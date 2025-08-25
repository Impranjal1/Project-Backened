/**
 * Zoom and pan utility functions for the canvas
 */

export const applyZoom = (scrollRef, setScale, delta, centerX, centerY) => {
  const sc = scrollRef.current;
  if (!sc) return;
  
  setScale(prev => {
    const next = Math.min(3, Math.max(0.25, +(prev * delta).toFixed(3)));
    
    if (centerX !== undefined && centerY !== undefined) {
      const rect = sc.getBoundingClientRect();
      const actualCenterX = centerX - rect.left;
      const actualCenterY = centerY - rect.top;
      
      const logicalX = (sc.scrollLeft + actualCenterX) / prev;
      const logicalY = (sc.scrollTop + actualCenterY) / prev;
      
      requestAnimationFrame(() => {
        sc.scrollLeft = logicalX * next - actualCenterX;
        sc.scrollTop = logicalY * next - actualCenterY;
      });
    }
    return next;
  });
};

export const zoomIn = (scrollRef, setScale) => {
  const sc = scrollRef.current;
  if (!sc) return;
  const rect = sc.getBoundingClientRect();
  applyZoom(scrollRef, setScale, 1.2, rect.left + sc.clientWidth/2, rect.top + sc.clientHeight/2);
};

export const zoomOut = (scrollRef, setScale) => {
  const sc = scrollRef.current;
  if (!sc) return;
  const rect = sc.getBoundingClientRect();
  applyZoom(scrollRef, setScale, 1/1.2, rect.left + sc.clientWidth/2, rect.top + sc.clientHeight/2);
};

export const resetZoom = (scrollRef, setScale) => {
  setScale(1);
  const sc = scrollRef.current;
  if (sc) {
    requestAnimationFrame(() => {
      sc.scrollTo({
        left: (5000 - sc.clientWidth) / 2,
        top: (5000 - sc.clientHeight) / 2,
        behavior: 'smooth'
      });
    });
  }
};

export const handleWheel = (e, scrollRef, setScale, activeTool) => {
  if (activeTool !== 'select') return;
  
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    applyZoom(scrollRef, setScale, delta, e.clientX, e.clientY);
  }
};

export const distance = (p1, p2) => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

export const getGestureCenter = (pointers) => {
  let x = 0, y = 0;
  for (const p of pointers.values()) {
    x += p.x;
    y += p.y;
  }
  return { x: x / pointers.size, y: y / pointers.size };
};
