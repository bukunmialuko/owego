import { unknownError, type AppError } from '@/core/errors/app-error';
import { andThen, err, map, ok, type Result } from '@/core/result/result';
import type { Beneficiary, RecipientRecord } from '../../domain/entity/beneficiary';
import type { BeneficiaryRepository } from '../../domain/repository/beneficiary-repository';
import { toBeneficiary } from '../../domain/beneficiary/to-beneficiary';
import type { RecipientRemoteDataSource } from '../datasource/recipient-remote-datasource';
import type { RecipientDto } from '../model/recipient-model';
import { toCreateRecipientBody, toRecipientRecord } from '../mapper/recipient-mapper';

const MAX_PAGES = 25;

type Dependencies = {
  remoteDataSource: RecipientRemoteDataSource;
};

export function createBeneficiaryRepositoryImpl({
  remoteDataSource,
}: Dependencies): BeneficiaryRepository {
  return {
    async list(): Promise<Result<Beneficiary[], AppError>> {
      const byId = new Map<string, RecipientRecord>();

      for (let page = 1; page <= MAX_PAGES; page += 1) {
        const result = await remoteDataSource.getPage(page);
        if (!result.ok) return result;

        const { rows, next } = result.value;
        const before = byId.size;
        for (const record of placeable(rows)) {
          if (!byId.has(record.id)) byId.set(record.id, record);
        }

        const isLastPage =
          rows.length === 0 || (next === undefined ? byId.size === before : next.trim() === '');
        if (isLastPage) break;
      }

      return ok([...byId.values()].map(toBeneficiary));
    },

    async getRecent() {
      const result = await remoteDataSource.getRecent();

      return map(result, (rows) => {
        const seen = new Set<string>();

        return placeable(rows)
          .filter((record) => {
            if (seen.has(record.id)) return false;
            seen.add(record.id);

            return true;
          })
          .map(toBeneficiary);
      });
    },

    async get(id) {
      const result = await remoteDataSource.getById(id);

      return andThen(result, (dto) => {
        const [record] = placeable([dto]);

        return record === undefined
          ? err(unknownError('The server answered with no recipient.'))
          : ok(toBeneficiary(record));
      });
    },

    async create(fields) {
      const result = await remoteDataSource.create(toCreateRecipientBody(fields));

      return map(result, () => undefined);
    },

    remove: (id) => remoteDataSource.remove(id),
  };
}

function placeable(rows: readonly RecipientDto[]): RecipientRecord[] {
  return rows.map(toRecipientRecord).filter((record) => record.id !== '');
}
