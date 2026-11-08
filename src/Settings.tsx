import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Slider } from "./components/ui/slider";
import { Separator } from "./components/ui/separator";

type SettingsProps = {
  timeRange: number;
  onTimeRangeChange: (value: number) => void;
  yResolution: number;
  onYResolutionChange: (value: number) => void;
  minFrequency: number;
  onMinFrequencyChange: (value: number) => void;
  maxFrequency: number;
  onMaxFrequencyChange: (value: number) => void;
  minColor: number;
  onMinColorChange: (value: number) => void;
  maxColor: number;
  onMaxColorChange: (value: number) => void;
};

const FFT_SIZES = [2_048, 4_096, 8_192, 16_384, 32_768];
const MIN_ALLOWED_FREQUENCY = 20;
const MAX_ALLOWED_FREQUENCY = 20_000;

function frequencyToSliderValue(frequency: number) {
  return Math.log(frequency / MIN_ALLOWED_FREQUENCY) /
    Math.log(MAX_ALLOWED_FREQUENCY / MIN_ALLOWED_FREQUENCY);
}

function sliderValueToFrequency(value: number) {
  return Math.round(
    MIN_ALLOWED_FREQUENCY * (MAX_ALLOWED_FREQUENCY / MIN_ALLOWED_FREQUENCY) ** value,
  );
}

