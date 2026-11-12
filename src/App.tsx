import "./index.css";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Circle, Text } from "react-konva";
import { cn } from "@/lib/utils";
import { Toolbar } from "./Toolbar";
import { Spectrogram } from "./Spectrogram";
import { SpectrogramAxes } from "./SpectrogramAxes";
import { Settings } from "./Settings";
import { DEFAULT_NOTE_IDS, NOTE_OPTIONS, noteColor } from "./lib/notes";

const SETTINGS_STORAGE_KEY = "spectrogram-settings";
const DEFAULT_SETTINGS = {
  timeRange: 8,
  yResolution: 8_192,
  minFrequency: 60,
  maxFrequency: 1_000,
  minColor: -100,
  maxColor: -25,
  enabledNotes: DEFAULT_NOTE_IDS,
  playNotesOnHover: false,
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
      minFrequency: hasValidFrequencyRange ? saved.minFrequency : DEFAULT_SETTINGS.minFrequency,
      maxFrequency: hasValidFrequencyRange ? saved.maxFrequency : DEFAULT_SETTINGS.maxFrequency,
      minColor: hasValidColorRange ? saved.minColor : DEFAULT_SETTINGS.minColor,
      maxColor: hasValidColorRange ? saved.maxColor : DEFAULT_SETTINGS.maxColor,
      enabledNotes: Array.isArray(saved.enabledNotes)
        ? [
            ...new Set(
              saved.enabledNotes.filter(
                (midi: unknown): midi is number =>
                  Number.isInteger(midi) && NOTE_OPTIONS.some((note) => note.midi === midi),
              ),
            ),
          ]
        : DEFAULT_SETTINGS.enabledNotes,
      playNotesOnHover:
        typeof saved.playNotesOnHover === "boolean"
          ? saved.playNotesOnHover
          : DEFAULT_SETTINGS.playNotesOnHover,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function App() {
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
  const [enabledNotes, setEnabledNotes] = useState<number[]>(savedSettings.enabledNotes);
  const [playNotesOnHover, setPlayNotesOnHover] = useState(savedSettings.playNotesOnHover);
  const [hoveredNoteMidi, setHoveredNoteMidi] = useState<number | null>(null);
  const [clickedNoteMidi, setClickedNoteMidi] = useState<number | null>(null);
  const [pressedNoteMidi, setPressedNoteMidi] = useState<number | null>(null);
  const audioRef = useRef<{ stream: MediaStream; context: AudioContext } | null>(null);
  const noteAudioContextRef = useRef<AudioContext | null>(null);
  const noteVoiceRef = useRef<{
    midi: number;
    oscillator: OscillatorNode;
    gain: GainNode;
    sustained: boolean;
  } | null>(null);
  const noteTimerRef = useRef<number | null>(null);
  const clickedNoteTimerRef = useRef<number | null>(null);
  const noteStartSequenceRef = useRef(0);
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
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        timeRange,
        yResolution,
        minFrequency,
        maxFrequency,
        minColor,
        maxColor,
        enabledNotes,
        playNotesOnHover,
      }),
    );
  }, [
    enabledNotes,
    maxColor,
    maxFrequency,
    minColor,
    minFrequency,
    playNotesOnHover,
    timeRange,
    yResolution,
  ]);

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

  const stopActiveNote = useCallback(() => {
    const voice = noteVoiceRef.current;
    if (!voice) return;
    const now = voice.gain.context.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setTargetAtTime(0, now, 0.025);
    try {
      voice.oscillator.stop(now + 0.1);
    } catch {
      // The note may already have finished.
    }
    noteVoiceRef.current = null;
    if (noteTimerRef.current !== null) window.clearTimeout(noteTimerRef.current);
    noteTimerRef.current = null;
  }, []);

  const startNote = useCallback(
    async (midi: number, sustained: boolean) => {
      const sequence = ++noteStartSequenceRef.current;
      stopActiveNote();
      const context =
        audioRef.current?.context ?? (noteAudioContextRef.current ??= new AudioContext());
      try {
        await context.resume();
        if (sequence !== noteStartSequenceRef.current) return;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const now = context.currentTime;
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(440 * 2 ** ((midi - 69) / 12), now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.025);
        if (!sustained) gain.gain.setTargetAtTime(0, now + 0.55, 0.08);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(now);
        if (!sustained) oscillator.stop(now + 0.9);
        noteVoiceRef.current = { midi, oscillator, gain, sustained };
        if (!sustained) {
          noteTimerRef.current = window.setTimeout(() => {
            if (noteVoiceRef.current?.oscillator === oscillator) noteVoiceRef.current = null;
            noteTimerRef.current = null;
          }, 950);
        }
      } catch (error) {
        console.error("Could not play note", error);
      }
    },
    [stopActiveNote],
  );

  const hoverNote = useCallback((midi: number | null) => {
    setHoveredNoteMidi(midi);
  }, []);

  const playNote = useCallback(
    (midi: number) => {
      setClickedNoteMidi(midi);
      if (clickedNoteTimerRef.current !== null) window.clearTimeout(clickedNoteTimerRef.current);
      void startNote(midi, false);
      clickedNoteTimerRef.current = window.setTimeout(() => {
        setClickedNoteMidi((current) => (current === midi ? null : current));
        clickedNoteTimerRef.current = null;
      }, 900);
    },
    [startNote],
  );

  const startSettingsNote = useCallback(
    (midi: number) => {
      void startNote(midi, true);
    },
    [startNote],
  );

  const startHeldNote = useCallback(
    (midi: number, pressed = true) => {
      if (pressed) setPressedNoteMidi(midi);
      void startNote(midi, true);
    },
    [startNote],
  );

  const stopSustainedNote = useCallback(
    (midi: number) => {
      if (noteVoiceRef.current?.midi === midi && noteVoiceRef.current.sustained) {
        stopActiveNote();
      }
    },
    [stopActiveNote],
  );

  const stopHeldNote = useCallback(
    (midi: number) => {
      setPressedNoteMidi((current) => (current === midi ? null : current));
      stopSustainedNote(midi);
    },
    [stopSustainedNote],
  );

  useEffect(
    () => () => {
      stopActiveNote();
      if (clickedNoteTimerRef.current !== null) window.clearTimeout(clickedNoteTimerRef.current);
      if (noteAudioContextRef.current) void noteAudioContextRef.current.close();
    },
    [stopActiveNote],
  );

  const changeTimeRange = useCallback((seconds: number) => {
    setTimeRange(seconds);
    setPanOffsetPixels(0);
  }, []);

  return (
    <div
      className={cn(
        "flex h-dvh w-full flex-col gap-4 overflow-hidden bg-background p-4 text-foreground dark",
      )}
    >
      <Toolbar
        isPlaying={isPlaying}
        isRequestingMicrophone={isRequestingMicrophone}
        onTogglePlayback={togglePlayback}
        microphoneError={microphoneError}
        isSettingsOpen={isSettingsOpen}
        setSettingsOpen={setSettingsOpen}
        notes={NOTE_OPTIONS.filter((note) => enabledNotes.includes(note.midi))}
        onHoverNote={hoverNote}
        onPlayNote={playNote}
        onStartNote={startHeldNote}
        onStopNote={stopHeldNote}
        pressedNoteMidi={pressedNoteMidi}
        playNotesOnHover={playNotesOnHover}
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
            enabledNotes={enabledNotes}
            onEnabledNotesChange={setEnabledNotes}
            onHoverNote={hoverNote}
            onStartPreviewNote={startSettingsNote}
            onStopPreviewNote={stopSustainedNote}
            playNotesOnHover={playNotesOnHover}
            onPlayNotesOnHoverChange={setPlayNotesOnHover}
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
        highlightedNoteFrequency={(() => {
          const midi = hoveredNoteMidi ?? clickedNoteMidi;
          return midi === null
            ? null
            : (NOTE_OPTIONS.find((note) => note.midi === midi)?.frequency ?? null);
        })()}
        highlightedNoteColor={(() => {
          const midi = hoveredNoteMidi ?? clickedNoteMidi;
          const note =
            midi === null ? undefined : NOTE_OPTIONS.find((option) => option.midi === midi);
          return note ? noteColor(note.color) : null;
        })()}
        selectedNotes={NOTE_OPTIONS.filter((note) => enabledNotes.includes(note.midi))}
        onHoverNote={hoverNote}
        onStartNote={(midi) => startHeldNote(midi, false)}
        onStopNote={stopSustainedNote}
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
          className="pointer-events-none absolute inset-0 z-0"
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
