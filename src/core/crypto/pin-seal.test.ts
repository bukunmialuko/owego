import { unknownError } from '@/core/errors/app-error';
import { err } from '@/core/result/result';
import { derivePinKey, type PinKdf } from './pin-kdf';
import { openUnderPin, sealUnderPin } from './pin-seal';
import { secureRandom } from './secure-random';

const SECRET = Uint8Array.from({ length: 32 }, (_, index) => index);

async function seal(pin: string): Promise<string> {
  const sealed = await sealUnderPin(SECRET, pin, secureRandom, derivePinKey);
  if (!sealed.ok) throw new Error('seal failed');
  return sealed.value;
}

const open = (blob: string, pin: string) => openUnderPin(blob, pin, derivePinKey);

describe('pin seal', () => {
  it('opens with the pin it was sealed under', async () => {
    const sealed = await seal('1357');

    await expect(open(sealed, '1357')).resolves.toEqual({
      ok: true,
      value: { type: 'opened', secret: SECRET },
    });
  });

  it('reports a wrong pin when the tag check fails', async () => {
    const sealed = await seal('1357');

    await expect(open(sealed, '2468')).resolves.toEqual({ ok: true, value: { type: 'wrong-pin' } });
  });

  it('never carries the secret in readable form', async () => {
    const sealed = await seal('1357');

    expect(sealed).not.toContain(Buffer.from(SECRET).toString('hex'));
  });

  it('draws a salt of its own for every seal', async () => {
    const first = await seal('1357');
    const second = await seal('1357');

    expect(first.split('.')[1]).not.toEqual(second.split('.')[1]);
  });

  it.each([
    ['an empty string', ''],
    ['too few parts', 'v1.aa.bb'],
    ['an unknown version', 'v9.aa.bb.cc'],
    ['parts that are not hex', 'v1.zz.yy.xx'],
  ])('reports %s as malformed rather than as a wrong pin', async (_label, blob) => {
    await expect(open(blob, '1357')).resolves.toEqual({ ok: true, value: { type: 'malformed' } });
  });

  it('works without a global crypto, as on Hermes', async () => {
    const restore = jest.replaceProperty(globalThis, 'crypto', undefined as unknown as Crypto);

    try {
      const sealed = await seal('1357');

      await expect(open(sealed, '1357')).resolves.toEqual({
        ok: true,
        value: { type: 'opened', secret: SECRET },
      });
    } finally {
      restore.restore();
    }
  });

  describe('when the key cannot be derived', () => {
    const failing: PinKdf = () => Promise.resolve(err(unknownError('out of memory')));

    it('reports it when sealing, rather than throwing', async () => {
      const sealed = await sealUnderPin(SECRET, '1357', secureRandom, failing);

      expect(sealed.ok).toBe(false);
    });

    it('reports it when opening, rather than calling the pin wrong', async () => {
      const blob = await seal('1357');

      const opened = await openUnderPin(blob, '1357', failing);

      expect(opened.ok).toBe(false);
    });
  });
});
