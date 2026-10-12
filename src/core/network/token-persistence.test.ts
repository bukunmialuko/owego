import { createSecureStorage } from '@/core/storage/keychain-secure-storage';
import { SecureKey } from '@/core/storage/storage-keys';
import { createEphemeralTokenPersistence } from './token-persistence';

const REFRESH = 'refresh-token-abc123';

describe('EphemeralTokenPersistence', () => {
  const secureStorage = createSecureStorage();

  it('writes nothing at all', async () => {
    const persistence = createEphemeralTokenPersistence();

    await persistence.save(REFRESH);

    for (const key of Object.values(SecureKey)) {
      await expect(secureStorage.get(key)).resolves.toEqual({ ok: true, value: undefined });
    }
  });

  it('reports that it does not persist', async () => {
    await expect(createEphemeralTokenPersistence().persists()).resolves.toBe(false);
  });

  it('clears without complaint, having nothing to clear', async () => {
    await expect(createEphemeralTokenPersistence().clear()).resolves.toEqual({
      ok: true,
      value: undefined,
    });
  });
});
