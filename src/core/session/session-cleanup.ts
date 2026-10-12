export interface SessionCleanupTask {
  readonly name: string;
  run(): Promise<void>;
}

export interface SessionCleanupRegistry {
  registerPre(task: SessionCleanupTask): void;
  register(task: SessionCleanupTask): void;
  runAll(): Promise<string[]>;
  readonly size: number;
}

export function createSessionCleanupRegistry(): SessionCleanupRegistry {
  const pre = new Map<string, SessionCleanupTask>();
  const regular = new Map<string, SessionCleanupTask>();

  async function runSafely(task: SessionCleanupTask, failed: string[]): Promise<void> {
    try {
      await task.run();
    } catch {
      failed.push(task.name);
    }
  }

  return {
    registerPre(task) {
      pre.set(task.name, task);
    },

    register(task) {
      regular.set(task.name, task);
    },

    async runAll() {
      const failed: string[] = [];

      for (const task of pre.values()) {
        await runSafely(task, failed);
      }

      await Promise.all([...regular.values()].map((task) => runSafely(task, failed)));

      return failed;
    },

    get size() {
      return pre.size + regular.size;
    },
  };
}
