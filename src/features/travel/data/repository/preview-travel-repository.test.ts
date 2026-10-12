import {
  createPreviewEsimRepository,
  createPreviewInsuranceRepository,
} from './preview-travel-repository';

async function value<T>(promise: Promise<{ ok: true; value: T } | { ok: false }>): Promise<T> {
  const result = await promise;
  if (!result.ok) throw new Error('expected an ok result');

  return result.value;
}

describe('preview eSIM repository', () => {
  it('lists the multi-country plan alongside the countries', async () => {
    const repository = createPreviewEsimRepository();

    const destinations = await value(repository.getDestinations());

    expect(destinations.some((entry) => entry.code === 'global')).toBe(true);
  });

  it('hands back a copy of its lists', async () => {
    const repository = createPreviewEsimRepository();

    const first = await value(repository.getDestinations());
    first.length = 0;

    expect(await value(repository.getDestinations())).not.toHaveLength(0);
  });

  it('adds a purchased eSIM to the installed list, uninstalled', async () => {
    const repository = createPreviewEsimRepository();

    const esim = await value(repository.purchase('p-1gb'));

    expect(esim.isInstalled).toBe(false);
    expect(await value(repository.getInstalled())).toContainEqual(esim);
  });

  it('marks an eSIM installed', async () => {
    const repository = createPreviewEsimRepository();
    const esim = await value(repository.purchase('p-3gb'));

    const installed = await value(repository.install(esim.id));

    expect(installed.isInstalled).toBe(true);
  });

  it('fails rather than inventing a plan that does not exist', async () => {
    const repository = createPreviewEsimRepository();

    expect((await repository.purchase('nope')).ok).toBe(false);
  });
});

describe('preview insurance repository', () => {
  const trip = {
    destinationCode: 'ke',
    destinationName: 'Kenya',
    departure: '2026-08-14',
    returnDate: '2026-08-21',
    travellers: 1,
    tripCostMinor: 80_000,
    currency: 'USD',
  };

  it('quotes the three tiers the designs print', async () => {
    const repository = createPreviewInsuranceRepository();

    const covers = await value(repository.getCovers(trip));

    expect(covers.map((cover) => cover.priceMinor)).toEqual([6_100, 9_000, 13_000]);
    expect(covers.find((cover) => cover.isMostPopular)?.tier).toBe('deluxe');
  });

  it('gives a richer tier more cover than a cheaper one', async () => {
    const repository = createPreviewInsuranceRepository();

    const essential = await value(repository.getCoverage('essential'));
    const platinum = await value(repository.getCoverage('platinum'));

    expect(platinum.length).toBeGreaterThan(essential.length);
  });

  it('files a policy that can then be listed', async () => {
    const repository = createPreviewInsuranceRepository();

    const policy = await value(repository.buyPolicy(trip, 'deluxe'));

    expect(policy.amountMinor).toBe(9_000);
    expect(await value(repository.getPolicies())).toContainEqual(policy);
  });
});
