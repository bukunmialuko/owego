import type { AppError } from '@/core/errors/app-error';
import { ok, type Result } from '@/core/result/result';
import type { FieldValues } from '../corridor/corridor-spec';
import { corridorFor } from '../corridor/registry';
import type { PaymentMethodCode } from '../entity/beneficiary-form';
import { mayHaveMovedMoney, type SendOutcome } from '../entity/send-outcome';
import type { BeneficiaryRepository } from '../repository/beneficiary-repository';
import type { SaveBeneficiaryOutcome, SaveBeneficiaryUseCase } from './save-beneficiary-usecase';
import type { SaveMerchantUseCase } from './save-merchant-usecase';

export type PaidRecipient = {
  currency: string;
  method: PaymentMethodCode;
  values: FieldValues;
  labels: FieldValues;
};

export type SavePaidRecipientInput = {
  recipient: PaidRecipient;
  outcome: SendOutcome;
  saveAsBeneficiary: boolean;
};

export type SavePaidRecipientOutcome = SaveBeneficiaryOutcome | { kind: 'skipped' };

type Dependencies = {
  beneficiaryRepository: BeneficiaryRepository;
  saveMerchantUseCase: SaveMerchantUseCase;
  saveBeneficiaryUseCase: SaveBeneficiaryUseCase;
};

export interface SavePaidRecipientUseCase {
  execute(input: SavePaidRecipientInput): Promise<Result<SavePaidRecipientOutcome, AppError>>;
}

export function createSavePaidRecipientUseCase({
  beneficiaryRepository,
  saveMerchantUseCase,
  saveBeneficiaryUseCase,
}: Dependencies): SavePaidRecipientUseCase {
  async function saveMerchant(
    values: FieldValues,
  ): Promise<Result<SavePaidRecipientOutcome, AppError>> {
    const saved = await saveMerchantUseCase.execute({
      qrString: values['qrString'] ?? '',
      existing: [],
    });
    if (!saved.ok) return saved;

    switch (saved.value.kind) {
      case 'saved':
      case 'duplicate':
        return ok(saved.value);
      case 'notSaveable':
        return ok({ kind: 'skipped' });
    }
  }

  return {
    async execute({ recipient, outcome, saveAsBeneficiary }) {
      if (!saveAsBeneficiary || !mayHaveMovedMoney(outcome)) return ok({ kind: 'skipped' });

      const corridor = corridorFor(recipient.currency, recipient.method);
      if (corridor?.entry === 'scan') return saveMerchant(recipient.values);
      if (corridor?.beneficiary?.saveable !== true) return ok({ kind: 'skipped' });

      const existing = await beneficiaryRepository.list();
      if (!existing.ok) return existing;

      return saveBeneficiaryUseCase.execute({
        corridor,
        values: recipient.values,
        labelOf: (name) => recipient.labels[name] ?? '',
        existing: existing.value,
      });
    },
  };
}
