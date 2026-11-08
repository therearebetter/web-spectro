import { Button } from "./components/ui/button";
import { MoonIcon, PlayIcon, Settings, SunIcon } from "lucide-react";

type ToolbarProps = {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
};

export function Toolbar({ isDarkMode, onToggleDarkMode }: ToolbarProps) {
  return (
    <div className="flex shrink-0 gap-3">
      <Button>
        <PlayIcon /> Play
      </Button>
      <Button variant="outline">
        <Settings /> Settings
      </Button>
      <Button
        type="button"
        variant="outline"
        aria-pressed={isDarkMode}
        className="ml-auto"
        onClick={onToggleDarkMode}
      >
        {isDarkMode ? <SunIcon /> : <MoonIcon />}
      </Button>
    </div>
  );
}
