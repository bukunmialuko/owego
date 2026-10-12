import { isUsableWallet } from './wallet';

describe('isUsableWallet', () => {
  it('counts a wallet with an id and an address', () => {
    expect(isUsableWallet({ id: 'w1', address: 'So1ana' })).toBe(true);
  });

  it('does not count a wallet without an address', () => {
    expect(isUsableWallet({ id: 'w1', address: '' })).toBe(false);
  });

  it('does not count a wallet without an id', () => {
    expect(isUsableWallet({ id: '', address: 'So1ana' })).toBe(false);
  });
});
