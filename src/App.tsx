import "./index.css";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Circle, Text } from "react-konva";
import { cn } from "@/lib/utils";
import { Toolbar } from "./Toolbar";
import { Spectrogram } from "./Spectrogram";
import { SpectrogramAxes } from "./SpectrogramAxes";
import { Settings } from "./Settings";

const SETTINGS_STORAGE_KEY = "spectrogram-settings";
const DEFAULT_SETTINGS = {
  timeRange: 8,
  yResolution: 8_192,
  minFrequency: 60,
  maxFrequency: 1_000,
  minColor: -100,
  maxColor: -25,
};
const ALLOWED_FFT_SIZES = [2_048, 4_096, 8_192, 16_384, 32_768];

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "null");
    if (!saved || typeof saved !== "object") return DEFAULT_SETTINGS;

    const timeRange =
      typeof saved.timeRange === "number" && saved.timeRange >= 2 && saved.timeRange <= 30
        ? saved.timeRange
        : DEFAULT_SETTINGS.timeRange;
    const yResolution = ALLOWED_FFT_SIZES.includes(saved.yResolution)
      ? saved.yResolution
      : DEFAULT_SETTINGS.yResolution;
    const hasValidFrequencyRange =
      Number.isInteger(saved.minFrequency) &&
      Number.isInteger(saved.maxFrequency) &&
      saved.minFrequency >= 20 &&
      saved.maxFrequency <= 20_000 &&
      saved.minFrequency < saved.maxFrequency;
    const hasValidColorRange =
      Number.isInteger(saved.minColor) &&
      Number.isInteger(saved.maxColor) &&
      saved.minColor >= -120 &&
      saved.maxColor <= 0 &&
      saved.minColor < saved.maxColor;

    return {
      timeRange,
      yResolution,
      minFrequency: hasValidFrequencyRange
        ? saved.minFrequency
        : DEFAULT_SETTINGS.minFrequency,
      maxFrequency: hasValidFrequencyRange
        ? saved.maxFrequency
        : DEFAULT_SETTINGS.maxFrequency,
      minColor: hasValidColorRange ? saved.minColor : DEFAULT_SETTINGS.minColor,
      maxColor: hasValidColorRange ? saved.maxColor : DEFAULT_SETTINGS.maxColor,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem("theme") === "dark");
  const [savedSettings] = useState(loadSettings);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [microphoneError, setMicrophoneError] = useState<string | null>(null);
  const [isRequestingMicrophone, setIsRequestingMicrophone] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [panOffsetPixels, setPanOffsetPixels] = useState(0);
  const [timeRange, setTimeRange] = useState(savedSettings.timeRange);
  const [yResolution, setYResolution] = useState(savedSettings.yResolution);
  const [minFrequency, setMinFrequency] = useState(savedSettings.minFrequency);
  const [maxFrequency, setMaxFrequency] = useState(savedSettings.maxFrequency);
  const [minColor, setMinColor] = useState(savedSettings.minColor);
  const [maxColor, setMaxColor] = useState(savedSettings.maxColor);
  const audioRef = useRef<{ stream: MediaStream; context: AudioContext } | null>(null);
  const yResolutionRef = useRef(yResolution);
  yResolutionRef.current = yResolution;
  const requestTokenRef = useRef(0);
  const requestPendingRef = useRef(false);

  const stageContainerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const container = stageContainerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const nextSize = {
        width: Math.floor(entry.contentRect.width),
        height: Math.floor(entry.contentRect.height),
      };
      setStageSize(nextSize);
      setPanOffsetPixels((offset) => Math.min(offset, nextSize.width * 3));
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ timeRange, yResolution, minFrequency, maxFrequency, minColor, maxColor }),
    );
  }, [maxColor, maxFrequency, minColor, minFrequency, timeRange, yResolution]);

  useEffect(() => {
    if (!analyser) return;
    analyser.fftSize = yResolution;
    analyser.minDecibels = minColor;
    analyser.maxDecibels = maxColor;
  }, [analyser, maxColor, minColor, yResolution]);

  const requestMicrophone = useCallback(async () => {
    if (audioRef.current || requestPendingRef.current) return;
    requestPendingRef.current = true;
    setIsRequestingMicrophone(true);
    setMicrophoneError(null);
    const requestToken = ++requestTokenRef.current;
    let stream: MediaStream | null = null;
    let context: AudioContext | null = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          autoGainControl: false,
          echoCancellation: false,
          noiseSuppression: false,
        },
      });
      if (requestToken !== requestTokenRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      context = new AudioContext();
      await context.resume();
      if (requestToken !== requestTokenRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        void context.close();
        return;
      }

      const source = context.createMediaStreamSource(stream);
      const nextAnalyser = context.createAnalyser();
      nextAnalyser.fftSize = yResolutionRef.current;
      nextAnalyser.smoothingTimeConstant = 0.45;
      nextAnalyser.minDecibels = -100;
      nextAnalyser.maxDecibels = -25;
      source.connect(nextAnalyser);

      audioRef.current = { stream, context };
      setAnalyser(nextAnalyser);
      setIsPlaying(true);
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      if (context) void context.close();
      if (requestToken === requestTokenRef.current) {
        setMicrophoneError(
          error instanceof Error ? error.message : "Could not access the microphone.",
        );
      }
    } finally {
      if (requestToken === requestTokenRef.current) {
        requestPendingRef.current = false;
        setIsRequestingMicrophone(false);
      }
    }
  }, []);

  useEffect(() => {
    // Deferring lets React StrictMode's development-only cleanup cancel its first mount.
    const timeout = window.setTimeout(() => void requestMicrophone(), 0);
    return () => {
      window.clearTimeout(timeout);
      requestTokenRef.current += 1;
      requestPendingRef.current = false;
      const audio = audioRef.current;
      audioRef.current = null;
      audio?.stream.getTracks().forEach((track) => track.stop());
      if (audio) void audio.context.close();
    };
  }, [requestMicrophone]);

  const togglePlayback = useCallback(() => {
    if (!analyser) {
      void requestMicrophone();
      return;
    }
    setIsPlaying((playing) => {
      const nextPlaying = !playing;
      if (nextPlaying) setPanOffsetPixels(0);
      return nextPlaying;
    });
  }, [analyser, requestMicrophone]);

  const changeTimeRange = useCallback((seconds: number) => {
    setTimeRange(seconds);
    setPanOffsetPixels(0);
  }, []);

  return (
    <div
      className={cn(
        "flex h-dvh w-full flex-col gap-4 overflow-hidden bg-background p-4 text-foreground",
        isDarkMode && "dark",
      )}
    >
      <Toolbar
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode((dark) => !dark)}
        isPlaying={isPlaying}
        isRequestingMicrophone={isRequestingMicrophone}
        onTogglePlayback={togglePlayback}
        microphoneError={microphoneError}
        isSettingsOpen={isSettingsOpen}
        setSettingsOpen={setSettingsOpen}
      />
      <div
        aria-hidden={!isSettingsOpen}
        inert={!isSettingsOpen}
        className={cn(
          "grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
          isSettingsOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 -my-2",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <Settings
            timeRange={timeRange}
            onTimeRangeChange={changeTimeRange}
            yResolution={yResolution}
            onYResolutionChange={setYResolution}
            minFrequency={minFrequency}
            onMinFrequencyChange={(value) => setMinFrequency(Math.min(value, maxFrequency - 1))}
            maxFrequency={maxFrequency}
            onMaxFrequencyChange={(value) => setMaxFrequency(Math.max(value, minFrequency + 1))}
            minColor={minColor}
            onMinColorChange={(value) => setMinColor(Math.min(value, maxColor - 1))}
            maxColor={maxColor}
            onMaxColorChange={(value) => setMaxColor(Math.max(value, minColor + 1))}
          />
        </div>
      </div>
      <SpectrogramAxes
        plotRef={stageContainerRef}
        width={stageSize.width}
        height={stageSize.height}
        columnIntervalMs={(timeRange * 1_000) / Math.max(stageSize.width, 1)}
        timeRangeSeconds={timeRange}
        onTimeRangeChange={changeTimeRange}
        minColor={minColor}
        maxColor={maxColor}
        minFrequency={minFrequency}
        maxFrequency={maxFrequency}
        panOffsetPixels={panOffsetPixels}
        onPanOffsetChange={setPanOffsetPixels}
        onStartPanning={() => setIsPlaying(false)}
      >
        <Spectrogram
          analyser={analyser}
          isPlaying={isPlaying}
          width={stageSize.width}
          height={stageSize.height}
          minFrequency={minFrequency}
          maxFrequency={maxFrequency}
          panOffsetPixels={panOffsetPixels}
          timeRangeSeconds={timeRange}
          yResolution={yResolution}
          minColor={minColor}
          maxColor={maxColor}
        />
        <Stage
          className="absolute inset-0 z-20"
          width={stageSize.width}
          height={stageSize.height}
          style={{ transform: `translateX(${panOffsetPixels}px)` }}
        >
          <Layer />
        </Stage>
      </SpectrogramAxes>
    </div>
  );
}

export default App;
