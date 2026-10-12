import { transact, type MobileWallet } from '@solana-mobile/mobile-wallet-adapter-protocol';
import { getBase58Decoder, getBase58Encoder } from '@solana/kit';
import type { DepositTransfer, RecentBlockhash } from '../../domain/entity/external-deposit';
import type { ExternalWalletAccount } from '../../domain/entity/external-wallet';
import { createMobileWalletAdapter } from './mobile-wallet-adapter.android';
import { buildDepositTransaction } from './solana-deposit-transaction';

const SOURCE = 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH';
const OTHER_ACCOUNT = '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin';
const CIRCLE = 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N';
const SIGNATURE_BYTES = new Uint8Array(64).fill(7);

const ACCOUNT: ExternalWalletAccount = { address: SOURCE, authToken: 'page-token' };
const TRANSFER: DepositTransfer = {
  token: { symbol: 'USDC', mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', decimals: 6 },
  source: SOURCE,
  destination: CIRCLE,
  amount: 12_340_000n,
};
const BLOCKHASH: RecentBlockhash = {
  blockhash: 'DaWBXUQaYoWGBC1tjYAD8wrCFX1o5yVBUezsjNnEqf2e',
  lastValidBlockHeight: 300n,
  minContextSlot: 250n,
};
const IDENTITY = { name: 'Owego', uri: 'https://owego.app', icon: 'favicon.ico' };

function base64Of(base58Address: string): string {
  return Buffer.from(getBase58Encoder().encode(base58Address)).toString('base64');
}

type Answer<T> = T | Error;

function wallet({
  authorize = { accounts: [{ address: base64Of(SOURCE) }], auth_token: 'fresh-token' },
  signatures = { signatures: [Buffer.from(SIGNATURE_BYTES).toString('base64')] },
}: {
  authorize?: Answer<unknown>;
  signatures?: Answer<unknown>;
} = {}) {
  const answer = (value: Answer<unknown>) =>
    value instanceof Error ? Promise.reject(value) : Promise.resolve(value);

  const fake = {
    authorize: jest.fn(() => answer(authorize)),
    signAndSendTransactions: jest.fn(() => answer(signatures)),
    deauthorize: jest.fn(),
  };
  jest
    .mocked(transact)
    .mockImplementation((callback) => Promise.resolve(callback(fake as unknown as MobileWallet)));
  return fake;
}

function failToStart(error: Error) {
  jest.mocked(transact).mockImplementation(() => Promise.reject(error));
}

const adapterError = (code: string) =>
  Object.assign(new Error(code), { name: 'SolanaMobileWalletAdapterError', code });
const protocolError = (code: number) =>
  Object.assign(new Error(`protocol ${code}`), {
    name: 'SolanaMobileWalletAdapterProtocolError',
    code,
    jsonRpcMessageId: 0,
  });

afterEach(() => {
  jest.mocked(transact).mockReset();
});

describe('createMobileWalletAdapter (android)', () => {
  describe('connect', () => {
    it('asks the wallet to authorise Owego on devnet', async () => {
      const fake = wallet();

      await createMobileWalletAdapter({ cluster: 'devnet' }).connect();

      expect(fake.authorize).toHaveBeenCalledWith({ identity: IDENTITY, chain: 'solana:devnet' });
    });

    it('asks for mainnet on a mainnet build', async () => {
      const fake = wallet();

      await createMobileWalletAdapter({ cluster: 'mainnet-beta' }).connect();

      expect(fake.authorize).toHaveBeenCalledWith({ identity: IDENTITY, chain: 'solana:mainnet' });
    });

    it("answers with the wallet's address and its authorisation", async () => {
      wallet();

      expect(await createMobileWalletAdapter({ cluster: 'devnet' }).connect()).toEqual({
        ok: true,
        value: { type: 'connected', account: { address: SOURCE, authToken: 'fresh-token' } },
      });
    });

    it('never deauthorises, as v1 never did', async () => {
      const fake = wallet();

      await createMobileWalletAdapter({ cluster: 'devnet' }).connect();

      expect(fake.deauthorize).not.toHaveBeenCalled();
    });

    it.each([
      ['no wallet on the device', adapterError('ERROR_WALLET_NOT_FOUND'), 'noWallet'],
      [
        'the chooser dismissed',
        adapterError('Session not established: Local association cancelled by user'),
        'cancelled',
      ],
      [
        'a wallet that never answered',
        adapterError('Timed out waiting for local association to be ready'),
        'unreachable',
      ],
    ] as const)('reports %s', async (_, error, reason) => {
      failToStart(error);

      expect(await createMobileWalletAdapter({ cluster: 'devnet' }).connect()).toEqual({
        ok: true,
        value: { type: 'failed', reason },
      });
    });

    it('reports authorisation declined in the wallet as cancelled', async () => {
      wallet({ authorize: protocolError(-1) });

      expect(await createMobileWalletAdapter({ cluster: 'devnet' }).connect()).toEqual({
        ok: true,
        value: { type: 'failed', reason: 'cancelled' },
      });
    });

    it.each([
      ['an authorisation with no account', { accounts: [], auth_token: 't' }],
      [
        'an account that is not a 32-byte key',
        { accounts: [{ address: 'AAAA' }], auth_token: 't' },
      ],
    ])('fails on %s rather than inventing one', async (_, authorize) => {
      wallet({ authorize });

      expect((await createMobileWalletAdapter({ cluster: 'devnet' }).connect()).ok).toBe(false);
    });

    it('fails on an error it cannot explain', async () => {
      failToStart(new Error('boom'));

      expect((await createMobileWalletAdapter({ cluster: 'devnet' }).connect()).ok).toBe(false);
    });
  });

  describe('signAndSend', () => {
    const send = () =>
      createMobileWalletAdapter({ cluster: 'devnet' }).signAndSend(ACCOUNT, TRANSFER, BLOCKHASH);

    it("re-authorises under the page's authorisation before asking for a signature", async () => {
      const fake = wallet();

      await send();

      expect(fake.authorize).toHaveBeenCalledWith({
        identity: IDENTITY,
        chain: 'solana:devnet',
        auth_token: 'page-token',
      });
      expect(fake.authorize.mock.invocationCallOrder[0]).toBeLessThan(
        fake.signAndSendTransactions.mock.invocationCallOrder[0] ?? 0,
      );
    });

    it('hands the wallet exactly the transaction built for this transfer, at the blockhash slot', async () => {
      const fake = wallet();

      await send();

      expect(fake.signAndSendTransactions).toHaveBeenCalledWith({
        payloads: [buildDepositTransaction(TRANSFER, BLOCKHASH)],
        options: { min_context_slot: 250 },
      });
    });

    it('answers with the base58 signature the wallet broadcast', async () => {
      wallet();

      expect(await send()).toEqual({
        ok: true,
        value: { type: 'submitted', signature: getBase58Decoder().decode(SIGNATURE_BYTES) },
      });
    });

    it('reads an empty list of signatures as declined', async () => {
      wallet({ signatures: { signatures: [] } });

      expect(await send()).toEqual({ ok: true, value: { type: 'notSent', reason: 'declined' } });
    });

    it('reads a refusal to sign as declined', async () => {
      wallet({ signatures: protocolError(-3) });

      expect(await send()).toEqual({ ok: true, value: { type: 'notSent', reason: 'declined' } });
    });

    it.each([
      ['a session lost while waiting', adapterError('Timed out waiting for response')],
      ['an error it cannot explain', new Error('boom')],
    ])('reads %s after asking as unconfirmed', async (_, error) => {
      wallet({ signatures: error });

      expect(await send()).toEqual({ ok: true, value: { type: 'unconfirmed' } });
    });

    it('reads an unreadable answer after asking as unconfirmed', async () => {
      wallet({ signatures: { signatures: ['not base64 of a signature'] } });

      expect(await send()).toEqual({ ok: true, value: { type: 'unconfirmed' } });
    });

    it('stops before signing when the wallet no longer honours the authorisation', async () => {
      const fake = wallet({ authorize: protocolError(-1) });

      expect(await send()).toEqual({
        ok: true,
        value: { type: 'notSent', reason: 'authorizationExpired' },
      });
      expect(fake.signAndSendTransactions).not.toHaveBeenCalled();
    });

    it('stops before signing when the wallet now puts forward a different account', async () => {
      const fake = wallet({
        authorize: { accounts: [{ address: base64Of(OTHER_ACCOUNT) }], auth_token: 't' },
      });

      expect(await send()).toEqual({
        ok: true,
        value: { type: 'notSent', reason: 'authorizationExpired' },
      });
      expect(fake.signAndSendTransactions).not.toHaveBeenCalled();
    });

    it('never opens the wallet for a transfer it cannot build', async () => {
      wallet();

      const result = await createMobileWalletAdapter({ cluster: 'devnet' }).signAndSend(
        ACCOUNT,
        { ...TRANSFER, destination: 'nope' },
        BLOCKHASH,
      );

      expect(result).toEqual({ ok: true, value: { type: 'notSent', reason: 'invalidRequest' } });
      expect(transact).not.toHaveBeenCalled();
    });

    it('reports no wallet when there is none to open', async () => {
      failToStart(adapterError('ERROR_WALLET_NOT_FOUND'));

      expect(await send()).toEqual({ ok: true, value: { type: 'notSent', reason: 'noWallet' } });
    });

    it('fails, as nothing having moved, on an error it cannot explain before asking', async () => {
      failToStart(new Error('boom'));

      expect((await send()).ok).toBe(false);
    });
  });
});
