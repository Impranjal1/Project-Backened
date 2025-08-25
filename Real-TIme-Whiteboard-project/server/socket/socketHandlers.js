const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Board = require('../models/Board');

// Store active users and their board connections
const activeUsers = new Map();
const boardRooms = new Map();

// Socket.IO middleware for authentication
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded._id).select('-password');
    
    if (!user) {
      return next(new Error('User not found'));
    }

    socket.userId = user._id.toString();
    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
};

module.exports = (io) => {
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    console.log(`User ${socket.user.name} connected (${socket.userId})`);

    // Store active user
    activeUsers.set(socket.userId, {
      socketId: socket.id,
      user: {
        _id: socket.user._id,
        name: socket.user.name,
        email: socket.user.email,
        avatar: socket.user.avatar,
        initials: socket.user.getInitials(),
      },
      joinedAt: new Date(),
      currentBoard: null,
    });

    // Join board room
    socket.on('join-board', async (data) => {
      try {
        const { boardId } = data;
        
        // Verify user has access to board
        const board = await Board.findById(boardId);
        if (!board) {
          socket.emit('error', { message: 'Board not found' });
          return;
        }

        const access = board.hasAccess(socket.userId);
        if (!access.hasAccess) {
          socket.emit('error', { message: 'Access denied to board' });
          return;
        }

        // Leave previous board room if any
        if (activeUsers.get(socket.userId)?.currentBoard) {
          socket.leave(activeUsers.get(socket.userId).currentBoard);
        }

        // Join new board room
        socket.join(boardId);
        
        // Update user's current board
        const userData = activeUsers.get(socket.userId);
        userData.currentBoard = boardId;
        userData.role = access.role;
        activeUsers.set(socket.userId, userData);

        // Add user to board room tracking
        if (!boardRooms.has(boardId)) {
          boardRooms.set(boardId, new Set());
        }
        boardRooms.get(boardId).add(socket.userId);

        // Get current users in board
        const usersInBoard = Array.from(boardRooms.get(boardId))
          .map(userId => activeUsers.get(userId))
          .filter(Boolean);

        // Notify all users in board about new user
        socket.to(boardId).emit('user-joined', {
          user: userData.user,
          role: userData.role,
          joinedAt: userData.joinedAt,
        });

        // Send current board state to new user
        socket.emit('board-joined', {
          boardId,
          role: access.role,
          activeUsers: usersInBoard,
          message: `Joined board successfully`,
        });

        // Broadcast updated user list to all users in board
        io.to(boardId).emit('active-users-updated', usersInBoard);

        console.log(`User ${socket.user.name} joined board ${boardId}`);
      } catch (error) {
        console.error('Error joining board:', error);
        socket.emit('error', { message: 'Failed to join board' });
      }
    });

    // Handle canvas element updates
    socket.on('canvas-update', async (data) => {
      try {
        const { boardId, elements, action, element } = data;
        const userData = activeUsers.get(socket.userId);

        if (userData?.currentBoard !== boardId) {
          socket.emit('error', { message: 'Not in this board' });
          return;
        }

        // Verify user has edit access to the board
        const board = await Board.findById(boardId);
        if (!board) {
          socket.emit('error', { message: 'Board not found' });
          return;
        }

        const access = board.hasAccess(socket.userId);
        if (!access.hasAccess || (access.role === 'viewer' && action !== 'cursor')) {
          socket.emit('error', { message: 'No edit permission for this board' });
          return;
        }

        // Update board elements in database for persistent actions
        if (action === 'add' && element) {
          // Add new element to board
          const newElement = {
            ...element,
            id: element.id || new Date().getTime().toString(),
            createdBy: socket.userId,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          board.elements.push(newElement);
          await board.updateLastModified(socket.userId);
          
        } else if (action === 'update' && element) {
          // Update existing element
          const elementIndex = board.elements.findIndex(el => el.id === element.id);
          if (elementIndex !== -1) {
            board.elements[elementIndex] = {
              ...board.elements[elementIndex],
              ...element,
              updatedAt: new Date(),
              lastModifiedBy: socket.userId
            };
            await board.updateLastModified(socket.userId);
          }
          
        } else if (action === 'delete' && element) {
          // Remove element from board
          board.elements = board.elements.filter(el => el.id !== element.id);
          await board.updateLastModified(socket.userId);
          
        } else if (action === 'batch' && elements) {
          // Batch update all elements
          board.elements = elements.map(el => ({
            ...el,
            updatedAt: new Date(),
            lastModifiedBy: el.lastModifiedBy || socket.userId
          }));
          await board.updateLastModified(socket.userId);
        }

        // Broadcast to all other users in the board
        socket.to(boardId).emit('canvas-updated', {
          elements: action === 'batch' ? elements : board.elements,
          action, // 'add', 'update', 'delete', 'batch'
          element,
          updatedBy: userData.user,
          timestamp: new Date(),
          boardVersion: board.version
        });

        // Send confirmation to the user who made the change
        socket.emit('canvas-update-confirmed', {
          action,
          element,
          success: true,
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Error handling canvas update:', error);
        socket.emit('error', { 
          message: 'Failed to update canvas',
          action: data.action
        });
      }
    });

    // Handle real-time cursor movement
    socket.on('cursor-move', (data) => {
      const { boardId, x, y } = data;
      const userData = activeUsers.get(socket.userId);

      if (userData?.currentBoard !== boardId) {
        return;
      }

      socket.to(boardId).emit('cursor-moved', {
        userId: socket.userId,
        user: userData.user,
        x,
        y,
        timestamp: Date.now(),
      });
    });

    // Handle tool selection
    socket.on('tool-change', (data) => {
      const { boardId, tool } = data;
      const userData = activeUsers.get(socket.userId);

      if (userData?.currentBoard !== boardId) {
        return;
      }

      socket.to(boardId).emit('user-tool-changed', {
        userId: socket.userId,
        user: userData.user,
        tool,
        timestamp: Date.now(),
      });
    });

    // Handle drawing start
    socket.on('drawing-start', (data) => {
      const { boardId, tool, startPoint } = data;
      const userData = activeUsers.get(socket.userId);

      if (userData?.currentBoard !== boardId) {
        return;
      }

      socket.to(boardId).emit('user-drawing-start', {
        userId: socket.userId,
        user: userData.user,
        tool,
        startPoint,
        timestamp: Date.now(),
      });
    });

    // Handle drawing end
    socket.on('drawing-end', (data) => {
      const { boardId } = data;
      const userData = activeUsers.get(socket.userId);

      if (userData?.currentBoard !== boardId) {
        return;
      }

      socket.to(boardId).emit('user-drawing-end', {
        userId: socket.userId,
        user: userData.user,
        timestamp: Date.now(),
      });
    });

    // Handle board save
    socket.on('board-save', async (data) => {
      try {
        const { boardId, elements } = data;
        const userData = activeUsers.get(socket.userId);

        if (userData?.currentBoard !== boardId) {
          socket.emit('error', { message: 'Not in this board' });
          return;
        }

        // Save elements to database if provided
        if (elements && Array.isArray(elements)) {
          const board = await Board.findById(boardId);
          if (board) {
            const access = board.hasAccess(socket.userId);
            if (access.hasAccess && access.role !== 'viewer') {
              board.elements = elements.map(element => ({
                ...element,
                updatedAt: new Date(),
                lastModifiedBy: element.lastModifiedBy || socket.userId
              }));
              await board.updateLastModified(socket.userId);
            }
          }
        }

        socket.to(boardId).emit('board-saved', {
          savedBy: userData.user,
          elementCount: elements?.length || 0,
          timestamp: new Date(),
        });

      } catch (error) {
        console.error('Error saving board:', error);
        socket.emit('error', { message: 'Failed to save board' });
      }
    });

    // Handle element creation
    socket.on('element-create', async (data) => {
      try {
        const { boardId, element } = data;
        const userData = activeUsers.get(socket.userId);

        if (userData?.currentBoard !== boardId) {
          socket.emit('error', { message: 'Not in this board' });
          return;
        }

        const board = await Board.findById(boardId);
        if (!board) {
          socket.emit('error', { message: 'Board not found' });
          return;
        }

        const access = board.hasAccess(socket.userId);
        if (!access.hasAccess || access.role === 'viewer') {
          socket.emit('error', { message: 'No edit permission' });
          return;
        }

        const newElement = {
          ...element,
          id: element.id || new Date().getTime().toString(),
          createdBy: socket.userId,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        board.elements.push(newElement);
        await board.updateLastModified(socket.userId);

        // Broadcast to all users in board
        io.to(boardId).emit('element-created', {
          element: newElement,
          createdBy: userData.user,
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Error creating element:', error);
        socket.emit('error', { message: 'Failed to create element' });
      }
    });

    // Handle element update
    socket.on('element-update', async (data) => {
      try {
        const { boardId, element } = data;
        const userData = activeUsers.get(socket.userId);

        if (userData?.currentBoard !== boardId) {
          socket.emit('error', { message: 'Not in this board' });
          return;
        }

        const board = await Board.findById(boardId);
        if (!board) {
          socket.emit('error', { message: 'Board not found' });
          return;
        }

        const access = board.hasAccess(socket.userId);
        if (!access.hasAccess || access.role === 'viewer') {
          socket.emit('error', { message: 'No edit permission' });
          return;
        }

        const elementIndex = board.elements.findIndex(el => el.id === element.id);
        if (elementIndex !== -1) {
          board.elements[elementIndex] = {
            ...board.elements[elementIndex],
            ...element,
            updatedAt: new Date(),
            lastModifiedBy: socket.userId
          };
          await board.updateLastModified(socket.userId);

          // Broadcast to all users in board
          io.to(boardId).emit('element-updated', {
            element: board.elements[elementIndex],
            updatedBy: userData.user,
            timestamp: new Date()
          });
        } else {
          socket.emit('error', { message: 'Element not found' });
        }

      } catch (error) {
        console.error('Error updating element:', error);
        socket.emit('error', { message: 'Failed to update element' });
      }
    });

    // Handle element deletion
    socket.on('element-delete', async (data) => {
      try {
        const { boardId, elementId } = data;
        const userData = activeUsers.get(socket.userId);

        if (userData?.currentBoard !== boardId) {
          socket.emit('error', { message: 'Not in this board' });
          return;
        }

        const board = await Board.findById(boardId);
        if (!board) {
          socket.emit('error', { message: 'Board not found' });
          return;
        }

        const access = board.hasAccess(socket.userId);
        if (!access.hasAccess || access.role === 'viewer') {
          socket.emit('error', { message: 'No edit permission' });
          return;
        }

        const elementExists = board.elements.some(el => el.id === elementId);
        if (elementExists) {
          board.elements = board.elements.filter(el => el.id !== elementId);
          await board.updateLastModified(socket.userId);

          // Broadcast to all users in board
          io.to(boardId).emit('element-deleted', {
            elementId,
            deletedBy: userData.user,
            timestamp: new Date()
          });
        } else {
          socket.emit('error', { message: 'Element not found' });
        }

      } catch (error) {
        console.error('Error deleting element:', error);
        socket.emit('error', { message: 'Failed to delete element' });
      }
    });

    // Handle leave board
    socket.on('leave-board', () => {
      const userData = activeUsers.get(socket.userId);
      if (userData?.currentBoard) {
        handleUserLeaveBoard(socket, userData.currentBoard);
      }
    });

    // Handle permission updates
    socket.on('permission-updated', (data) => {
      const { userId, newRole, boardId } = data;
      console.log(`Broadcasting permission update: User ${userId} -> ${newRole} on board ${boardId}`);
      
      // Broadcast to all users in the board except sender
      socket.to(boardId).emit('permission-updated', {
        userId,
        newRole,
        boardId,
        updatedBy: socket.userId,
        timestamp: new Date()
      });
    });

    // Handle user removal
    socket.on('user-removed', (data) => {
      const { userId, boardId } = data;
      console.log(`Broadcasting user removal: User ${userId} from board ${boardId}`);
      
      // Find the socket of the user being removed
      const removedUserData = activeUsers.get(userId);
      if (removedUserData) {
        const removedUserSocket = io.sockets.sockets.get(removedUserData.socketId);
        if (removedUserSocket) {
          // Notify the removed user
          removedUserSocket.emit('user-removed', {
            userId,
            boardId,
            removedBy: socket.userId,
            timestamp: new Date()
          });
          
          // Remove them from the board room
          handleUserLeaveBoard(removedUserSocket, boardId);
        }
      }

      // Broadcast to other users in the board
      socket.to(boardId).emit('user-removed', {
        userId,
        boardId,
        removedBy: socket.userId,
        timestamp: new Date()
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User ${socket.user.name} disconnected`);
      
      const userData = activeUsers.get(socket.userId);
      if (userData?.currentBoard) {
        handleUserLeaveBoard(socket, userData.currentBoard);
      }

      activeUsers.delete(socket.userId);
    });

    // Helper function to handle user leaving board
    function handleUserLeaveBoard(socket, boardId) {
      // Remove from board room tracking
      if (boardRooms.has(boardId)) {
        boardRooms.get(boardId).delete(socket.userId);
        if (boardRooms.get(boardId).size === 0) {
          boardRooms.delete(boardId);
        }
      }

      // Notify other users
      socket.to(boardId).emit('user-left', {
        userId: socket.userId,
        user: activeUsers.get(socket.userId)?.user,
        timestamp: new Date(),
      });

      // Leave socket room
      socket.leave(boardId);

      // Update active users list for remaining users
      if (boardRooms.has(boardId)) {
        const usersInBoard = Array.from(boardRooms.get(boardId))
          .map(userId => activeUsers.get(userId))
          .filter(Boolean);
        
        socket.to(boardId).emit('active-users-updated', usersInBoard);
      }

      // Clear user's current board
      const userData = activeUsers.get(socket.userId);
      if (userData) {
        userData.currentBoard = null;
        activeUsers.set(socket.userId, userData);
      }
    }

    // Send initial connection confirmation
    socket.emit('connected', {
      message: 'Connected to real-time collaboration server',
      user: socket.user,
      timestamp: new Date(),
    });
  });

  // Helper function to get board statistics
  const getBoardStats = (boardId) => {
    const usersInBoard = boardRooms.get(boardId);
    return {
      activeUsers: usersInBoard ? usersInBoard.size : 0,
      users: usersInBoard ? Array.from(usersInBoard).map(userId => activeUsers.get(userId)?.user).filter(Boolean) : [],
    };
  };

  // Expose helper functions
  io.getBoardStats = getBoardStats;
  io.getActiveUsers = () => Array.from(activeUsers.values());
  io.getBoardRooms = () => Object.fromEntries(boardRooms);
};
