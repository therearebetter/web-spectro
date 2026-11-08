import type { PointerEvent as ReactPointerEvent, ReactNode, RefObject } from "react";
import { useRef } from "react";

const TIME_TICK_POSITIONS = [0, 1 / 3, 2 / 3, 1];
const MIN_FREQUENCY = 60;
const MAX_FREQUENCY = 1_000;
const FREQUENCY_LABELS = [60, 70, 80, 90, 100, 125, 150, 200, 250, 300, 400, 500, 600, 800, 1_000];
const GRID_FREQUENCIES = [60, 100, 200, 400, 600, 800, 1_000];

type SpectrogramAxesProps = {
  width: number;
  height: number;
  columnIntervalMs: number;
  timeRangeSeconds: number;
  onTimeRangeChange: (seconds: number) => void;
  minColor: number;
  maxColor: number;
  panOffsetPixels: number;
  onPanOffsetChange: (offset: number) => void;
  onStartPanning: () => void;
  plotRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
};

function formatTime(seconds: number) {
  if (seconds <= 0.5) return "Now";
  return `${seconds >= 10 ? Math.round(seconds) : seconds.toFixed(1)}s`;
}

export function SpectrogramAxes({
  width,
  height,
  columnIntervalMs,
  timeRangeSeconds,
  onTimeRangeChange,
  minColor,
  maxColor,
  panOffsetPixels,
  onPanOffsetChange,
  onStartPanning,
  plotRef,
  children,
}: SpectrogramAxesProps) {
  const logRange = Math.log(MAX_FREQUENCY / MIN_FREQUENCY);
  const decibelTickCount = Math.min(5, Math.floor(maxColor - minColor) + 1);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startOffset: number;
    didMove: boolean;
  } | null>(null);

  const updateFromPointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || width <= 0) return;

    const deltaX = event.clientX - drag.startX;
    if (!drag.didMove && Math.abs(deltaX) > 0) {
      drag.didMove = true;
      onStartPanning();
    }
    onPanOffsetChange(Math.max(0, Math.min(width * 3, drag.startOffset + deltaX)));
  };

  return (
    <div className="grid min-h-0 min-w-0 flex-1 grid-cols-[110px_minmax(0,1fr)_90px] grid-rows-[minmax(0,1fr)_32px] overflow-hidden">
      <svg
        aria-hidden="true"
        className="row-start-1 h-full w-full select-none text-muted-foreground"
        viewBox={`0 0 110 ${height}`}
        preserveAspectRatio="none"
      >
        <text
          x="10"
          y={height / 2}
          textAnchor="middle"
          transform={`rotate(-90 10 ${height / 2})`}
          className="fill-current text-[10px]"
        >
          Frequency (Hz)
        </text>
        <line x1="108" y1="0" x2="108" y2={height} className="stroke-border" />
        {FREQUENCY_LABELS.map((frequency) => {
          const y = height * (1 - Math.log(frequency / MIN_FREQUENCY) / logRange);
          const labelY = Math.max(9, Math.min(height - 2, y + 3));

          return (
            <g key={frequency}>
              <line x1="103" y1={y} x2="108" y2={y} className="stroke-muted-foreground/60" />
              <text x="100" y={labelY} textAnchor="end" className="fill-current text-[10px]">
                {frequency}
              </text>
            </g>
          );
        })}
      </svg>

      <div
        ref={plotRef}
        className="relative col-start-2 row-start-1 min-h-0 min-w-0 overflow-hidden"
      >
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 size-full text-muted-foreground"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
        >
          {GRID_FREQUENCIES.map((frequency) => {
            const y = height * (1 - Math.log(frequency / MIN_FREQUENCY) / logRange);
            return (
              <line
                key={frequency}
                x1="0"
                y1={y}
                x2={width}
                y2={y}
                className="stroke-current"
                strokeOpacity={frequency === 60 || frequency === 1_000 ? "0.4" : "0.18"}
                strokeWidth={frequency === 60 || frequency === 1_000 ? "1.25" : "1"}
              />
            );
          })}
        </svg>
        {children}
      </div>

      <svg
        aria-hidden="true"
        className="col-start-3 row-start-1 h-full w-full select-none text-muted-foreground"
        viewBox={`0 0 90 ${height}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="decibel-scale" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="rgb(0, 0, 0)" />
            <stop offset="12%" stopColor="rgb(9, 8, 35)" />
            <stop offset="34%" stopColor="rgb(61, 31, 170)" />
            <stop offset="56%" stopColor="rgb(174, 35, 132)" />
            <stop offset="74%" stopColor="rgb(247, 71, 24)" />
            <stop offset="88%" stopColor="rgb(255, 191, 0)" />
            <stop offset="100%" stopColor="rgb(255, 255, 170)" />
          </linearGradient>
        </defs>
        <text
          x="78"
          y={height / 2}
          textAnchor="middle"
          transform={`rotate(90 78 ${height / 2})`}
          className="fill-current text-[10px]"
        >
          Level (dB)
        </text>
        <rect x="6" y="0" width="12" height={height} fill="url(#decibel-scale)" />
        {Array.from({ length: decibelTickCount }, (_, index) => {
          const position = index / Math.max(decibelTickCount - 1, 1);
          const y = height * (1 - position);
          const value = Math.round(minColor + (maxColor - minColor) * position);
          return (
            <g key={`${index}-${value}`}>
              <line x1="18" y1={y} x2="22" y2={y} className="stroke-muted-foreground/60" />
              <text
                x="25"
                y={Math.max(9, Math.min(height - 2, y + 3))}
                className="fill-current text-[10px]"
              >
                {value}
              </text>
            </g>
          );
        })}
      </svg>

      <svg
        role="group"
        aria-label="Time axis. Drag left or right to pan through captured audio. Scroll to change the displayed time range."
        tabIndex={0}
        onWheel={(event) => {
          event.preventDefault();
          const nextRange = Math.max(
            2,
            Math.min(30, timeRangeSeconds * Math.exp(event.deltaY * 0.001)),
          );
          onTimeRangeChange(Math.round(nextRange * 10) / 10);
        }}
        onPointerDown={(event) => {
          dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startOffset: panOffsetPixels,
            didMove: false,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={updateFromPointer}
        onPointerUp={(event) => {
          dragRef.current = null;
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          onStartPanning();
          const direction = event.key === "ArrowRight" ? 1 : -1;
          onPanOffsetChange(Math.max(0, Math.min(width * 3, panOffsetPixels + direction * 10)));
        }}
        className="col-start-2 row-start-2 h-full w-full touch-none cursor-ew-resize select-none text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        viewBox={`0 0 ${width} 32`}
        preserveAspectRatio="none"
      >
        <text x={width / 2} y="28" textAnchor="middle" className="fill-current text-[10px]">
          Time
        </text>
        {TIME_TICK_POSITIONS.map((position) => {
          const x = width * position;
          const ageSeconds = ((panOffsetPixels + (width - x)) * columnIntervalMs) / 1_000;
          const anchor = position === 0 ? "start" : position === 1 ? "end" : "middle";

          return (
            <g key={position}>
              <line x1={x} y1="0" x2={x} y2="5" className="stroke-muted-foreground/60" />
              <text x={x} y="14" textAnchor={anchor} className="fill-current text-[10px]">
                {formatTime(ageSeconds)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
