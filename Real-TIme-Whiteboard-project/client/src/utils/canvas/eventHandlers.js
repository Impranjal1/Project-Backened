import { findElementAtPosition, getResizeCorner, createNewElement } from './elementUtils';

/**
 * Canvas event handlers for mouse and touch interactions
 */

export const createCanvasEventHandlers = ({
  elements,
  setElements,
  activeTool,
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
  strokeColor,
  strokeWidth,
  scrollRef,
  scale,
  recordHistory,
  broadcastCanvasUpdate,
  broadcastCursorMove,
  broadcastToolChange,
  broadcastDrawingStart,
  broadcastDrawingEnd,
}) => {

  let lastClickTime = 0;
  let lastClickElement = null;

  const getCanvasCoordinates = (clientX, clientY) => {
    const rect = scrollRef.current?.getBoundingClientRect();
    if (!rect) return { x: clientX, y: clientY };
    
    const scrollLeft = scrollRef.current?.scrollLeft || 0;
    const scrollTop = scrollRef.current?.scrollTop || 0;
    
    // Account for the canvas surface position and scale
    const canvasX = (clientX - rect.left + scrollLeft) / scale;
    const canvasY = (clientY - rect.top + scrollTop) / scale;
    
    return { x: canvasX, y: canvasY };
  };

  const handleMouseDown = (e) => {
    if (e.button === 2) {
      // Right-click - show context menu (avoid preventDefault to silence passive warning)
      const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
      const element = findElementAtPosition(elements, x, y);
      
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        elementId: element?.id || null
      });
      return;
    }
    
    if (e.button !== 0) return; // Only handle left mouse button
    
  // Avoid preventDefault here to prevent passive listener warnings
    
    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
    
    // Broadcast cursor position
    if (broadcastCursorMove) {
      broadcastCursorMove(x, y);
    }

    setContextMenu({ visible: false, x: 0, y: 0, elementId: null });

  if (activeTool === 'select') {
      const element = findElementAtPosition(elements, x, y);
      
      if (element) {
        // Check for double-click to start editing
        const currentTime = Date.now();
        if (lastClickElement === element.id && currentTime - lastClickTime < 300) {
          // Double-click detected - start editing text/sticky elements
          if (element.type === 'text' || element.type === 'sticky') {
            setElements(prev => prev.map(el =>
              el.id === element.id ? { ...el, isEditing: true } : el
            ));
            setSelectedElement({ ...element, isEditing: true });
            return;
          }
        }
        lastClickTime = currentTime;
        lastClickElement = element.id;
        
        // Check if clicking on resize corner
        if (selectedElement?.id === element.id) {
          const corner = getResizeCorner(element, x, y);
          if (corner) {
            setIsResizing(true);
            setResizeCorner(corner);
            return;
          }
        }
        
        // Start dragging
        setSelectedElement(element);
        setIsDragging(true);
        setDragOffset({
          x: x - element.x,
          y: y - element.y
        });
      } else {
        setSelectedElement(null);
        lastClickElement = null;
      }
  } else if (activeTool === 'line' || activeTool === 'arrow') {
      // Start drawing line/arrow
  const newElement = createNewElement(activeTool, {
        x: x,
        y: y,
        strokeColor,
        strokeWidth
      });
      newElement.x2 = x;
      newElement.y2 = y;
      setElements(prev => [...prev, newElement]);
      setDrawingTempId(newElement.id);      if (broadcastDrawingStart) {
        broadcastDrawingStart(activeTool, { x, y, strokeColor, strokeWidth });
      }
  } else if (activeTool === 'text' || activeTool === 'sticky' || activeTool === 'shape') {
      // Create basic element on click (missing previously)
      const base = createNewElement(activeTool, { x, y, strokeColor, strokeWidth });
      // Immediately enter editing mode for text & sticky notes
      if (activeTool === 'text' || activeTool === 'sticky') {
        base.isEditing = true;
      }
  const newElements = [...elements, base];
  setElements(prev => [...prev, base]);
      setSelectedElement(base);
      recordHistory(newElements);
      if (broadcastCanvasUpdate) {
        broadcastCanvasUpdate(newElements);
      }
      return; // Stop further processing for this click
    } else if (activeTool === 'freehand') {
      // Start freehand drawing
  const newElement = createNewElement('freehand', {
        x: x,
        y: y,
        strokeColor,
        strokeWidth
      });
      newElement.points = [{ x, y }];
      newElement.path = `M${x},${y}`;  // Initialize path data
      setElements(prev => [...prev, newElement]);
      setDrawingTempId(newElement.id);      if (broadcastDrawingStart) {
        broadcastDrawingStart('freehand', { x, y, strokeColor, strokeWidth });
      }
    } else if (activeTool === 'eraser') {
      // Eraser tool
      const elementToDelete = findElementAtPosition(elements, x, y);
      if (elementToDelete) {
        const newElements = elements.filter(el => el.id !== elementToDelete.id);
        setElements(newElements);
        recordHistory(newElements);
        
        if (broadcastCanvasUpdate) {
          broadcastCanvasUpdate(newElements);
        }
      }
    }
  };

  // Throttle mouse move events for better performance with requestAnimationFrame
  let lastMoveTime = 0;
  let animationFrameId = null;
  const throttleDelay = 16; // ~60fps

  const handleMouseMove = (e) => {
  if (!isDragging && !isResizing && !drawingTempId) return; // Skip heavy work when idle
  // Debug minimal log (throttled by early returns above)
  // console.debug('[CanvasMouseMove]', { activeTool, isDragging, isResizing, drawingTempId });
    const currentTime = Date.now();
    
    // Cancel previous animation frame if pending
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }

    // For drag operations, use requestAnimationFrame for smooth updates
    if (isDragging || isResizing || drawingTempId) {
  // Avoid preventDefault to silence passive warnings
      
      animationFrameId = requestAnimationFrame(() => {
        const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
        
        if (isDragging && selectedElement) {
          // Functional update to avoid stale elements snapshot
          setElements(prev => prev.map(el => 
            el.id === selectedElement.id 
              ? { ...el, x: x - dragOffset.x, y: y - dragOffset.y }
              : el
          ));
        } else if (isResizing && selectedElement) {
          setElements(prev => prev.map(el => {
            if (el.id === selectedElement.id) {
              const updates = { ...el };
              switch (resizeCorner) {
                case 'nw':
                  updates.width = Math.max(20, updates.width + (updates.x - x));
                  updates.height = Math.max(20, updates.height + (updates.y - y));
                  updates.x = x; updates.y = y; break;
                case 'ne':
                  updates.width = Math.max(20, x - updates.x);
                  updates.height = Math.max(20, updates.height + (updates.y - y));
                  updates.y = y; break;
                case 'sw':
                  updates.width = Math.max(20, updates.width + (updates.x - x));
                  updates.height = Math.max(20, y - updates.y);
                  updates.x = x; break;
                case 'se':
                  updates.width = Math.max(20, x - updates.x);
                  updates.height = Math.max(20, y - updates.y); break;
                default: break;
              }
              return updates;
            }
            return el;
          }));
        } else if (drawingTempId) {
          if (activeTool === 'line' || activeTool === 'arrow') {
            setElements(prev => prev.map(el => el.id === drawingTempId ? { ...el, x2: x, y2: y } : el));
          } else if (activeTool === 'freehand') {
            setElements(prev => prev.map(el => {
              if (el.id !== drawingTempId) return el;
              const currentPoints = el.points || [];
              const lastPoint = currentPoints[currentPoints.length - 1];
              const threshold = 3;
              if (lastPoint && Math.abs(x - lastPoint.x) <= threshold && Math.abs(y - lastPoint.y) <= threshold) {
                return el; // skip tiny move
              }
              const newPoints = [...currentPoints, { x, y }];
              let pathData = '';
              if (newPoints.length === 1) {
                pathData = `M${newPoints[0].x},${newPoints[0].y}`;
              } else if (newPoints.length === 2) {
                pathData = `M${newPoints[0].x},${newPoints[0].y} L${newPoints[1].x},${newPoints[1].y}`;
              } else {
                pathData = `M${newPoints[0].x},${newPoints[0].y}`;
                for (let i = 1; i < newPoints.length - 1; i++) {
                  const curr = newPoints[i];
                  const next = newPoints[i + 1];
                  const cx = (curr.x + next.x) / 2;
                  const cy = (curr.y + next.y) / 2;
                  pathData += ` Q${curr.x},${curr.y} ${cx},${cy}`;
                }
                const lastIdx = newPoints.length - 1;
                pathData += ` L${newPoints[lastIdx].x},${newPoints[lastIdx].y}`;
              }
              return { ...el, points: newPoints, path: pathData };
            }));
          }
        }
      });
    } else {
      // For non-drag operations, use regular throttling
      if (currentTime - lastMoveTime < throttleDelay) {
        return; // Skip non-essential updates
      }
      lastMoveTime = currentTime;
      
      const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
      
      // Broadcast cursor movement (throttled)
      if (broadcastCursorMove && currentTime - lastMoveTime > 100) {
        broadcastCursorMove(x, y);
      }
    }
  };

  const handleMouseUp = (e) => {
    if (isDragging || isResizing) {
      recordHistory(elements);
      
      if (broadcastCanvasUpdate) {
        broadcastCanvasUpdate(elements);
      }
    } else if (drawingTempId) {
      recordHistory(elements);
      
      if (broadcastDrawingEnd) {
        broadcastDrawingEnd();
      }
      if (broadcastCanvasUpdate) {
        broadcastCanvasUpdate(elements);
      }
    }

    setIsDragging(false);
    setIsResizing(false);
    setResizeCorner(null);
    setDrawingTempId(null);
  };

  const handleDoubleClick = (element) => {
    if (element.type === 'text' || element.type === 'sticky') {
      const newElements = elements.map(el =>
        el.id === element.id ? { ...el, isEditing: true } : el
      );
      setElements(newElements);
    }
  };

  const handleTextChange = (element, newText) => {
    const newElements = elements.map(el =>
      el.id === element.id ? { ...el, text: newText } : el
    );
    setElements(newElements);
  };

  const handleTextBlur = (element) => {
    const newElements = elements.map(el =>
      el.id === element.id ? { ...el, isEditing: false } : el
    );
    setElements(newElements);
    recordHistory(newElements);
    
    if (broadcastCanvasUpdate) {
      broadcastCanvasUpdate(newElements);
    }
  };

  const handleContextMenu = (e, element) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      elementId: element.id
    });
  };

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDoubleClick,
    handleTextChange,
    handleTextBlur,
    handleContextMenu,
    getCanvasCoordinates
  };
};
