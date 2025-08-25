import { useCallback } from 'react';

export const useCanvasInteractions = ({
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
}) => {
  // Utility functions
  const getMousePosition = useCallback((e) => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale
    };
  }, [scale, surfaceRef]);

  const isPointInElement = useCallback((x, y, element) => {
    if (element.type === 'line' || element.type === 'arrow') {
      // Check if point is near the line
      const dist = pointToLineDistance(x, y, element.x, element.y, element.x2 || element.x, element.y2 || element.y);
      return dist < 10;
    } else if (element.type === 'freehand') {
      // Check if point is near any part of the freehand path
      if (!element.points || element.points.length === 0) return false;
      return element.points.some(point => {
        const dist = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
        return dist < 10;
      });
    } else {
      // Standard rectangular bounds check
      return x >= element.x && x <= element.x + element.width &&
             y >= element.y && y <= element.y + element.height;
    }
  }, []);

  const pointToLineDistance = useCallback((px, py, x1, y1, x2, y2) => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const getElementAt = useCallback((x, y) => {
    // Check from top to bottom (reverse order)
    for (let i = elements.length - 1; i >= 0; i--) {
      const element = elements[i];
      if (isPointInElement(x, y, element)) {
        return element;
      }
    }
    return null;
  }, [elements, isPointInElement]);

  const getResizeCorner = useCallback((x, y, element) => {
    const margin = 8 / scale;
    const corners = [
      { name: 'nw', x: element.x, y: element.y },
      { name: 'ne', x: element.x + element.width, y: element.y },
      { name: 'sw', x: element.x, y: element.y + element.height },
      { name: 'se', x: element.x + element.width, y: element.y + element.height }
    ];

    for (const corner of corners) {
      if (Math.abs(x - corner.x) < margin && Math.abs(y - corner.y) < margin) {
        return corner.name;
      }
    }
    return null;
  }, [scale]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return; // Only handle left mouse button

    const pos = getMousePosition(e);
    const elementAt = getElementAt(pos.x, pos.y);

    // Close context menu if open
    if (contextMenu.visible) {
      setContextMenu({ visible: false, x: 0, y: 0, elementId: null });
      return;
    }

    if (activeTool === 'select') {
      if (elementAt) {
        // Check for resize handles if element is selected
        if (selectedElement && selectedElement.id === elementAt.id) {
          const corner = getResizeCorner(pos.x, pos.y, elementAt);
          if (corner) {
            setIsResizing(true);
            setResizeCorner(corner);
            return;
          }
        }

        // Start dragging
        setSelectedElement(elementAt);
        setIsDragging(true);
        setDragOffset({
          x: pos.x - elementAt.x,
          y: pos.y - elementAt.y
        });
      } else {
        // Deselect if clicking on empty space
        setSelectedElement(null);
      }
    } else if (activeTool === 'line' || activeTool === 'arrow') {
      // Start drawing line/arrow
      const tempId = Date.now();
      const newElement = {
        id: tempId,
        type: activeTool,
        x: pos.x,
        y: pos.y,
        x2: pos.x,
        y2: pos.y,
        strokeColor,
        strokeWidth,
      };
      setElements(prev => [...prev, newElement]);
      setDrawingTempId(tempId);
    } else if (activeTool === 'freehand') {
      // Start freehand drawing
      const tempId = Date.now();
      const newElement = {
        id: tempId,
        type: 'freehand',
        points: [pos],
        strokeColor,
        strokeWidth,
      };
      setElements(prev => [...prev, newElement]);
      setDrawingTempId(tempId);
    }
  }, [
    activeTool, getMousePosition, getElementAt, contextMenu.visible, selectedElement,
    getResizeCorner, strokeColor, strokeWidth, setContextMenu, setSelectedElement,
    setIsDragging, setDragOffset, setIsResizing, setResizeCorner, setElements, setDrawingTempId
  ]);

  const handleMouseMove = useCallback((e) => {
    const pos = getMousePosition(e);

    if (isDragging && selectedElement) {
      // Update element position
      const newX = pos.x - dragOffset.x;
      const newY = pos.y - dragOffset.y;

      setElements(prev => prev.map(el =>
        el.id === selectedElement.id
          ? { ...el, x: newX, y: newY }
          : el
      ));

      // Emit update to other users
      if (realtimeCollab && realtimeCollab.isConnected) {
        realtimeCollab.broadcastElementUpdate(selectedElement.id, { x: newX, y: newY });
      }
    } else if (isResizing && selectedElement) {
      // Update element size
      let updates = {};
      setElements(prev => prev.map(el => {
        if (el.id !== selectedElement.id) return el;

        switch (resizeCorner) {
          case 'nw':
            updates = {
              x: pos.x,
              y: pos.y,
              width: el.width + (el.x - pos.x),
              height: el.height + (el.y - pos.y)
            };
            break;
          case 'ne':
            updates = {
              y: pos.y,
              width: pos.x - el.x,
              height: el.height + (el.y - pos.y)
            };
            break;
          case 'sw':
            updates = {
              x: pos.x,
              width: el.width + (el.x - pos.x),
              height: pos.y - el.y
            };
            break;
          case 'se':
            updates = {
              width: pos.x - el.x,
              height: pos.y - el.y
            };
            break;
          default:
            break;
        }
        return { ...el, ...updates };
      }));

      // Emit update to other users
      if (realtimeCollab && realtimeCollab.isConnected && updates) {
        realtimeCollab.broadcastElementUpdate(selectedElement.id, updates);
      }
    } else if (drawingTempId) {
      // Update drawing
      setElements(prev => prev.map(el => {
        if (el.id !== drawingTempId) return el;

        if (el.type === 'line' || el.type === 'arrow') {
          return { ...el, x2: pos.x, y2: pos.y };
        } else if (el.type === 'freehand') {
          return { ...el, points: [...el.points, pos] };
        }
        return el;
      }));
    }
  }, [
    getMousePosition, isDragging, selectedElement, dragOffset, isResizing, resizeCorner,
    drawingTempId, setElements, realtimeCollab
  ]);

  const handleMouseUp = useCallback(() => {
    if (isDragging || isResizing) {
      recordHistory(elements);
    }

    if (drawingTempId) {
      recordHistory(elements);
      
      // Emit creation to other users
      if (realtimeCollab && realtimeCollab.isConnected) {
        const element = elements.find(el => el.id === drawingTempId);
        if (element) {
          realtimeCollab.broadcastElementCreate(element);
        }
      }
    }

    setIsDragging(false);
    setIsResizing(false);
    setResizeCorner(null);
    setDrawingTempId(null);
  }, [
    isDragging, isResizing, drawingTempId, elements, recordHistory, realtimeCollab,
    setIsDragging, setIsResizing, setResizeCorner, setDrawingTempId
  ]);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    const pos = getMousePosition(e);
    const elementAt = getElementAt(pos.x, pos.y);

    if (elementAt) {
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        elementId: elementAt.id
      });
    }
  }, [getMousePosition, getElementAt, setContextMenu]);

  // Wheel event for zooming
  const handleWheel = useCallback((e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY;
      const zoomFactor = delta > 0 ? 0.9 : 1.1;
      setScale(prev => Math.min(Math.max(prev * zoomFactor, 0.1), 3));
    }
  }, [setScale]);

  // Touch event handlers for mobile support
  const handleTouchStart = useCallback((e) => {
    const touches = Array.from(e.touches);
    
    // Update pointers map
    touches.forEach(touch => {
      pointersRef.current.set(touch.identifier, {
        x: touch.clientX,
        y: touch.clientY,
        timestamp: Date.now()
      });
    });

    if (touches.length === 1) {
      // Single touch - treat as mouse down
      const touch = touches[0];
      const mouseEvent = {
        button: 0,
        clientX: touch.clientX,
        clientY: touch.clientY
      };
      handleMouseDown(mouseEvent);
    } else if (touches.length === 2) {
      // Two finger pinch/zoom
      const [touch1, touch2] = touches;
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      pinchInitialDistRef.current = distance;
      pinchInitialScaleRef.current = scale;
      pinchCenterRef.current = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      };
    }
  }, [pointersRef, handleMouseDown, scale, pinchInitialDistRef, pinchInitialScaleRef, pinchCenterRef]);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    const touches = Array.from(e.touches);

    if (touches.length === 1) {
      // Single touch - treat as mouse move
      const touch = touches[0];
      const mouseEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY
      };
      handleMouseMove(mouseEvent);
    } else if (touches.length === 2) {
      // Two finger pinch/zoom
      const [touch1, touch2] = touches;
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      if (pinchInitialDistRef.current > 0) {
        const scaleChange = distance / pinchInitialDistRef.current;
        const newScale = pinchInitialScaleRef.current * scaleChange;
        setScale(Math.min(Math.max(newScale, 0.1), 3));
      }
    }
  }, [handleMouseMove, pinchInitialDistRef, pinchInitialScaleRef, setScale]);

  const handleTouchEnd = useCallback((e) => {
    const touches = Array.from(e.touches);
    
    // Remove ended touches from pointers map
    const activeTouchIds = new Set(touches.map(t => t.identifier));
    for (const [id] of pointersRef.current) {
      if (!activeTouchIds.has(id)) {
        pointersRef.current.delete(id);
      }
    }

    if (touches.length === 0) {
      handleMouseUp();
      pinchInitialDistRef.current = 0;
    }
  }, [pointersRef, handleMouseUp, pinchInitialDistRef]);

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleContextMenu,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    getMousePosition,
    getElementAt,
    isPointInElement,
  };
};
