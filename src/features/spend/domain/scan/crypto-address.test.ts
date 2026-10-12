import { cryptoAddressFrom } from './crypto-address';

const EVM = '0x1111111111111111111111111111111111111111';
const SOLANA = 'Cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx4';
const BITCOIN = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
const BECH32 = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';

describe('cryptoAddressFrom', () => {
  describe('never names a chain from the shape of an address', () => {
    it.each([
      ['a legacy Bitcoin address', BITCOIN],
      ['a Bitcoin script address', '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy'],
      ['a Litecoin address', 'LZone2ELc9yLQPPCFrgSLMe4tjPQNPKDLj'],
      ['a Tron address', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'],
      ['a Solana-shaped address with no scheme', SOLANA],
    ])('%s', (_case, address) => {
      expect(cryptoAddressFrom(address)).toEqual({
        kind: 'address',
        address,
        networkCode: undefined,
      });
    });
  });

  it('reads a bare EVM address', () => {
    expect(cryptoAddressFrom(EVM)).toEqual({
      kind: 'address',
      address: EVM,
      networkCode: undefined,
    });
  });

  it('does not guess which EVM chain an 0x address belongs to', () => {
    expect(cryptoAddressFrom(EVM)).toMatchObject({ networkCode: undefined });
    expect(cryptoAddressFrom(`ethereum:${EVM}`)).toMatchObject({ networkCode: undefined });
  });

  it('names Solana only when the code says Solana', () => {
    expect(cryptoAddressFrom(`solana:${SOLANA}`)).toEqual({
      kind: 'address',
      address: SOLANA,
      networkCode: 'SOL',
    });
  });

  describe('payment URIs', () => {
    it.each([
      ['ethereum:', `ethereum:${EVM}`, EVM],
      ['a capitalised scheme', `Ethereum:${EVM}`, EVM],
      ['solana:', `solana:${SOLANA}`, SOLANA],
    ])('strips %s', (_case, input, address) => {
      expect(cryptoAddressFrom(input)).toMatchObject({ kind: 'address', address });
    });

    it('drops the parameters a payment URI carries after the address', () => {
      expect(cryptoAddressFrom(`solana:${SOLANA}?amount=1.5&label=tip`)).toMatchObject({
        address: SOLANA,
        networkCode: 'SOL',
      });
      expect(cryptoAddressFrom(`${EVM}?value=10`)).toMatchObject({ address: EVM });
    });

    it.each(['bitcoin:', 'litecoin:'])('names %s as a chain owego has no rail for', (scheme) => {
      expect(cryptoAddressFrom(`${scheme}${BITCOIN}`)).toEqual({ kind: 'unsupportedChain' });
    });
  });

  describe('will not take an address out of something longer', () => {
    it.each([
      ['a sentence', 'pay to 0x4444444444444444444444444444444444444444'],
      ['a private key', `0x${'a'.repeat(64)}`],
      ['a transaction hash', `0x${'1'.repeat(64)}`],
      ['an address with a digit appended', `${EVM}5`],
    ])('%s', (_case, input) => {
      expect(cryptoAddressFrom(input)).toEqual({ kind: 'none' });
    });
  });

  describe('refuses a payment URI that asks for a contract call', () => {
    it.each([
      [
        'an ERC-20 transfer request',
        `ethereum:0xdAC17F958D2ee523a2206206994597C13D831ec7@1/transfer?address=${EVM}&uint256=1000000`,
      ],
      [
        'a function call with no query',
        'ethereum:0xdAC17F958D2ee523a2206206994597C13D831ec7/transfer',
      ],
    ])('%s', (_case, input) => {
      expect(cryptoAddressFrom(input)).toEqual({ kind: 'none' });
    });
  });

  it('will not pick an address out of surrounding words', () => {
    expect(cryptoAddressFrom(`send ${BITCOIN} now`)).toEqual({ kind: 'none' });
    expect(cryptoAddressFrom('1A1zP1eP5QGefi2 DMPTfTL5SLmv7DivfNa')).toEqual({ kind: 'none' });
  });

  it('ignores the whitespace a scan carries', () => {
    expect(cryptoAddressFrom(`   ${EVM}   `)).toMatchObject({ address: EVM });
  });

  it('reads an address it cannot place without naming a network for it', () => {
    expect(cryptoAddressFrom(BECH32)).toEqual({
      kind: 'address',
      address: BECH32,
      networkCode: undefined,
    });
  });

  it('still names the chain a payment URI names, even for an address it cannot place', () => {
    expect(cryptoAddressFrom(`solana:${SOLANA}?amount=1.5`)).toMatchObject({ networkCode: 'SOL' });
  });

  describe('is not fooled by', () => {
    it.each([
      ['an empty string', ''],
      ['whitespace', '   '],
      ['a short token', 'shorttoken'],
      ['an account number', '0123456789'],
      ['a phone number', '+2250701234567'],
      ['a merchant code', '00020101021158'],
      ['an EVM address broken by a space', '0x1234 5678901234567890123456789012345678'],
    ])('%s', (_case, input) => {
      expect(cryptoAddressFrom(input)).toEqual({ kind: 'none' });
    });
  });
});
