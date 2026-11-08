import "./index.css";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Circle, Text } from "react-konva";
import { Button } from "./components/ui/button";
import { MoonIcon, PlayIcon, Settings, SunIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Toolbar } from "./Toolbar";

export function App() {
  const [rectPosition, setRectPosition] = useState({ x: 20, y: 50 });
  const [circlePosition, setCirclePosition] = useState({ x: 200, y: 100 });
  const [isDarkMode, setIsDarkMode] = useState(
    () => localStorage.getItem("theme") === "dark",
  );

  const stageContainerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const container = stageContainerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setStageSize({
        width: Math.floor(entry.contentRect.width),
        height: Math.floor(entry.contentRect.height),
      });
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  return (
    <div
      className={cn(
        "flex h-dvh w-full flex-col gap-3 overflow-hidden bg-background p-3 text-foreground",
        isDarkMode && "dark",
      )}
    >
      <Toolbar
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode((dark) => !dark)}
      />
      <div ref={stageContainerRef} className="relative min-h-0 min-w-0 flex-1 rounded border">
        <Stage width={stageSize.width} height={stageSize.height}>
          <Layer>
            <Text text="Try to drag shapes" fontSize={15} />
            <Rect
              x={rectPosition.x}
              y={rectPosition.y}
              width={100}
              height={100}
              fill="red"
              shadowBlur={10}
              draggable
              onDragEnd={(e) => setRectPosition(e.target.position())}
            />
            <Circle
              x={circlePosition.x}
              y={circlePosition.y}
              radius={50}
              fill="green"
              draggable
              onDragEnd={(e) => setCirclePosition(e.target.position())}
            />
          </Layer>
        </Stage>
      </div>
    </div>
  );
}

export default App;
