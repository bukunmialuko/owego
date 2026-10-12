import { createSignOutUseCase } from './sign-out-usecase';

function build() {
  const order: string[] = [];

  const sessionCleanup = {
    registerPre: jest.fn(),
    register: jest.fn(),
    size: 0,
    runAll: jest.fn(async () => {
      order.push('cleanup:start');
      await Promise.resolve();
      order.push('cleanup:end');

      return [];
    }),
  };

  const tokenStore = {
    read: jest.fn(),
    write: jest.fn(),
    restore: jest.fn(),
    lock: jest.fn(),
    onTokensPersisted: jest.fn(),
    clear: jest.fn(async () => {
      order.push('tokens-cleared');
      await Promise.resolve();
    }),
  };

  const signedOut = jest.fn(() => {
    order.push('signed-out');
  });

  const usecase = createSignOutUseCase({
    sessionCleanup,
    tokenStore,
    signedOut,
  });

  return { usecase, order, sessionCleanup, tokenStore, signedOut };
}

describe('createSignOutUseCase', () => {
  it('finishes cleanup before it clears the tokens', async () => {
    const { usecase, order } = build();

    await usecase.execute();

    expect(order).toEqual(['cleanup:start', 'cleanup:end', 'tokens-cleared', 'signed-out']);
  });

  it('leaves nothing behind', async () => {
    const { usecase, sessionCleanup, tokenStore, signedOut } = build();

    await usecase.execute();

    expect(sessionCleanup.runAll).toHaveBeenCalledTimes(1);
    expect(tokenStore.clear).toHaveBeenCalledTimes(1);
    expect(signedOut).toHaveBeenCalledTimes(1);
  });

  it('runs once for concurrent callers', async () => {
    const { usecase, sessionCleanup, tokenStore } = build();

    await Promise.all([usecase.execute(), usecase.execute(), usecase.execute()]);

    expect(sessionCleanup.runAll).toHaveBeenCalledTimes(1);
    expect(tokenStore.clear).toHaveBeenCalledTimes(1);
  });

  it('can sign out again later, once the first has settled', async () => {
    const { usecase, sessionCleanup } = build();

    await usecase.execute();
    await usecase.execute();

    expect(sessionCleanup.runAll).toHaveBeenCalledTimes(2);
  });

  it('still signs out when a cleanup task fails', async () => {
    const { usecase, tokenStore, signedOut, sessionCleanup } = build();
    sessionCleanup.runAll.mockRejectedValueOnce(new Error('push unregister exploded'));

    await expect(usecase.execute()).resolves.toBeUndefined();

    expect(tokenStore.clear).toHaveBeenCalled();
    expect(signedOut).toHaveBeenCalled();
  });
});
