import type { PointerEvent as ReactPointerEvent, ReactNode, RefObject } from "react";
import { useRef } from "react";
import { SPECTROGRAM_COLUMN_INTERVAL_MS } from "./Spectrogram";
import { getFrequencyOffsetLimits } from "@/lib/frequency-range";

const FREQUENCY_TICKS = [30, 50, 100, 200, 500, 1_000, 2_000, 5_000, 10_000, 20_000];
const TIME_TICK_POSITIONS = [0, 1 / 3, 2 / 3, 1];
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

type SpectrogramAxesProps = {
  width: number;
  height: number;
  sampleRate: number;
  minFrequency: number;
  maxFrequency: number;
  frequencyOffsetOctaves: number;
  onFrequencyOffsetChange: (offset: number) => void;
  plotRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
};

function formatFrequency(frequency: number) {
  return frequency >= 1_000 ? `${frequency / 1_000} kHz` : `${frequency} Hz`;
}

function formatTime(seconds: number) {
  if (seconds <= 0.5) return "Now";
  return `${seconds >= 10 ? Math.round(seconds) : seconds.toFixed(1)}s`;
}

function frequencyToNote(frequency: number) {
  const midiNote = Math.round(69 + 12 * Math.log2(frequency / 440));
  const noteName = NOTE_NAMES[((midiNote % 12) + 12) % 12]!;
  const octave = Math.floor(midiNote / 12) - 1;
  return `${noteName}${octave}`;
}

export function SpectrogramAxes({
  width,
  height,
  sampleRate,
  minFrequency,
  maxFrequency,
  frequencyOffsetOctaves,
  onFrequencyOffsetChange,
  plotRef,
  children,
}: SpectrogramAxesProps) {
  const logRange = Math.log(maxFrequency / minFrequency);
  const dragRef = useRef<{ pointerId: number; startY: number; startOffset: number } | null>(null);
  const offsetLimits = getFrequencyOffsetLimits(sampleRate);
  const frequencies = FREQUENCY_TICKS.filter(
    (frequency) => frequency >= minFrequency && frequency <= maxFrequency,
  );

  const updateFromPointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || height <= 0) return;
    const octaveChange = ((event.clientY - drag.startY) / height) * 2;
    const nextOffset = Math.max(
      offsetLimits.min,
      Math.min(offsetLimits.max, drag.startOffset + octaveChange),
    );
    onFrequencyOffsetChange(nextOffset);
  };

  return (
    <div className="grid min-h-0 min-w-0 flex-1 grid-cols-[78px_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_32px] overflow-hidden">
      <svg
        role="group"
        aria-label="Frequency axis. Drag vertically to pan the displayed frequency range. Use the up and down arrow keys to adjust it."
        tabIndex={0}
        onPointerDown={(event) => {
          dragRef.current = {
            pointerId: event.pointerId,
            startY: event.clientY,
            startOffset: frequencyOffsetOctaves,
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
          if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
          event.preventDefault();
          const amount = event.key === "ArrowUp" ? 1 / 12 : -1 / 12;
          onFrequencyOffsetChange(
            Math.max(
              offsetLimits.min,
              Math.min(offsetLimits.max, frequencyOffsetOctaves + amount),
            ),
          );
        }}
        className="row-start-1 h-full w-full touch-none select-none text-muted-foreground cursor-ns-resize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        viewBox={`0 0 78 ${height}`}
        preserveAspectRatio="none"
      >
        <text
          x="10"
          y={height / 2}
          textAnchor="middle"
          transform={`rotate(-90 10 ${height / 2})`}
          className="fill-current text-[10px]"
        >
          Frequency / note
        </text>
        <line x1="76" y1="0" x2="76" y2={height} className="stroke-border" />
        {frequencies.map((frequency) => {
          const y = height * (1 - Math.log(frequency / minFrequency) / logRange);
          const labelY = Math.max(10, Math.min(height - 14, y - 2));

          return (
            <g key={frequency}>
              <line x1="71" y1={y} x2="76" y2={y} className="stroke-muted-foreground/60" />
              <text x="68" y={labelY} textAnchor="end" className="fill-current text-[10px]">
                {formatFrequency(frequency)}
              </text>
              <text
                x="68"
                y={labelY + 12}
                textAnchor="end"
                className="fill-current text-[10px] opacity-70"
              >
                {frequencyToNote(frequency)}
              </text>
            </g>
          );
        })}
      </svg>

      <div
        ref={plotRef}
        className="relative col-start-2 row-start-1 min-h-0 min-w-0 overflow-hidden rounded-t-sm border-t border-r border-border"
      >
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 size-full text-muted-foreground"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
        >
          {frequencies.map((frequency) => {
            const y = height * (1 - Math.log(frequency / minFrequency) / logRange);
            return (
              <line
                key={frequency}
                x1="0"
                y1={y}
                x2={width}
                y2={y}
                className="stroke-current"
                strokeOpacity="0.22"
                strokeWidth="1"
              />
            );
          })}
        </svg>
        {children}
      </div>

      <svg
        aria-hidden="true"
        className="col-start-2 row-start-2 h-full w-full text-muted-foreground"
        viewBox={`0 0 ${width} 32`}
        preserveAspectRatio="none"
      >
        <text x={width / 2} y="28" textAnchor="middle" className="fill-current text-[10px]">
          Time
        </text>
        {TIME_TICK_POSITIONS.map((position) => {
          const x = width * position;
          const ageSeconds = ((width - x) * SPECTROGRAM_COLUMN_INTERVAL_MS) / 1_000;
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
