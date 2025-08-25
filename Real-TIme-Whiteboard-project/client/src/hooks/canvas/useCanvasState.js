import { useState, useRef, useEffect } from 'react';

/**
 * Custom hook to manage canvas state including elements, tools, zoom, history, etc.
 */
export const useCanvasState = () => {
  // Core canvas elements
  const [elements, setElements] = useState([]);
  
  // Tool state
  const [activeTool, setActiveTool] = useState('select');
  const [strokeColor, setStrokeColor] = useState('#111827');
  const [strokeWidth, setStrokeWidth] = useState(3);
  
  // Selection and interaction state
  const [selectedElement, setSelectedElement] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeCorner, setResizeCorner] = useState(null);
  const [drawingTempId, setDrawingTempId] = useState(null);
  
  // UI state
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, elementId: null });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showStrokePanel, setShowStrokePanel] = useState(false);
  
  // Modal states
  const [showShareModal, setShowShareModal] = useState(false);
  const [showActiveUsersModal, setShowActiveUsersModal] = useState(false);
  
  // Zoom and pan state
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  
  // History for undo/redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Refs
  const colorInputRef = useRef(null);
  const scrollRef = useRef(null);
  const surfaceRef = useRef(null);
  const panOrigin = useRef({ x: 0, y: 0 });
  const scrollOrigin = useRef({ x: 0, y: 0 });
  
  // Touch/gesture refs
  const pointersRef = useRef(new Map());
  const pinchInitialDistRef = useRef(0);
  const pinchInitialScaleRef = useRef(1);
  const pinchCenterRef = useRef({ x: 0, y: 0 });
  const singleTouchPanRef = useRef(null);

  // History management
  const recordHistory = (newElements) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newElements]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setElements([...history[prevIndex]]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setElements([...history[nextIndex]]);
    }
  };

  // Center viewport on mount
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      requestAnimationFrame(() => {
        el.scrollTo({
          left: (5000 - el.clientWidth) / 2,
          top: (5000 - el.clientHeight) / 2,
          behavior: 'instant'
        });
      });
    }
  }, []);

  return {
    // State
    elements,
    setElements,
    activeTool,
    setActiveTool,
    strokeColor,
    setStrokeColor,
    strokeWidth,
    setStrokeWidth,
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
    showStrokePanel,
    setShowStrokePanel,
    showShareModal,
    setShowShareModal,
    showActiveUsersModal,
    setShowActiveUsersModal,
    scale,
    setScale,
    isPanning,
    setIsPanning,
    history,
    setHistory,
    historyIndex,
    setHistoryIndex,
    
    // Refs
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
    
    // Methods
    recordHistory,
    undo,
    redo,
  };
};
