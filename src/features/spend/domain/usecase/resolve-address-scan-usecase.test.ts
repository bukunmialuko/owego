import { resolveAddressScan } from './resolve-address-scan-usecase';

const SOLANA_ADDRESS = 'Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx3';
const EVM_ADDRESS = '0xb249111111111111111111111111111111113901';

describe('resolveAddressScan', () => {
  it('reads a Solana payment link as a Solana address', () => {
    expect(resolveAddressScan(`solana:${SOLANA_ADDRESS}?amount=5`)).toEqual({
      kind: 'prefillAddress',
      address: SOLANA_ADDRESS,
      networkCode: 'SOL',
    });
  });

  it('reads a bare address without guessing its network', () => {
    expect(resolveAddressScan(EVM_ADDRESS)).toEqual({
      kind: 'prefillAddress',
      address: EVM_ADDRESS,
      networkCode: undefined,
    });
  });

  it('says a chain owego cannot send to is not supported', () => {
    expect(resolveAddressScan('bitcoin:bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq')).toEqual({
      kind: 'unsupported',
      reason: 'unsupportedChain',
    });
  });

  it('treats anything that is not an address as an unknown code', () => {
    expect(resolveAddressScan('000201010211')).toEqual({
      kind: 'unsupported',
      reason: 'unknownCode',
    });
    expect(resolveAddressScan('hello')).toEqual({ kind: 'unsupported', reason: 'unknownCode' });
  });
});
