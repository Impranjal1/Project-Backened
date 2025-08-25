import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import socketService from '../services/socketService';

export const useSocket = () => {
  const { user, token } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [connectionError, setConnectionError] = useState(null);
  const reconnectTimeoutRef = useRef(null);

  // Connect to socket when user is authenticated
  useEffect(() => {
    if (user && token) {
      try {
        socketService.connect(token);
        setConnectionError(null);
      } catch (error) {
        console.error('Failed to connect to socket:', error);
        setConnectionError(error.message);
      }
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [user, token]);

  // Set up connection event listeners
  useEffect(() => {
    if (!socketService.isSocketConnected()) return;

    const handleConnect = () => {
      setIsConnected(true);
      setConnectionError(null);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleConnectError = (error) => {
      setIsConnected(false);
      setConnectionError(error.message);
    };

    const handleError = (error) => {
      setConnectionError(error.message);
    };

    socketService.on('connect', handleConnect);
    socketService.on('disconnect', handleDisconnect);
    socketService.on('connect_error', handleConnectError);
    socketService.on('error', handleError);

    return () => {
      socketService.off('connect', handleConnect);
      socketService.off('disconnect', handleDisconnect);
      socketService.off('connect_error', handleConnectError);
      socketService.off('error', handleError);
    };
  }, []);

  const joinBoard = useCallback((boardId) => {
    if (!socketService.isSocketConnected()) {
      setConnectionError('Socket not connected');
      return;
    }

    try {
      socketService.joinBoard(boardId);
    } catch (error) {
      setConnectionError(error.message);
    }
  }, []);

  const leaveBoard = useCallback(() => {
    socketService.leaveBoard();
    setActiveUsers([]);
  }, []);

  return {
    isConnected,
    activeUsers,
    connectionError,
    socketService,
    joinBoard,
    leaveBoard,
  };
};

export const useBoardCollaboration = (boardId) => {
  const { socketService, isConnected } = useSocket();
  const [activeUsers, setActiveUsers] = useState([]);
  const [userCursors, setUserCursors] = useState(new Map());
  const [userTools, setUserTools] = useState(new Map());
  const [userDrawingStates, setUserDrawingStates] = useState(new Map());
  const [lastCanvasUpdate, setLastCanvasUpdate] = useState(null);

  // Join board on mount
  useEffect(() => {
    if (isConnected && boardId) {
      socketService.joinBoard(boardId);
    }

    return () => {
      if (boardId) {
        socketService.leaveBoard();
      }
    };
  }, [isConnected, boardId, socketService]);

  // Set up board event listeners
  useEffect(() => {
    if (!socketService.isSocketConnected()) return;

    const handleBoardJoined = (data) => {
      setActiveUsers(data.activeUsers || []);
    };

    const handleActiveUsersUpdated = (users) => {
      setActiveUsers(users || []);
    };

    const handleUserJoined = (data) => {
      setActiveUsers(prev => [...prev, data]);
    };

    const handleUserLeft = (data) => {
      setActiveUsers(prev => prev.filter(user => user.user._id !== data.userId));
      setUserCursors(prev => {
        const newCursors = new Map(prev);
        newCursors.delete(data.userId);
        return newCursors;
      });
      setUserTools(prev => {
        const newTools = new Map(prev);
        newTools.delete(data.userId);
        return newTools;
      });
      setUserDrawingStates(prev => {
        const newStates = new Map(prev);
        newStates.delete(data.userId);
        return newStates;
      });
    };

    const handleCanvasUpdated = (data) => {
      setLastCanvasUpdate(data);
    };

    const handleCursorMoved = (data) => {
      setUserCursors(prev => new Map(prev).set(data.userId, {
        x: data.x,
        y: data.y,
        user: data.user,
        timestamp: data.timestamp,
      }));
    };

    const handleUserToolChanged = (data) => {
      setUserTools(prev => new Map(prev).set(data.userId, {
        tool: data.tool,
        user: data.user,
        timestamp: data.timestamp,
      }));
    };

    const handleUserDrawingStart = (data) => {
      setUserDrawingStates(prev => new Map(prev).set(data.userId, {
        isDrawing: true,
        tool: data.tool,
        startPoint: data.startPoint,
        user: data.user,
        timestamp: data.timestamp,
      }));
    };

    const handleUserDrawingEnd = (data) => {
      setUserDrawingStates(prev => new Map(prev).set(data.userId, {
        isDrawing: false,
        user: data.user,
        timestamp: data.timestamp,
      }));
    };

    const handleBoardSaved = (data) => {
      // Could show a toast notification or update UI
      console.log(`Board saved by ${data.savedBy.name}`);
    };

    // Register event listeners
    socketService.on('board-joined', handleBoardJoined);
    socketService.on('active-users-updated', handleActiveUsersUpdated);
    socketService.on('user-joined', handleUserJoined);
    socketService.on('user-left', handleUserLeft);
    socketService.on('canvas-updated', handleCanvasUpdated);
    socketService.on('cursor-moved', handleCursorMoved);
    socketService.on('user-tool-changed', handleUserToolChanged);
    socketService.on('user-drawing-start', handleUserDrawingStart);
    socketService.on('user-drawing-end', handleUserDrawingEnd);
    socketService.on('board-saved', handleBoardSaved);

    return () => {
      socketService.off('board-joined', handleBoardJoined);
      socketService.off('active-users-updated', handleActiveUsersUpdated);
      socketService.off('user-joined', handleUserJoined);
      socketService.off('user-left', handleUserLeft);
      socketService.off('canvas-updated', handleCanvasUpdated);
      socketService.off('cursor-moved', handleCursorMoved);
      socketService.off('user-tool-changed', handleUserToolChanged);
      socketService.off('user-drawing-start', handleUserDrawingStart);
      socketService.off('user-drawing-end', handleUserDrawingEnd);
      socketService.off('board-saved', handleBoardSaved);
    };
  }, [socketService]);

  // Canvas update methods
  const broadcastCanvasUpdate = useCallback((elements, action = 'batch', element = null) => {
    socketService.broadcastCanvasUpdate(elements, action, element);
  }, [socketService]);

  const broadcastCursorMove = useCallback((x, y) => {
    socketService.broadcastCursorMove(x, y);
  }, [socketService]);

  const broadcastToolChange = useCallback((tool) => {
    socketService.broadcastToolChange(tool);
  }, [socketService]);

  const broadcastDrawingStart = useCallback((tool, startPoint) => {
    socketService.broadcastDrawingStart(tool, startPoint);
  }, [socketService]);

  const broadcastDrawingEnd = useCallback(() => {
    socketService.broadcastDrawingEnd();
  }, [socketService]);

  const broadcastBoardSave = useCallback((elements) => {
    socketService.broadcastBoardSave(elements);
  }, [socketService]);

  return {
    activeUsers,
    userCursors,
    userTools,
    userDrawingStates,
    lastCanvasUpdate,
    broadcastCanvasUpdate,
    broadcastCursorMove,
    broadcastToolChange,
    broadcastDrawingStart,
    broadcastDrawingEnd,
    broadcastBoardSave,
  };
};
