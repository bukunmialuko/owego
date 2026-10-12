import type { ChainDto } from '@/core/reference-data/reference-data';
import { toChain } from './chain-mapper';

const BASE_DTO: ChainDto = { key: 'BASE', blockchain: 'BASE-SEPOLIA', enabled: true };

describe('toChain', () => {
  it('maps the wire key and blockchain label straight through', () => {
    const chain = toChain(BASE_DTO);

    expect(chain.code).toBe('BASE');
    expect(chain.networkLabel).toBe('BASE-SEPOLIA');
  });

  it('reads display name, ETA and fee from the client-side metadata table, not the wire', () => {
    const chain = toChain(BASE_DTO);

    expect(chain.name).toBe('Base');
    expect(chain.estimatedTime).toBe('1 - 2 min');
    expect(chain.depositFeePercent).toBe(3);
  });

  it('supports USDC only on a bridged chain', () => {
    expect(toChain(BASE_DTO).supportedTokens).toEqual(['USDC']);
  });

  it('carries the enabled flag through', () => {
    expect(toChain({ ...BASE_DTO, enabled: false }).isEnabled).toBe(false);
  });

  it('is never native, since the wire never lists Solana', () => {
    expect(toChain(BASE_DTO).isNative).toBe(false);
  });
});
