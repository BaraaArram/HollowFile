import React, { useState, useEffect, useRef, useCallback } from 'react';

export default function VirtualGrid({ 
  items, 
  renderItem, 
  itemHeight = 200, 
  itemWidth = 300,
  containerHeight = 600,
  containerWidth = '100%',
  gap = 16,
  overscan = 5
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerRef, setContainerRef] = useState(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  
  // Calculate grid layout
  const itemsPerRow = Math.floor((containerDimensions.width + gap) / (itemWidth + gap));
  const totalRows = Math.ceil(items.length / itemsPerRow);
  const totalHeight = totalRows * (itemHeight + gap) - gap;
  
  // Calculate visible range
  const startRow = Math.max(0, Math.floor(scrollTop / (itemHeight + gap)) - overscan);
  const endRow = Math.min(
    totalRows - 1,
    Math.floor((scrollTop + containerDimensions.height) / (itemHeight + gap)) + overscan
  );
  
  // Get visible items
  const visibleItems = [];
  for (let row = startRow; row <= endRow; row++) {
    for (let col = 0; col < itemsPerRow; col++) {
      const index = row * itemsPerRow + col;
      if (index < items.length) {
        visibleItems.push({
          item: items[index],
          index,
          style: {
            position: 'absolute',
            top: row * (itemHeight + gap),
            left: col * (itemWidth + gap),
            width: itemWidth,
            height: itemHeight
          }
        });
      }
    }
  }
  
  // Handle scroll
  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);
  
  // Resize observer
  useEffect(() => {
    if (!containerRef) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    
    resizeObserver.observe(containerRef);
    return () => resizeObserver.disconnect();
  }, [containerRef]);
  
  return (
    <div
      ref={setContainerRef}
      style={{
        height: containerHeight,
        width: containerWidth,
        overflow: 'auto',
        position: 'relative'
      }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index, style }) => (
          <div key={index} style={style}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
} 