import { ok } from '@/core/result/result';
import type { Wallet } from '../../domain/entity/wallet-entity';
import type { WalletRepository } from '../../domain/repository/wallet-repository';
import { createSolanaWalletAddressAdapter } from './solana-wallet-address-adapter';

function adapterOver(wallets: Wallet[]) {
  const repository: WalletRepository = {
    getWallets: () => Promise.resolve(ok(wallets)),
    createChallenge: () => Promise.reject(new Error('not used by this adapter')),
    createPinChangeChallenge: () => Promise.reject(new Error('not used by this adapter')),
  };

  return createSolanaWalletAddressAdapter(repository);
}

const SOLANA: Wallet = { id: 'w1', address: 'sol-address', blockchain: 'SOL', balances: [] };
const BASE: Wallet = {
  id: 'w2',
  address: 'base-address',
  blockchain: 'BASE-SEPOLIA',
  balances: [],
};

describe('solana wallet address adapter', () => {
  it('returns the Solana wallet address among several chains', async () => {
    const result = await adapterOver([BASE, SOLANA]).getSolanaAddress();

    expect(result).toEqual(ok('sol-address'));
  });

  it('matches a Solana wallet regardless of its environment suffix', async () => {
    const devnet: Wallet = {
      id: 'w3',
      address: 'devnet-address',
      blockchain: 'SOL-DEVNET',
      balances: [],
    };

    const result = await adapterOver([BASE, devnet]).getSolanaAddress();

    expect(result).toEqual(ok('devnet-address'));
  });

  it('does not match a non-Solana chain that happens to start similarly', async () => {
    const notSolana: Wallet = { id: 'w4', address: 'wrong', blockchain: 'SOLD-OUT', balances: [] };

    const result = await adapterOver([notSolana]).getSolanaAddress();

    expect(result).toEqual(ok(undefined));
  });

  it('returns undefined when the account has no Solana wallet yet', async () => {
    const result = await adapterOver([BASE]).getSolanaAddress();

    expect(result).toEqual(ok(undefined));
  });
});
