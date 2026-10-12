import { equalBytes } from './constant-time';

const bytes = (...values: number[]) => new Uint8Array(values);

describe('equalBytes', () => {
  it('accepts identical byte strings', () => {
    expect(equalBytes(bytes(1, 2, 3), bytes(1, 2, 3))).toBe(true);
  });

  it('accepts two empty byte strings', () => {
    expect(equalBytes(bytes(), bytes())).toBe(true);
  });

  it('rejects a difference in the last byte', () => {
    expect(equalBytes(bytes(1, 2, 3), bytes(1, 2, 4))).toBe(false);
  });

  it('rejects a difference in the first byte', () => {
    expect(equalBytes(bytes(9, 2, 3), bytes(1, 2, 3))).toBe(false);
  });

  it('rejects different lengths', () => {
    expect(equalBytes(bytes(1, 2), bytes(1, 2, 3))).toBe(false);
  });

  it('rejects a prefix of the other', () => {
    expect(equalBytes(bytes(1, 2, 3), bytes(1, 2))).toBe(false);
  });

  it('reads every byte regardless of where the difference is', () => {
    const reads: number[] = [];
    const watched = new Proxy(bytes(1, 2, 3, 4), {
      get(target, key): unknown {
        if (typeof key === 'string' && /^\d+$/.test(key)) reads.push(Number(key));
        return Reflect.get(target, key);
      },
    });

    equalBytes(watched, bytes(9, 9, 9, 9));

    expect(reads).toEqual([0, 1, 2, 3]);
  });
});
