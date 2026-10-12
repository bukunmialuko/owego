import { createSessionCleanupRegistry } from './session-cleanup';

describe('SessionCleanupRegistry', () => {
  it('runs every registered task', async () => {
    const registry = createSessionCleanupRegistry();
    const first = jest.fn().mockResolvedValue(undefined);
    const second = jest.fn().mockResolvedValue(undefined);

    registry.register({ name: 'first', run: first });
    registry.register({ name: 'second', run: second });
    await registry.runAll();

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('completes every pre-task before starting the rest', async () => {
    const order: string[] = [];
    const registry = createSessionCleanupRegistry();

    registry.register({
      name: 'wipe-tokens',
      run: () => {
        order.push('regular');
        return Promise.resolve();
      },
    });
    registry.registerPre({
      name: 'deregister-push',
      run: async () => {
        await Promise.resolve();
        order.push('pre');
      },
    });

    await registry.runAll();

    expect(order).toEqual(['pre', 'regular']);
  });

  it('runs pre-tasks in registration order', async () => {
    const order: string[] = [];
    const registry = createSessionCleanupRegistry();

    registry.registerPre({
      name: 'a',
      run: async () => {
        await Promise.resolve();
        order.push('a');
      },
    });
    registry.registerPre({
      name: 'b',
      run: () => {
        order.push('b');
        return Promise.resolve();
      },
    });

    await registry.runAll();

    expect(order).toEqual(['a', 'b']);
  });

  describe('failure isolation', () => {
    it('still runs the remaining tasks when one rejects', async () => {
      const registry = createSessionCleanupRegistry();
      const survivor = jest.fn().mockResolvedValue(undefined);

      registry.register({ name: 'broken', run: () => Promise.reject(new Error('boom')) });
      registry.register({ name: 'survivor', run: survivor });

      await expect(registry.runAll()).resolves.toEqual(['broken']);
      expect(survivor).toHaveBeenCalledTimes(1);
    });

    it('continues past a failing pre-task', async () => {
      const registry = createSessionCleanupRegistry();
      const regular = jest.fn().mockResolvedValue(undefined);

      registry.registerPre({ name: 'broken-pre', run: () => Promise.reject(new Error('boom')) });
      registry.register({ name: 'regular', run: regular });

      const failed = await registry.runAll();

      expect(failed).toEqual(['broken-pre']);
      expect(regular).toHaveBeenCalledTimes(1);
    });
  });

  it('replaces a task registered under the same name', () => {
    const registry = createSessionCleanupRegistry();

    registry.register({ name: 'same', run: jest.fn() });
    registry.register({ name: 'same', run: jest.fn() });

    expect(registry.size).toBe(1);
  });
});
