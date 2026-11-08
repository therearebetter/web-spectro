import { useEffect, useRef } from "react";

type SpectrogramProps = {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  width: number;
  height: number;
  minFrequency: number;
  maxFrequency: number;
  panOffsetPixels: number;
};

const COLOR_STOPS = [
  { at: 0, color: [0, 0, 0] },
  { at: 0.12, color: [9, 8, 35] },
  { at: 0.34, color: [61, 31, 170] },
  { at: 0.56, color: [174, 35, 132] },
  { at: 0.74, color: [247, 71, 24] },
  { at: 0.88, color: [255, 191, 0] },
  { at: 1, color: [255, 255, 170] },
];

export const SPECTROGRAM_COLUMN_INTERVAL_MS = 33;

function colorForLevel(level: number) {
  const upperIndex = COLOR_STOPS.findIndex((stop) => stop.at >= level);
  const upper = COLOR_STOPS[Math.max(upperIndex, 1)]!;
  const lower = COLOR_STOPS[Math.max(upperIndex - 1, 0)]!;
  const amount = (level - lower.at) / (upper.at - lower.at || 1);

  return lower.color.map((channel, index) =>
    Math.round(channel + (upper.color[index]! - channel) * amount),
  );
}

export function Spectrogram({
  analyser,
  isPlaying,
  width,
  height,
  minFrequency,
  maxFrequency,
  panOffsetPixels,
}: SpectrogramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const writeXRef = useRef(0);
  const bufferWidth = width * 4;
  const liveViewOffset = bufferWidth - width;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width < 1 || height < 1) return;

    canvas.width = bufferWidth;
    canvas.height = height;
    writeXRef.current = liveViewOffset;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.fillStyle = "black";
    context.fillRect(0, 0, bufferWidth, height);
  }, [bufferWidth, height, liveViewOffset, width]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser || !isPlaying || width < 1 || height < 1) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const frequencyData = new Float32Array(analyser.frequencyBinCount);
    const column = context.createImageData(1, height);
    const sampleRate = analyser.context.sampleRate;
    const logRange = Math.log(maxFrequency / minFrequency);
    const pixels = column.data;
    let animationFrame = 0;
    let lastDraw = 0;
    let writeX = writeXRef.current;

    const draw = (timestamp: number) => {
      animationFrame = requestAnimationFrame(draw);
      if (timestamp - lastDraw < SPECTROGRAM_COLUMN_INTERVAL_MS) return;
      lastDraw = timestamp;

      analyser.getFloatFrequencyData(frequencyData);
      if (writeX >= bufferWidth) {
        const retainedWidth = bufferWidth - width;
        context.drawImage(canvas, width, 0, retainedWidth, height, 0, 0, retainedWidth, height);
        context.clearRect(retainedWidth, 0, width, height);
        writeX = retainedWidth;
        writeXRef.current = writeX;
      }

      for (let y = 0; y < height; y += 1) {
        const verticalPosition = 1 - y / Math.max(height - 1, 1);
        const frequency = minFrequency * Math.exp(verticalPosition * logRange);
        const bin = Math.max(
          0,
          Math.min(
            Math.round((frequency / sampleRate) * analyser.fftSize),
            frequencyData.length - 1,
          ),
        );
        const db = frequencyData[bin] ?? analyser.minDecibels;
        const normalized = Math.max(
          0,
          Math.min(1, (db - analyser.minDecibels) / (analyser.maxDecibels - analyser.minDecibels)),
        );
        const [red, green, blue] = colorForLevel(normalized ** 1.35);
        const offset = y * 4;
        pixels[offset] = red!;
        pixels[offset + 1] = green!;
        pixels[offset + 2] = blue!;
        pixels[offset + 3] = 255;
      }

      context.putImageData(column, writeX, 0);
      writeX += 1;
      writeXRef.current = writeX;
    };

    animationFrame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationFrame);
  }, [analyser, bufferWidth, height, isPlaying, liveViewOffset, maxFrequency, minFrequency, width]);

  return (
    <canvas
      ref={canvasRef}
      aria-label="Live microphone spectrogram"
      className="pointer-events-none absolute inset-y-0 left-0 h-full max-w-none"
      style={{
        width: bufferWidth,
        transform: `translateX(${-liveViewOffset + panOffsetPixels}px)`,
      }}
    />
  );
}
