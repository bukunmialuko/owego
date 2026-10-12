import { settleWithin } from '@/core/async/settle-within';
import { ErrorCode, isServerRefusal, unknownError, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import { MOVABLE_TOKEN, type YieldTarget } from '../entity/yield-entity';
import type { YieldInitiation } from '../entity/yield-move';
import type { YieldMoveOutcome, YieldNotSentReason } from '../entity/yield-move-outcome';
import type { YieldQuote } from '../entity/yield-quote';
import type { YieldSigningPort } from '../port/yield-signing-port';
import type { YieldRepository } from '../repository/yield-repository';
import { resolveYieldBroadcast } from './resolve-yield-broadcast-usecase';
import { resolveYieldSigning } from './resolve-yield-signing-usecase';

const YIELD_SIGNING_TIMEOUT_MS = 3 * 60_000;

type YieldMoveDraft = { target: YieldTarget; quote: YieldQuote };

export type PreparedYieldMove = {
  quote: YieldQuote;
  confirm(options?: { onBroadcasting?: () => void }): Promise<YieldMoveOutcome>;
};

export interface PrepareYieldMoveUseCase {
  prepare(draft: YieldMoveDraft): Result<PreparedYieldMove, AppError>;
}

export function createPrepareYieldMoveUseCase({
  yieldRepository,
  yieldSigningPort,
  signingTimeoutMs = YIELD_SIGNING_TIMEOUT_MS,
}: {
  yieldRepository: YieldRepository;
  yieldSigningPort: YieldSigningPort;
  signingTimeoutMs?: number;
}): PrepareYieldMoveUseCase {
  return {
    prepare({ target, quote }) {
      if (!Number.isSafeInteger(quote.amountMinor) || quote.amountMinor <= 0) {
        return err(unknownError('yield move: the amount is not a whole number of cents'));
      }
      if (target.tokenSymbol !== MOVABLE_TOKEN || target.tokenMint === '') {
        return err(unknownError('yield move: only USDC with a known mint can move'));
      }

      let isSpent = false;

      const notSent = (reason: YieldNotSentReason): YieldMoveOutcome => {
        isSpent = false;

        return { type: 'notSent', reason };
      };

      async function sign(): Promise<
        | { type: 'signed'; signedTransaction: string; transactionId: string }
        | { type: 'ended'; outcome: YieldMoveOutcome }
      > {
        const initiated = await yieldRepository.initiate({
          kind: quote.kind,
          amountMinor: quote.amountMinor,
          tokenSymbol: target.tokenSymbol,
          tokenMint: target.tokenMint,
        });
        if (!initiated.ok) {
          return { type: 'ended', outcome: notSent(whyNotBuilt(initiated.error)) };
        }
        if (!matchesQuote(initiated.value, quote)) {
          return { type: 'ended', outcome: notSent('quoteChanged') };
        }

        const signing = resolveYieldSigning(
          await settleWithin(yieldSigningPort.sign(initiated.value.challenge), signingTimeoutMs),
        );
        switch (signing.type) {
          case 'signed':
            return {
              type: 'signed',
              signedTransaction: signing.signedTransaction,
              transactionId: initiated.value.transactionId,
            };
          case 'cancelled':
            isSpent = false;
            return { type: 'ended', outcome: { type: 'cancelled' } };
          case 'notSent':
            return { type: 'ended', outcome: notSent(signing.reason) };
          case 'unconfirmed':
            return { type: 'ended', outcome: { type: 'unconfirmed' } };
        }
      }

      return ok({
        quote,
        async confirm({ onBroadcasting } = {}) {
          if (isSpent) return { type: 'notSent', reason: 'invalidRequest' };
          isSpent = true;

          let signed: Awaited<ReturnType<typeof sign>>;
          try {
            signed = await sign();
          } catch {
            return notSent('failed');
          }
          if (signed.type === 'ended') return signed.outcome;

          try {
            onBroadcasting?.();
          } catch {
            // A listener's bug must not keep a signed move from going out.
          }
          try {
            return resolveYieldBroadcast(
              await yieldRepository.broadcast({
                signedTransaction: signed.signedTransaction,
                transactionId: signed.transactionId,
              }),
            );
          } catch {
            return { type: 'unconfirmed' };
          }
        },
      });
    },
  };
}

function whyNotBuilt(error: AppError): YieldNotSentReason {
  if (error.code === ErrorCode.RateLimited) return 'rateLimited';

  return isServerRefusal(error) ? 'rejected' : 'failed';
}

function matchesQuote({ echo }: YieldInitiation, quote: YieldQuote): boolean {
  if (echo === undefined) return true;
  if (echo.amountMinor !== undefined && echo.amountMinor !== quote.amountMinor) return false;
  if (echo.feeMinor !== undefined && echo.feeMinor > quote.feeMinor) return false;
  if (echo.totalMinor === undefined) return true;

  return quote.kind === 'deposit'
    ? echo.totalMinor <= quote.totalMinor
    : echo.totalMinor >= quote.totalMinor;
}
