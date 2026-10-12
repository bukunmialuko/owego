import { http, HttpResponse } from 'msw';
import { ErrorCode } from '@/core/errors/app-error';
import { createHttpClient } from '@/core/network/http-client';
import { server, withMockServer } from '@/test/msw/server';
import { BLANK_RECIPIENT_FIELDS } from '../../domain/entity/beneficiary';
import { toCreateRecipientBody } from '../mapper/recipient-mapper';
import { createRecipientRemoteDataSource } from './recipient-remote-datasource';

const BASE_URL = 'https://api.test';

withMockServer();

function dataSource() {
  return createRecipientRemoteDataSource(createHttpClient({ baseUrl: BASE_URL }));
}

const ROW = {
  id: 'r1',
  bank_account_information: {
    bank_country: 'NG',
    bank_name: 'GTBank',
    account_number: '0123456789',
  },
};

describe('getPage', () => {
  it('asks for one page of recipients by number', async () => {
    let asked: URL | undefined;
    server.use(
      http.get(`${BASE_URL}/recipient`, ({ request }) => {
        asked = new URL(request.url);

        return HttpResponse.json({ data: [ROW], meta: { next: '3', previous: '1' } });
      }),
    );

    const result = await dataSource().getPage(2);

    expect(asked?.searchParams.get('page')).toBe('2');
    expect(result.ok ? result.value.next : 'failed').toBe('3');
    expect(result.ok ? result.value.rows.map((row) => row.id) : []).toEqual(['r1']);
  });

  it('never sends a search term', async () => {
    let asked: URL | undefined;
    server.use(
      http.get(`${BASE_URL}/recipient`, ({ request }) => {
        asked = new URL(request.url);

        return HttpResponse.json({ data: [] });
      }),
    );

    await dataSource().getPage(1);

    expect([...(asked?.searchParams.keys() ?? [])].sort()).toEqual(['page', 'type']);
  });

  it('asks for every type of beneficiary, wallets included', async () => {
    let asked: URL | undefined;
    server.use(
      http.get(`${BASE_URL}/recipient`, ({ request }) => {
        asked = new URL(request.url);

        return HttpResponse.json({ data: [] });
      }),
    );

    await dataSource().getPage(1);

    expect(asked?.searchParams.get('type')).toBe('all');
  });

  it('says so when the page carries no cursor at all', async () => {
    server.use(http.get(`${BASE_URL}/recipient`, () => HttpResponse.json({ data: [ROW] })));

    const result = await dataSource().getPage(1);

    expect(result.ok ? result.value.next : 'failed').toBeUndefined();
  });

  it('refuses a page it cannot read', async () => {
    server.use(http.get(`${BASE_URL}/recipient`, () => HttpResponse.json({ data: 'rows' })));

    const result = await dataSource().getPage(1);

    expect(result.ok ? undefined : result.error.code).toBe(ErrorCode.InvalidInput);
  });
});

describe('getRecent', () => {
  it('reads the recently paid', async () => {
    server.use(
      http.get(`${BASE_URL}/recipient/recent`, () =>
        HttpResponse.json({ data: [ROW], error: false }),
      ),
    );

    const result = await dataSource().getRecent();

    expect(result.ok ? result.value.map((row) => row.id) : []).toEqual(['r1']);
  });

  it('asks for the recently paid of every type, wallets included', async () => {
    let asked: URL | undefined;
    server.use(
      http.get(`${BASE_URL}/recipient/recent`, ({ request }) => {
        asked = new URL(request.url);

        return HttpResponse.json({ data: [] });
      }),
    );

    await dataSource().getRecent();

    expect(asked?.searchParams.get('type')).toBe('all');
  });
});

describe('getById', () => {
  it('reads one recipient by an escaped id', async () => {
    let path = '';
    server.use(
      http.get(`${BASE_URL}/recipient/*`, ({ request }) => {
        path = new URL(request.url).pathname;

        return HttpResponse.json({ data: ROW });
      }),
    );

    const result = await dataSource().getById('a/b');

    expect(path).toBe('/recipient/a%2Fb');
    expect(result.ok ? result.value.id : 'failed').toBe('r1');
  });
});

describe('create', () => {
  it('posts the body it is given and reads back the saved record', async () => {
    let sent: unknown;
    server.use(
      http.post(`${BASE_URL}/recipient`, async ({ request }) => {
        sent = await request.json();

        return HttpResponse.json({ data: ROW, error: false });
      }),
    );
    const body = toCreateRecipientBody({ ...BLANK_RECIPIENT_FIELDS, bankCountry: 'ng' });

    const result = await dataSource().create(body);

    expect(sent).toEqual(body);
    expect(result.ok ? result.value.id : 'failed').toBe('r1');
  });
});

describe('remove', () => {
  it('deletes the recipient by its escaped id', async () => {
    let removed = '';
    server.use(
      http.delete(`${BASE_URL}/recipient/*`, ({ request }) => {
        removed = new URL(request.url).pathname;

        return HttpResponse.json({ error: false });
      }),
    );

    const result = await dataSource().remove('00000000-000a');

    expect(removed).toBe('/recipient/00000000-000a');
    expect(result.ok).toBe(true);
  });

  it('reports a removal the server says failed', async () => {
    server.use(http.delete(`${BASE_URL}/recipient/*`, () => HttpResponse.json({ error: true })));

    expect((await dataSource().remove('r1')).ok).toBe(false);
  });

  it('passes a refused removal through with its status', async () => {
    server.use(
      http.delete(`${BASE_URL}/recipient/*`, () => new HttpResponse(null, { status: 404 })),
    );

    const result = await dataSource().remove('r1');

    expect(result.ok ? undefined : result.error.httpStatus).toBe(404);
  });
});
