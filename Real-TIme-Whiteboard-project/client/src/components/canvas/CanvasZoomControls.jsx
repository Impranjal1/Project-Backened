import React from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

const CanvasZoomControls = ({ 
  scale, 
  onZoomIn, 
  onZoomOut, 
  onResetZoom, 
  onFitToView 
}) => {
  const formatZoom = (scale) => {
    return `${Math.round(scale * 100)}%`;
  };

  return (
    <div className="absolute bottom-4 right-4 z-40">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-2">
        <div className="flex flex-col space-y-1">
          {/* Zoom In */}
          <button
            onClick={onZoomIn}
            className="p-2 rounded-md hover:bg-gray-100 text-gray-700 transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={18} />
          </button>

          {/* Current Zoom Level */}
          <button
            onClick={onResetZoom}
            className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-md transition-colors min-w-[50px]"
            title="Reset Zoom (100%)"
          >
            {formatZoom(scale)}
          </button>

          {/* Zoom Out */}
          <button
            onClick={onZoomOut}
            className="p-2 rounded-md hover:bg-gray-100 text-gray-700 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={18} />
          </button>

          {/* Fit to View */}
          <button
            onClick={onFitToView}
            className="p-2 rounded-md hover:bg-gray-100 text-gray-700 transition-colors"
            title="Fit to View"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CanvasZoomControls;
