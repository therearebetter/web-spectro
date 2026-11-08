import { Button } from "./components/ui/button";
import { ChevronRightIcon, MoonIcon, MusicIcon, PauseIcon, PlayIcon, SunIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "./components/ui/separator";

type ToolbarProps = {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  isPlaying: boolean;
  isRequestingMicrophone: boolean;
  onTogglePlayback: () => void;
  microphoneError: string | null;
  isSettingsOpen: boolean;
  setSettingsOpen: (isOpen: boolean) => void;
};

export function Toolbar({
  isDarkMode,
  onToggleDarkMode,
  isPlaying,
  isRequestingMicrophone,
  onTogglePlayback,
  microphoneError,
  isSettingsOpen,
  setSettingsOpen,
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
      <Separator orientation="vertical" className="bg-muted-foreground w-px" />
      <MusicIcon className="text-muted-foreground" />
      <Button
        variant="outline"
        aria-expanded={isSettingsOpen}
        onClick={() => setSettingsOpen(!isSettingsOpen)}
        className="ml-auto"
      >
        <ChevronRightIcon
          className={cn(
            "transition-transform duration-200 ease-out motion-reduce:transition-none",
            isSettingsOpen && "rotate-90",
          )}
        />
        Settings
      </Button>
      <Button type="button" variant="outline" aria-pressed={isDarkMode} onClick={onToggleDarkMode}>
        {isDarkMode ? <SunIcon /> : <MoonIcon />}
      </Button>
      {microphoneError && (
        <p role="alert" className="text-sm text-destructive">
          {microphoneError} Allow microphone access, then press Play to retry.
        </p>
      )}
    </div>
  );
}
