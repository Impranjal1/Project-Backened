/**
 * Element management utilities for canvas elements
 */

export const createNewElement = (type, options = {}) => {
  const newId = Date.now();
  const width = type === 'shape' ? 120 : (type === 'sticky' ? 200 : 240);
  const height = type === 'shape' ? 120 : (type === 'sticky' ? 150 : 120);
  
  const baseElement = {
    id: newId,
    type,
    text: type === 'text' ? 'Double click to edit' : type === 'sticky' ? 'Double click to edit' : '',
    x: options.x || 100,
    y: options.y || 100,
    width,
    height,
    isEditing: false,
    strokeColor: options.strokeColor || '#000000',
    strokeWidth: options.strokeWidth || 2,
    textColor: '#000000',
    points: type === 'freehand' ? (options.points || []) : undefined,
    x2: options.x2 || undefined,
    y2: options.y2 || undefined,
    createdBy: options.createdBy || null, // Add createdBy field for backend validation
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Set specific properties based on element type
  switch (type) {
    case 'sticky':
      baseElement.backgroundColor = '#FBBF24'; // Yellow color
      baseElement.borderColor = '#F59E0B';
      baseElement.textColor = '#1F2937';
      baseElement.style = {
        backgroundColor: '#FBBF24',
        borderColor: '#F59E0B',
        color: '#1F2937',
        fontSize: 14
      };
      break;
    case 'text':
      baseElement.backgroundColor = 'transparent';
      baseElement.borderColor = '#E5E7EB';
      baseElement.textColor = '#111827';
      baseElement.style = {
        backgroundColor: 'transparent',
        borderColor: '#E5E7EB',
        color: '#111827',
        fontSize: 16
      };
      break;
    case 'shape':
      baseElement.backgroundColor = '#3B82F6';
      baseElement.borderColor = '#2563EB';
      baseElement.style = {
        backgroundColor: '#3B82F6',
        borderColor: '#2563EB'
      };
      break;
    case 'freehand':
      baseElement.backgroundColor = 'transparent';
      baseElement.borderColor = 'transparent';
      baseElement.style = {
        stroke: options.strokeColor || '#000000',
        strokeWidth: options.strokeWidth || 2,
        fill: 'none'
      };
      break;
    default:
      baseElement.backgroundColor = 'transparent';
      baseElement.borderColor = '#E5E7EB';
      break;
  }

  return baseElement;
};

export const findElementAtPosition = (elements, x, y) => {
  // Check in reverse order (top elements first)
  for (let i = elements.length - 1; i >= 0; i--) {
    const element = elements[i];
    
    if (element.type === 'line' || element.type === 'arrow') {
      // For lines and arrows, check if point is near the line
      const dist = distanceToLine(x, y, element.x, element.y, element.x2, element.y2);
      if (dist < 10) return element;
    } else if (element.type === 'freehand') {
      // For freehand, check if point is near any part of the path
      for (let j = 0; j < element.points.length - 1; j++) {
        const p1 = element.points[j];
        const p2 = element.points[j + 1];
        const dist = distanceToLine(x, y, p1.x, p1.y, p2.x, p2.y);
        if (dist < 10) return element;
      }
    } else {
      // For rectangular elements
      if (x >= element.x && x <= element.x + element.width &&
          y >= element.y && y <= element.y + element.height) {
        return element;
      }
    }
  }
  return null;
};

export const duplicateElement = (element, options = {}) => {
  if (!element) return null;

  const newElement = {
    ...element,
    id: Date.now(),
    x: element.x + 20,
    y: element.y + 20,
    isEditing: false,
    createdBy: options.createdBy || element.createdBy,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return newElement;
};

export const duplicateElementInArray = (elements, setElements, recordHistory, elementId) => {
  const elementToDuplicate = elements.find(el => el.id === elementId);
  if (!elementToDuplicate) return;

  const newElement = duplicateElement(elementToDuplicate);
  const newElements = [...elements, newElement];
  setElements(newElements);
  recordHistory(newElements);
};

export const deleteElement = (elements, elementId) => {
  return elements.filter(el => el.id !== elementId);
};

export const updateElement = (elements, setElements, elementId, updates) => {
  setElements(elements.map(el => 
    el.id === elementId ? { ...el, ...updates } : el
  ));
};

export const getResizeCorner = (element, x, y) => {
  const cornerSize = 8;
  const { x: ex, y: ey, width, height } = element;
  
  // Check corners
  if (x >= ex - cornerSize && x <= ex + cornerSize && 
      y >= ey - cornerSize && y <= ey + cornerSize) return 'nw';
  if (x >= ex + width - cornerSize && x <= ex + width + cornerSize && 
      y >= ey - cornerSize && y <= ey + cornerSize) return 'ne';
  if (x >= ex - cornerSize && x <= ex + cornerSize && 
      y >= ey + height - cornerSize && y <= ey + height + cornerSize) return 'sw';
  if (x >= ex + width - cornerSize && x <= ex + width + cornerSize && 
      y >= ey + height - cornerSize && y <= ey + height + cornerSize) return 'se';
      
  return null;
};

// Helper function to calculate distance from point to line
const distanceToLine = (px, py, x1, y1, x2, y2) => {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  
  if (lenSq === 0) return Math.sqrt(A * A + B * B);
  
  let param = dot / lenSq;
  
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
};
