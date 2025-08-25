import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.currentBoard = null;
    this.listeners = new Map();
  }

  connect(token) {
    if (this.socket && this.isConnected) {
      return this.socket;
    }

    this.socket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000', {
      auth: {
        token
      },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to Socket.IO server');
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from Socket.IO server');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      this.isConnected = false;
    });

    this.socket.on('error', (error) => {
      console.error('Socket.IO error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      if (this.currentBoard) {
        this.leaveBoard();
      }
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
    }
  }

  // Board operations
  joinBoard(boardId) {
    if (!this.socket || !this.isConnected) {
      throw new Error('Socket not connected');
    }

    this.currentBoard = boardId;
    this.socket.emit('join-board', { boardId });
  }

  leaveBoard() {
    if (!this.socket || !this.isConnected) {
      return;
    }

    this.socket.emit('leave-board');
    this.currentBoard = null;
  }

  // Canvas operations
  broadcastCanvasUpdate(elements, action = 'batch', element = null) {
    if (!this.socket || !this.isConnected || !this.currentBoard) {
      return;
    }

    this.socket.emit('canvas-update', {
      boardId: this.currentBoard,
      elements,
      action,
      element,
    });
  }

  // Cursor operations
  broadcastCursorMove(x, y) {
    if (!this.socket || !this.isConnected || !this.currentBoard) {
      return;
    }

    this.socket.emit('cursor-move', {
      boardId: this.currentBoard,
      x,
      y,
    });
  }

  // Tool operations
  broadcastToolChange(tool) {
    if (!this.socket || !this.isConnected || !this.currentBoard) {
      return;
    }

    this.socket.emit('tool-change', {
      boardId: this.currentBoard,
      tool,
    });
  }

  // Drawing operations
  broadcastDrawingStart(tool, startPoint) {
    if (!this.socket || !this.isConnected || !this.currentBoard) {
      return;
    }

    this.socket.emit('drawing-start', {
      boardId: this.currentBoard,
      tool,
      startPoint,
    });
  }

  broadcastDrawingEnd() {
    if (!this.socket || !this.isConnected || !this.currentBoard) {
      return;
    }

    this.socket.emit('drawing-end', {
      boardId: this.currentBoard,
    });
  }

  // Board save
  broadcastBoardSave(elements) {
    if (!this.socket || !this.isConnected || !this.currentBoard) {
      return;
    }

    this.socket.emit('board-save', {
      boardId: this.currentBoard,
      elements,
    });
  }

  // Advanced element operations
  createElement(element) {
    if (!this.socket || !this.isConnected || !this.currentBoard) {
      return;
    }

    this.socket.emit('element-create', {
      boardId: this.currentBoard,
      element,
    });
  }

  updateElement(element) {
    if (!this.socket || !this.isConnected || !this.currentBoard) {
      return;
    }

    this.socket.emit('element-update', {
      boardId: this.currentBoard,
      element,
    });
  }

  deleteElement(elementId) {
    if (!this.socket || !this.isConnected || !this.currentBoard) {
      return;
    }

    this.socket.emit('element-delete', {
      boardId: this.currentBoard,
      elementId,
    });
  }

  // Element locking operations
  lockElement(elementId) {
    if (!this.socket || !this.isConnected || !this.currentBoard) {
      return;
    }

    this.socket.emit('element-lock', {
      boardId: this.currentBoard,
      elementId,
    });
  }

  unlockElement(elementId) {
    if (!this.socket || !this.isConnected || !this.currentBoard) {
      return;
    }

    this.socket.emit('element-unlock', {
      boardId: this.currentBoard,
      elementId,
    });
  }

  // Selection operations
  broadcastSelection(elementIds) {
    if (!this.socket || !this.isConnected || !this.currentBoard) {
      return;
    }

    this.socket.emit('selection-change', {
      boardId: this.currentBoard,
      elementIds,
    });
  }

  // Viewport operations
  broadcastViewportChange(viewport) {
    if (!this.socket || !this.isConnected || !this.currentBoard) {
      return;
    }

    this.socket.emit('viewport-change', {
      boardId: this.currentBoard,
      viewport,
    });
  }

  // Event listeners
  on(event, callback) {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    this.socket.on(event, callback);
    
    // Store listener for cleanup
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
      
      // Remove from stored listeners
      if (this.listeners.has(event)) {
        this.listeners.get(event).delete(callback);
        if (this.listeners.get(event).size === 0) {
          this.listeners.delete(event);
        }
      }
    }
  }

  removeAllListeners(event = null) {
    if (this.socket) {
      if (event) {
        this.socket.removeAllListeners(event);
        this.listeners.delete(event);
      } else {
        this.socket.removeAllListeners();
        this.listeners.clear();
      }
    }
  }

  // Utility methods
  isSocketConnected() {
    return this.socket && this.isConnected;
  }

  getCurrentBoard() {
    return this.currentBoard;
  }

  getSocketId() {
    return this.socket?.id;
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
