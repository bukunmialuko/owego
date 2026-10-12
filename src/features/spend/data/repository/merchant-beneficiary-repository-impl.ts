import { map } from '@/core/result/result';
import type { MerchantBeneficiaryRepository } from '../../domain/repository/merchant-beneficiary-repository';
import type { RecipientRemoteDataSource } from '../datasource/recipient-remote-datasource';
import { toCreateQrRecipientBody } from '../mapper/recipient-mapper';

type Dependencies = { remoteDataSource: RecipientRemoteDataSource };

export function createMerchantBeneficiaryRepositoryImpl({
  remoteDataSource,
}: Dependencies): MerchantBeneficiaryRepository {
  return {
    async save(merchant) {
      const created = await remoteDataSource.create(toCreateQrRecipientBody(merchant));

      return map(created, () => undefined);
    },
  };
}
