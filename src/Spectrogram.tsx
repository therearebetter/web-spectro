import { useEffect, useRef } from "react";

type SpectrogramProps = {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  width: number;
  height: number;
  minFrequency: number;
  maxFrequency: number;
  panOffsetPixels: number;
  timeRangeSeconds: number;
  yResolution: number;
  minColor: number;
  maxColor: number;
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
  timeRangeSeconds,
  yResolution,
  minColor,
  maxColor,
}: SpectrogramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bufferWidth = width * 4;
  const liveViewOffset = bufferWidth - width;
  const columnIntervalMs = (timeRangeSeconds * 1_000) / Math.max(width, 1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width < 1 || height < 1) return;

    canvas.width = bufferWidth;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.fillStyle = "black";
    context.fillRect(0, 0, bufferWidth, height);
  }, [bufferWidth, columnIntervalMs, height, liveViewOffset, width]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser || !isPlaying || width < 1 || height < 1) return;
    analyser.fftSize = yResolution;
    const context = canvas.getContext("2d");
    if (!context) return;

    const frequencyData = new Float32Array(analyser.frequencyBinCount);
    const sampleRate = analyser.context.sampleRate;
    const logRange = Math.log(maxFrequency / minFrequency);
    let animationFrame = 0;
    let lastDraw: number | null = null;
    let elapsedSinceDraw = 0;
    const draw = (timestamp: number) => {
      animationFrame = requestAnimationFrame(draw);
      if (lastDraw === null) {
        lastDraw = timestamp;
        return;
      }
      elapsedSinceDraw += timestamp - lastDraw;
      lastDraw = timestamp;
      const columnsToAdvance = Math.floor(elapsedSinceDraw / columnIntervalMs);
      if (columnsToAdvance < 1) return;
      elapsedSinceDraw -= columnsToAdvance * columnIntervalMs;

      analyser.getFloatFrequencyData(frequencyData);
      const advance = Math.min(columnsToAdvance, bufferWidth);
      if (advance < bufferWidth) {
        context.drawImage(
          canvas,
          advance,
          0,
          bufferWidth - advance,
          height,
          0,
          0,
          bufferWidth - advance,
          height,
        );
      }
      context.clearRect(bufferWidth - advance, 0, advance, height);

      const columns = context.createImageData(advance, height);
      for (let y = 0; y < height; y += 1) {
        const verticalPosition = 1 - y / Math.max(height - 1, 1);
        const frequency = minFrequency * Math.exp(verticalPosition * logRange);
        const binPosition = (frequency / sampleRate) * analyser.fftSize;
        const lowerBin = Math.max(0, Math.min(Math.floor(binPosition), frequencyData.length - 1));
        const upperBin = Math.min(lowerBin + 1, frequencyData.length - 1);
        const binFraction = binPosition - lowerBin;
        const lowerDb = frequencyData[lowerBin] ?? analyser.minDecibels;
        const upperDb = frequencyData[upperBin] ?? lowerDb;
        const db = lowerDb + (upperDb - lowerDb) * binFraction;
        const normalized = Math.max(
          0,
          Math.min(1, (db - minColor) / (maxColor - minColor)),
        );
        const [red, green, blue] = colorForLevel(normalized ** 1.35);
        for (let x = 0; x < advance; x += 1) {
          const offset = (y * advance + x) * 4;
          columns.data[offset] = red!;
          columns.data[offset + 1] = green!;
          columns.data[offset + 2] = blue!;
          columns.data[offset + 3] = 255;
        }
      }

      context.putImageData(columns, bufferWidth - advance, 0);
    };

    animationFrame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationFrame);
  }, [
    analyser,
    bufferWidth,
    columnIntervalMs,
    height,
    isPlaying,
    liveViewOffset,
    maxColor,
    maxFrequency,
    minColor,
    minFrequency,
    yResolution,
    width,
  ]);

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
