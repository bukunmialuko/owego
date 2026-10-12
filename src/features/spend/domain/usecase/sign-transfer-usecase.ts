import { settleWithin } from '@/core/async/settle-within';
import type { SendOutcome } from '../entity/send-outcome';
import type { TransferChallenge } from '../entity/transfer-challenge';
import type { TransferSigningPort } from '../port/transfer-signing-port';
import { resolveSendOutcome } from './resolve-send-outcome-usecase';

export const SIGNING_TIMEOUT_MS = 3 * 60_000;

export async function signTransfer(
  transferSigningPort: TransferSigningPort,
  challenge: TransferChallenge,
  timeoutMs: number,
): Promise<SendOutcome> {
  const signed = await settleWithin(transferSigningPort.sign(challenge), timeoutMs);

  return signed === 'timedOut' ? { type: 'unconfirmed' } : resolveSendOutcome(signed);
}
