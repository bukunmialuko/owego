import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ASSETS = [
  'back',
  'chevron-down',
  'close',
  'eye',
  'eye-off',
  'number-1',
  'number-2',
  'number-3',
  'owego-logo',
];

const DENSITIES = ['', '@2x', '@3x'];

const read = (name: string) =>
  readFileSync(join(__dirname, '../../../../../assets/circle', `${name}.png`));

const digest = (name: string) => createHash('sha256').update(read(name)).digest('hex');

describe('the circle branding assets', () => {
  it.each(ASSETS)('ships %s at every density', (name) => {
    for (const density of DENSITIES) {
      expect(read(`${name}${density}`).byteLength).toBeGreaterThan(0);
    }
  });

  it('gives every icon its own artwork', () => {
    const byDigest = new Map<string, string[]>();

    for (const name of ASSETS) {
      const key = digest(name);
      byDigest.set(key, [...(byDigest.get(key) ?? []), name]);
    }

    const duplicates = [...byDigest.values()].filter((names) => names.length > 1);

    expect(duplicates).toEqual([]);
  });

  it.each(ASSETS)('scales %s rather than repeating one bitmap', (name) => {
    expect(new Set(DENSITIES.map((d) => digest(`${name}${d}`))).size).toBe(DENSITIES.length);
  });
});
