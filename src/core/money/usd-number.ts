const API_MINOR_SCALE = 100;
const MICRO_SCALE = 1_000_000;

function microDollars(usd: number): number {
  return Math.round(usd * MICRO_SCALE) / (MICRO_SCALE / API_MINOR_SCALE);
}

export function usdToMinorDown(usd: number): number {
  return Math.floor(microDollars(usd));
}

export function usdToMinorUp(usd: number): number {
  return Math.ceil(microDollars(usd));
}

export function usdToMinorNearest(usd: number): number {
  return Math.round(microDollars(usd));
}
