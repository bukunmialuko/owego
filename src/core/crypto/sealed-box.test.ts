import { generateKeyPair, openWith, sealTo } from './sealed-box';
import { secureRandom } from './secure-random';

const TOKEN = 'refresh-token-4f1c9e';

describe('sealed box', () => {
  it('derives the RFC 7748 public key for a known secret', () => {
    const secret = Buffer.from(
      '77076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2a',
      'hex',
    );

    const { publicKey } = generateKeyPair(() => new Uint8Array(secret));

    expect(Buffer.from(publicKey).toString('hex')).toBe(
      '8520f0098930a754748b7ddcb43ef75a0dbf3a0d26381af4eba4a98eaa9b4e6a',
    );
  });

  it('opens with the secret key of the pair it was sealed to', () => {
    const pair = generateKeyPair(secureRandom);
    const sealed = sealTo(pair.publicKey, TOKEN, secureRandom);

    expect(sealed.ok && openWith(pair.secretKey, sealed.value)).toBe(TOKEN);
  });

  it('yields nothing for any other key pair', () => {
    const sealed = sealTo(generateKeyPair(secureRandom).publicKey, TOKEN, secureRandom);

    expect(sealed.ok && openWith(generateKeyPair(secureRandom).secretKey, sealed.value)).toBe(
      undefined,
    );
  });

  it('never carries the plaintext in readable form', () => {
    const sealed = sealTo(generateKeyPair(secureRandom).publicKey, TOKEN, secureRandom);

    expect(sealed.ok && sealed.value).not.toContain(TOKEN);
    expect(sealed.ok && sealed.value).not.toContain(Buffer.from(TOKEN).toString('hex'));
  });

  it('seals the same plaintext differently every time', () => {
    const { publicKey } = generateKeyPair(secureRandom);
    const first = sealTo(publicKey, TOKEN, secureRandom);
    const second = sealTo(publicKey, TOKEN, secureRandom);

    expect(first.ok && second.ok && first.value !== second.value).toBe(true);
  });

  it('yields nothing once a single ciphertext byte is changed', () => {
    const pair = generateKeyPair(secureRandom);
    const sealed = sealTo(pair.publicKey, TOKEN, secureRandom);
    if (!sealed.ok) throw new Error('seal failed');

    const flipped = sealed.value.slice(0, -1) + (sealed.value.endsWith('0') ? '1' : '0');

    expect(openWith(pair.secretKey, flipped)).toBeUndefined();
  });

  it.each([
    ['an empty string', ''],
    ['too few parts', 'v1.aa.bb'],
    ['an unknown version', 'v9.aa.bb.cc'],
    ['parts that are not hex', 'v1.zz.yy.xx'],
  ])('yields nothing for %s', (_label, blob) => {
    expect(openWith(generateKeyPair(secureRandom).secretKey, blob)).toBeUndefined();
  });

  it('reports a malformed public key as an error rather than throwing', () => {
    const sealed = sealTo(new Uint8Array(5), TOKEN, secureRandom);

    expect(sealed.ok).toBe(false);
  });

  it('works without a global crypto, as on Hermes', () => {
    const restore = jest.replaceProperty(globalThis, 'crypto', undefined as unknown as Crypto);

    try {
      const pair = generateKeyPair(secureRandom);
      const sealed = sealTo(pair.publicKey, TOKEN, secureRandom);

      expect(sealed.ok && openWith(pair.secretKey, sealed.value)).toBe(TOKEN);
    } finally {
      restore.restore();
    }
  });
});
