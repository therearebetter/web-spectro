import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Slider } from "./components/ui/slider";

type SettingsProps = {
  timeRange: number;
  onTimeRangeChange: (value: number) => void;
  yResolution: number;
  onYResolutionChange: (value: number) => void;
  minColor: number;
  onMinColorChange: (value: number) => void;
  maxColor: number;
  onMaxColorChange: (value: number) => void;
};

const FFT_SIZES = [2_048, 4_096, 8_192, 16_384, 32_768];

function NumberSetting({
  id,
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-3">
        <Slider
          aria-label={label}
          min={min}
          max={max}
          step={1}
          value={[value]}
          onValueChange={([next]) => next !== undefined && onChange(next)}
          className="flex-1"
        />
        <div className="flex w-28 items-center gap-2">
          <Input
            id={id}
            type="number"
            min={min}
            max={max}
            step={1}
            value={value}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (Number.isFinite(next)) onChange(Math.max(min, Math.min(max, next)));
            }}
            className="h-8"
          />
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
      </div>
    </div>
  );
}

export function Settings({
  timeRange,
  onTimeRangeChange,
  yResolution,
  onYResolutionChange,
  minColor,
  onMinColorChange,
  maxColor,
  onMaxColorChange,
}: SettingsProps) {
  return (
    <div className="grid gap-4 rounded-md border bg-card p-4 text-card-foreground shadow-sm sm:grid-cols-3">
      <NumberSetting
        id="time-range"
        label="Time range"
        value={timeRange}
        min={2}
        max={30}
        unit="seconds"
        onChange={onTimeRangeChange}
      />
      <div className="grid gap-2">
        <Label htmlFor="y-resolution">Y-axis resolution</Label>
        <div className="flex items-center gap-3">
          <Slider
            aria-label="Y-axis resolution"
            min={0}
            max={FFT_SIZES.length - 1}
            step={1}
            value={[FFT_SIZES.indexOf(yResolution)]}
            onValueChange={([index]) => {
              if (index !== undefined) onYResolutionChange(FFT_SIZES[index]!);
            }}
            className="flex-1"
          />
          <div className="flex w-28 items-center gap-2">
            <Input
              id="y-resolution"
              type="number"
              min={FFT_SIZES[0]}
              max={FFT_SIZES[FFT_SIZES.length - 1]}
              step={1_024}
              value={yResolution}
              onChange={(event) => {
                const entered = Number(event.target.value);
                if (!Number.isFinite(entered)) return;
                const nearest = FFT_SIZES.reduce((best, size) =>
                  Math.abs(size - entered) < Math.abs(best - entered) ? size : best,
                );
                onYResolutionChange(nearest);
              }}
              className="h-8"
            />
            <span className="text-xs text-muted-foreground">FFT</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Higher values show finer frequency detail.</p>
      </div>
      <NumberSetting
        id="min-color"
        label="Minimum color level"
        value={minColor}
        min={-120}
        max={-1}
        unit="dB"
        onChange={onMinColorChange}
      />
      <NumberSetting
        id="max-color"
        label="Maximum color level"
        value={maxColor}
        min={-119}
        max={0}
        unit="dB"
        onChange={onMaxColorChange}
      />
    </div>
  );
}
