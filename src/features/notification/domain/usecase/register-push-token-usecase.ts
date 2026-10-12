import type { AppError } from '@/core/errors/app-error';
import type { TokenStore } from '@/core/network/auth-tokens';
import type { KeyValueStorage } from '@/core/storage/key-value-storage';
import { CacheKey } from '@/core/storage/storage-keys';
import { ok, type Result } from '@/core/result/result';
import type { PushMessagingPort } from '../port/push-messaging-port';
import type { PushTokenRepository } from '../repository/push-token-repository';

type Dependencies = {
  messaging: PushMessagingPort;
  pushTokenRepository: PushTokenRepository;
  tokenStore: TokenStore;
  cache: KeyValueStorage;
};

export interface RegisterPushTokenUseCase {
  execute(): Promise<Result<void, AppError>>;
}

export function createRegisterPushTokenUseCase({
  messaging,
  pushTokenRepository,
  tokenStore,
  cache,
}: Dependencies): RegisterPushTokenUseCase {
  let inFlight: Promise<Result<void, AppError>> | undefined;

  async function register(): Promise<Result<void, AppError>> {
    if ((await tokenStore.read()) === undefined) return ok(undefined);

    const token = await messaging.getToken();
    if (!token.ok) return token;

    if (cache.getString(CacheKey.RegisteredPushToken) === token.value) return ok(undefined);

    await messaging.requestPermission();

    const posted = await pushTokenRepository.register(token.value);
    if (!posted.ok) return posted;

    cache.setString(CacheKey.RegisteredPushToken, token.value);

    return ok(undefined);
  }

  return {
    execute() {
      inFlight ??= register().finally(() => {
        inFlight = undefined;
      });

      return inFlight;
    },
  };
}
