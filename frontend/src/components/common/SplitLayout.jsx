import { useState, useRef } from "react";

export default function SplitLayout({ left, right, storageKey, defaultSplit = 50, minWidth = 150 }) {
  const [splitPercent, setSplitPercent] = useState(() => {
    if (storageKey) {
      const saved = localStorage.getItem(`codepilot_split_${storageKey}`);
      if (saved) return parseInt(saved, 10);
    }
    return defaultSplit;
  });

  const containerRef = useRef(null);
  const isDragging = useRef(false);

  const handleMouseDown = (e) => {
    e.preventDefault();
    isDragging.current = true;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    // eslint-disable-next-line
    document.body.style.cursor = "col-resize";
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const relativeX = e.clientX - containerRect.left;
    const newPercent = (relativeX / containerRect.width) * 100;
    
    // Bounds calculations
    const minPercent = (minWidth / containerRect.width) * 100;
    const maxPercent = 100 - minPercent;
    const boundedPercent = Math.max(minPercent, Math.min(maxPercent, newPercent));
    
    setSplitPercent(boundedPercent);
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    // eslint-disable-next-line
    document.body.style.cursor = "default";
    
    if (storageKey) {
      localStorage.setItem(`codepilot_split_${storageKey}`, Math.round(splitPercent).toString());
    }
  };

  return (
    <div ref={containerRef} className="flex flex-1 w-full h-full min-h-0 overflow-hidden select-none">
      {/* Left Column Container */}
      <div 
        style={{ width: `${splitPercent}%` }}
        className="h-full overflow-hidden select-text"
      >
        {left}
      </div>

      {/* Interactive Divider Line */}
      <div
        onMouseDown={handleMouseDown}
        className="w-[3px] h-full cursor-col-resize hover:bg-indigo-500/50 bg-[#1c2230] transition-colors relative shrink-0"
      >
        <div className="absolute inset-y-0 -left-1 -right-1 cursor-col-resize z-10" />
      </div>

      {/* Right Column Container */}
      <div 
        style={{ width: `${100 - splitPercent}%` }}
        className="h-full overflow-hidden select-text"
      >
        {right}
      </div>
    </div>
  );
}
