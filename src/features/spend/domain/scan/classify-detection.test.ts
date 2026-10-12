import { KHQR_PAYLOAD, PIX_STATIC_PAYLOAD, TANQR_PAYLOAD } from '@/test/qr-payloads';
import { classifyDetection } from './classify-detection';

const EVM = '0x1111111111111111111111111111111111111111';
const SOLANA = 'Cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx4';

describe('classifyDetection', () => {
  describe('reads a merchant code', () => {
    it.each([
      ['Tanzania', TANQR_PAYLOAD, 'tanqr'],
      ['Cambodia', KHQR_PAYLOAD, 'khqr'],
      ['Brazil', PIX_STATIC_PAYLOAD, 'pix'],
    ])('from %s', (_case, payload, id) => {
      expect(classifyDetection(payload)).toMatchObject({
        kind: 'merchantQr',
        scheme: { id },
      });
    });

    it('even when the checksum does not check out', () => {
      const tampered = `${TANQR_PAYLOAD.slice(0, -4)}0000`;
      const detected = classifyDetection(tampered);

      expect(detected).toMatchObject({ kind: 'merchantQr' });
      expect(detected).toMatchObject({ parsed: { crcValid: false } });
    });
  });

  describe('reads a wallet address', () => {
    it.each([
      ['an EVM address', EVM, undefined],
      ['a bare base58 address', SOLANA, undefined],
      ['a Solana payment URI', `solana:${SOLANA}?amount=1.5`, 'SOL'],
    ])('%s', (_case, input, networkCode) => {
      expect(classifyDetection(input)).toMatchObject({ kind: 'cryptoAddress', networkCode });
    });

    it('and names a chain owego cannot pay rather than finding nothing', () => {
      expect(classifyDetection('bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')).toEqual({
        kind: 'unknown',
        reason: 'unsupportedChain',
      });
    });
  });

  it.each([
    ['an Ivorian number', '+2250701234567', 'CI'],
    ['a Kenyan number', 'tel:+254712345678', 'KE'],
  ])('reads %s', (_case, input, countryCode) => {
    expect(classifyDetection(input)).toMatchObject({ kind: 'phoneNumber', countryCode });
  });

  it('reads a ten-digit account number', () => {
    expect(classifyDetection('0123456789')).toEqual({
      kind: 'nigerianAccount',
      accountNumber: '0123456789',
    });
  });

  it('reads an account number that happens to start like a merchant code', () => {
    expect(classifyDetection('0002123456')).toEqual({
      kind: 'nigerianAccount',
      accountNumber: '0002123456',
    });
  });

  it('says a code that opens like a merchant code but does not parse is malformed', () => {
    expect(classifyDetection('0002010102115802')).toEqual({
      kind: 'unknown',
      reason: 'malformedQr',
    });
  });

  it.each([
    ['an empty string', ''],
    ['whitespace', '   '],
    ['a sentence', 'thanks for your custom'],
    ['a website', 'https://owego.app'],
    ['a nine-digit number', '012345678'],
  ])('finds nothing to pay in %s', (_case, input) => {
    expect(classifyDetection(input)).toEqual({ kind: 'unknown', reason: 'unknownCode' });
  });
});
