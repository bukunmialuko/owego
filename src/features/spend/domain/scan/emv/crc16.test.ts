import {
  CANONICAL_EMV_PAYLOAD,
  KHQR_PAYLOAD,
  PIX_DYNAMIC_PAYLOAD,
  PIX_STATIC_PAYLOAD,
  QRIS_PAYLOAD,
  TANQR_PAYLOAD,
  TANQR_SPEC_PAYLOAD,
} from '@/test/qr-payloads';
import { crc16CcittFalse } from './crc16';

function checksummedPart(payload: string): string {
  return payload.slice(0, payload.lastIndexOf('6304') + 4);
}

function declaredChecksum(payload: string): string {
  return payload.slice(payload.lastIndexOf('6304') + 4);
}

describe('crc16CcittFalse', () => {
  it.each([
    ['the EMVCo worked example', CANONICAL_EMV_PAYLOAD, 'A13A'],
    ['an anonymised Tanzanian TANQR sticker', TANQR_PAYLOAD, '5FE4'],
    ['the TANQR standard sample', TANQR_SPEC_PAYLOAD, '7D47'],
    ['a Cambodian KHQR', KHQR_PAYLOAD, '62BF'],
    ['a static Brazilian Pix code', PIX_STATIC_PAYLOAD, '1D3D'],
    ['a dynamic Brazilian Pix code', PIX_DYNAMIC_PAYLOAD, '64E4'],
    ['an anonymised Indonesian QRIS sticker', QRIS_PAYLOAD, 'E9B6'],
  ])('reproduces the checksum %s carries', (_case, payload, expected) => {
    expect(crc16CcittFalse(checksummedPart(payload))).toBe(expected);
    expect(crc16CcittFalse(checksummedPart(payload))).toBe(declaredChecksum(payload));
  });

  it('hashes the UTF-8 bytes, not the code units', () => {
    expect(crc16CcittFalse('最佳运输')).toBe(crc16CcittFalse(Buffer.from('最佳运输').toString()));
    expect(crc16CcittFalse('北京')).not.toBe('0000');
  });

  it('starts from the all-ones seed, so an empty input is FFFF', () => {
    expect(crc16CcittFalse('')).toBe('FFFF');
  });

  it('always answers four upper-case hex characters', () => {
    for (const input of ['', 'A', 'owego', CANONICAL_EMV_PAYLOAD]) {
      expect(crc16CcittFalse(input)).toMatch(/^[0-9A-F]{4}$/);
    }
  });

  it('changes when one character of the payload changes', () => {
    const original = checksummedPart(TANQR_PAYLOAD);
    const tampered = `${original.slice(0, -5)}9${original.slice(-4)}`;

    expect(crc16CcittFalse(tampered)).not.toBe(crc16CcittFalse(original));
  });
});
