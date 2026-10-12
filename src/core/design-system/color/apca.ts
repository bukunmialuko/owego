export type Foreground = 'light' | 'dark';

const HEX = /^#[0-9a-f]{6}$/i;

const EXPONENT = 2.4;
const RED = 0.2126729;
const GREEN = 0.7151522;
const BLUE = 0.072175;

const BLACK_THRESHOLD = 0.022;
const BLACK_CLAMP = 1.414;

const DELTA_Y_MIN = 0.0005;

const NORMAL_BACKGROUND = 0.56;
const NORMAL_TEXT = 0.57;
const REVERSE_TEXT = 0.62;
const REVERSE_BACKGROUND = 0.65;
const SCALE = 1.14;
const OFFSET = 0.027;
const LOW_CLIP = 0.1;

export function apcaContrast(text: string, background: string): number {
  const textY = screenLuminance(text);
  const backgroundY = screenLuminance(background);
  if (Math.abs(backgroundY - textY) < DELTA_Y_MIN) return 0;

  if (backgroundY > textY) {
    const sapc = (backgroundY ** NORMAL_BACKGROUND - textY ** NORMAL_TEXT) * SCALE;
    return sapc < LOW_CLIP ? 0 : (sapc - OFFSET) * 100;
  }

  const sapc = (backgroundY ** REVERSE_BACKGROUND - textY ** REVERSE_TEXT) * SCALE;
  return sapc > -LOW_CLIP ? 0 : (sapc + OFFSET) * 100;
}

export function pickForeground(
  background: string,
  candidates: { light: string; dark: string },
): Foreground {
  const light = Math.abs(apcaContrast(candidates.light, background));
  const dark = Math.abs(apcaContrast(candidates.dark, background));

  return light > dark ? 'light' : 'dark';
}

function screenLuminance(hex: string): number {
  if (!HEX.test(hex)) throw new RangeError(`Expected a #RRGGBB colour, got "${hex}".`);

  const channel = (offset: number) =>
    (parseInt(hex.slice(offset, offset + 2), 16) / 255) ** EXPONENT;
  const y = RED * channel(1) + GREEN * channel(3) + BLUE * channel(5);

  return y < BLACK_THRESHOLD ? y + (BLACK_THRESHOLD - y) ** BLACK_CLAMP : y;
}
