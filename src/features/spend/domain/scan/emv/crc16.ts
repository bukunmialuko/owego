const POLYNOMIAL = 0x1021;
const INITIAL = 0xffff;
const SIXTEEN_BITS = 0xffff;
const TOP_BIT = 0x8000;

const HEX_DIGITS = '0123456789ABCDEF';

export function crc16CcittFalse(input: string): string {
  let remainder = INITIAL;

  for (const byte of new TextEncoder().encode(input)) {
    remainder ^= byte << 8;

    for (let bit = 0; bit < 8; bit += 1) {
      remainder =
        (remainder & TOP_BIT) === 0
          ? (remainder << 1) & SIXTEEN_BITS
          : ((remainder << 1) ^ POLYNOMIAL) & SIXTEEN_BITS;
    }
  }

  return [12, 8, 4, 0].map((shift) => HEX_DIGITS[(remainder >> shift) & 0xf]).join('');
}
