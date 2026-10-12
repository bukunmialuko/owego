import { ErrorCategory, ErrorCode, type AppError } from '@/core/errors/app-error';
import { err, map, ok, type Result } from '@/core/result/result';
import type { Beneficiary } from '../entity/beneficiary';
import type { CorridorSpec, FieldValues } from '../corridor/corridor-spec';
import { recipientFor } from '../corridor/recipient-corridor';
import { isStepComplete } from '../corridor/step-completeness';
import { findSavedCopy } from '../beneficiary/find-saved-copy';
import type { BeneficiaryRepository } from '../repository/beneficiary-repository';

export type SaveBeneficiaryInput = {
  corridor: CorridorSpec;
  values: FieldValues;
  labelOf: (name: string) => string;
  existing: readonly Beneficiary[];
};

export type SaveBeneficiaryOutcome =
  { kind: 'saved' } | { kind: 'duplicate'; existing: Beneficiary };

type Dependencies = {
  beneficiaryRepository: BeneficiaryRepository;
};

export interface SaveBeneficiaryUseCase {
  execute(input: SaveBeneficiaryInput): Promise<Result<SaveBeneficiaryOutcome, AppError>>;
}

export function createSaveBeneficiaryUseCase({
  beneficiaryRepository,
}: Dependencies): SaveBeneficiaryUseCase {
  return {
    async execute({ corridor, values, labelOf, existing }) {
      const block = corridor.beneficiary;
      if (block === undefined || !block.saveable) {
        return err(refused(`${corridor.currency}:${corridor.method} cannot be saved.`));
      }

      if (!block.steps.every((step) => isStepComplete(step.fields, values))) {
        return err(refused('The form is not complete.'));
      }

      const resolves = corridor.verification?.resolves;
      if (resolves !== undefined && (values[resolves] ?? '').trim() === '') {
        return err(refused('The account has not been resolved.'));
      }

      const problem = block.validate?.(values);
      if (problem !== undefined) {
        return err(refused('A field breaks its rule.', { [problem.field]: problem.messageKey }));
      }

      const fields = recipientFor(corridor, values, labelOf);
      const duplicate = findSavedCopy(fields, existing);
      if (duplicate !== undefined) return ok({ kind: 'duplicate', existing: duplicate });

      const created = await beneficiaryRepository.create(fields);

      return map(created, () => ({ kind: 'saved' }) as const);
    },
  };
}

function refused(detail: string, fieldErrors?: Readonly<Record<string, string>>): AppError {
  return {
    code: ErrorCode.InvalidInput,
    category: ErrorCategory.Validation,
    titleKey: 'errors.validation.invalidInput',
    retryable: false,
    detail,
    ...(fieldErrors === undefined ? {} : { fieldErrors }),
  };
}
