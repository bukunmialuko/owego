import {
  CANONICAL_EMV_PAYLOAD,
  KHQR_PAYLOAD,
  PIX_DYNAMIC_PAYLOAD,
  PIX_STATIC_PAYLOAD,
  TANQR_PAYLOAD,
  TANQR_SPEC_PAYLOAD,
} from '@/test/qr-payloads';
import { crc16CcittFalse } from './crc16';
import { parseEmvQr } from './parse-emv-qr';

function tlv(tag: string, value: string): string {
  return `${tag}${String(value.length).padStart(2, '0')}${value}`;
}

function payloadOf(body: string): string {
  const withHeader = `${body}6304`;

  return `${withHeader}${crc16CcittFalse(withHeader)}`;
}

const HEADER = `${tlv('00', '01')}${tlv('01', '11')}`;

describe('parseEmvQr', () => {
  describe('the EMVCo worked example', () => {
    const parsed = parseEmvQr(CANONICAL_EMV_PAYLOAD);

    it('reads its named fields', () => {
      expect(parsed).toMatchObject({
        currency: 'CNY',
        currencyNumeric: '156',
        country: 'CN',
        merchantName: 'BEST TRANSPORT',
        merchantCity: 'BEIJING',
        amount: '23.72',
        initiation: 'dynamic',
        crcValid: true,
      });
    });

    it('tokenises the payload end to end, non-ASCII included', () => {
      expect(parsed?.raw).toBe(CANONICAL_EMV_PAYLOAD);
      expect(parsed?.tags['64']).toContain('最佳运输');
    });
  });

  describe('a Tanzanian TANQR sticker', () => {
    const parsed = parseEmvQr(TANQR_PAYLOAD);

    it('reads the merchant and the currency', () => {
      expect(parsed).toMatchObject({
        currency: 'TZS',
        country: 'TZ',
        merchantName: 'EXAMPLE MERCHANT LTD',
        merchantCity: 'Dar Es Salaam',
        initiation: 'static',
        crcValid: true,
      });
    });

    it('leaves the amount absent, because a sticker does not carry one', () => {
      expect(parsed?.amount).toBeUndefined();
    });

    it('finds the national scheme block with its acquirer and merchant identifiers', () => {
      expect(parsed?.merchantAccounts).toContainEqual({
        tag: '26',
        guid: 'tz.go.bot.tips',
        subTags: { '00': 'tz.go.bot.tips', '01': '01003', '02': '000000001' },
      });
    });

    it('keeps the card-scheme slots apart from the merchant-account templates', () => {
      expect(parsed?.cardSchemeBlocks).toEqual({
        '02': '4000000000000001',
        '04': '5000000000000001',
        '15': '0000000100000001xxxxxxxxxxxx000',
      });
      expect(parsed?.merchantAccounts.map((account) => account.tag)).toEqual(['26']);
    });
  });

  it('reads the sample from the TANQR standard, which carries only the national block', () => {
    const parsed = parseEmvQr(TANQR_SPEC_PAYLOAD);

    expect(parsed?.merchantAccounts).toHaveLength(1);
    expect(parsed?.merchantAccounts[0]?.guid).toBe('tz.go.bot.tips');
    expect(parsed?.cardSchemeBlocks).toEqual({});
    expect(parsed).toMatchObject({ currency: 'TZS', merchantName: 'YN RESTAURANTS' });
  });

  it('reads a Cambodian KHQR denominated in dollars', () => {
    const parsed = parseEmvQr(KHQR_PAYLOAD);

    expect(parsed).toMatchObject({
      currency: 'USD',
      currencyNumeric: '840',
      country: 'KH',
      merchantName: 'TESTACC',
      merchantCity: 'Phnom Penh',
      crcValid: true,
    });
    expect(parsed?.merchantAccounts[0]).toMatchObject({
      tag: '29',
      guid: 'bredkhppxxx@bred',
    });
  });

  describe('Brazilian Pix', () => {
    it('reads a static code and its key', () => {
      const parsed = parseEmvQr(PIX_STATIC_PAYLOAD);

      expect(parsed).toMatchObject({ currency: 'BRL', country: 'BR', crcValid: true });
      expect(parsed?.merchantAccounts[0]).toMatchObject({
        tag: '26',
        guid: 'br.gov.bcb.pix',
        subTags: expect.objectContaining({ '01': '123e4567-e12b-12d1-a456-426655440000' }),
      });
      expect(parsed?.amount).toBeUndefined();
    });

    it('keeps the URL a dynamic code hides its amount behind', () => {
      const parsed = parseEmvQr(PIX_DYNAMIC_PAYLOAD);

      expect(parsed?.initiation).toBe('dynamic');
      expect(parsed?.merchantAccounts[0]?.subTags['25']).toBe(
        'pix.example.com/8b3da2f39a4140d1a91abd93113bd441',
      );
    });
  });

  describe('rejects what is not a merchant code', () => {
    it.each([
      ['an empty string', ''],
      ['whitespace', '   '],
      ['a sentence', 'hello world'],
      ['a wallet address', '0x1234567890abcdef1234567890abcdef12345678'],
      ['an account number', '1234567890'],
      ['a length that overruns the payload', '009912'],
      ['a length that is not a number', '000201XY99'],
      ['a truncated trailing triple', '00020101'],
      ['a payload with no checksum tag', `${tlv('00', '01')}${tlv('58', 'TH')}`],
    ])('%s', (_case, input) => {
      expect(parseEmvQr(input)).toBeUndefined();
    });

    it('a payload far longer than a QR symbol can carry', () => {
      expect(parseEmvQr(`0002${'0'.repeat(5000)}`)).toBeUndefined();
    });
  });

  it('parses a payload whose checksum does not check out, and says so', () => {
    const tampered = `${TANQR_PAYLOAD.slice(0, -4)}0000`;
    const parsed = parseEmvQr(tampered);

    expect(parsed?.crcValid).toBe(false);
    expect(parsed?.merchantName).toBe('EXAMPLE MERCHANT LTD');
    expect(parsed?.raw).toBe(tampered);
  });

  it('trims the surrounding whitespace a scanner can pick up, and nothing else', () => {
    const parsed = parseEmvQr(`  ${TANQR_SPEC_PAYLOAD}\n`);

    expect(parsed?.raw).toBe(TANQR_SPEC_PAYLOAD);
    expect(parsed?.crcValid).toBe(true);
  });

  it('takes the last value when a payload repeats a tag, which the specification forbids', () => {
    const parsed = parseEmvQr(
      payloadOf(`${HEADER}${tlv('53', '704')}${tlv('58', 'VN')}${tlv('58', 'TH')}`),
    );

    expect(parsed?.country).toBe('TH');
  });

  it('reports an unnamed currency number without inventing a code for it', () => {
    const parsed = parseEmvQr(payloadOf(`${HEADER}${tlv('53', '001')}${tlv('58', 'TH')}`));

    expect(parsed?.currencyNumeric).toBe('001');
    expect(parsed?.currency).toBeUndefined();
  });

  it('leaves the merchant name and city empty rather than undefined when a code omits them', () => {
    const parsed = parseEmvQr(payloadOf(`${HEADER}${tlv('53', '704')}${tlv('58', 'VN')}`));

    expect(parsed?.merchantName).toBe('');
    expect(parsed?.merchantCity).toBe('');
  });

  it('reads a merchant-account template from the unreserved range', () => {
    const parsed = parseEmvQr(
      payloadOf(`${HEADER}${tlv('81', tlv('00', 'ke.go.qr'))}${tlv('58', 'KE')}`),
    );

    expect(parsed?.merchantAccounts).toContainEqual({
      tag: '81',
      guid: 'ke.go.qr',
      subTags: { '00': 'ke.go.qr' },
    });
  });

  it('reports a merchant-account template whose sub-tags do not tokenise, without a GUID', () => {
    const parsed = parseEmvQr(payloadOf(`${HEADER}${tlv('26', 'XY')}${tlv('58', 'TH')}`));

    expect(parsed?.merchantAccounts).toContainEqual({ tag: '26', guid: '', subTags: {} });
  });
});
