import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AwilixContainer } from 'awilix';
import { useCallback, useEffect, useRef } from 'react';
import type { AppCradle } from '@/core/di/container';
import { useContainer } from '@/core/di/container-provider';
import { fromUnknown, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import type { PayoutQuote } from '../../../domain/entity/payout-quote';
import { mayHaveMovedMoney, type SendOutcome } from '../../../domain/entity/send-outcome';
import type {
  BankPayoutDraft,
  PreparedPayout,
  PrepareBankPayoutUseCase,
} from '../../../domain/usecase/prepare-bank-payout-usecase';
import { useSavePaidRecipient } from '../../hook/use-save-paid-recipient';

type PayoutChoices = { saveAsBeneficiary: boolean };

export function useBankPayout(draft: BankPayoutDraft, { enabled }: { enabled: boolean }) {
  const container = useContainer();
  const queryClient = useQueryClient();
  const payout = useRef<PreparedPayout | undefined>(undefined);
  const isConfirming = useRef(false);
  const hasInitiated = useRef(false);
  const savePaidRecipient = useSavePaidRecipient();

  const preparing = useMutation<Result<PayoutQuote, AppError>, never, BankPayoutDraft>({
    mutationFn: async (next) => {
      payout.current = undefined;

      const useCase = resolvePrepare(container);
      if (!useCase.ok) return useCase;

      const prepared = await useCase.value.execute(next);
      if (!prepared.ok) return prepared;

      payout.current = prepared.value;

      return ok(prepared.value.quote);
    },
  });

  const { mutate: prepare } = preparing;

  const confirming = useMutation<SendOutcome, never, PayoutChoices>({
    mutationFn: () =>
      payout.current === undefined
        ? Promise.resolve({ type: 'notSent', reason: 'invalidRequest' })
        : payout.current.confirm(),
    onSettled: (outcome, _error, choices) => {
      isConfirming.current = false;
      if (outcome === undefined) return;

      savePaidRecipient({
        recipient: draft.recipient,
        outcome,
        saveAsBeneficiary: choices.saveAsBeneficiary,
      });
      if (mayHaveMovedMoney(outcome)) void queryClient.invalidateQueries();
      if (outcome.type === 'notSent') prepare(draft);
    },
  });

  const { mutate: confirmMutate } = confirming;

  useEffect(() => {
    if (!enabled || hasInitiated.current) return;
    hasInitiated.current = true;
    prepare(draft);
  }, [draft, enabled, prepare]);

  const confirm = useCallback(
    (choices: PayoutChoices) => {
      if (isConfirming.current || payout.current === undefined) return;
      isConfirming.current = true;
      confirmMutate(choices);
    },
    [confirmMutate],
  );

  const answer = preparing.data;

  return {
    quote: answer?.ok === true ? answer.value : undefined,
    isPreparing: preparing.isPending,
    prepareFailed: answer?.ok === false,
    confirm,
    isConfirming: confirming.isPending,
    outcome: confirming.data,
  };
}

function resolvePrepare(
  container: AwilixContainer<AppCradle>,
): Result<PrepareBankPayoutUseCase, AppError> {
  try {
    return ok(container.resolve('prepareBankPayoutUseCase'));
  } catch (cause) {
    return err(fromUnknown(cause));
  }
}
