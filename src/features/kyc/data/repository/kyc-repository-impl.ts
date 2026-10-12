import { map } from '@/core/result/result';
import type { KycRepository } from '../../domain/repository/kyc-repository';
import type { KycRemoteDataSource } from '../datasource/kyc-remote-datasource';

export function createKycRepositoryImpl(remoteDataSource: KycRemoteDataSource): KycRepository {
  return {
    async createSession() {
      const response = await remoteDataSource.createSession();

      return map(response, (dto) => ({
        sessionId: dto.session_id,
        sessionToken: dto.session_token,
        url: dto.url,
        status: dto.status,
      }));
    },
  };
}
