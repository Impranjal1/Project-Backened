import React, { useEffect, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCanvasState } from '../hooks/canvas/useCanvasState';
import { useCanvasInteractions } from '../hooks/canvas/useCanvasInteractions';
import { useRealtimeCollaboration } from '../hooks/useRealtimeCollaboration';
import CanvasToolbar from '../components/canvas/CanvasToolbar';
import CanvasViewport from '../components/canvas/CanvasViewport';
import CanvasZoomControls from '../components/canvas/CanvasZoomControls';
import boardService from '../services/boardService';
import LoadingSpinner from '../components/common/LoadingSpinner';

const CanvasPage = () => {
  const { boardId, token } = useParams(); // Handle both board ID and share token
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Board state
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSharedAccess, setIsSharedAccess] = useState(!!token);
  const [sharePermissions, setSharePermissions] = useState('view');

  // Canvas state from custom hook
  const canvasState = useCanvasState();
  const {
    elements,
    setElements,
    activeTool,
    setActiveTool,
    selectedElement,
    setSelectedElement,
    isDragging,
    setIsDragging,
    dragOffset,
    setDragOffset,
    isResizing,
    setIsResizing,
    resizeCorner,
    setResizeCorner,
    drawingTempId,
    setDrawingTempId,
    contextMenu,
    setContextMenu,
    showColorPicker,
    setShowColorPicker,
    strokeColor,
    setStrokeColor,
    strokeWidth,
    setStrokeWidth,
    showStrokePanel,
    setShowStrokePanel,
    scale,
    setScale,
    isPanning,
    setIsPanning,
    history,
    historyIndex,
    colorInputRef,
    scrollRef,
    surfaceRef,
    panOrigin,
    scrollOrigin,
    pointersRef,
    pinchInitialDistRef,
    pinchInitialScaleRef,
    pinchCenterRef,
    singleTouchPanRef,
    recordHistory,
    undo,
    redo,
  } = canvasState;

  // Real-time collaboration
  const realtimeCollab = useRealtimeCollaboration(boardId, user, {
    onElementCreate: (element) => {
      setElements(prev => [...prev, element]);
    },
    onElementUpdate: (elementId, updates) => {
      setElements(prev => prev.map(el => 
        el.id === elementId ? { ...el, ...updates } : el
      ));
    },
    onElementDelete: (elementId) => {
      setElements(prev => prev.filter(el => el.id !== elementId));
    },
  });

  // Canvas interactions hook
  const canvasInteractions = useCanvasInteractions({
    activeTool,
    elements,
    setElements,
    selectedElement,
    setSelectedElement,
    isDragging,
    setIsDragging,
    dragOffset,
    setDragOffset,
    isResizing,
    setIsResizing,
    resizeCorner,
    setResizeCorner,
    drawingTempId,
    setDrawingTempId,
    contextMenu,
    setContextMenu,
    scale,
    setScale,
    isPanning,
    setIsPanning,
    strokeColor,
    strokeWidth,
    scrollRef,
    surfaceRef,
    panOrigin,
    scrollOrigin,
    pointersRef,
    pinchInitialDistRef,
    pinchInitialScaleRef,
    pinchCenterRef,
    singleTouchPanRef,
    recordHistory,
    realtimeCollab
  });

  const {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleContextMenu,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  } = canvasInteractions;

  // Load board data
  useEffect(() => {
    const loadBoard = async () => {
      try {
        setLoading(true);
        let response;
        
        if (boardId) {
          // Load board by ID
          response = await boardService.getBoard(boardId);
          setBoard(response.data);
        } else if (token) {
          // Load board by share token
          response = await boardService.getBoardByShareToken(token);
          setBoard(response.data.board);
          setSharePermissions(response.data.permissions);
          setIsSharedAccess(true);
        }
      } catch (err) {
        console.error('Failed to load board:', err);
        if (token) {
          setError('Invalid or expired share link.');
        } else {
          setError('Failed to load board. You may not have access to this board.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (boardId || token) {
      loadBoard();
    } else {
      // If no boardId or token, redirect to dashboard
      setLoading(false);
      setError('No board specified. Please create or select a board from the dashboard.');
    }
  }, [boardId, token]);

  // Check if user can edit (not view-only)
  const canEdit = !isSharedAccess || sharePermissions !== 'view';

  // Zoom functions
  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(prev * 1.2, 3));
  }, [setScale]);

  const zoomOut = useCallback(() => {
    setScale(prev => Math.max(prev / 1.2, 0.1));
  }, [setScale]);

  const resetZoom = useCallback(() => {
    setScale(1);
  }, [setScale]);

  const fitToView = useCallback(() => {
    if (elements.length === 0) {
      resetZoom();
      return;
    }

    const bounds = elements.reduce((acc, el) => {
      const right = el.x + (el.width || 0);
      const bottom = el.y + (el.height || 0);
      return {
        minX: Math.min(acc.minX, el.x),
        minY: Math.min(acc.minY, el.y),
        maxX: Math.max(acc.maxX, right),
        maxY: Math.max(acc.maxY, bottom),
      };
    }, { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });

    const padding = 50;
    const contentWidth = bounds.maxX - bounds.minX + padding * 2;
    const contentHeight = bounds.maxY - bounds.minY + padding * 2;
    
    const container = scrollRef.current;
    if (container) {
      const scaleX = container.clientWidth / contentWidth;
      const scaleY = container.clientHeight / contentHeight;
      const newScale = Math.min(scaleX, scaleY, 1);
      
      setScale(newScale);
      
      setTimeout(() => {
        container.scrollTo({
          left: bounds.minX - padding,
          top: bounds.minY - padding,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [elements, setScale, scrollRef, resetZoom]);

  // Element operations
  const addElement = useCallback((type) => {
    const newId = Date.now();
    const width = type === 'shape' ? 120 : 240;
    const height = type === 'shape' ? 120 : 120;
    const sc = scrollRef.current;
    const viewportCenterX = sc ? sc.scrollLeft + sc.clientWidth / 2 : width;
    const viewportCenterY = sc ? sc.scrollTop + sc.clientHeight / 2 : height;
    
    const newElement = {
      id: newId,
      type,
      text: type === 'text' ? 'New Text Box' : type === 'sticky' ? 'New Sticky Note' : '',
      x: viewportCenterX - width / 2,
      y: viewportCenterY - height / 2,
      width,
      height,
      isEditing: false,
      backgroundColor: type === 'sticky' ? '#FEF08A' : (type === 'shape' ? '#3B82F6' : 'transparent'),
      borderColor: '#94A3B8',
      textColor: '#111827',
      strokeColor: '#111827',
      points: type === 'freehand' ? [] : undefined,
      x2: undefined,
      y2: undefined,
    };
    
    const newElements = [...elements, newElement];
    setElements(newElements);
    recordHistory(newElements);
    
    // Emit element creation to other users
    if (realtimeCollab && realtimeCollab.isConnected) {
      realtimeCollab.broadcastElementCreate(newElement);
    }
  }, [elements, setElements, recordHistory, realtimeCollab, scrollRef]);

  const deleteElement = useCallback((id) => {
    const newElements = elements.filter(el => el.id !== id);
    setElements(newElements);
    setSelectedElement(null);
    recordHistory(newElements);
    
    // Emit element deletion to other users
    if (realtimeCollab && realtimeCollab.isConnected) {
      realtimeCollab.broadcastElementDelete(id);
    }
  }, [elements, setElements, setSelectedElement, recordHistory, realtimeCollab]);

  const duplicateElement = useCallback((id) => {
    const el = elements.find(e => e.id === id);
    if (!el) return;
    
    const clone = JSON.parse(JSON.stringify(el));
    clone.id = Date.now();
    clone.x += 40;
    clone.y += 40;
    
    const newElements = [...elements, clone];
    setElements(newElements);
    recordHistory(newElements);
    
    // Emit element creation to other users
    if (realtimeCollab && realtimeCollab.isConnected) {
      realtimeCollab.broadcastElementCreate(clone);
    }
  }, [elements, setElements, recordHistory, realtimeCollab]);

  const applyColor = useCallback((value) => {
    const newElements = elements.map(el => {
      if (!selectedElement || el.id !== selectedElement.id) return el;
      if (el.type === 'text') return { ...el, textColor: value };
      if (el.type === 'sticky' || el.type === 'shape') return { ...el, backgroundColor: value };
      if (['line', 'arrow', 'freehand'].includes(el.type)) return { ...el, strokeColor: value };
      return el;
    });
    setElements(newElements);
    recordHistory(newElements);
    
    // Emit element update to other users
    if (realtimeCollab && realtimeCollab.isConnected && selectedElement) {
      const updatedElement = newElements.find(el => el.id === selectedElement.id);
      if (updatedElement) {
        realtimeCollab.broadcastElementUpdate(updatedElement.id, updatedElement);
      }
    }
  }, [elements, setElements, selectedElement, recordHistory, realtimeCollab]);

  // Event handlers - these would need full implementation
  // Note: These are now provided by the useCanvasInteractions hook above

  // Close panels when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showColorPicker && !e.target.closest('.color-picker-panel')) {
        setShowColorPicker(false);
      }
      if (showStrokePanel && !e.target.closest('.stroke-panel')) {
        setShowStrokePanel(false);
      }
      if (contextMenu.visible) {
        setContextMenu({ visible: false, x: 0, y: 0, elementId: null });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColorPicker, showStrokePanel, contextMenu.visible, setShowColorPicker, setShowStrokePanel, setContextMenu]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case 'y':
            e.preventDefault();
            redo();
            break;
          default:
            break;
        }
      }

      // Delete selected element
      if (e.key === 'Delete' && selectedElement) {
        deleteElement(selectedElement.id);
      }

      // Tool shortcuts
      if (!e.ctrlKey && !e.metaKey) {
        switch (e.key) {
          case 'v':
            setActiveTool('select');
            break;
          case 'r':
            setActiveTool('shape');
            break;
          case 't':
            setActiveTool('text');
            break;
          case 's':
            setActiveTool('sticky');
            break;
          case 'l':
            setActiveTool('line');
            break;
          case 'a':
            setActiveTool('arrow');
            break;
          case 'd':
            setActiveTool('freehand');
            break;
          default:
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, selectedElement, deleteElement, setActiveTool]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Canvas Toolbar */}
      <CanvasToolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        selectedElement={selectedElement}
        showColorPicker={showColorPicker}
        setShowColorPicker={setShowColorPicker}
        showStrokePanel={showStrokePanel}
        setShowStrokePanel={setShowStrokePanel}
        strokeColor={strokeColor}
        setStrokeColor={setStrokeColor}
        strokeWidth={strokeWidth}
        setStrokeWidth={setStrokeWidth}
        colorInputRef={colorInputRef}
        onAddElement={addElement}
        onDeleteElement={deleteElement}
        onDuplicateElement={duplicateElement}
        onUndo={undo}
        onRedo={redo}
        onApplyColor={applyColor}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        canEdit={canEdit}
      />

      {/* Canvas Viewport */}
      <CanvasViewport
        scrollRef={scrollRef}
        surfaceRef={surfaceRef}
        scale={scale}
        elements={elements}
        selectedElement={selectedElement}
        activeTool={activeTool}
        contextMenu={contextMenu}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
      />

      {/* Zoom Controls */}
      <CanvasZoomControls
        scale={scale}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetZoom={resetZoom}
        onFitToView={fitToView}
      />

      {/* Collaboration Status */}
      {realtimeCollab && (
        <div className="absolute top-4 right-4 z-40">
          <div className={`px-3 py-1 rounded-full text-sm ${
            realtimeCollab.isConnected 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {realtimeCollab.isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      )}
    </div>
  );
};

export default CanvasPage;
