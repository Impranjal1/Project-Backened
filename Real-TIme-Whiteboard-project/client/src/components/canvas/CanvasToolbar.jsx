import React from 'react';
import { Square, Type, StickyNote, Minus, ArrowRight, PenTool, Move, RotateCcw, RotateCw, Palette, Trash2, Copy } from 'lucide-react';

const CanvasToolbar = ({
  activeTool,
  setActiveTool,
  selectedElement,
  showColorPicker,
  setShowColorPicker,
  showStrokePanel,
  setShowStrokePanel,
  strokeColor,
  setStrokeColor,
  strokeWidth,
  setStrokeWidth,
  colorInputRef,
  onAddElement,
  onDeleteElement,
  onDuplicateElement,
  onUndo,
  onRedo,
  onApplyColor,
  canUndo,
  canRedo,
  canEdit = true
}) => {
  const tools = [
    { id: 'select', icon: Move, label: 'Select' },
    { id: 'shape', icon: Square, label: 'Rectangle' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'sticky', icon: StickyNote, label: 'Sticky Note' },
    { id: 'line', icon: Minus, label: 'Line' },
    { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
    { id: 'freehand', icon: PenTool, label: 'Draw' },
  ];

  const strokeSizes = [1, 2, 3, 5, 8, 12];

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-40">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-2 flex items-center space-x-2">
        {/* Undo/Redo */}
        <div className="flex items-center space-x-1 border-r border-gray-200 pr-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-2 rounded-md transition-colors ${
              canUndo 
                ? 'hover:bg-gray-100 text-gray-700' 
                : 'text-gray-300 cursor-not-allowed'
            }`}
            title="Undo"
          >
            <RotateCcw size={18} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-2 rounded-md transition-colors ${
              canRedo 
                ? 'hover:bg-gray-100 text-gray-700' 
                : 'text-gray-300 cursor-not-allowed'
            }`}
            title="Redo"
          >
            <RotateCw size={18} />
          </button>
        </div>

        {/* Tools */}
        <div className="flex items-center space-x-1">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isDisabled = !canEdit && tool.id !== 'select';
            return (
              <button
                key={tool.id}
                onClick={() => {
                  if (isDisabled) return;
                  if (tool.id === activeTool) {
                    onAddElement(tool.id);
                  } else {
                    setActiveTool(tool.id);
                  }
                }}
                disabled={isDisabled}
                className={`p-2 rounded-md transition-colors ${
                  isDisabled
                    ? 'text-gray-300 cursor-not-allowed'
                    : activeTool === tool.id
                    ? 'bg-blue-100 text-blue-600'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
                title={isDisabled ? 'View only' : tool.label}
              >
                <Icon size={18} />
              </button>
            );
          })}
        </div>

        {/* Element Actions */}
        {selectedElement && canEdit && (
          <div className="flex items-center space-x-1 border-l border-gray-200 pl-2">
            <button
              onClick={() => onDuplicateElement(selectedElement.id)}
              className="p-2 rounded-md hover:bg-gray-100 text-gray-700 transition-colors"
              title="Duplicate"
            >
              <Copy size={18} />
            </button>
            <button
              onClick={() => onDeleteElement(selectedElement.id)}
              className="p-2 rounded-md hover:bg-red-100 text-red-600 transition-colors"
              title="Delete"
            >
              <Trash2 size={18} />
            </button>
          </div>
        )}

        {/* Color and Stroke Controls */}
        {canEdit && (
          <div className="flex items-center space-x-1 border-l border-gray-200 pl-2">
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-2 rounded-md hover:bg-gray-100 text-gray-700 transition-colors"
              title="Color"
            >
              <Palette size={18} />
            </button>
            
            {showColorPicker && (
              <div className="absolute top-full mt-2 left-0 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-50">
                <div className="grid grid-cols-6 gap-1 mb-2">
                  {[
                    '#111827', '#EF4444', '#F97316', '#EAB308',
                    '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899',
                    '#6B7280', '#000000', '#FFFFFF', '#F3F4F6'
                  ].map(color => (
                    <button
                      key={color}
                      onClick={() => onApplyColor(color)}
                      className="w-6 h-6 rounded border-2 border-gray-300 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
                <input
                  ref={colorInputRef}
                  type="color"
                  value={strokeColor}
                  onChange={(e) => {
                    setStrokeColor(e.target.value);
                    onApplyColor(e.target.value);
                  }}
                  className="w-full h-8 rounded border border-gray-300"
                />
              </div>
            )}
          </div>

          {/* Stroke Width */}
          {(activeTool === 'freehand' || activeTool === 'line' || activeTool === 'arrow') && (
            <div className="relative">
              <button
                onClick={() => setShowStrokePanel(!showStrokePanel)}
                className="p-2 rounded-md hover:bg-gray-100 text-gray-700 transition-colors flex items-center"
                title="Stroke Width"
              >
                <div 
                  className="rounded-full bg-gray-700"
                  style={{ 
                    width: `${Math.min(strokeWidth * 2, 16)}px`, 
                    height: `${Math.min(strokeWidth * 2, 16)}px` 
                  }}
                />
              </button>
              
              {showStrokePanel && (
                <div className="absolute top-full mt-2 left-0 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-50">
                  <div className="flex flex-col space-y-2">
                    {strokeSizes.map(size => (
                      <button
                        key={size}
                        onClick={() => {
                          setStrokeWidth(size);
                          setShowStrokePanel(false);
                        }}
                        className={`flex items-center space-x-2 p-2 rounded hover:bg-gray-100 ${
                          strokeWidth === size ? 'bg-blue-100' : ''
                        }`}
                      >
                        <div 
                          className="rounded-full bg-gray-700"
                          style={{ width: `${size * 2}px`, height: `${size * 2}px` }}
                        />
                        <span className="text-sm">{size}px</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
};

export default CanvasToolbar;
