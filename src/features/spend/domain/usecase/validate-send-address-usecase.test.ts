import { validateSendAddress } from './validate-send-address-usecase';

const SOLANA_ADDRESS = 'Axxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx1';
const EVM_ADDRESS = '0xb249111111111111111111111111111111110e93';

describe('validateSendAddress', () => {
  it('accepts a Solana address on Solana', () => {
    expect(validateSendAddress(SOLANA_ADDRESS, 'SOL')).toEqual({ valid: true });
  });

  it('says an EVM address cannot be paid because sending is Solana only', () => {
    expect(validateSendAddress(EVM_ADDRESS, 'SOL')).toEqual({
      valid: false,
      messageKey: 'spend.sendSolanaOnly',
    });
  });

  it('keeps the wrong-network message for anything else that is not a Solana address', () => {
    expect(validateSendAddress('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', 'SOL')).toEqual({
      valid: false,
      messageKey: 'spend.addressWrongNetwork',
    });
  });

  it('asks for an address when there is none', () => {
    expect(validateSendAddress('   ', 'SOL')).toEqual({
      valid: false,
      messageKey: 'spend.addressRequired',
    });
  });
});
