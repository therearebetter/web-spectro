import "./index.css";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Circle, Text } from "react-konva";
import { cn } from "@/lib/utils";
import { Toolbar } from "./Toolbar";
import { Spectrogram } from "./Spectrogram";
import { SpectrogramAxes } from "./SpectrogramAxes";
import { Settings } from "./Settings";

export function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem("theme") === "dark");
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [microphoneError, setMicrophoneError] = useState<string | null>(null);
  const [isRequestingMicrophone, setIsRequestingMicrophone] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [panOffsetPixels, setPanOffsetPixels] = useState(0);
  const audioRef = useRef<{ stream: MediaStream; context: AudioContext } | null>(null);
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
      nextAnalyser.fftSize = 2048;
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
          isSettingsOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <Settings />
        </div>
      </div>
      <SpectrogramAxes
        plotRef={stageContainerRef}
        width={stageSize.width}
        height={stageSize.height}
        panOffsetPixels={panOffsetPixels}
        onPanOffsetChange={setPanOffsetPixels}
        onStartPanning={() => setIsPlaying(false)}
      >
        <Spectrogram
          analyser={analyser}
          isPlaying={isPlaying}
          width={stageSize.width}
          height={stageSize.height}
          minFrequency={60}
          maxFrequency={1_000}
          panOffsetPixels={panOffsetPixels}
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
