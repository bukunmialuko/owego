import { validateWalletAddress } from './validate-wallet-address-usecase';

const SOLANA_ADDRESS = 'Axxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx1';
const EVM_ADDRESS = '0xb249111111111111111111111111111111110e93';

describe('validateWalletAddress', () => {
  it('accepts a Solana address on Solana', () => {
    expect(validateWalletAddress(SOLANA_ADDRESS, 'SOL')).toEqual({ valid: true });
  });

  it.each(['BASE', 'MONAD', 'ARC'])('accepts an EVM address on %s', (network) => {
    expect(validateWalletAddress(EVM_ADDRESS, network)).toEqual({ valid: true });
  });

  it('rejects an EVM address pasted onto Solana', () => {
    expect(validateWalletAddress(EVM_ADDRESS, 'SOL')).toEqual({
      valid: false,
      messageKey: 'spend.addressWrongNetwork',
    });
  });

  it('rejects a Solana address pasted onto an EVM chain', () => {
    expect(validateWalletAddress(SOLANA_ADDRESS, 'BASE').valid).toBe(false);
  });

  describe('rejects an address from another chain that shares the alphabet', () => {
    it.each([
      ['a legacy Bitcoin address', '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'],
      ['a Bitcoin script address', '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy'],
      ['a Litecoin address', 'LZone2ELc9yLQPPCFrgSLMe4tjPQNPKDLj'],
      ['a Tron address', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'],
    ])('%s', (_case, address) => {
      expect(validateWalletAddress(address, 'SOL')).toEqual({
        valid: false,
        messageKey: 'spend.addressWrongNetwork',
      });
    });
  });

  it('still accepts a Solana address one character short of the usual length', () => {
    expect(validateWalletAddress(SOLANA_ADDRESS.slice(1), 'SOL').valid).toBe(true);
  });

  describe('rejects a malformed address', () => {
    it.each([
      ['too short for Solana', 'abc', 'SOL'],
      ['base58 has no zero', `0${SOLANA_ADDRESS.slice(1)}`, 'SOL'],
      ['EVM without the prefix', EVM_ADDRESS.slice(2), 'BASE'],
      ['EVM one nibble short', EVM_ADDRESS.slice(0, -1), 'BASE'],
      ['EVM with a non-hex digit', `${EVM_ADDRESS.slice(0, -1)}z`, 'BASE'],
    ])('%s', (_case, address, network) => {
      expect(validateWalletAddress(address, network).valid).toBe(false);
    });
  });

  it('rejects an empty address with its own message', () => {
    expect(validateWalletAddress('   ', 'SOL')).toEqual({
      valid: false,
      messageKey: 'spend.addressRequired',
    });
  });

  it('ignores surrounding whitespace, which a paste often carries', () => {
    expect(validateWalletAddress(`  ${EVM_ADDRESS}\n`, 'BASE').valid).toBe(true);
  });

  it('accepts anything on a network it does not recognise', () => {
    expect(validateWalletAddress(EVM_ADDRESS, 'FUTURECHAIN').valid).toBe(true);
  });
});
