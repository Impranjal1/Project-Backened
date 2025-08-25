import React from 'react';
import { useMemo } from 'react';

const CanvasViewport = ({
  scrollRef,
  surfaceRef,
  scale,
  elements,
  selectedElement,
  activeTool,
  contextMenu,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onWheel,
  onContextMenu,
  children
}) => {
  // Generate grid pattern
  const gridPattern = useMemo(() => {
    const gridSize = 20 * scale;
    return (
      <defs>
        <pattern
          id="grid"
          width={gridSize}
          height={gridSize}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="0.5"
          />
        </pattern>
      </defs>
    );
  }, [scale]);

  return (
    <div 
      ref={scrollRef}
      className="flex-1 overflow-auto bg-gray-50 relative"
      onWheel={onWheel}
    >
      <div
        ref={surfaceRef}
        className="relative bg-white"
        style={{
          width: '5000px',
          height: '5000px',
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
          cursor: activeTool === 'select' ? 'default' : 'crosshair'
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onContextMenu={onContextMenu}
      >
        {/* Grid Background */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: '100%', height: '100%' }}
        >
          {gridPattern}
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Canvas Elements */}
        {elements.map((element) => (
          <CanvasElement
            key={element.id}
            element={element}
            isSelected={selectedElement?.id === element.id}
            scale={scale}
          />
        ))}

        {/* Additional children (like temporary drawing elements) */}
        {children}

        {/* Context Menu */}
        {contextMenu.visible && (
          <div
            className="absolute bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[120px]"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
            }}
          >
            <button className="w-full px-3 py-1 text-left hover:bg-gray-100 text-sm">
              Copy
            </button>
            <button className="w-full px-3 py-1 text-left hover:bg-gray-100 text-sm">
              Duplicate
            </button>
            <button className="w-full px-3 py-1 text-left hover:bg-gray-100 text-sm text-red-600">
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Canvas Element Component
const CanvasElement = ({ element, isSelected, scale }) => {
  const getElementStyle = () => {
    const baseStyle = {
      position: 'absolute',
      left: element.x,
      top: element.y,
      width: element.width,
      height: element.height,
    };

    switch (element.type) {
      case 'text':
        return {
          ...baseStyle,
          color: element.textColor || '#111827',
          fontSize: '16px',
          fontFamily: 'Inter, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          border: isSelected ? '2px solid #3B82F6' : 'none',
          backgroundColor: 'transparent',
          cursor: 'move',
        };
      
      case 'sticky':
        return {
          ...baseStyle,
          backgroundColor: element.backgroundColor || '#FEF08A',
          border: isSelected ? '2px solid #3B82F6' : '1px solid #E5E7EB',
          borderRadius: '8px',
          padding: '8px',
          fontSize: '14px',
          fontFamily: 'Inter, sans-serif',
          cursor: 'move',
        };
      
      case 'shape':
        return {
          ...baseStyle,
          backgroundColor: element.backgroundColor || '#3B82F6',
          border: isSelected ? '2px solid #1D4ED8' : '1px solid #E5E7EB',
          borderRadius: '4px',
          cursor: 'move',
        };
      
      default:
        return baseStyle;
    }
  };

  const renderElement = () => {
    switch (element.type) {
      case 'line':
        return (
          <svg
            style={{
              position: 'absolute',
              left: Math.min(element.x, element.x2 || element.x),
              top: Math.min(element.y, element.y2 || element.y),
              width: Math.abs((element.x2 || element.x) - element.x) + 10,
              height: Math.abs((element.y2 || element.y) - element.y) + 10,
              pointerEvents: 'none',
            }}
          >
            <line
              x1={element.x - Math.min(element.x, element.x2 || element.x) + 5}
              y1={element.y - Math.min(element.y, element.y2 || element.y) + 5}
              x2={(element.x2 || element.x) - Math.min(element.x, element.x2 || element.x) + 5}
              y2={(element.y2 || element.y) - Math.min(element.y, element.y2 || element.y) + 5}
              stroke={element.strokeColor || '#111827'}
              strokeWidth={element.strokeWidth || 3}
              strokeLinecap="round"
            />
          </svg>
        );
      
      case 'arrow':
        const dx = (element.x2 || element.x) - element.x;
        const dy = (element.y2 || element.y) - element.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        return (
          <svg
            style={{
              position: 'absolute',
              left: Math.min(element.x, element.x2 || element.x),
              top: Math.min(element.y, element.y2 || element.y),
              width: Math.abs((element.x2 || element.x) - element.x) + 20,
              height: Math.abs((element.y2 || element.y) - element.y) + 20,
              pointerEvents: 'none',
            }}
          >
            <defs>
              <marker
                id={`arrowhead-${element.id}`}
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill={element.strokeColor || '#111827'}
                />
              </marker>
            </defs>
            <line
              x1={element.x - Math.min(element.x, element.x2 || element.x) + 10}
              y1={element.y - Math.min(element.y, element.y2 || element.y) + 10}
              x2={(element.x2 || element.x) - Math.min(element.x, element.x2 || element.x) + 10}
              y2={(element.y2 || element.y) - Math.min(element.y, element.y2 || element.y) + 10}
              stroke={element.strokeColor || '#111827'}
              strokeWidth={element.strokeWidth || 3}
              strokeLinecap="round"
              markerEnd={`url(#arrowhead-${element.id})`}
            />
          </svg>
        );
      
      case 'freehand':
        if (!element.points || element.points.length < 2) return null;
        
        const minX = Math.min(...element.points.map(p => p.x));
        const minY = Math.min(...element.points.map(p => p.y));
        const maxX = Math.max(...element.points.map(p => p.x));
        const maxY = Math.max(...element.points.map(p => p.y));
        
        return (
          <svg
            style={{
              position: 'absolute',
              left: minX - 10,
              top: minY - 10,
              width: maxX - minX + 20,
              height: maxY - minY + 20,
              pointerEvents: 'none',
            }}
          >
            <path
              d={`M ${element.points.map(p => `${p.x - minX + 10},${p.y - minY + 10}`).join(' L ')}`}
              stroke={element.strokeColor || '#111827'}
              strokeWidth={element.strokeWidth || 3}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        );
      
      default:
        return (
          <div style={getElementStyle()}>
            {element.text && (
              <span>{element.text}</span>
            )}
            {isSelected && (
              <div className="absolute -inset-1 border-2 border-blue-500 pointer-events-none">
                {/* Resize handles */}
                <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
              </div>
            )}
          </div>
        );
    }
  };

  return renderElement();
};

export default CanvasViewport;
