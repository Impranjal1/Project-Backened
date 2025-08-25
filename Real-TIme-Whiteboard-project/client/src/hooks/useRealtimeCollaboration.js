import { useState, useEffect, useCallback, useRef } from 'react';
import socketService from '../services/socketService';
import { useAuth } from '../contexts/AuthContext';

export const useRealtimeCollaboration = (boardId) => {
  const { user } = useAuth();
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [cursors, setCursors] = useState(new Map());
  const [lockedElements, setLockedElements] = useState(new Map());
  const [userSelections, setUserSelections] = useState(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const cursorTimeoutRef = useRef(new Map());

  // Connect to board and set up event listeners
  useEffect(() => {
    if (!boardId || !user) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      socketService.connect(token);
      // Defer join until connected
      const attemptJoin = () => {
        if (socketService.isSocketConnected()) {
          try {
            socketService.joinBoard(boardId);
            setupEventListeners();
            setIsConnected(true);
            setConnectionError(null);
          } catch (err) {
            console.warn('Join board failed (will keep offline mode):', err.message);
            setIsConnected(false);
          }
        } else {
          // Try again shortly (max 3s window)
          if (!joinStartRef.current) joinStartRef.current = Date.now();
          if (Date.now() - joinStartRef.current < 3000) {
            setTimeout(attemptJoin, 200);
          } else {
            console.warn('Socket not connected; continuing in offline mode');
          }
        }
      };
      attemptJoin();
    } catch (error) {
      console.error('Failed to initiate collaboration service:', error);
      setConnectionError(error.message);
      setIsConnected(false);
    }

    // Cleanup on unmount
    return () => {
      if (socketService.getCurrentBoard() === boardId) {
        socketService.leaveBoard();
      }
      cleanupEventListeners();
    };
  }, [boardId, user]);

  const joinStartRef = useRef(null);

  const setupEventListeners = useCallback(() => {
    // Board connection events
    socketService.on('board-joined', (data) => {
      console.log('Successfully joined board:', data.boardId);
      let activeUsers = data.activeUsers || [];
      
      // Ensure current user is always included in the active users list
      if (user && !activeUsers.some(u => u.user._id === user._id || u.userId === user._id)) {
        activeUsers.push({
          user: user,
          userId: user._id,
          role: data.userRole || 'viewer', // Use the role from the join response
          joinedAt: new Date().toISOString()
        });
      }
      
      setConnectedUsers(activeUsers);
    });

    socketService.on('user-joined', (data) => {
      console.log('User joined:', data.user.name);
      setConnectedUsers(prev => [...prev, {
        user: data.user,
        role: data.role,
        joinedAt: data.joinedAt
      }]);
    });

    socketService.on('user-left', (data) => {
      console.log('User left:', data.user?.name);
      setConnectedUsers(prev => prev.filter(u => u.user._id !== data.userId));
      
      // Remove user's cursor and selections
      setCursors(prev => {
        const newCursors = new Map(prev);
        newCursors.delete(data.userId);
        return newCursors;
      });
      
      setUserSelections(prev => {
        const newSelections = new Map(prev);
        newSelections.delete(data.userId);
        return newSelections;
      });
    });

    socketService.on('active-users-updated', (users) => {
      setConnectedUsers(users);
    });

    // Cursor tracking
    socketService.on('cursor-moved', (data) => {
      const { userId, user: userData, x, y, timestamp } = data;
      
      if (userId === socketService.getSocketId()) return; // Don't show own cursor
      
      setCursors(prev => {
        const newCursors = new Map(prev);
        newCursors.set(userId, {
          user: userData,
          x,
          y,
          timestamp,
          lastSeen: Date.now()
        });
        return newCursors;
      });

      // Clear existing timeout for this user
      if (cursorTimeoutRef.current.has(userId)) {
        clearTimeout(cursorTimeoutRef.current.get(userId));
      }

      // Set timeout to hide cursor after inactivity
      const timeout = setTimeout(() => {
        setCursors(prev => {
          const newCursors = new Map(prev);
          newCursors.delete(userId);
          return newCursors;
        });
        cursorTimeoutRef.current.delete(userId);
      }, 5000); // Hide cursor after 5 seconds of inactivity

      cursorTimeoutRef.current.set(userId, timeout);
    });

    // Tool and drawing state
    socketService.on('user-tool-changed', (data) => {
      console.log(`${data.user.name} selected tool: ${data.tool}`);
      // You can show this in UI if needed
    });

    socketService.on('user-drawing-start', (data) => {
      console.log(`${data.user.name} started drawing with ${data.tool}`);
      // You can show drawing indicators
    });

    socketService.on('user-drawing-end', (data) => {
      console.log(`${data.user.name} finished drawing`);
    });

    // Element locking (if implemented on server)
    socketService.on('element-locked', (data) => {
      setLockedElements(prev => {
        const newLocked = new Map(prev);
        newLocked.set(data.elementId, {
          lockedBy: data.lockedBy,
          timestamp: data.timestamp
        });
        return newLocked;
      });
    });

    socketService.on('element-unlocked', (data) => {
      setLockedElements(prev => {
        const newLocked = new Map(prev);
        newLocked.delete(data.elementId);
        return newLocked;
      });
    });

    // Selection tracking (if implemented on server)
    socketService.on('user-selection-changed', (data) => {
      const { userId, elementIds, user: userData } = data;
      
      if (userId === socketService.getSocketId()) return; // Don't track own selection
      
      setUserSelections(prev => {
        const newSelections = new Map(prev);
        if (elementIds.length > 0) {
          newSelections.set(userId, {
            user: userData,
            elementIds,
            timestamp: Date.now()
          });
        } else {
          newSelections.delete(userId);
        }
        return newSelections;
      });
    });

    // Error handling
    socketService.on('error', (error) => {
      console.error('Collaboration error:', error);
      setConnectionError(error.message);
    });

    // Permission and user management events
    socketService.on('permission-updated', (data) => {
      const { userId, newRole } = data;
      console.log(`User permission updated: ${userId} -> ${newRole}`);
      
      // Update local connected users list
      setConnectedUsers(prev => 
        prev.map(user => 
          user.user._id === userId 
            ? { ...user, role: newRole }
            : user
        )
      );

      // If it's the current user, you might want to update permissions in parent component
      if (userId === user?._id) {
        // Notify parent component about permission change
        console.log('Your permissions have been updated to:', newRole);
        // You could emit a custom event or use a callback here
      }
    });

    socketService.on('user-removed', (data) => {
      const { userId, boardId } = data;
      console.log(`User removed from board: ${userId}`);
      
      // Remove from connected users
      setConnectedUsers(prev => prev.filter(u => u.user._id !== userId));
      
      // If it's the current user being removed, redirect them
      if (userId === user?._id) {
        alert('You have been removed from this board');
        // You might want to redirect to dashboard here
        // This could be handled by parent component
        window.location.href = '/dashboard';
      }
    });

  }, [user]);

  const cleanupEventListeners = useCallback(() => {
    // Clear all cursor timeouts
    cursorTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
    cursorTimeoutRef.current.clear();

    // Remove all socket listeners
    socketService.removeAllListeners();
  }, []);

  // Broadcast cursor movement
  const broadcastCursor = useCallback((x, y) => {
    if (isConnected) {
      socketService.broadcastCursorMove(x, y);
    }
  }, [isConnected]);

  // Broadcast tool change
  const broadcastToolChange = useCallback((tool) => {
    if (isConnected) {
      socketService.broadcastToolChange(tool);
    }
  }, [isConnected]);

  // Broadcast drawing events
  const broadcastDrawingStart = useCallback((tool, startPoint) => {
    if (isConnected) {
      socketService.broadcastDrawingStart(tool, startPoint);
    }
  }, [isConnected]);

  const broadcastDrawingEnd = useCallback(() => {
    if (isConnected) {
      socketService.broadcastDrawingEnd();
    }
  }, [isConnected]);

  // Element operations
  const broadcastSelection = useCallback((elementIds) => {
    if (isConnected) {
      socketService.broadcastSelection(elementIds);
    }
  }, [isConnected]);

  // Element broadcasting methods
  const broadcastElementCreate = useCallback((element) => {
    if (isConnected && socketService.socket) {
      socketService.socket.emit('element-create', {
        boardId,
        element
      });
    }
  }, [isConnected, boardId]);

  const broadcastElementUpdate = useCallback((element) => {
    if (isConnected && socketService.socket) {
      socketService.socket.emit('element-update', {
        boardId,
        element
      });
    }
  }, [isConnected, boardId]);

  const broadcastElementDelete = useCallback((elementId) => {
    if (isConnected && socketService.socket) {
      socketService.socket.emit('element-delete', {
        boardId,
        elementId
      });
    }
  }, [isConnected, boardId]);

  const broadcastCursorPosition = useCallback((data) => {
    if (isConnected && socketService.socket) {
      socketService.socket.emit('cursor-move', {
        boardId,
        x: data.x,
        y: data.y,
        user: data.user
      });
    }
  }, [isConnected, boardId]);

  // Event listeners for element operations
  const onElementCreate = useCallback((handler) => {
    if (socketService.socket) {
      socketService.socket.on('element-created', handler);
    }
  }, []);

  const onElementUpdate = useCallback((handler) => {
    if (socketService.socket) {
      socketService.socket.on('element-updated', handler);
    }
  }, []);

  const onElementDelete = useCallback((handler) => {
    if (socketService.socket) {
      socketService.socket.on('element-deleted', handler);
    }
  }, []);

  const offElementCreate = useCallback((handler) => {
    if (socketService.socket) {
      socketService.socket.off('element-created', handler);
    }
  }, []);

  const offElementUpdate = useCallback((handler) => {
    if (socketService.socket) {
      socketService.socket.off('element-updated', handler);
    }
  }, []);

  const offElementDelete = useCallback((handler) => {
    if (socketService.socket) {
      socketService.socket.off('element-deleted', handler);
    }
  }, []);

  const lockElement = useCallback((elementId) => {
    if (isConnected) {
      socketService.lockElement(elementId);
    }
  }, [isConnected]);

  const unlockElement = useCallback((elementId) => {
    if (isConnected) {
      socketService.unlockElement(elementId);
    }
  }, [isConnected]);

  // Check if element is locked by another user
  const isElementLocked = useCallback((elementId) => {
    const lock = lockedElements.get(elementId);
    return lock && lock.lockedBy._id !== user?._id;
  }, [lockedElements, user]);

  // Get lock info for element
  const getElementLock = useCallback((elementId) => {
    return lockedElements.get(elementId);
  }, [lockedElements]);

  return {
    // Connection state
    isConnected,
    connectionError,
    
    // Users and collaboration
    connectedUsers,
    cursors,
    userSelections,
    
    // Element locking
    lockedElements,
    isElementLocked,
    getElementLock,
    lockElement,
    unlockElement,
    
    // Broadcasting functions
    broadcastCursor,
    broadcastToolChange,
    broadcastDrawingStart,
    broadcastDrawingEnd,
    broadcastSelection,
    broadcastElementCreate,
    broadcastElementUpdate,
    broadcastElementDelete,
    broadcastCursorPosition,
    
    // Event listeners
    onElementCreate,
    onElementUpdate,
    onElementDelete,
    offElementCreate,
    offElementUpdate,
    offElementDelete,
    
    // Utility
    socketService,
  };
};
