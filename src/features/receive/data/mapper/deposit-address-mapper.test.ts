import type { DepositAddressDto } from '../model/receive-model';
import { toDepositAddress } from './deposit-address-mapper';

const ACTIVE_DTO: DepositAddressDto = { chain: 'BASE', address: '0xabc', status: 'ACTIVE' };

describe('toDepositAddress', () => {
  it('maps an active wallet to a receivable address', () => {
    expect(toDepositAddress(ACTIVE_DTO, 'BASE')).toEqual({
      chainCode: 'BASE',
      address: '0xabc',
      acceptedTokens: ['USDC'],
    });
  });

  it('reads accepted tokens from the client-side metadata table for the chain', () => {
    const solanaDto: DepositAddressDto = { chain: 'SOL', address: 'solAddr', status: 'ACTIVE' };

    expect(toDepositAddress(solanaDto, 'SOL')?.acceptedTokens).toEqual(['USDC', 'USDT']);
  });

  it('returns undefined when the wallet is not active yet', () => {
    expect(toDepositAddress({ ...ACTIVE_DTO, status: 'PENDING' }, 'BASE')).toBeUndefined();
  });

  it('returns undefined when the address is blank', () => {
    expect(toDepositAddress({ ...ACTIVE_DTO, address: '' }, 'BASE')).toBeUndefined();
  });
});
