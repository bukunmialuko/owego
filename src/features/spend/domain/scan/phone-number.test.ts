import { phoneNumberFrom } from './phone-number';

describe('phoneNumberFrom', () => {
  describe('reads a number that names its country', () => {
    it.each([
      ["Côte d'Ivoire", '+2250701234567', '+2250701234567', 'CI'],
      ['Kenya', '+254712345678', '+254712345678', 'KE'],
      ['an international prefix instead of a plus', '00254712345678', '+254712345678', 'KE'],
      ['a tel: URI', 'tel:+2250701234567', '+2250701234567', 'CI'],
      ['an SMS: URI', 'SMS:+254712345678', '+254712345678', 'KE'],
      ['spacing a person would write', '+225 07 01 23 45 67', '+2250701234567', 'CI'],
      ['punctuation a sign would print', '+254 (712) 345-678', '+254712345678', 'KE'],
      ['surrounding whitespace', '  +254712345678\n', '+254712345678', 'KE'],
    ])('%s', (_case, input, e164, countryCode) => {
      expect(phoneNumberFrom(input)).toEqual({ e164, countryCode });
    });
  });

  describe('refuses a number that does not say where it is from', () => {
    it.each([
      ['a local Ivorian mobile number', '0701234567'],
      ['a local Kenyan mobile number', '0712345678'],
      ['the same number in a tel: URI', 'tel:0701234567'],
      ['a Nigerian mobile number', '08012345678'],
      ['a Nigerian number in full', '+2348012345678'],
      ['a bank account number', '0123456789'],
    ])('%s', (_case, input) => {
      expect(phoneNumberFrom(input)).toBeUndefined();
    });
  });

  describe('refuses a number of the wrong length for its country', () => {
    it.each([
      ['one digit short for CI', '+225070123456'],
      ['one digit long for CI', '+22507012345678'],
      ['one digit short for KE', '+25471234567'],
      ['one digit long for KE', '+2547123456789'],
    ])('%s', (_case, input) => {
      expect(phoneNumberFrom(input)).toBeUndefined();
    });
  });

  describe('refuses a country owego has no mobile-money rail into', () => {
    it.each([
      ['the United Kingdom', '+447700900123'],
      ['Ghana', '+233201234567'],
      ['Tanzania', '+255755700400'],
    ])('%s', (_case, input) => {
      expect(phoneNumberFrom(input)).toBeUndefined();
    });
  });

  it.each([
    ['an empty string', ''],
    ['whitespace', '   '],
    ['a wallet address', '0x1111111111111111111111111111111111111111'],
    ['a merchant code', '00020101021158'],
    ['letters', '+225abcdefghij'],
  ])('is not fooled by %s', (_case, input) => {
    expect(phoneNumberFrom(input)).toBeUndefined();
  });
});
