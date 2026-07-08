import { useState, useRef } from "react";

interface SplitLayoutProps {
  left: React.ReactNode;
  right: React.ReactNode;
  storageKey?: string;
  defaultSplit?: number;
  minWidth?: number;
}

export default function SplitLayout({ left, right, storageKey, defaultSplit = 50, minWidth = 150 }: SplitLayoutProps) {
  const [splitPercent, setSplitPercent] = useState<number>(() => {
    if (storageKey) {
      const saved = localStorage.getItem(`codepilot_split_${storageKey}`);
      if (saved) return parseInt(saved, 10);
    }
    return defaultSplit;
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<boolean>(false);

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const relativeX = e.clientX - containerRect.left;
    const newPercent = (relativeX / containerRect.width) * 100;
    const minPercent = (minWidth / containerRect.width) * 100;
    const maxPercent = 100 - minPercent;
    const boundedPercent = Math.max(minPercent, Math.min(maxPercent, newPercent));
    setSplitPercent(boundedPercent);
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "default";
    if (storageKey) {
      localStorage.setItem(`codepilot_split_${storageKey}`, Math.round(splitPercent).toString());
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
  };

  return (
    <div ref={containerRef} className="flex flex-1 w-full h-full min-h-0 overflow-hidden select-none">
      <div style={{ width: `${splitPercent}%` }} className="h-full overflow-hidden select-text">
        {left}
      </div>

      <div
        onMouseDown={handleMouseDown}
        className="w-[3px] h-full cursor-col-resize hover:bg-accent/50 bg-border transition-colors relative shrink-0"
      >
        <div className="absolute inset-y-0 -left-1 -right-1 cursor-col-resize z-10" />
      </div>

      <div style={{ width: `${100 - splitPercent}%` }} className="h-full overflow-hidden select-text">
        {right}
      </div>
    </div>
  );
}
