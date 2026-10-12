import { isSolanaSignature, solscanTransactionUrl } from './explorer';

const SIGNATURE_88 =
  '4xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx1';
const SIGNATURE_87 =
  'Wxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx2';

describe('isSolanaSignature', () => {
  it.each([SIGNATURE_88, SIGNATURE_87])('accepts a recorded signature', (signature) => {
    expect(isSolanaSignature(signature)).toBe(true);
  });

  it.each([
    ['blank', ''],
    ['a transaction id', '00000000-0000-4000-8000-000000000004'],
    ['an EVM hash', `0x${'a'.repeat(64)}`],
    ['a wallet address', 'Fxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx7'],
    ['characters base58 leaves out', `0OIl${SIGNATURE_87.slice(4)}`],
    ['surrounding whitespace', ` ${SIGNATURE_87}`],
    ['a path', `${SIGNATURE_87.slice(0, 80)}/../../x`],
    ['anything longer than a signature', `${SIGNATURE_88}1`],
  ])('rejects %s', (_, value) => {
    expect(isSolanaSignature(value)).toBe(false);
  });
});

describe('solscanTransactionUrl', () => {
  it('names the devnet cluster, which Solscan otherwise reads as mainnet', () => {
    expect(solscanTransactionUrl(SIGNATURE_88, 'devnet')).toBe(
      `https://solscan.io/tx/${SIGNATURE_88}?cluster=devnet`,
    );
  });

  it('leaves mainnet unqualified, as v1 did', () => {
    expect(solscanTransactionUrl(SIGNATURE_87, 'mainnet-beta')).toBe(
      `https://solscan.io/tx/${SIGNATURE_87}`,
    );
  });

  it('builds nothing from a value that is not a signature', () => {
    expect(solscanTransactionUrl('https://evil.example', 'devnet')).toBeUndefined();
  });
});
