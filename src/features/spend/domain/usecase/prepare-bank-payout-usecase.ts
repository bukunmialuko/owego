import { unknownError, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import type { WalletBalancePort } from '@/core/wallet/wallet';
import { findFundingWallet } from '../asset/funding-wallet';
import { corridorFor } from '../corridor/registry';
import { pricePayout, type PayoutQuote } from '../entity/payout-quote';
import type { PayoutOrigin, PayoutRecipient } from '../entity/payout-recipient';
import { mayHaveMovedMoney, type SendOutcome } from '../entity/send-outcome';
import type { TransferChallenge } from '../entity/transfer-challenge';
import type { TransferSigningPort } from '../port/transfer-signing-port';
import type { BankTransferRepository } from '../repository/bank-transfer-repository';
import type { LastTransferCurrencyRepository } from '../repository/last-transfer-currency-repository';
import { SIGNING_TIMEOUT_MS, signTransfer } from './sign-transfer-usecase';

export type BankPayoutDraft = {
  recipient: PayoutRecipient;
  fundingToken: string;
  amountMinor: number;
  narration: string;
  origin: PayoutOrigin;
};

export type PreparedPayout = {
  quote: PayoutQuote;
  confirm(): Promise<SendOutcome>;
};

type Dependencies = {
  walletBalancePort: WalletBalancePort;
  bankTransferRepository: BankTransferRepository;
  transferSigningPort: TransferSigningPort;
  lastTransferCurrencyRepository: LastTransferCurrencyRepository;
  signingTimeoutMs?: number;
};

export interface PrepareBankPayoutUseCase {
  execute(draft: BankPayoutDraft): Promise<Result<PreparedPayout, AppError>>;
}

export function createPrepareBankPayoutUseCase({
  walletBalancePort,
  bankTransferRepository,
  transferSigningPort,
  lastTransferCurrencyRepository,
  signingTimeoutMs = SIGNING_TIMEOUT_MS,
}: Dependencies): PrepareBankPayoutUseCase {
  function preparedPayout(
    draft: BankPayoutDraft,
    quote: PayoutQuote,
    challenge: TransferChallenge,
  ): PreparedPayout {
    let isSpent = false;

    return {
      quote,
      async confirm() {
        if (isSpent) return { type: 'notSent', reason: 'invalidRequest' };
        isSpent = true;

        const outcome = await signTransfer(transferSigningPort, challenge, signingTimeoutMs);
        if (outcome.type === 'cancelled') isSpent = false;

        if (draft.origin === 'transfer' && mayHaveMovedMoney(outcome)) {
          lastTransferCurrencyRepository.remember(draft.recipient.currency);
        }

        return outcome;
      },
    };
  }

  return {
    async execute(draft) {
      const { recipient, fundingToken, amountMinor, narration } = draft;

      if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
        return err(unknownError('A payout needs a whole, positive amount.'));
      }

      const corridor = corridorFor(recipient.currency, recipient.method);
      if (corridor === undefined || !corridor.payable) {
        return err(unknownError(`No payable corridor for ${recipient.currency}.`));
      }

      const wallets = await walletBalancePort.listWallets();
      if (!wallets.ok) return wallets;

      const funding = findFundingWallet(wallets.value, fundingToken);
      if (funding === undefined) {
        return err(unknownError(`No wallet holds ${fundingToken}.`));
      }

      const body = corridor.toBody(recipient.values, {
        ...funding,
        amountMinor,
        currency: recipient.currency,
        narration,
        countryCode: recipient.countryCode,
      });

      const initiation = await bankTransferRepository.initiate(corridor.endpoint, body);
      if (!initiation.ok) return initiation;

      const quote = pricePayout(initiation.value.figures, recipient.currency);
      if (quote === undefined) {
        return err(unknownError('The payout came back with figures that could not be shown.'));
      }

      return ok(preparedPayout(draft, quote, initiation.value.challenge));
    },
  };
}
