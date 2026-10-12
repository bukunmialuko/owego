import { cryptoAddressFrom } from '../scan/crypto-address';
import type { ScanOutcome } from '../scan/scan-outcome';

export function resolveAddressScan(raw: string): ScanOutcome {
  const reading = cryptoAddressFrom(raw);

  switch (reading.kind) {
    case 'address':
      return { kind: 'prefillAddress', address: reading.address, networkCode: reading.networkCode };
    case 'unsupportedChain':
      return { kind: 'unsupported', reason: 'unsupportedChain' };
    case 'none':
      return { kind: 'unsupported', reason: 'unknownCode' };
  }
}
