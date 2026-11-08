export const MIN_DISPLAY_FREQUENCY = 30;
export const BASE_MIN_FREQUENCY = 60;
export const BASE_MAX_FREQUENCY = 8_000;

export function getFrequencyOffsetLimits(sampleRate: number) {
  const nyquist = sampleRate / 2;
  const baseMaxFrequency = Math.min(BASE_MAX_FREQUENCY, nyquist * 0.8);

  return {
    min: Math.log2(MIN_DISPLAY_FREQUENCY / BASE_MIN_FREQUENCY),
    max: Math.log2(nyquist / baseMaxFrequency),
    baseMaxFrequency,
  };
}

export function getFrequencyRange(sampleRate: number, offsetOctaves: number) {
  const limits = getFrequencyOffsetLimits(sampleRate);
  const offset = Math.max(limits.min, Math.min(limits.max, offsetOctaves));
  const multiplier = 2 ** offset;

  return {
    min: BASE_MIN_FREQUENCY * multiplier,
    max: limits.baseMaxFrequency * multiplier,
    offset,
  };
}
