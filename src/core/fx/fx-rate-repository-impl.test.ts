import { offline } from '@/core/errors/app-error';
import type { HttpClient } from '@/core/network/http-client';
import { err, ok } from '@/core/result/result';
import { createFxRateRepositoryImpl } from './fx-rate-repository-impl';

const QUOTED = {
  data: {
    source_currency: 'USD',
    destination_currency: 'NGN',
    rate: 1431.692,
    expire_at: '2026-02-10T18:47:34.182Z',
  },
};

function build(response: unknown) {
  const post = jest.fn().mockResolvedValue(ok(response));

  return { repository: createFxRateRepositoryImpl({ post } as Pick<HttpClient, 'post'>), post };
}

describe('FxRateRepositoryImpl', () => {
  it('asks the rate endpoint in the words it expects', async () => {
    const { repository, post } = build(QUOTED);

    await repository.getQuote('USD', 'NGN');

    expect(post).toHaveBeenCalledWith('/transaction/rate', {
      source_currency: 'USD',
      destination_currency: 'NGN',
    });
  });

  it('answers with the rate and the moment it lapses', async () => {
    const { repository } = build(QUOTED);

    await expect(repository.getQuote('USD', 'NGN')).resolves.toEqual({
      ok: true,
      value: {
        baseCurrency: 'USD',
        quoteCurrency: 'NGN',
        rate: 1431.692,
        expiresAt: '2026-02-10T18:47:34.182Z',
      },
    });
  });

  it('does not ask for a conversion between a currency and itself', async () => {
    const { repository, post } = build(QUOTED);

    await expect(repository.getQuote('USD', 'USD')).resolves.toEqual({
      ok: true,
      value: { baseCurrency: 'USD', quoteCurrency: 'USD', rate: 1 },
    });
    expect(post).not.toHaveBeenCalled();
  });

  it.each([
    ['zero', 0],
    ['negative', -1],
  ])('reports a %s rate as no quote at all', async (_case, rate) => {
    const { repository } = build({ data: { ...QUOTED.data, rate } });

    await expect(repository.getQuote('USD', 'NGN')).resolves.toEqual({
      ok: true,
      value: undefined,
    });
  });

  it('leaves the expiry off a quote the backend did not date', async () => {
    const { repository } = build({ data: { ...QUOTED.data, expire_at: '' } });
    const result = await repository.getQuote('USD', 'NGN');

    expect(result).toEqual({
      ok: true,
      value: { baseCurrency: 'USD', quoteCurrency: 'NGN', rate: 1431.692 },
    });
  });

  it('names the currencies it asked about, not the ones the answer echoes', async () => {
    const { repository } = build({ data: { ...QUOTED.data, source_currency: 'XXX' } });

    await expect(repository.getQuote('USD', 'NGN')).resolves.toMatchObject({
      value: { baseCurrency: 'USD', quoteCurrency: 'NGN' },
    });
  });

  it('passes a request that did not complete straight through', async () => {
    const post = jest.fn().mockResolvedValue(err(offline()));
    const repository = createFxRateRepositoryImpl({ post } as Pick<HttpClient, 'post'>);

    await expect(repository.getQuote('USD', 'NGN')).resolves.toMatchObject({ ok: false });
  });

  it('refuses a payload it cannot read rather than pricing from it', async () => {
    const { repository } = build({ data: { rate: 'one thousand' } });

    await expect(repository.getQuote('USD', 'NGN')).resolves.toMatchObject({ ok: false });
  });
});
