import { NATIVE_CHAIN_CODE } from '@/core/reference-data/chain-metadata';
import { validateWalletAddress, type AddressValidation } from './validate-wallet-address-usecase';

const EVM = /^0x[0-9a-fA-F]{40}$/;

export function validateSendAddress(address: string, networkCode: string): AddressValidation {
  const validation = validateWalletAddress(address, networkCode);
  if (validation.valid) return validation;

  return networkCode === NATIVE_CHAIN_CODE && EVM.test(address.trim())
    ? { valid: false, messageKey: 'spend.sendSolanaOnly' }
    : validation;
}
