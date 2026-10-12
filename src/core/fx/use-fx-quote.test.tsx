import { Text } from 'react-native';
import { act, screen } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { serverError } from '@/core/errors/app-error';
import { setLogSink } from '@/core/log/dev-log';
import { err, ok, type Result } from '@/core/result/result';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import type { AppError } from '@/core/errors/app-error';
import type { FxQuote, FxRateRepository } from './fx-rate';
import { useFxQuote } from './use-fx-quote';

jest.useFakeTimers();

const REFRESH_INTERVAL_MS = 120_000;

type Answer = Result<FxQuote | undefined, AppError>;

function quoteAt(rate: number, expiresInMs?: number): FxQuote {
  return {
    baseCurrency: 'USD',
    quoteCurrency: 'NGN',
    rate,
    ...(expiresInMs === undefined
      ? {}
      : { expiresAt: new Date(Date.now() + expiresInMs).toISOString() }),
  };
}

function repositoryAnswering(...answers: (() => Answer)[]) {
  let calls = 0;
  const getQuote = jest.fn((): Promise<Answer> => {
    const next = answers[Math.min(calls, answers.length - 1)];
    calls += 1;

    return Promise.resolve(next?.() ?? ok(undefined));
  });

  return { getQuote } satisfies FxRateRepository;
}

function Rate() {
  const quote = useFxQuote('USD', 'NGN', { refreshIntervalMs: REFRESH_INTERVAL_MS });

  return <Text>{quote.data == null ? 'none' : `rate ${String(quote.data.rate)}`}</Text>;
}

async function renderRate(repository: FxRateRepository) {
  await renderWithProviders(<Rate />, {
    container: createTestContainer({ fxRateRepository: asValue(repository) }),
  });
}

async function advance(milliseconds: number) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(milliseconds);
  });
}

describe('useFxQuote', () => {
  afterEach(() => {
    setLogSink(() => undefined);
  });

  it('refreshes when the quote expires', async () => {
    const repository = repositoryAnswering(() => ok(quoteAt(1500, 30_000)));
    await renderRate(repository);
    expect(await screen.findByText('rate 1500')).toBeOnTheScreen();

    await advance(30_000);

    expect(repository.getQuote).toHaveBeenCalledTimes(2);
  });

  describe('refreshes at the given interval when the quote has no usable expiry', () => {
    it.each([
      ['no expiry', () => ok(quoteAt(1500))],
      ['an expiry already past', () => ok(quoteAt(1500, -60_000))],
    ])('%s', async (_case, answer: () => Answer) => {
      const repository = repositoryAnswering(answer);
      await renderRate(repository);
      expect(await screen.findByText('rate 1500')).toBeOnTheScreen();

      await advance(REFRESH_INTERVAL_MS / 2);
      expect(repository.getQuote).toHaveBeenCalledTimes(1);

      await advance(REFRESH_INTERVAL_MS / 2);
      expect(repository.getQuote).toHaveBeenCalledTimes(2);

      await advance(REFRESH_INTERVAL_MS);
      expect(repository.getQuote).toHaveBeenCalledTimes(3);
    });
  });

  it('keeps the last rate when a refresh fails, and logs the failure', async () => {
    const lines: string[] = [];
    setLogSink((line) => {
      lines.push(line);
    });
    const repository = repositoryAnswering(
      () => ok(quoteAt(1500)),
      () => err(serverError()),
    );
    await renderRate(repository);
    expect(await screen.findByText('rate 1500')).toBeOnTheScreen();

    await advance(REFRESH_INTERVAL_MS);

    expect(repository.getQuote).toHaveBeenCalledTimes(2);
    expect(screen.getByText('rate 1500')).toBeOnTheScreen();
    expect(lines).toEqual(['[fx] quote failed base=USD quote=NGN code=server/internal']);
  });

  it('keeps refreshing after a failed refresh', async () => {
    const repository = repositoryAnswering(
      () => ok(quoteAt(1500)),
      () => err(serverError()),
      () => ok(quoteAt(1510)),
    );
    await renderRate(repository);
    expect(await screen.findByText('rate 1500')).toBeOnTheScreen();

    await advance(REFRESH_INTERVAL_MS);
    await advance(REFRESH_INTERVAL_MS);

    expect(repository.getQuote).toHaveBeenCalledTimes(3);
    expect(screen.getByText('rate 1510')).toBeOnTheScreen();
  });
});
