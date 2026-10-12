import type { PushTokenRepository } from '../../domain/repository/push-token-repository';
import type { PushTokenRemoteDataSource } from '../datasource/push-token-remote-datasource';

export function createPushTokenRepositoryImpl(
  remoteDataSource: PushTokenRemoteDataSource,
): PushTokenRepository {
  return {
    register: (token) => remoteDataSource.register(token),
    unregister: (accessToken) => remoteDataSource.unregister(accessToken),
  };
}
