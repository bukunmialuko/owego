import { tokenForNetwork } from './token-for-network';

describe('tokenForNetwork', () => {
  it('keeps the token already chosen when the network carries it', () => {
    expect(tokenForNetwork('USDT', 'SOL')).toBe('USDT');
  });

  it('switches to a token the network does carry', () => {
    expect(tokenForNetwork('USDT', 'BASE')).toBe('USDC');
  });

  it('keeps the token when the network is one the catalog does not know', () => {
    expect(tokenForNetwork('USDT', 'TRON')).toBe('USDT');
  });
});
