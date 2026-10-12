import { isServerRefusal, unknownError, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import type { YieldTarget } from '../entity/yield-entity';
import type { DepositQuoteDecision, YieldQuote } from '../entity/yield-quote';
import type { YieldRepository } from '../repository/yield-repository';
import type { LoadYieldProductsUseCase } from './load-yield-products-usecase';

const MAX_FIT_ATTEMPTS = 3;

const FEE_PROBE_MINOR = 100;

export interface QuoteYieldDepositUseCase {
  execute(request: {
    target: YieldTarget;
    amountMinor: number;
  }): Promise<Result<DepositQuoteDecision, AppError>>;
}

export function createQuoteYieldDepositUseCase({
  yieldRepository,
  loadYieldProducts,
}: {
  yieldRepository: YieldRepository;
  loadYieldProducts: LoadYieldProductsUseCase;
}): QuoteYieldDepositUseCase {
  const quote = (amountMinor: number) => yieldRepository.quote({ kind: 'deposit', amountMinor });

  async function fit(
    requestedMinor: number,
    balanceMinor: number,
    firstFeeMinor: number,
  ): Promise<Result<DepositQuoteDecision, AppError>> {
    let feeMinor = firstFeeMinor;

    for (let attempt = 0; attempt < MAX_FIT_ATTEMPTS; attempt += 1) {
      const candidateMinor = balanceMinor - feeMinor;
      if (candidateMinor <= 0) return ok({ type: 'feeExceedsBalance', feeMinor });

      const quoted = await quote(candidateMinor);
      if (!quoted.ok) return quoted;
      if (quoted.value.totalMinor <= balanceMinor) {
        return ok({ type: 'adjusted', quote: quoted.value, requestedMinor });
      }

      feeMinor = quoted.value.feeMinor;
    }

    return ok({ type: 'noFit' });
  }

  return {
    async execute({ target, amountMinor }) {
      if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
        return err(unknownError('yield deposit: the amount is not a whole number of cents'));
      }

      const products = await loadYieldProducts.execute();
      if (!products.ok) return products;

      const balanceMinor = products.value.find(
        (product) => product.id === target.vaultId,
      )?.walletBalanceMinor;
      if (balanceMinor === undefined) return ok({ type: 'unknownBalance' });
      if (amountMinor > balanceMinor) return ok({ type: 'exceedsBalance' });

      const first = await quote(amountMinor);
      if (first.ok) {
        return fitsAsIs(first.value, balanceMinor)
          ? ok({ type: 'quoted', quote: first.value })
          : fit(amountMinor, balanceMinor, first.value.feeMinor);
      }
      if (!isServerRefusal(first.error)) return first;

      const probe = await quote(Math.min(FEE_PROBE_MINOR, amountMinor));
      if (!probe.ok || balanceMinor - probe.value.feeMinor >= amountMinor) return first;

      return fit(amountMinor, balanceMinor, probe.value.feeMinor);
    },
  };
}

function fitsAsIs(quote: YieldQuote, balanceMinor: number): boolean {
  return quote.totalMinor <= balanceMinor;
}
