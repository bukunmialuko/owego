import { isOnChain } from './chain';

describe('isOnChain', () => {
  it('matches the chain code on its own', () => {
    expect(isOnChain('SOL', 'SOL')).toBe(true);
  });

  it('matches the chain code with an environment suffix', () => {
    expect(isOnChain('SOL-DEVNET', 'SOL')).toBe(true);
  });

  it('does not match a different chain that shares a prefix', () => {
    expect(isOnChain('SOLD-OUT', 'SOL')).toBe(false);
  });

  it('does not match another chain', () => {
    expect(isOnChain('BASE-SEPOLIA', 'SOL')).toBe(false);
  });

  it('does not match a blank blockchain', () => {
    expect(isOnChain('', 'SOL')).toBe(false);
  });
});
