import { delay, http, HttpResponse } from 'msw';
import { ErrorCode } from '@/core/errors/app-error';
import { createHttpClient } from '@/core/network/http-client';
import { server, withMockServer } from '@/test/msw/server';
import { createPayoutRemoteDataSource } from './payout-remote-datasource';

const BASE_URL = 'https://api.test';

const WALLET_TO_BANK_BODY = {
  wallet_id: 'sol-wallet',
  wallet_address: 'Axxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx1',
  amount: 500_000,
  currency: 'NGN',
  token_id: 'usdc-sol',
  recipient_bank_code: '058',
  recipient_account_number: '0123456789',
  narration: 'For upkeep',
};

const QR_PAY_BODY = {
  qr_string: '00020101021238570010A000000727',
  wallet_id: 'sol-wallet',
  wallet_address: 'Axxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx1',
  token_id: 'usdc-sol',
  amount: 25.5,
};

const CHALLENGE = { challenge_id: 'chal_1', user_token: 'utok_1', encryption_key: 'key_1' };

withMockServer();

function dataSource(timeoutMs?: number) {
  return createPayoutRemoteDataSource(
    createHttpClient({ baseUrl: BASE_URL }),
    timeoutMs === undefined ? {} : { timeoutMs },
  );
}

function capturing(path: string, data: unknown) {
  const sent: unknown[] = [];
  server.use(
    http.post(`${BASE_URL}${path}`, async ({ request }) => {
      sent.push(await request.json());

      return HttpResponse.json({ data, status_code: 200, msg: '' });
    }),
  );

  return sent;
}

describe('payout remote datasource', () => {
  describe('wallet-to-bank', () => {
    it('posts the body exactly as given, once', async () => {
      const sent = capturing('/transaction/wallet-to-bank', CHALLENGE);

      await dataSource().walletToBank(WALLET_TO_BANK_BODY);

      expect(sent).toEqual([WALLET_TO_BANK_BODY]);
    });

    it('reads the priced payout from data', async () => {
      capturing('/transaction/wallet-to-bank', { ...CHALLENGE, amount_fiat: 500_000, rate: 1500 });

      const result = await dataSource().walletToBank(WALLET_TO_BANK_BODY);

      expect(result.ok ? result.value : undefined).toMatchObject({
        ...CHALLENGE,
        amount_fiat: 500_000,
        rate: 1500,
      });
    });
  });

  describe('qr-pay', () => {
    it('posts the body exactly as given, once', async () => {
      const sent = capturing('/transaction/qr-pay', CHALLENGE);

      await dataSource().qrPay(QR_PAY_BODY);

      expect(sent).toEqual([QR_PAY_BODY]);
    });

    it('reads the priced merchant payment from data', async () => {
      capturing('/transaction/qr-pay', {
        ...CHALLENGE,
        amount_local: 25.5,
        fee: { total_fee: 1.5 },
      });

      const result = await dataSource().qrPay(QR_PAY_BODY);

      expect(result.ok ? result.value : undefined).toMatchObject({
        amount_local: 25.5,
        fee: { total_fee: 1.5 },
      });
    });
  });

  it('carries the status of a refused payout', async () => {
    server.use(
      http.post(`${BASE_URL}/transaction/wallet-to-bank`, () =>
        HttpResponse.json({ error: true, msg: 'insufficient balance' }, { status: 400 }),
      ),
    );

    const result = await dataSource().walletToBank(WALLET_TO_BANK_BODY);

    expect(result.ok ? undefined : result.error.httpStatus).toBe(400);
  });

  it('refuses an answer it cannot read', async () => {
    capturing('/transaction/wallet-to-bank', { amount_fiat: 'lots' });

    const result = await dataSource().walletToBank(WALLET_TO_BANK_BODY);

    expect(result.ok ? undefined : result.error.code).toBe(ErrorCode.InvalidInput);
  });

  it('gives up on an initiation that takes too long', async () => {
    server.use(
      http.post(`${BASE_URL}/transaction/qr-pay`, async () => {
        await delay(1_000);
        return HttpResponse.json({ data: CHALLENGE });
      }),
    );

    const result = await dataSource(20).qrPay(QR_PAY_BODY);

    expect(result.ok).toBe(false);
  });
});
