import { Button } from "./components/ui/button";
import {
  BookIcon,
  ChevronLeftIcon,
  MusicIcon,
  PauseIcon,
  PlayIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "./components/ui/separator";
import type { NoteOption } from "./lib/notes";
import { noteButtonClass } from "./lib/notes";

type ToolbarProps = {
  isPlaying: boolean;
  isRequestingMicrophone: boolean;
  onTogglePlayback: () => void;
  microphoneError: string | null;
  isSettingsOpen: boolean;
  setSettingsOpen: (isOpen: boolean) => void;
  notes: NoteOption[];
  onHoverNote: (midi: number | null) => void;
  onPlayNote: (midi: number) => void;
  onStartNote: (midi: number, pressed?: boolean) => void;
  onStopNote: (midi: number) => void;
  pressedNoteMidi: number | null;
  playNotesOnHover: boolean;
};

export function Toolbar({
  isPlaying,
  isRequestingMicrophone,
  onTogglePlayback,
  microphoneError,
  isSettingsOpen,
  setSettingsOpen,
  notes,
  onHoverNote,
  onPlayNote,
  onStartNote,
  onStopNote,
  pressedNoteMidi,
  playNotesOnHover,
}: ToolbarProps) {
  return (
    <div className="flex shrink-0 items-center gap-4">
      <Button
        type="button"
        variant="default"
        aria-label={isPlaying ? "Pause spectrogram" : "Play spectrogram"}
        disabled={isRequestingMicrophone}
        onClick={onTogglePlayback}
        className="w-24 justify-start"
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
        {isPlaying ? "Pause" : "Play"}
      </Button>
      <Button variant="outline">
        <BookIcon />{" "}
        <span>
          <u>E</u>xamples
        </span>
      </Button>
      <Separator orientation="vertical" className="bg-muted-foreground w-px" />
      <MusicIcon className="text-muted-foreground" />
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {notes.map((note, index) => (
          <Button
            key={note.midi}
            type="button"
            variant="outline"
            size="sm"
            aria-label={`Play ${note.name}, ${note.frequency.toFixed(1)} hertz`}
            onPointerEnter={() => {
              onHoverNote(note.midi);
              if (playNotesOnHover) onStartNote(note.midi, false);
            }}
            onPointerLeave={() => {
              onHoverNote(null);
              onStopNote(note.midi);
            }}
            onPointerDown={(event) => {
              event.preventDefault();
              if (!playNotesOnHover) onStartNote(note.midi);
            }}
            onPointerUp={() => {
              if (!playNotesOnHover) onStopNote(note.midi);
            }}
            onPointerCancel={() => onStopNote(note.midi)}
            onFocus={() => {
              onHoverNote(note.midi);
              if (playNotesOnHover) onStartNote(note.midi, false);
            }}
            onBlur={() => {
              onHoverNote(null);
              onStopNote(note.midi);
            }}
            onClick={(event) => {
              if (!playNotesOnHover && event.detail === 0) onPlayNote(note.midi);
            }}
            aria-pressed={pressedNoteMidi === note.midi}
            data-pressed={pressedNoteMidi === note.midi}
            className={cn(
              noteButtonClass(note.color),
              "active:scale-95 active:brightness-75 data-[pressed=true]:scale-95 data-[pressed=true]:brightness-75",
            )}
          >
            {note.name} <span className="text-muted-foreground underline text-xs">{index + 1}</span>
          </Button>
        ))}
      </div>
      <div className="mx-auto border-x px-3 py-0.5 border-blue-400">
        <div className="mx-auto border-x px-3 py-0.5 border-pink-400">
          <div className="mx-auto border-x px-3 border-foreground">Web Spectro</div>
        </div>
      </div>

      <Button
        variant="outline"
        aria-expanded={isSettingsOpen}
        onClick={() => setSettingsOpen(!isSettingsOpen)}
      >
        <span>
          <u>S</u>ettings
        </span>
        <ChevronLeftIcon
          className={cn(
            "transition-transform duration-200 ease-out motion-reduce:transition-none",
            isSettingsOpen && "-rotate-90",
          )}
        />
      </Button>

      {microphoneError && (
        <p role="alert" className="text-sm text-destructive">
          {microphoneError} Allow microphone access, then press Play to retry.
        </p>
      )}
    </div>
  );
}
