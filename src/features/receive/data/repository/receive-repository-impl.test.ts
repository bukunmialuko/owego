import { offline } from '@/core/errors/app-error';
import { err, ok } from '@/core/result/result';
import type { ReceiveRemoteDataSource } from '../datasource/receive-remote-datasource';
import type { SolanaWalletAddressPort } from '../../domain/port/solana-wallet-address-port';
import { createReceiveRepositoryImpl } from './receive-repository-impl';

function build(
  overrides: {
    remote?: Partial<ReceiveRemoteDataSource>;
    solana?: Partial<SolanaWalletAddressPort>;
  } = {},
) {
  const remoteDataSource = {
    getChains: jest
      .fn()
      .mockResolvedValue(ok([{ key: 'BASE', blockchain: 'BASE-SEPOLIA', enabled: true }])),
    getAddress: jest
      .fn()
      .mockResolvedValue(ok({ chain: 'BASE', address: '0xabc', status: 'ACTIVE' })),
    ...overrides.remote,
  } satisfies ReceiveRemoteDataSource;

  const solanaWalletAddressPort = {
    getSolanaAddress: jest.fn().mockResolvedValue(ok('solAddress')),
    ...overrides.solana,
  } satisfies SolanaWalletAddressPort;

  return {
    repository: createReceiveRepositoryImpl({ remoteDataSource, solanaWalletAddressPort }),
    remoteDataSource,
    solanaWalletAddressPort,
  };
}

describe('ReceiveRepository — getChains', () => {
  it('prepends the hardcoded native Solana chain to the bridged chains from the wire', async () => {
    const { repository } = build();

    const result = await repository.getChains();

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected success');
    expect(result.value.map((chain) => chain.code)).toEqual(['SOL', 'BASE']);
    expect(result.value[0]?.isNative).toBe(true);
    expect(result.value[1]?.isNative).toBe(false);
  });

  it('still resolves the native chain when the remote list fails', async () => {
    const { repository } = build({
      remote: { getChains: jest.fn().mockResolvedValue(err(offline())) },
    });

    const result = await repository.getChains();

    expect(result).toEqual(ok([expect.objectContaining({ code: 'SOL', isNative: true })]));
  });
});

describe('ReceiveRepository — getAddress', () => {
  it('resolves Solana through the wallet-address port, never the deposit-wallet endpoint', async () => {
    const { repository, remoteDataSource, solanaWalletAddressPort } = build();

    const result = await repository.getAddress('SOL');

    expect(result).toEqual(
      ok({ chainCode: 'SOL', address: 'solAddress', acceptedTokens: ['USDC', 'USDT'] }),
    );
    expect(solanaWalletAddressPort.getSolanaAddress).toHaveBeenCalled();
    expect(remoteDataSource.getAddress).not.toHaveBeenCalled();
  });

  it('resolves undefined for Solana when no wallet exists yet', async () => {
    const { repository } = build({
      solana: { getSolanaAddress: jest.fn().mockResolvedValue(ok(undefined)) },
    });

    await expect(repository.getAddress('SOL')).resolves.toEqual(ok(undefined));
  });

  it('resolves a bridged chain through the deposit-wallet endpoint, never the Solana port', async () => {
    const { repository, remoteDataSource, solanaWalletAddressPort } = build();

    const result = await repository.getAddress('BASE');

    expect(result).toEqual(ok({ chainCode: 'BASE', address: '0xabc', acceptedTokens: ['USDC'] }));
    expect(remoteDataSource.getAddress).toHaveBeenCalledWith('BASE');
    expect(solanaWalletAddressPort.getSolanaAddress).not.toHaveBeenCalled();
  });

  it('passes a bridged-chain failure straight through', async () => {
    const { repository } = build({
      remote: { getAddress: jest.fn().mockResolvedValue(err(offline())) },
    });

    await expect(repository.getAddress('BASE')).resolves.toEqual(err(offline()));
  });
});
