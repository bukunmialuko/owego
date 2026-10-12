export async function settleWithin<T>(
  pending: Promise<T>,
  timeoutMs: number,
): Promise<T | 'timedOut'> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<'timedOut'>((resolve) => {
    timer = setTimeout(() => {
      resolve('timedOut');
    }, timeoutMs);
  });

  try {
    return await Promise.race([pending, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
