/**
 * CanvasPageFixed.jsx - Collaborative Whiteboard Component
 * 
 * A comprehensive React component providing a full-featured collaborative whiteboard
 * with real-time editing, drawing tools, and team collaboration features.
 * 
 * REFACTORED STRUCTURE:
 * =====================
 * - Organized state into logical groups (routing, board, canvas, interaction, UI, etc.)
 * - Extracted helper functions for complex mouse operations (resize, drag, drawing)
 * - Separated rendering logic with renderElement helper
 * - Maintained all original functionality and CSS styling
 * - Internal refactoring only - no external API changes
 * 
 * KEY FEATURES:
 * =============
 * - Real-time collaboration with Socket.IO
 * - Multiple drawing tools (text, shapes, lines, arrows, freehand)
 * - Zoom and pan functionality with touch gesture support
 * - Undo/redo history management
 * - Export to PNG/PDF
 * - Element context menus and resize handles
 * - Board sharing with permission controls
 * - Cross-platform compatibility (desktop + mobile)
 * 
 * TECHNICAL STACK:
 * ================
 * - React with hooks (useState, useRef, useEffect, useCallback)
 * - Real-time collaboration via custom hooks
 * - Tailwind CSS for styling
 * - Lucide React for icons
 * - Dynamic imports for html2canvas & jsPDF
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Text, MousePointer2, Square, StickyNote, Pen, Eraser, Minus, Undo2, Redo2, ArrowRight, ZoomIn, ZoomOut, Camera, Palette } from 'lucide-react';

// Hooks for collaboration
import { useRealtimeCollaboration } from '../hooks/useRealtimeCollaboration';
import { useAuth } from '../contexts/AuthContext';

// Components
import ShareModal from '../components/ShareModal';
import ActiveUsersModal from '../components/ActiveUsersModal';

// Import assets
import dashboardIcon from '../assets/bgimage.png';

// NOTE: html2canvas & jsPDF dynamically imported when exporting to keep bundle lean

const CanvasPage = () => {
  // ========================== ROUTING & AUTH ==========================
  const location = useLocation();
  const navigate = useNavigate();
  const { token, boardId } = useParams(); // Get both share token and board ID from URL
  const { user } = useAuth();
  
  // ========================== BOARD STATE ==========================
  const [board, setBoard] = useState(location.state?.board || null);
  const [isSharedAccess, setIsSharedAccess] = useState(!!token);
  const [sharePermissions, setSharePermissions] = useState('view');

  // ========================== CANVAS ELEMENTS & TOOLS ==========================
  const [elements, setElements] = useState([]);
  const [activeTool, setActiveTool] = useState('select');
  const [selectedElement, setSelectedElement] = useState(null);
  
  // ========================== INTERACTION STATE ==========================
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeCorner, setResizeCorner] = useState(null); // 'nw','ne','sw','se'
  const [drawingTempId, setDrawingTempId] = useState(null); // for line/arrow/pen while drawing
  
  // ========================== UI STATE ==========================
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, elementId: null });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showStrokePanel, setShowStrokePanel] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showActiveUsersModal, setShowActiveUsersModal] = useState(false);
  
  // ========================== DRAWING PROPERTIES ==========================
  const [strokeColor, setStrokeColor] = useState('#111827');
  const [strokeWidth, setStrokeWidth] = useState(3);
  
  // ========================== ZOOM & PAN STATE ==========================
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  
  // ========================== HISTORY STATE ==========================
  const [history, setHistory] = useState([]); // array of element arrays
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // ========================== REFS ==========================
  // UI refs
  const colorInputRef = useRef(null);
  const scrollRef = useRef(null);
  const surfaceRef = useRef(null);
  
  // Pan and zoom refs
  const panOrigin = useRef({ x: 0, y: 0 });
  const scrollOrigin = useRef({ x: 0, y: 0 });
  
  // Touch / gesture refs
  const pointersRef = useRef(new Map()); // id -> {x,y}
  const pinchInitialDistRef = useRef(0);
  const pinchInitialScaleRef = useRef(1);
  const pinchCenterRef = useRef({x:0,y:0});
  const singleTouchPanRef = useRef(null); // {x,y,scrollLeft,scrollTop}
  
  // ========================== COMPUTED VALUES ==========================
  // Check if user can edit (not view-only)
  const canEdit = !isSharedAccess || sharePermissions !== 'view';
  
  // Initialize realtime collaboration
  const realtimeCollab = useRealtimeCollaboration(board?._id);
  
  // ========================== BOARD LOADING FUNCTIONS ==========================
  const loadBoardById = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/boards/${boardId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setBoard(data.board);
        setIsSharedAccess(false);
        setSharePermissions('edit'); // Full access for owned/collaborative boards
      } else {
        console.error('Failed to load board');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error loading board:', error);
      navigate('/dashboard');
    }
  };

  const loadSharedBoard = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/boards/access/${token}`, {
        headers: user ? {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        } : {}
      });
      
      if (response.ok) {
        const data = await response.json();
        setBoard(data.board);
        setSharePermissions(data.permissions);
        setIsSharedAccess(true);
      } else {
        console.error('Failed to access shared board');
        navigate('/login');
      }
    } catch (error) {
      console.error('Error accessing shared board:', error);
      navigate('/login');
    }
  };

  // ========================== EFFECTS ==========================
  // Load board via share token if accessing via share link
  useEffect(() => {
    if (token && !board) {
      loadSharedBoard();
    } else if (boardId && !board) {
      loadBoardById();
    }
  }, [token, boardId, board]);

  // Log collaboration status for debugging
  useEffect(() => {
    console.log('🔌 Socket.IO Status:', {
      isConnected: realtimeCollab?.isConnected,
      connectedUsers: realtimeCollab?.connectedUsers?.length || 0,
      hasSocket: !!realtimeCollab?.socketService,
      boardId: board?._id
    });
  }, [realtimeCollab?.isConnected, realtimeCollab?.connectedUsers, board?._id]);

  // Center viewport on mount to middle of large surface
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      // Delay to allow layout
      requestAnimationFrame(() => {
        el.scrollTo({
          left: (5000 - el.clientWidth) / 2,
          top: (5000 - el.clientHeight) / 2,
          behavior: 'instant'
        });
      });
    }
  }, []);

  // Set up real-time collaboration event listeners
  useEffect(() => {
    if (!realtimeCollab || !realtimeCollab.isConnected) return;

    const handleElementCreate = (element) => {
      setElements(prev => {
        const exists = prev.find(el => el.id === element.id);
        if (exists) return prev;
        const newElements = [...prev, element];
        recordHistory(newElements);
        return newElements;
      });
    };

    const handleElementUpdate = (updatedElement) => {
      setElements(prev => {
        const newElements = prev.map(el => 
          el.id === updatedElement.id ? { ...el, ...updatedElement } : el
        );
        recordHistory(newElements);
        return newElements;
      });
    };

    const handleElementDelete = (elementId) => {
      setElements(prev => {
        const newElements = prev.filter(el => el.id !== elementId);
        recordHistory(newElements);
        return newElements;
      });
    };

    // Subscribe to collaboration events
    realtimeCollab.onElementCreate(handleElementCreate);
    realtimeCollab.onElementUpdate(handleElementUpdate);
    realtimeCollab.onElementDelete(handleElementDelete);

    return () => {
      // Cleanup listeners
      realtimeCollab.offElementCreate(handleElementCreate);
      realtimeCollab.offElementUpdate(handleElementUpdate);
      realtimeCollab.offElementDelete(handleElementDelete);
    };
  }, [realtimeCollab?.isConnected]);

  const addElement = (type) => {
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
  };

  // ========================== ZOOM & PAN FUNCTIONS ==========================
  const applyZoom = (delta, centerX, centerY) => {
    const sc = scrollRef.current;
    if (!sc) return;
    setScale(prev => {
      const next = Math.min(3, Math.max(0.25, +(prev * delta).toFixed(3)));
      if (centerX !== undefined && centerY !== undefined) {
        // logical point before zoom
        const logicalX = (sc.scrollLeft + centerX) / prev;
        const logicalY = (sc.scrollTop + centerY) / prev;
        requestAnimationFrame(() => {
          sc.scrollLeft = logicalX * next - centerX;
          sc.scrollTop = logicalY * next - centerY;
        });
      }
      return next;
    });
  };
  const zoomIn = () => applyZoom(1.2, scrollRef.current?.clientWidth/2, scrollRef.current?.clientHeight/2);
  const zoomOut = () => applyZoom(1/1.2, scrollRef.current?.clientWidth/2, scrollRef.current?.clientHeight/2);

  const handleWheel = (e) => {
    // Many trackpads send ctrlKey true for pinch; treat that as zoom
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const sc = scrollRef.current;
      const rect = sc.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      applyZoom(e.deltaY < 0 ? 1.1 : 0.9, cx, cy);
    }
  };

  const startPan = (e) => {
    if (activeTool !== 'select' || selectedElement) return; // only empty space
    if (e.button !== 1 && !(e.button === 0 && e.altKey)) return; // middle mouse or Alt+Left
    e.preventDefault();
    setIsPanning(true);
    panOrigin.current = { x: e.clientX, y: e.clientY };
    const sc = scrollRef.current;
    scrollOrigin.current = { x: sc.scrollLeft, y: sc.scrollTop };
  };

  const panMove = (e) => {
    if (!isPanning) return;
    const sc = scrollRef.current;
    sc.scrollLeft = scrollOrigin.current.x - (e.clientX - panOrigin.current.x);
    sc.scrollTop = scrollOrigin.current.y - (e.clientY - panOrigin.current.y);
  };

  const stopPan = () => setIsPanning(false);

  // ========================== TOUCH & GESTURE HANDLERS ==========================
  // Pointer helpers for touch gestures
  const handlePointerDown = (e) => {
    const sc = scrollRef.current;
    if (!sc) return;
    if (e.pointerType === 'touch') {
      pointersRef.current.set(e.pointerId, {x:e.clientX, y:e.clientY});
      if (pointersRef.current.size === 1) {
        // single finger start pan
        singleTouchPanRef.current = { x: e.clientX, y: e.clientY, scrollLeft: sc.scrollLeft, scrollTop: sc.scrollTop };
      } else if (pointersRef.current.size === 2) {
        // pinch start
        const vals = Array.from(pointersRef.current.values());
        const dx = vals[0].x - vals[1].x;
        const dy = vals[0].y - vals[1].y;
        pinchInitialDistRef.current = Math.hypot(dx, dy);
        pinchInitialScaleRef.current = scale;
        pinchCenterRef.current = { x: (vals[0].x + vals[1].x)/2 - sc.getBoundingClientRect().left, y: (vals[0].y + vals[1].y)/2 - sc.getBoundingClientRect().top };
      }
    }
  };

  const handlePointerMove = (e) => {
    const sc = scrollRef.current;
    if (!sc) return;
    if (e.pointerType === 'touch') {
      if (pointersRef.current.has(e.pointerId)) {
        pointersRef.current.set(e.pointerId, {x:e.clientX, y:e.clientY});
      }
      if (pointersRef.current.size === 1 && singleTouchPanRef.current) {
        const start = singleTouchPanRef.current;
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        sc.scrollLeft = start.scrollLeft - dx;
        sc.scrollTop = start.scrollTop - dy;
      } else if (pointersRef.current.size === 2) {
        const vals = Array.from(pointersRef.current.values());
        const dx = vals[0].x - vals[1].x;
        const dy = vals[0].y - vals[1].y;
        const dist = Math.hypot(dx, dy);
        if (pinchInitialDistRef.current > 0) {
          const factor = dist / pinchInitialDistRef.current;
          const target = pinchInitialScaleRef.current * factor;
          applyZoom(target / scale, pinchCenterRef.current.x, pinchCenterRef.current.y);
        }
      }
    }
  };

  const handlePointerUp = (e) => {
    if (e.pointerType === 'touch') {
      pointersRef.current.delete(e.pointerId);
      if (pointersRef.current.size < 2) {
        pinchInitialDistRef.current = 0;
      }
      if (pointersRef.current.size === 0) {
        singleTouchPanRef.current = null;
      }
    }
  };

  // Persist in localStorage by board id
  useEffect(() => {
    if (!board) return;
    const key = `board-elements-${board.title}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try { const parsed = JSON.parse(saved); setElements(parsed); } catch {}
    }
  }, [board]);

  useEffect(() => {
    if (!board) return;
    const key = `board-elements-${board.title}`;
    localStorage.setItem(key, JSON.stringify(elements));
  }, [elements, board]);

  // ========================== EXPORT FUNCTIONS ==========================
  const exportAsImage = async () => {
    if (!surfaceRef.current) return;
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(surfaceRef.current, { scale: 1 });
    const link = document.createElement('a');
    link.download = `${board?.title || 'board'}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const exportAsPDF = async () => {
    if (!surfaceRef.current) return;
    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');
    const canvas = await html2canvas(surfaceRef.current, { scale: 1 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width, canvas.height] });
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(`${board?.title || 'board'}.pdf`);
  };

  // ========================== HISTORY FUNCTIONS ==========================
  const recordHistory = (els) => {
    setHistory(prev => {
      const trimmed = prev.slice(0, historyIndex + 1);
      const next = [...trimmed, JSON.parse(JSON.stringify(els))];
      // limit size
      if (next.length > 50) next.shift();
      return next;
    });
    setHistoryIndex(idx => Math.min(idx + 1, 49));
  };

  const undo = () => {
    setHistoryIndex(idx => {
      if (idx <= 0) return 0;
      const newIdx = idx - 1;
      setElements(JSON.parse(JSON.stringify(history[newIdx])));
      return newIdx;
    });
  };
  const redo = () => {
    setHistoryIndex(idx => {
      if (idx >= history.length - 1) return idx;
      const newIdx = idx + 1;
      setElements(JSON.parse(JSON.stringify(history[newIdx])));
      return newIdx;
    });
  };

  // ========================== ELEMENT MANAGEMENT FUNCTIONS ==========================
  // Helper functions for mouse move behavior
  const handleElementResize = (e, surfaceRect) => {
    if (!isResizing || !selectedElement) return false;
    
    e.preventDefault();
    const newX = (e.clientX - surfaceRect.left) / scale;
    const newY = (e.clientY - surfaceRect.top) / scale;
    
    setElements(prev => prev.map(el => {
      if (el.id !== selectedElement.id) return el;
      let { x, y, width, height } = el;
      
      if (resizeCorner.includes('e')) {
        width = Math.max(40 / scale, newX - x);
      }
      if (resizeCorner.includes('s')) {
        height = Math.max(40 / scale, newY - y);
      }
      if (resizeCorner.includes('w')) {
        const diff = newX - x;
        width = Math.max(40 / scale, width - diff);
        x = x + diff;
      }
      if (resizeCorner.includes('n')) {
        const diff = newY - y;
        height = Math.max(40 / scale, height - diff);
        y = y + diff;
      }
      
      return { ...el, x, y, width, height };
    }));
    return true;
  };

  const handleLineDrawing = (e, surfaceRect) => {
    if (!drawingTempId || !['line', 'arrow'].includes(activeTool)) return false;
    
    setElements(prev => prev.map(el => {
      if (el.id !== drawingTempId) return el;
      const nx2 = (e.clientX - surfaceRect.left) / scale;
      const ny2 = (e.clientY - surfaceRect.top) / scale;
      return { ...el, x2: nx2, y2: ny2, width: Math.abs(nx2 - el.x) || 1, height: Math.abs(ny2 - el.y) || 1 };
    }));
    return true;
  };

  const handlePenDrawing = (e, surfaceRect) => {
    if (!drawingTempId || activeTool !== 'pen') return false;
    
    setElements(prev => prev.map(el => {
      if (el.id !== drawingTempId) return el;
      const px = (e.clientX - surfaceRect.left) / scale;
      const py = (e.clientY - surfaceRect.top) / scale;
      
      // Add point only if it's far enough from the last point to avoid too many points
      const lastPoint = el.points[el.points.length - 1];
      const distance = Math.hypot(px - lastPoint.x, py - lastPoint.y);
      if (distance < 2) return el; // Skip if too close to last point
      
      const newPoints = [...el.points, { x: px, y: py }];
      // compute bounding box
      const xs = newPoints.map(p => p.x);
      const ys = newPoints.map(p => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);
      return { ...el, points: newPoints, x: minX, y: minY, width: (maxX - minX) || 1, height: (maxY - minY) || 1 };
    }));
    return true;
  };

  const handleElementDrag = (e, surfaceRect) => {
    if (activeTool !== 'select' || !isDragging || !selectedElement) return false;
    
    const newX = (e.clientX - surfaceRect.left) / scale - dragOffset.x;
    const newY = (e.clientY - surfaceRect.top) / scale - dragOffset.y;
    const newElements = elements.map(el => el.id === selectedElement.id ? { ...el, x: newX, y: newY } : el);
    setElements(newElements);
    
    // Emit position update to other users (throttled)
    if (realtimeCollab && realtimeCollab.isConnected) {
      const updatedElement = newElements.find(el => el.id === selectedElement.id);
      if (updatedElement) {
        clearTimeout(window.positionUpdateTimeout);
        window.positionUpdateTimeout = setTimeout(() => {
          realtimeCollab.broadcastElementUpdate(updatedElement);
        }, 100);
      }
    }
    return true;
  };

  const startResize = (e, corner) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeCorner(corner);
  };

  const handleSelectElement = (e, id) => {
    e.stopPropagation();
    setSelectedElement(elements.find(el => el.id === id));
    setActiveTool('select');
  };

  const handleMouseDown = (e, element) => {
    if (activeTool !== 'select') return;
    if (element.isEditing) return;
    setIsDragging(true);
    setSelectedElement(element);
    const surfaceRect = surfaceRef.current.getBoundingClientRect();
    setDragOffset({
      x: (e.clientX - surfaceRect.left) / scale - element.x,
      y: (e.clientY - surfaceRect.top) / scale - element.y,
    });
  };

  const handleMouseMove = (e) => {
    const surfaceRect = surfaceRef.current.getBoundingClientRect();
    
    // Handle different mouse move behaviors
    if (handleElementResize(e, surfaceRect)) return;
    if (handleLineDrawing(e, surfaceRect)) return;
    if (handlePenDrawing(e, surfaceRect)) return;
    if (handleElementDrag(e, surfaceRect)) return;
  };

  // Track cursor position for real-time collaboration
  const handleCursorMove = (e) => {
    if (realtimeCollab && realtimeCollab.isConnected && user) {
      const surfaceRect = surfaceRef.current.getBoundingClientRect();
      const x = (e.clientX - surfaceRect.left) / scale;
      const y = (e.clientY - surfaceRect.top) / scale;
      
      // Throttle cursor updates to avoid excessive network traffic
      clearTimeout(window.cursorUpdateTimeout);
      window.cursorUpdateTimeout = setTimeout(() => {
        realtimeCollab.broadcastCursorPosition({
          x,
          y,
          user: {
            id: user.id,
            name: user.name,
            avatar: user.avatar
          }
        });
      }, 50);
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      recordHistory(elements);
    }
    if (isResizing) {
      recordHistory(elements);
    }
    if (drawingTempId) {
      recordHistory(elements);
      setDrawingTempId(null);
    }
    setIsDragging(false);
    setIsResizing(false);
    setResizeCorner(null);
  };

  const handleCanvasClick = () => {
    setSelectedElement(null);
    setElements(prevElements =>
      prevElements.map(el => ({ ...el, isEditing: false }))
    );
    setContextMenu({ visible: false, x: 0, y: 0, elementId: null });
    setShowColorPicker(false);
  };

  const handleDoubleClick = (id) => {
    setElements(prevElements =>
      prevElements.map(el =>
        el.id === id ? { ...el, isEditing: true } : el
      )
    );
  };

  const handleTextChange = (e, id) => {
    const newElements = elements.map(el =>
      el.id === id ? { ...el, text: e.target.value } : el
    );
    setElements(newElements);
    
    // Emit element update to other users (with debouncing for text changes)
    if (realtimeCollab && realtimeCollab.isConnected) {
      const updatedElement = newElements.find(el => el.id === id);
      if (updatedElement) {
        // Debounce text updates to avoid excessive network traffic
        clearTimeout(window.textUpdateTimeout);
        window.textUpdateTimeout = setTimeout(() => {
          realtimeCollab.broadcastElementUpdate(updatedElement);
        }, 500);
      }
    }
  };

  // ========================== DRAWING FUNCTIONS ==========================
  // Helper function to render individual elements
  const renderElement = (element) => (
    <div
      key={element.id}
      onMouseDown={(e) => {
        if (activeTool === 'eraser' && element.type === 'freehand') {
          deleteElementById(element.id);
          return;
        }
        handleMouseDown(e, element);
      }}
      onDoubleClick={() => handleDoubleClick(element.id)}
      onClick={(e) => handleSelectElement(e, element.id)}
      onContextMenu={(e) => handleElementContextMenu(e, element)}
      className={`absolute ${['line','arrow','freehand'].includes(element.type) ? '' : 'rounded-xl shadow-lg border-2 p-4'}
        ${element.type === 'text' ? 'bg-white text-gray-900 border-gray-300' : ''}
        ${element.type === 'sticky' ? 'text-gray-900 border-yellow-400 shadow-md' : ''}
        ${element.type === 'shape' ? 'border-blue-700 rounded-xl shadow-lg border-2 p-0' : ''}
        ${selectedElement && selectedElement.id === element.id ? 'z-20' : 'z-10'}
      `}
      style={{
         top: `${element.y}px`,
         left: `${element.x}px`,
         width: `${element.width}px`,
         height: `${element.height}px`,
        cursor: activeTool === 'select' ? 'grab' : 'crosshair',
        background: element.backgroundColor || (element.type==='text'?'#ffffff': 'transparent'),
        color: element.textColor,
        borderColor: element.borderColor,
      }}
    >
      {element.type === 'text' && (
        element.isEditing ? (
          <textarea
            value={element.text}
            onChange={(e) => handleTextChange(e, element.id)}
            onBlur={() => setElements(prevElements => prevElements.map(el => el.id === element.id ? { ...el, isEditing: false } : el))}
            className="w-full h-full p-0 border-none bg-transparent resize-none focus:outline-none"
          />
        ) : (
          <span className="font-semibold">{element.text}</span>
        )
      )}
      {element.type === 'sticky' && (
         element.isEditing ? (
          <textarea
            value={element.text}
            onChange={(e) => handleTextChange(e, element.id)}
            onBlur={() => setElements(prevElements => prevElements.map(el => el.id === element.id ? { ...el, isEditing: false } : el))}
            className="w-full h-full p-0 border-none bg-transparent resize-none focus:outline-none"
          />
        ) : (
          <span className="font-semibold">{element.text}</span>
        )
      )}
      {element.type === 'shape' && <div style={{width: '100%', height: '100%', backgroundColor: element.backgroundColor || '#3B82F6', borderRadius: '12px'}} />}
      {['line','arrow','freehand'].includes(element.type) && (
        <svg style={{position:'absolute', inset:0, width:'100%', height:'100%', overflow:'visible'}}>
          {element.type === 'line' && element.x2 !== undefined && (
            <line x1={0} y1={0} x2={(element.x2 - element.x)} y2={(element.y2 - element.y)} stroke={element.strokeColor} strokeWidth={element.strokeWidth || 3} strokeLinecap="round" />
          )}
          {element.type === 'arrow' && element.x2 !== undefined && (
            <g>
              <defs>
                <marker id={`arrowhead-${element.id}`} markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L0,6 L6,3 z" fill={element.strokeColor} />
                </marker>
              </defs>
              <line x1={0} y1={0} x2={(element.x2 - element.x)} y2={(element.y2 - element.y)} stroke={element.strokeColor} strokeWidth={element.strokeWidth || 3} markerEnd={`url(#arrowhead-${element.id})`} strokeLinecap="round" />
            </g>
          )}
          {element.type === 'freehand' && element.points && element.points.length > 1 && (
            <path 
              d={`M ${element.points.map(p => `${p.x - element.x} ${p.y - element.y}`).join(' L ')}`} 
              stroke={element.strokeColor} 
              strokeWidth={element.strokeWidth || 3} 
              fill="none" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          )}
        </svg>
      )}
      
      {/* Resize handles for selected element */}
      {selectedElement && selectedElement.id === element.id && activeTool === 'select' && !['line','arrow','freehand'].includes(element.type) && (
        <>
          {['nw','ne','sw','se'].map(corner => (
            <div
              key={corner}
              onMouseDown={(e) => startResize(e, corner)}
              className="absolute w-3 h-3 bg-blue-500 border border-white cursor-pointer hover:bg-blue-600 transition-colors"
              style={{
                [corner.includes('n') ? 'top' : 'bottom']: '-4px',
                [corner.includes('w') ? 'left' : 'right']: '-4px',
                cursor: corner === 'nw' || corner === 'se' ? 'nw-resize' : 'ne-resize',
              }}
            />
          ))}
        </>
      )}
    </div>
  );

  // Start drawing for line/arrow/pen
  const startDrawingSurface = (e) => {
    if (!['line','arrow','pen'].includes(activeTool)) return;
    const surfaceRect = surfaceRef.current.getBoundingClientRect();
    const x = (e.clientX - surfaceRect.left) / scale;
    const y = (e.clientY - surfaceRect.top) / scale;
    const id = Date.now();
    if (activeTool === 'pen') {
  const el = { id, type: 'freehand', points: [{x,y}], strokeColor, strokeWidth, x, y, width: 1, height: 1 };
      setElements(prev => [...prev, el]);
    } else {
  const el = { id, type: activeTool, x, y, x2: x, y2: y, strokeColor, strokeWidth, width: 1, height: 1 };
      setElements(prev => [...prev, el]);
    }
    setDrawingTempId(id);
  };

  // ========================== CONTEXT MENU FUNCTIONS ==========================
  // Context Menu actions
  const duplicateElement = (id) => {
    setElements(prev => {
      const el = prev.find(e => e.id === id);
      if (!el) return prev;
      const clone = JSON.parse(JSON.stringify(el));
      clone.id = Date.now();
      clone.x += 40; clone.y += 40;
      return [...prev, clone];
    });
    recordHistory(elements);
  };
  const deleteElementById = (id) => {
    const newElements = elements.filter(e => e.id !== id);
    setElements(newElements);
    recordHistory(newElements);
    
    // Emit element deletion to other users
    if (realtimeCollab && realtimeCollab.isConnected) {
      realtimeCollab.broadcastElementDelete(id);
    }
  };
  const openColorPicker = () => {
    setShowColorPicker(true);
    requestAnimationFrame(() => colorInputRef.current && colorInputRef.current.click());
  };
  const applyColor = (value) => {
    setElements(prev => prev.map(el => {
      if (!selectedElement || el.id !== selectedElement.id) return el;
      if (el.type === 'text') return { ...el, textColor: value };
      if (el.type === 'sticky' || el.type === 'shape') return { ...el, backgroundColor: value };
      if (['line','arrow','freehand'].includes(el.type)) return { ...el, strokeColor: value };
      return el;
    }));
    recordHistory(elements);
  };

  const handleElementContextMenu = (e, el) => {
    e.preventDefault();
    setSelectedElement(el);
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, elementId: el.id });
  };

  // Keyboard shortcuts
  const keyHandler = useCallback((e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault(); undo();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault(); redo();
    }
  }, [undo, redo]);
  useEffect(() => {
    window.addEventListener('keydown', keyHandler);
    return () => window.removeEventListener('keydown', keyHandler);
  }, [keyHandler]);

  // ========================== RENDER ==========================
  return (
  <div className="fixed inset-0 flex flex-col bg-gray-50" onContextMenu={e => e.target === e.currentTarget && e.preventDefault()}>
      {/* Enhanced Top Navigation Bar - Fixed positioning to prevent zoom effects */}
      <div className="fixed top-0 left-0 right-0 h-16 shrink-0 bg-[#e1ee90] shadow-lg flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-4">
          {/* Logo and Branding - Keep original styling */}
          <div className="flex flex-row items-center gap-4 cursor-pointer" onClick={() => navigate('/dashboard')}>
            <img src={dashboardIcon} alt="Dashboard Icon" className="w-12 h-12 rounded-lg border-2 border-gray-400 bg-white" />
            <span className="borel-regular text-gray-900" style={{ fontSize: '32px', lineHeight: '32px', marginLeft: '8px', display: 'inline-block', verticalAlign: 'middle' }}>Dashboard</span>
          </div>
          
          {/* Board Info */}
          <div className="flex items-center gap-3 ml-6">
            {board?.img && <img src={board.img} alt={board?.title} className="w-12 h-8 rounded-md border-2 border-gray-400 object-cover" />}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{board?.title || 'Untitled Board'}</h2>
              <p className="text-xs text-gray-700">
                {isSharedAccess 
                  ? `Shared access (${sharePermissions}) • Real-time collaboration enabled`
                  : 'Real-time collaboration enabled'
                }
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Enhanced Collaboration Status with all info */}
          {realtimeCollab && (
            <div className="flex items-center gap-4 mr-4 bg-gray-700 rounded-lg px-4 py-2 border border-gray-600">
              {/* Connection Status */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  realtimeCollab.isConnected ? 'bg-green-400' : 
                  realtimeCollab.isConnecting ? 'bg-yellow-400' : 'bg-red-400'
                }`}></div>
                <span className="text-sm text-white font-medium">
                  {realtimeCollab.isConnected ? 'Connected' : 
                   realtimeCollab.isConnecting ? 'Connecting...' : 'Offline'}
                </span>
              </div>
              
              {/* Separator */}
              <div className="w-px h-4 bg-white/30"></div>
              
              {/* Active Users */}
              <button 
                onClick={() => setShowActiveUsersModal(true)}
                className="flex items-center gap-2 hover:bg-white/10 px-2 py-1 rounded transition-colors"
                title="Manage active users"
              >
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                </svg>
                <span className="text-sm text-white font-medium">
                  {realtimeCollab.connectedUsers ? realtimeCollab.connectedUsers.length : 1} user{realtimeCollab.connectedUsers?.length !== 1 ? 's' : ''}
                </span>
              </button>
              
              {/* Share Link - only show if user can edit */}
              {canEdit && (
                <>
                  <div className="w-px h-4 bg-white/30"></div>
                  
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z"/>
                    </svg>
                    <button 
                      onClick={() => setShowShareModal(true)}
                      className="text-sm text-white font-medium hover:text-gray-200 transition-colors"
                      title="Share board"
                    >
                      Share
                    </button>
                  </div>
                </>
              )}
              
              {/* Separator */}
              <div className="w-px h-4 bg-white/30"></div>
              
              {/* Zoom Level */}
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
                </svg>
                <span className="text-sm text-white font-medium">
                  {Math.round(scale * 100)}%
                </span>
              </div>
              
              {/* User Avatars */}
              {realtimeCollab.connectedUsers && realtimeCollab.connectedUsers.length > 0 && (
                <div className="flex -space-x-1 ml-2">
                  {realtimeCollab.connectedUsers.slice(0, 3).map((connectedUser, idx) => (
                    <div
                      key={connectedUser.id}
                      className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-xs text-white font-bold border-2 border-white shadow-md"
                      title={connectedUser.name}
                    >
                      {connectedUser.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  ))}
                  {realtimeCollab.connectedUsers.length > 3 && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-xs text-white font-bold border-2 border-white shadow-md">
                      +{realtimeCollab.connectedUsers.length - 3}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Zoom Controls - Dark background */}
          <div className="flex items-center gap-1 bg-gray-700 rounded-lg p-1 border border-gray-600">
            <button onClick={zoomOut} className="p-2 rounded-md hover:bg-gray-600 text-white transition-colors" title="Zoom Out">
              <ZoomOut size={18} />
            </button>
            <button onClick={zoomIn} className="p-2 rounded-md hover:bg-gray-600 text-white transition-colors" title="Zoom In">
              <ZoomIn size={18} />
            </button>
          </div>
          
          {/* Export Controls - Dark background */}
          <div className="flex items-center gap-1 bg-gray-700 rounded-lg p-1 border border-gray-600">
            <button onClick={exportAsImage} className="p-2 rounded-md hover:bg-gray-600 text-white transition-colors" title="Export PNG">
              <Camera size={18} />
            </button>
            <button onClick={exportAsPDF} className="px-3 py-2 rounded-md hover:bg-gray-600 text-white text-sm font-medium transition-colors" title="Export PDF">
              PDF
            </button>
          </div>
          
          <button
            className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 text-sm font-medium transition-colors border border-gray-600"
            onClick={() => navigate(-1)}
          >Dashboard</button>
        </div>
      </div>
     
      {/* Enhanced Floating Toolbar - Always Visible and Fixed */}
      <div className="fixed left-4 top-20 z-40 flex flex-col w-16 max-h-[calc(100vh-120px)] overflow-y-auto bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-200/60 select-none floating-element"
           style={{ position: 'fixed' }}>
        {/* Toolbar Header */}
        <div className="p-2 border-b border-gray-200/60 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="w-3 h-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full mx-auto"></div>
        </div>
        
        {/* Tool Buttons */}
        <div className="p-2 space-y-1">
          <button
            onClick={() => setActiveTool('select')}
            className={`w-full p-3 rounded-lg transition-all duration-200 tool-button ${activeTool === 'select' ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg transform scale-105' : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'}`}
            title="Select Tool"
          >
            <MousePointer2 size={20} />
          </button>
          <button
            onClick={() => canEdit && setActiveTool('text') && addElement('text')}
            disabled={!canEdit}
            className={`w-full p-3 rounded-lg transition-all duration-200 tool-button ${!canEdit ? 'opacity-50 cursor-not-allowed' : activeTool === 'text' ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg transform scale-105' : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'}`}
            title={canEdit ? "Add Text Box" : "View-only access"}
          >
            <Text size={20} />
          </button>
          <button
            onClick={() => canEdit && setActiveTool('sticky') && addElement('sticky')}
            disabled={!canEdit}
            className={`w-full p-3 rounded-lg transition-all duration-200 ${!canEdit ? 'opacity-50 cursor-not-allowed' : activeTool === 'sticky' ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg transform scale-105' : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'}`}
            title={canEdit ? "Add Sticky Note" : "View-only access"}
          >
            <StickyNote size={20} />
          </button>
          <button
            onClick={() => { setActiveTool('shape'); addElement('shape'); }}
            className={`w-full p-3 rounded-lg transition-all duration-200 ${activeTool === 'shape' ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg transform scale-105' : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'}`}
            title="Add Shape"
          >
            <Square size={20} />
          </button>
          <button
            onClick={() => setActiveTool('line')}
            className={`w-full p-3 rounded-lg transition-all duration-200 ${activeTool === 'line' ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg transform scale-105' : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'}`}
            title="Line Tool"
          >
            <Minus size={20} />
          </button>
          <button
            onClick={() => setActiveTool('arrow')}
            className={`w-full p-3 rounded-lg transition-all duration-200 ${activeTool === 'arrow' ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg transform scale-105' : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'}`}
            title="Arrow Tool"
          >
            <ArrowRight size={20} />
          </button>
          <button
            onClick={() => setActiveTool('pen')}
            className={`w-full p-3 rounded-lg transition-all duration-200 ${activeTool === 'pen' ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg transform scale-105' : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'}`}
            title="Freehand Pen"
          >
            <Pen size={20} />
          </button>
          <button
            onClick={() => setActiveTool('eraser')}
            className={`w-full p-3 rounded-lg transition-all duration-200 ${activeTool === 'eraser' ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg transform scale-105' : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'}`}
            title="Eraser"
          >
            <Eraser size={20} />
          </button>
        </div>
       
        {/* Toolbar Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent mx-2" />
       
        {/* Action Buttons */}
        <div className="p-2 space-y-1">
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className={`w-full p-3 rounded-lg transition-all duration-200 ${historyIndex <= 0 ? 'text-gray-300 cursor-not-allowed bg-gray-50' : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'}`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={18} />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className={`w-full p-3 rounded-lg transition-all duration-200 ${historyIndex >= history.length - 1 ? 'text-gray-300 cursor-not-allowed bg-gray-50' : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'}`}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={18} />
          </button>
       
          <button
            onClick={()=>setShowStrokePanel(s=>!s)}
            className={`w-full p-3 rounded-lg transition-all duration-200 ${showStrokePanel ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transform scale-105' : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600'}`}
            title="Stroke Settings"
          >
            <Palette size={18}/>
          </button>
        </div>

        {/* Enhanced Stroke Controls Panel */}
        {showStrokePanel && (
          <div className="mx-2 mb-2 p-3 color-picker-enhanced rounded-lg shadow-lg">
            <div className="text-xs font-medium text-purple-700 mb-2">Colors</div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {['#111827','#ef4444','#3b82f6','#10b981','#f59e0b','#8b5cf6'].map(col => {
                const isSelected = (selectedElement && ['line','arrow','freehand'].includes(selectedElement.type) && selectedElement.strokeColor === col) || (!selectedElement || !['line','arrow','freehand'].includes(selectedElement.type)) && strokeColor === col;
                return (
                  <button
                    key={col}
                    title={col}
                    onClick={() => {
                      if (selectedElement && ['line','arrow','freehand'].includes(selectedElement.type)) {
                        setElements(prev => {
                          const updated = prev.map(el => el.id === selectedElement.id ? { ...el, strokeColor: col } : el);
                          recordHistory(updated);
                          return updated;
                        });
                      } else {
                        setStrokeColor(col);
                      }
                    }}
                    className={`w-6 h-6 rounded-lg border-2 transition-all duration-200 ${isSelected ? 'ring-2 ring-purple-500 border-white shadow-lg transform scale-110' : 'border-gray-200 hover:border-purple-300'}`}
                    style={{ background: col }}
                  />
                );
              })}
            </div>
            <div className="text-xs font-medium text-purple-700 mb-2">
              Size: {selectedElement && ['line','arrow','freehand'].includes(selectedElement.type) ? (selectedElement.strokeWidth || 3) : strokeWidth}px
            </div>
            <input
              type="range"
              min={1}
              max={12}
              value={selectedElement && ['line','arrow','freehand'].includes(selectedElement.type) ? (selectedElement.strokeWidth || 3) : strokeWidth}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (selectedElement && ['line','arrow','freehand'].includes(selectedElement.type)) {
                  setElements(prev => {
                    const updated = prev.map(el => el.id === selectedElement.id ? { ...el, strokeWidth: val } : el);
                    recordHistory(updated);
                    return updated;
                  });
                } else {
                  setStrokeWidth(val);
                }
              }}
              className="w-full custom-slider"
            />
          </div>
        )}

        {/* Color Picker for Selected Element */}
        {selectedElement && (
          <div className="mx-2 mb-2">
            <button
              onClick={openColorPicker}
              className="w-full p-3 rounded-lg border-2 border-purple-200 hover:border-purple-400 bg-white transition-all duration-200 shadow-sm"
              title="Change Color"
            >
              <div className="w-6 h-6 rounded-lg mx-auto shadow-inner" style={{background: selectedElement.backgroundColor || selectedElement.strokeColor || '#111827'}} />
            </button>
          </div>
        )}
        <input ref={colorInputRef} type="color" className="hidden" onChange={(e) => applyColor(e.target.value)} />
      </div>

      {/* Scrollable canvas container with enhanced padding for fixed navbar and toolbar */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto relative touch-none pl-24 pt-16 custom-scrollbar"
        onMouseMove={(e)=>{panMove(e); handleMouseMove(e); handleCursorMove(e);}}
        onMouseUp={handleMouseUp}
        onMouseDown={startDrawingSurface}
        onClick={handleCanvasClick}
        style={{
          cursor: activeTool === 'select' ? 'default' : 'crosshair'
        }}
        onWheel={handleWheel}
        onMouseLeave={stopPan}
        onMouseDownCapture={startPan}
        onMouseUpCapture={stopPan}
        onPointerDown={handlePointerDown}
        onPointerMove={(e)=>{handlePointerMove(e);}}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div
          ref={surfaceRef}
          className="relative origin-top-left canvas-grid"
          style={{
            width: 5000,
            height: 5000,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            backgroundSize: `${24 / scale}px ${24 / scale}px`
          }}
        >
        {elements.map(renderElement)}
        
        {/* Real-time Collaboration Cursors */}
        {realtimeCollab && realtimeCollab.cursors && Array.from(realtimeCollab.cursors.entries()).map(([userId, cursor]) => {
          if (!cursor || userId === user?.id) return null;
          return (
            <div
              key={userId}
              className="collaboration-cursor"
              style={{
                left: cursor.x,
                top: cursor.y,
                transform: 'translate(-2px, -2px)'
              }}
              data-user={cursor.user?.name || 'Anonymous'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" className="text-blue-500">
                <path
                  fill="currentColor"
                  d="M5.64 1.64a1 1 0 0 1 1.41 0l15.31 15.31a1 1 0 0 1-1.41 1.41L5.64 3.05a1 1 0 0 1 0-1.41z"
                />
                <path
                  fill="currentColor"
                  d="M12 2a1 1 0 0 1 1 1v9a1 1 0 0 1-2 0V4.41L5.41 10 12 16.59V14a1 1 0 0 1 2 0v3a1 1 0 0 1-1.71.71L6.29 11.71a1 1 0 0 1 0-1.42L12 4.59V3a1 1 0 0 1 1-1z"
                />
              </svg>
            </div>
          );
        })}
        

        
        {/* Context Menu */}
        {contextMenu.visible && (
          <div
            className="absolute bg-white border border-gray-300 rounded shadow-lg z-30 text-sm gradient-border"
            style={{ top: contextMenu.y + scrollRef.current.scrollTop, left: contextMenu.x + scrollRef.current.scrollLeft }}
            onClick={(e)=>e.stopPropagation()}
          >
            <button className="block px-4 py-2 w-full text-left hover:bg-gray-100 tool-button" onClick={() => { duplicateElement(contextMenu.elementId); setContextMenu({visible:false,x:0,y:0,elementId:null}); }}>Duplicate</button>
            <button className="block px-4 py-2 w-full text-left hover:bg-gray-100 tool-button" onClick={() => { openColorPicker(); setContextMenu({visible:false,x:0,y:0,elementId:null}); }}>Change Color</button>
            <button className="block px-4 py-2 w-full text-left text-red-600 hover:bg-gray-100 tool-button" onClick={() => { deleteElementById(contextMenu.elementId); setContextMenu({visible:false,x:0,y:0,elementId:null}); }}>Delete</button>
          </div>
        )}
        
        {/* Share Modal */}
        <ShareModal
          board={board}
          user={user}
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
        />
        
        {/* Active Users Modal */}
        <ActiveUsersModal
          board={board}
          user={user}
          isOpen={showActiveUsersModal}
          onClose={() => setShowActiveUsersModal(false)}
          connectedUsers={realtimeCollab.connectedUsers}
          realtimeCollab={realtimeCollab}
        />
        </div>
      </div>
    </div>
  );
};

export default CanvasPage;
