import { offline, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import { BLANK_RECIPIENT_FIELDS } from '../../domain/entity/beneficiary';
import type { RecipientDto } from '../model/recipient-model';
import { recipientResponseSchema } from '../model/recipient-model';
import type {
  RecipientPageDto,
  RecipientRemoteDataSource,
} from '../datasource/recipient-remote-datasource';
import { toCreateRecipientBody } from '../mapper/recipient-mapper';
import { createBeneficiaryRepositoryImpl } from './beneficiary-repository-impl';

function row(id: string, overrides: Record<string, string> = {}): RecipientDto {
  return recipientResponseSchema.parse({
    data: {
      id,
      bank_account_information: {
        bank_country: 'NG',
        bank_name: 'GTBank',
        bank_code: '058',
        account_holder: `Holder ${id}`,
        account_number: '0123456789',
        ...overrides,
      },
    },
  }).data;
}

type Pages = Record<number, Result<RecipientPageDto, AppError>>;

function fakeDataSource(pages: Pages = {}) {
  const calls: { pages: number[]; created: unknown[]; removed: string[] } = {
    pages: [],
    created: [],
    removed: [],
  };
  const remoteDataSource: RecipientRemoteDataSource = {
    getPage: (page) => {
      calls.pages.push(page);

      return Promise.resolve(pages[page] ?? ok({ rows: [], next: '' }));
    },
    getRecent: () => Promise.resolve(ok([row('r2'), row('r1'), row('r2')])),
    getById: (id) => Promise.resolve(ok(id === 'missing' ? row('') : row(id))),
    create: (body) => {
      calls.created.push(body);

      return Promise.resolve(ok(row('new')));
    },
    remove: (id) => {
      calls.removed.push(id);

      return Promise.resolve(ok(undefined));
    },
  };

  return { calls, repository: createBeneficiaryRepositoryImpl({ remoteDataSource }) };
}

describe('list', () => {
  it('follows the cursor until the server says it is on the last page', async () => {
    const { calls, repository } = fakeDataSource({
      1: ok({ rows: [row('a')], next: '2' }),
      2: ok({ rows: [row('b')], next: '' }),
    });

    const result = await repository.list();

    expect(calls.pages).toEqual([1, 2]);
    expect(result.ok ? result.value.map((beneficiary) => beneficiary.id) : []).toEqual(['a', 'b']);
  });

  it('stops at an empty page', async () => {
    const { calls, repository } = fakeDataSource({
      1: ok({ rows: [row('a')], next: '2' }),
      2: ok({ rows: [], next: '3' }),
    });

    await repository.list();

    expect(calls.pages).toEqual([1, 2]);
  });

  it('stops as soon as a page without a cursor adds nobody new', async () => {
    const same = ok({ rows: [row('a'), row('b')], next: undefined });
    const { calls, repository } = fakeDataSource({ 1: same, 2: same, 3: same });

    const result = await repository.list();

    expect(calls.pages).toEqual([1, 2]);
    expect(result.ok ? result.value : []).toHaveLength(2);
  });

  it('never asks for more than v1 did, twenty-five pages', async () => {
    const pages: Pages = {};
    for (let page = 1; page <= 30; page += 1) {
      pages[page] = ok({ rows: [row(`r${String(page)}`)], next: String(page + 1) });
    }
    const { calls, repository } = fakeDataSource(pages);

    const result = await repository.list();

    expect(calls.pages).toHaveLength(25);
    expect(result.ok ? result.value : []).toHaveLength(25);
  });

  it('keeps one copy of a record that drifts onto the next page', async () => {
    const { repository } = fakeDataSource({
      1: ok({ rows: [row('a'), row('b')], next: '2' }),
      2: ok({ rows: [row('b'), row('c')], next: '' }),
    });

    const result = await repository.list();

    expect(result.ok ? result.value.map((beneficiary) => beneficiary.id) : []).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('fails rather than answering with the pages it managed to read', async () => {
    const { repository } = fakeDataSource({
      1: ok({ rows: [row('a')], next: '2' }),
      2: err(offline()),
    });

    expect(await repository.list()).toEqual(err(offline()));
  });

  it('leaves out a row that came back with no id, which nothing could open or remove', async () => {
    const { repository } = fakeDataSource({ 1: ok({ rows: [row(''), row('a')], next: '' }) });

    const result = await repository.list();

    expect(result.ok ? result.value.map((beneficiary) => beneficiary.id) : []).toEqual(['a']);
  });

  it('places every record it reads', async () => {
    const { repository } = fakeDataSource({ 1: ok({ rows: [row('a')], next: '' }) });

    const result = await repository.list();

    expect(result.ok ? result.value[0] : undefined).toMatchObject({
      kind: 'bank',
      name: 'Holder a',
      countryCode: 'ng',
      corridor: { currency: 'NGN' },
    });
  });
});

describe('getRecent', () => {
  it('keeps the server’s order and one copy of each record', async () => {
    const result = await fakeDataSource().repository.getRecent();

    expect(result.ok ? result.value.map((beneficiary) => beneficiary.id) : []).toEqual([
      'r2',
      'r1',
    ]);
  });
});

describe('get', () => {
  it('reads one beneficiary', async () => {
    const result = await fakeDataSource().repository.get('r9');

    expect(result.ok ? result.value.id : 'failed').toBe('r9');
  });

  it('fails when the server answers with nobody', async () => {
    expect((await fakeDataSource().repository.get('missing')).ok).toBe(false);
  });
});

describe('create', () => {
  it('sends the record as the create body', async () => {
    const { calls, repository } = fakeDataSource();
    const fields = { ...BLANK_RECIPIENT_FIELDS, bankCountry: 'ng', accountNumber: '0123456789' };

    const result = await repository.create(fields);

    expect(result.ok).toBe(true);
    expect(calls.created).toEqual([toCreateRecipientBody(fields)]);
  });
});

describe('remove', () => {
  it('removes by id', async () => {
    const { calls, repository } = fakeDataSource();

    expect((await repository.remove('r1')).ok).toBe(true);
    expect(calls.removed).toEqual(['r1']);
  });
});
