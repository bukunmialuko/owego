import { offline, serverError, type AppError } from '@/core/errors/app-error';
import { fromHttp } from '@/core/errors/from-http';
import { err, ok, type Result } from '@/core/result/result';
import type { BankDto } from '../model/bank-list-model';
import type { ResolvedAccountDto } from '../model/resolved-account-model';
import type { CorridorLookupRemoteDataSource } from '../datasource/corridor-lookup-remote-datasource';
import { createCorridorLookupRepositoryImpl } from './corridor-lookup-repository-impl';

const NIGERIA = { countryCode: 'NG' };

function fakeDataSource(
  overrides: Partial<{
    banks: Result<BankDto[], AppError>;
    resolved: Result<ResolvedAccountDto, AppError>;
  }> = {},
) {
  const asked: { countries: string[]; lookups: [string, string][] } = {
    countries: [],
    lookups: [],
  };
  const remoteDataSource: CorridorLookupRemoteDataSource = {
    getBanks: (countryCode) => {
      asked.countries.push(countryCode);

      return Promise.resolve(overrides.banks ?? ok([{ bank_code: '058', bank_name: 'GTBank' }]));
    },
    resolveAccount: (bankCode, accountNumber) => {
      asked.lookups.push([bankCode, accountNumber]);

      return Promise.resolve(
        overrides.resolved ?? ok({ account_number: accountNumber, account_name: 'Hannah Nuggest' }),
      );
    },
  };

  return { asked, repository: createCorridorLookupRepositoryImpl({ remoteDataSource }) };
}

describe('getOptions', () => {
  it('offers the banks of the country it is asked about', async () => {
    const { asked, repository } = fakeDataSource();

    const options = await repository.getOptions('bankList', NIGERIA);

    expect(asked.countries).toEqual(['NG']);
    expect(options).toEqual({ ok: true, value: [{ value: '058', label: 'GTBank' }] });
  });

  it('leaves out a bank that carries no code', async () => {
    const { repository } = fakeDataSource({
      banks: ok([
        { bank_code: '', bank_name: 'ABSA' },
        { bank_code: '044', bank_name: 'Access Bank' },
      ]),
    });

    const options = await repository.getOptions('bankList', NIGERIA);

    expect(options).toEqual({ ok: true, value: [{ value: '044', label: 'Access Bank' }] });
  });

  it('passes a bank list that failed to load through as a failure', async () => {
    const { repository } = fakeDataSource({ banks: err(offline()) });

    const options = await repository.getOptions('bankList', NIGERIA);

    expect(options.ok).toBe(false);
  });

  it('offers every country in the fixture, labelled by name', async () => {
    const { asked, repository } = fakeDataSource();

    const options = await repository.getOptions('countries', NIGERIA);

    expect(options.ok ? options.value : []).toContainEqual({ value: 'ng', label: 'Nigeria' });
    expect(asked.countries).toEqual([]);
  });

  it('offers both beneficiary categories', async () => {
    const { repository } = fakeDataSource();

    const options = await repository.getOptions('beneficiaryCategories', NIGERIA);

    expect(options).toEqual({
      ok: true,
      value: [
        { value: 'individual', labelKey: 'spend.categoryIndividual' },
        { value: 'business', labelKey: 'spend.categoryBusiness' },
      ],
    });
  });

  it('offers Solana first, then every bridged chain the catalog enables', async () => {
    const { repository } = fakeDataSource();

    const options = await repository.getOptions('networks', NIGERIA);

    expect(options).toEqual({
      ok: true,
      value: [
        { value: 'SOL', label: 'Solana' },
        { value: 'BASE', label: 'Base' },
        { value: 'MONAD', label: 'Monad' },
        { value: 'ARC', label: 'Arc' },
      ],
    });
  });

  it('has no providers of its own', async () => {
    const { repository } = fakeDataSource();

    expect(await repository.getOptions('mobileMoneyProviders', NIGERIA)).toEqual({
      ok: true,
      value: [],
    });
  });
});

describe('resolveAccount', () => {
  it('answers the holder the server resolved', async () => {
    const { asked, repository } = fakeDataSource();

    const resolved = await repository.resolveAccount('058', '0123456789');

    expect(asked.lookups).toEqual([['058', '0123456789']]);
    expect(resolved).toEqual({
      ok: true,
      value: { accountName: 'Hannah Nuggest', accountNumber: '0123456789' },
    });
  });

  it('answers nobody when the server resolves the account to no name', async () => {
    const { repository } = fakeDataSource({
      resolved: ok({ account_number: '0123456789', account_name: '  ' }),
    });

    expect(await repository.resolveAccount('058', '0123456789')).toEqual({
      ok: true,
      value: undefined,
    });
  });

  it.each([400, 404, 422])(
    'answers nobody when the server refuses the account with a %s',
    async (status) => {
      const { repository } = fakeDataSource({ resolved: err(fromHttp({ status })) });

      expect(await repository.resolveAccount('058', '0000000000')).toEqual({
        ok: true,
        value: undefined,
      });
    },
  );

  it.each([
    ['offline', offline()],
    ['a server fault', serverError(503)],
  ])('passes %s through rather than calling the account unknown', async (_case, error) => {
    const { repository } = fakeDataSource({ resolved: err(error) });

    expect(await repository.resolveAccount('058', '0123456789')).toEqual(err(error));
  });
});
