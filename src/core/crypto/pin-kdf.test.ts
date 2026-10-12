import type * as NodeCrypto from 'node:crypto';
import { scrypt } from 'react-native-quick-crypto';
import { PIN_KDF, derivePinKey } from './pin-kdf';

const SALT = new Uint8Array(16).fill(7);

describe('derivePinKey', () => {
  it('derives a 32-byte key', async () => {
    const key = await derivePinKey('1357', SALT);

    expect(key.ok && key.value).toHaveLength(32);
  });

  it('is deterministic for the same pin and salt', async () => {
    const first = await derivePinKey('1357', SALT);
    const second = await derivePinKey('1357', SALT);

    expect(first).toEqual(second);
  });

  it('differs for a different pin or a different salt', async () => {
    const base = await derivePinKey('1357', SALT);

    await expect(derivePinKey('2468', SALT)).resolves.not.toEqual(base);
    await expect(derivePinKey('1357', new Uint8Array(16).fill(8))).resolves.not.toEqual(base);
  });

  it('asks the native module for the agreed cost', async () => {
    jest.mocked(scrypt).mockClear();

    await derivePinKey('1357', SALT);

    expect(scrypt).toHaveBeenCalledWith(
      expect.anything(),
      SALT,
      32,
      expect.objectContaining({ N: 2 ** 14, r: 8, p: 1 }),
      expect.any(Function),
    );
    expect(PIN_KDF).toMatchObject({ N: 2 ** 14, r: 8, p: 1 });
  });

  it('matches RFC 7914 scrypt for the same parameters', async () => {
    const key = await derivePinKey('1357', SALT);
    const expected = jest
      .requireActual<typeof NodeCrypto>('node:crypto')
      .scryptSync('1357', SALT, 32, { N: 2 ** 14, r: 8, p: 1 });

    expect(key.ok && Buffer.from(key.value).toString('hex')).toBe(expected.toString('hex'));
  });

  it('reports a native failure as an error rather than throwing', async () => {
    jest.mocked(scrypt).mockImplementationOnce((...args: unknown[]) => {
      const callback = args[4] as (error: Error | null) => void;
      callback(new Error('out of memory'));
    });

    const key = await derivePinKey('1357', SALT);

    expect(key.ok).toBe(false);
  });

  it('reports a synchronous native throw as an error too', async () => {
    jest.mocked(scrypt).mockImplementationOnce(() => {
      throw new RangeError('Invalid scrypt parameters');
    });

    const key = await derivePinKey('1357', SALT);

    expect(key.ok).toBe(false);
  });
});
