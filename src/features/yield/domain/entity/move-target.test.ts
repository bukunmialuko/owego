import type { YieldPosition } from '@/core/yield/yield-overview';
import { apyOf, depositTargets, withdrawalTargets } from './move-target';
import type { YieldProduct } from './yield-entity';

const USDC: YieldProduct = {
  id: 'vault-usdc',
  tokenSymbol: 'USDC',
  tokenMint: 'usdc-mint',
  apyPercent: 4.1,
  provider: 'jupiter',
  isStakeable: true,
  walletBalanceMinor: 100_000,
};
const USDT: YieldProduct = {
  id: 'vault-usdt',
  tokenSymbol: 'USDT',
  tokenMint: 'usdt-mint',
  apyPercent: 3.77,
  provider: 'jupiter',
  isStakeable: false,
  walletBalanceMinor: 0,
};
const POSITION: YieldPosition = {
  id: 'vault-usdc',
  tokenSymbol: 'USDC',
  tokenMint: 'usdc-mint',
  valueMinor: 513_698,
  currency: 'USD',
  apyPercent: 3.3,
};

const TARGET = {
  vaultId: 'vault-usdc',
  tokenSymbol: 'USDC',
  tokenMint: 'usdc-mint',
  apyPercent: 4.1,
  provider: 'jupiter',
};

describe('depositTargets', () => {
  it('offers each enabled USDC vault, its ceiling the wallet balance', () => {
    expect(depositTargets([USDC, USDT])).toEqual([{ target: TARGET, ceilingMinor: 100_000 }]);
  });

  it('still offers the USDC vault to a user holding no USDC, with nothing to spend', () => {
    const unfunded = { ...USDC, isStakeable: false, walletBalanceMinor: 0 };

    expect(depositTargets([unfunded, USDT])).toEqual([{ target: TARGET, ceilingMinor: 0 }]);
  });

  it('offers the USDC vault to a funded wallet the options call unstakeable', () => {
    const misreported = { ...USDC, isStakeable: false, walletBalanceMinor: 100_000 };

    expect(depositTargets([misreported, USDT])).toEqual([
      { target: TARGET, ceilingMinor: 100_000 },
    ]);
  });

  it('offers nothing it cannot send — a vault with no mint', () => {
    expect(depositTargets([{ ...USDC, tokenMint: '' }])).toEqual([]);
  });

  it('leaves the ceiling unknown when the balance could not be read', () => {
    const { walletBalanceMinor: _unread, ...unreadable } = USDC;
    const [offered] = depositTargets([unreadable]);

    expect(offered).toEqual({ target: TARGET });
  });
});

describe('withdrawalTargets', () => {
  it('offers each USDC position, its ceiling the position’s value', () => {
    expect(withdrawalTargets([POSITION], [{ ...USDC, isStakeable: false }])).toEqual([
      { target: TARGET, ceilingMinor: 513_698 },
    ]);
  });

  it('offers nothing from an empty position, or one in a token that cannot move', () => {
    expect(
      withdrawalTargets(
        [
          { ...POSITION, valueMinor: 0 },
          { ...POSITION, id: 'vault-usdt', tokenSymbol: 'USDT' },
        ],
        [],
      ),
    ).toEqual([]);
  });
});

describe('apyOf', () => {
  it('takes the product’s rate for a vault both report', () => {
    expect(apyOf('vault-usdc', [USDC], [POSITION])).toBe(4.1);
  });

  it('falls back to the position’s rate', () => {
    expect(apyOf('vault-usdc', [], [POSITION])).toBe(3.3);
  });

  it('is absent when neither reports one', () => {
    expect(apyOf('vault-usdc', [], [])).toBeUndefined();
  });
});
