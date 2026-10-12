import { settleWithin } from './settle-within';

jest.useFakeTimers();

describe('settleWithin', () => {
  it('answers with the promise when it settles in time', async () => {
    await expect(settleWithin(Promise.resolve('signed'), 1_000)).resolves.toBe('signed');
  });

  it('answers timedOut once the bound passes', async () => {
    const answer = settleWithin(new Promise(() => undefined), 1_000);

    jest.advanceTimersByTime(1_000);

    await expect(answer).resolves.toBe('timedOut');
  });

  it('leaves no timer behind once the promise settles', async () => {
    await settleWithin(Promise.resolve('signed'), 1_000);

    expect(jest.getTimerCount()).toBe(0);
  });
});