function NumberInput({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  normalize = (number: number) => number,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  normalize?: (number: number) => number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => setDraft(String(value)), [value]);

  const normalizeDraft = (rawValue: string) => {
    if (rawValue.trim() === "" || rawValue === "-") return undefined;
    const entered = Number(rawValue);
    if (!Number.isFinite(entered)) return undefined;
    return normalize(Math.max(min, Math.min(max, Math.round(entered))));
  };
  const allowNegative = min < 0;
  const validInteger = allowNegative ? /^-?\d*$/ : /^\d*$/;

  return (
    <div className="relative min-w-0 flex-1">
      <Input
        id={id}
        aria-label={label}
        type="text"
        inputMode={allowNegative ? "text" : "numeric"}
        pattern={allowNegative ? "-?[0-9]*" : "[0-9]*"}
        value={draft}
        onChange={(event) => {
          const nextDraft = event.target.value;
          if (validInteger.test(nextDraft)) setDraft(nextDraft);
        }}
        onPaste={(event) => {
          if (!validInteger.test(event.clipboardData.getData("text"))) event.preventDefault();
        }}
        onBlur={() => {
          const next = normalizeDraft(draft);
          if (next === undefined) {
            setDraft(String(value));
            return;
          }
          onChange(next);
          setDraft(String(next));
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
            return;
          }
          if (
            event.ctrlKey ||
            event.metaKey ||
            event.altKey ||
            /^[0-9]$/.test(event.key) ||
            ["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "Home", "End"].includes(
              event.key,
            )
          ) {
            return;
          }
          if (allowNegative && event.key === "-" && !draft.startsWith("-")) {
            return;
          }
          event.preventDefault();
        }}
        className="h-8 appearance-none px-2 pr-7 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <div className="absolute inset-y-0 right-1 flex flex-col justify-center">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Increase ${label}`}
          disabled={value >= max}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            const next = normalizeDraft(String(Math.min(max, value + step)));
            if (next !== undefined) {
              onChange(next);
              setDraft(String(next));
            }
          }}
          className="h-3.5 w-5 rounded-sm p-0 [&_svg]:size-3"
        >
          <ChevronUp />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Decrease ${label}`}
          disabled={value <= min}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            const next = normalizeDraft(String(Math.max(min, value - step)));
            if (next !== undefined) {
              onChange(next);
              setDraft(String(next));
            }
          }}
          className="h-3.5 w-5 rounded-sm p-0 [&_svg]:size-3"
        >
          <ChevronDown />
        </Button>
      </div>
    </div>
  );
}

function NumberSetting({
  id,
  label,
  description,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="grid gap-2">
      <div className="grid gap-1">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-2">
        <Slider
          aria-label={label}
          min={min}
          max={max}
          step={1}
          value={[value]}
          onValueChange={([next]) => next !== undefined && onChange(next)}
          className="flex-1"
        />
        <div className="ml-auto flex w-40 items-center gap-2">
          <NumberInput
            id={id}
            label={label}
            value={value}
            min={min}
            max={max}
            onChange={onChange}
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
  minFrequency,
  onMinFrequencyChange,
  maxFrequency,
  onMaxFrequencyChange,
  minColor,
  onMinColorChange,
  maxColor,
  onMaxColorChange,
}: SettingsProps) {
  return (
    <div className="flex flex-col gap-4 rounded-md border bg-card p-4 text-card-foreground shadow-sm xl:flex-row xl:items-stretch">
      <div className="min-w-0 xl:flex-1">
        <NumberSetting
          id="time-range"
          label="Time range"
          description="Seconds shown across the time axis."
          value={timeRange}
          min={2}
          max={30}
          unit="seconds"
          onChange={onTimeRangeChange}
        />
      </div>
      <Separator
        decorative
        orientation="vertical"
        className="hidden min-h-24 self-stretch xl:block"
      />
      <Separator decorative className="h-px xl:hidden" />
      <div className="min-w-0 grid gap-2 xl:flex-1">
        <div className="grid gap-1">
          <Label htmlFor="y-resolution">Y-axis resolution</Label>
          <p className="text-xs text-muted-foreground">
            Higher values show finer frequency detail.
          </p>
        </div>
        <div className="grid gap-2">
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
          <div className="ml-auto flex w-32 items-center gap-2">
            <NumberInput
              id="y-resolution"
              label="Y-axis resolution"
              value={yResolution}
              min={FFT_SIZES[0]!}
              max={FFT_SIZES[FFT_SIZES.length - 1]!}
              step={1_024}
              normalize={(entered) =>
                FFT_SIZES.reduce((best, size) =>
                  Math.abs(size - entered) < Math.abs(best - entered) ? size : best,
                )
              }
              onChange={onYResolutionChange}
            />
            <span className="text-xs text-muted-foreground">FFT</span>
          </div>
        </div>
      </div>
      <Separator
        decorative
        orientation="vertical"
        className="hidden min-h-24 self-stretch xl:block"
      />
      <Separator decorative className="h-px xl:hidden" />
      <div className="min-w-0 grid gap-2 xl:flex-1">
        <div className="grid gap-1">
          <div className="text-sm leading-none font-medium">Color level</div>
          <p className="text-xs text-muted-foreground">
            Set the dB range mapped to the color scale.
          </p>
        </div>
        <div className="grid gap-2">
          <Slider
            aria-label="Color level range"
            min={-120}
            max={0}
            step={1}
            minStepsBetweenThumbs={1}
            value={[minColor, maxColor]}
            onValueChange={([minimum, maximum]) => {
              if (minimum !== undefined) onMinColorChange(minimum);
              if (maximum !== undefined) onMaxColorChange(maximum);
            }}
          />
          <div className="flex items-center justify-between">
            <div className="flex w-28 items-center gap-1">
              <NumberInput
                id="min-color"
                label="Minimum color level"
                value={minColor}
                min={-120}
                max={-1}
                onChange={onMinColorChange}
              />
              <span className="text-xs text-muted-foreground">dB</span>
            </div>
            <div className="flex w-28 items-center gap-1">
              <NumberInput
                id="max-color"
                label="Maximum color level"
                value={maxColor}
                min={-119}
                max={0}
                onChange={onMaxColorChange}
              />
              <span className="text-xs text-muted-foreground">dB</span>
            </div>
          </div>
        </div>
      </div>
      <Separator orientation="horizontal" className="xl:hidden" />
      <Separator
        decorative
        orientation="vertical"
        className="hidden min-h-24 self-stretch xl:block"
      />
      <div className="min-w-0 grid gap-2 xl:flex-1">
        <div className="grid gap-1">
          <div className="text-sm leading-none font-medium">Frequency range</div>
          <p className="text-xs text-muted-foreground">
            Set the logarithmic range shown on the Y axis.
          </p>
        </div>
        <div className="grid gap-2">
          <Slider
            aria-label="Frequency range"
            min={0}
            max={1}
            step={0.001}
            minStepsBetweenThumbs={1}
            value={[frequencyToSliderValue(minFrequency), frequencyToSliderValue(maxFrequency)]}
            onValueChange={([lower, upper]) => {
              if (lower !== undefined) onMinFrequencyChange(sliderValueToFrequency(lower));
              if (upper !== undefined) onMaxFrequencyChange(sliderValueToFrequency(upper));
            }}
          />
          <div className="flex items-center justify-between">
            <div className="flex w-28 items-center gap-1">
              <NumberInput
                id="min-frequency"
                label="Minimum frequency"
                value={minFrequency}
                min={MIN_ALLOWED_FREQUENCY}
                max={MAX_ALLOWED_FREQUENCY - 1}
                onChange={onMinFrequencyChange}
              />
              <span className="text-xs text-muted-foreground">Hz</span>
            </div>
            <div className="flex w-28 items-center gap-1">
              <NumberInput
                id="max-frequency"
                label="Maximum frequency"
                value={maxFrequency}
                min={MIN_ALLOWED_FREQUENCY + 1}
                max={MAX_ALLOWED_FREQUENCY}
                onChange={onMaxFrequencyChange}
              />
              <span className="text-xs text-muted-foreground">Hz</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
