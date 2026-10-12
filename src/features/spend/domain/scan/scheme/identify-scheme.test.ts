import {
  CANONICAL_EMV_PAYLOAD,
  KHQR_PAYLOAD,
  PIX_DYNAMIC_PAYLOAD,
  PIX_STATIC_PAYLOAD,
  TANQR_PAYLOAD,
  TANQR_SPEC_PAYLOAD,
} from '@/test/qr-payloads';
import { crc16CcittFalse } from '../emv/crc16';
import { parseEmvQr, type ParsedEmvQr } from '../emv/parse-emv-qr';
import { identifyScheme } from './identify-scheme';

function parsed(payload: string): ParsedEmvQr {
  const result = parseEmvQr(payload);
  if (result === undefined) throw new TypeError('fixture does not parse');

  return result;
}

function tlv(tag: string, value: string): string {
  return `${tag}${String(value.length).padStart(2, '0')}${value}`;
}

function payloadOf(body: string): string {
  const withHeader = `${body}6304`;

  return `${withHeader}${crc16CcittFalse(withHeader)}`;
}

function codeWith(tag: string, guid: string, country: string, extra = ''): ParsedEmvQr {
  return parsed(
    payloadOf(
      `${tlv('00', '01')}${tlv('01', '11')}${tlv(tag, `${tlv('00', guid)}${extra}`)}${tlv('58', country)}`,
    ),
  );
}

describe('identifyScheme', () => {
  describe('names a scheme from the identifier its merchant-account template carries', () => {
    it.each([
      ['Tanzania', TANQR_PAYLOAD, 'tanqr'],
      ['the Tanzanian standard sample', TANQR_SPEC_PAYLOAD, 'tanqr'],
      ['Cambodia', KHQR_PAYLOAD, 'khqr'],
      ['Brazil', PIX_STATIC_PAYLOAD, 'pix'],
    ])('%s', (_case, payload, id) => {
      expect(identifyScheme(parsed(payload))).toMatchObject({ kind: 'scheme', id });
    });

    it.each([
      ['ke.go.qr', '28', 'KE', 'ke-qr'],
      ['py.gov.bcp.qr', '26', 'PY', 'py-qr'],
      ['py.com.psp.qr', '51', 'PY', 'py-qr'],
      ['CO.COM.RBM.LLA', '26', 'CO', 'bre-b'],
      ['co.com.crb.lla', '26', 'CO', 'bre-b'],
      ['ph.instapay.me', '26', 'PH', 'qrph'],
      ['A000000727', '38', 'VN', 'vietqr'],
      ['A000000775', '26', 'VN', 'vnpayqr'],
    ])('%s', (guid, tag, country, id) => {
      expect(identifyScheme(codeWith(tag, guid, country))).toMatchObject({ kind: 'scheme', id });
    });
  });

  it.each([
    ['A000000677010111', '29'],
    ['A000000677010112', '30'],
  ])('names %s in tag %s as PromptPay', (guid, tag) => {
    expect(identifyScheme(codeWith(tag, guid, 'TH'))).toMatchObject({
      kind: 'scheme',
      id: 'promptpay',
    });
  });

  it('matches an identifier however it is cased', () => {
    expect(identifyScheme(codeWith('26', 'TZ.GO.BOT.TIPS', 'TZ'))).toMatchObject({ id: 'tanqr' });
  });

  it.each([
    ['an individual', '29'],
    ['a business', '30'],
  ])('recognises a Cambodian handle in the template for %s', (_case, tag) => {
    expect(identifyScheme(codeWith(tag, 'test_bakong@devb', 'KH'))).toMatchObject({ id: 'khqr' });
  });

  it('does not read a handle-shaped identifier in an unrelated template as Cambodian', () => {
    expect(identifyScheme(codeWith('40', 'someone@bank', 'ZZ'))).toEqual({ kind: 'unknown' });
  });

  describe('the amount', () => {
    it('is inline on a code that carries one', () => {
      expect(identifyScheme(parsed(PIX_STATIC_PAYLOAD))).toMatchObject({ amountSource: 'inline' });
    });

    it('is remote on a dynamic Pix code, which hides it behind a URL', () => {
      expect(identifyScheme(parsed(PIX_DYNAMIC_PAYLOAD))).toMatchObject({
        id: 'pix',
        amountSource: 'remote',
      });
    });
  });

  describe('when no identifier matches', () => {
    it('falls back to the country, which is what carries most African schemes today', () => {
      expect(identifyScheme(codeWith('26', 'zz.example.qr', 'TZ'))).toEqual({
        kind: 'country',
        country: 'TZ',
      });
    });

    it.each(['UG', 'ZA', 'GH', 'NG', 'ZM', 'AR', 'PE'])('recognises %s', (country) => {
      expect(identifyScheme(codeWith('26', 'zz.example.qr', country))).toMatchObject({
        kind: 'country',
        country,
      });
    });

    it('reads the country however the code cases it', () => {
      expect(identifyScheme(codeWith('26', 'zz.example.qr', 'tz'))).toMatchObject({
        kind: 'country',
        country: 'TZ',
      });
    });

    it('answers unknown for a country owego has no rail into', () => {
      expect(identifyScheme(parsed(CANONICAL_EMV_PAYLOAD))).toEqual({ kind: 'unknown' });
    });
  });

  it('calls a code carrying only card-scheme slots what it is', () => {
    const cardOnly = parsed(
      payloadOf(
        `${tlv('00', '01')}${tlv('01', '11')}${tlv('02', '4000000000000001')}${tlv('58', 'KE')}`,
      ),
    );

    expect(identifyScheme(cardOnly)).toEqual({ kind: 'cardOnly' });
  });

  it('prefers the national block on a code that carries card slots as well', () => {
    expect(identifyScheme(parsed(TANQR_PAYLOAD))).toMatchObject({ kind: 'scheme', id: 'tanqr' });
  });

  it('never reads a card-scheme slot as an identifier', () => {
    const visaLookalike = parsed(
      payloadOf(`${tlv('00', '01')}${tlv('02', 'A000000727')}${tlv('58', 'ZZ')}`),
    );

    expect(identifyScheme(visaLookalike)).toEqual({ kind: 'cardOnly' });
  });
});
