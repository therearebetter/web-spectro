export type NoteOption = {
  midi: number;
  name: string;
  frequency: number;
  color: "blue" | "pink" | "neutral";
};

const NOTE_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];

export const NOTE_OPTIONS: NoteOption[] = Array.from({ length: 24 }, (_, index) => {
  const midi = 42 + index;
  const octave = Math.floor(midi / 12) - 1;
  return {
    midi,
    name: `${NOTE_NAMES[midi % 12]}${octave}`,
    frequency: 440 * 2 ** ((midi - 69) / 12),
    color: midi <= 49 ? "blue" : midi >= 54 ? "pink" : "neutral",
  };
});

export const DEFAULT_NOTE_IDS = [49, 55, 63];

export function noteColor(color: NoteOption["color"], isDarkMode: boolean) {
  if (isDarkMode) {
    if (color === "blue") return "#7dd3fc";
    if (color === "pink") return "#f9a8d4";
    return "#c4b5fd";
  }
  if (color === "blue") return "#0284c7";
  if (color === "pink") return "#db2777";
  return "#7c3aed";
}

export function noteButtonClass(color: NoteOption["color"]) {
  if (color === "blue") {
    return "border-sky-300 bg-sky-200 text-sky-950 hover:bg-sky-300 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-200 dark:hover:bg-sky-900";
  }
  if (color === "pink") {
    return "border-pink-300 bg-pink-200 text-pink-950 hover:bg-pink-300 dark:border-pink-700 dark:bg-pink-950 dark:text-pink-200 dark:hover:bg-pink-900";
  }
  return "border-violet-300 bg-violet-200 text-violet-950 hover:bg-violet-300 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-200 dark:hover:bg-violet-900";
}
