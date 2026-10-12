import { getRandomValues } from 'expo-crypto';
import { secureRandom } from './secure-random';

describe('secureRandom', () => {
  it('returns exactly the number of bytes asked for', () => {
    expect(secureRandom(24)).toHaveLength(24);
  });

  it('draws them from the native generator', () => {
    jest.mocked(getRandomValues).mockClear();

    secureRandom(16);

    expect(getRandomValues).toHaveBeenCalledTimes(1);
  });

  it('does not hand back the same bytes twice', () => {
    expect(secureRandom(32)).not.toEqual(secureRandom(32));
  });

  it('works without a global crypto, as on Hermes', () => {
    const restore = jest.replaceProperty(globalThis, 'crypto', undefined as unknown as Crypto);

    try {
      expect(secureRandom(8)).toHaveLength(8);
    } finally {
      restore.restore();
    }
  });
});
