import { transact, type MobileWallet } from '@solana-mobile/mobile-wallet-adapter-protocol';
import type { SolanaCluster } from '@/core/config/app-config';
import { fromUnknown, unknownError } from '@/core/errors/app-error';
import { isSolanaSignature } from '@/core/reference-data/explorer';
import { err, ok } from '@/core/result/result';
import type { ExternalWalletAccount } from '../../domain/entity/external-wallet';
import type { ExternalWalletPort } from '../../domain/port/external-wallet-port';
import { connectFailureFor, depositOutcomeForError } from '../mapper/mobile-wallet-error-mapper';
import {
  authorizationResultSchema,
  signAndSendResultSchema,
  walletErrorSchema,
} from '../model/mobile-wallet-model';
import { base64ToBase58 } from './solana-address';
import { buildDepositTransaction } from './solana-deposit-transaction';

const IDENTITY = { name: 'Owego', uri: 'https://owego.app', icon: 'favicon.ico' } as const;

const CHAIN = { devnet: 'solana:devnet', 'mainnet-beta': 'solana:mainnet' } as const;

export function createMobileWalletAdapter({
  cluster,
}: {
  cluster: SolanaCluster;
}): ExternalWalletPort {
  const chain = CHAIN[cluster];

  return {
    async connect() {
      try {
        const authorization = await transact((wallet) =>
          wallet.authorize({ identity: IDENTITY, chain }),
        );
        const account = readAccount(authorization);

        return account === undefined
          ? err(unknownError('mwa: unreadable authorization'))
          : ok({ type: 'connected', account });
      } catch (cause) {
        const code = walletErrorSchema.safeParse(cause);
        const failure = code.success ? connectFailureFor(code.data.code) : undefined;

        return failure === undefined
          ? err(fromUnknown(cause))
          : ok({ type: 'failed', reason: failure });
      }
    },

    async signAndSend(account, transfer, blockhash) {
      const payload = buildDepositTransaction(transfer, blockhash);
      if (payload === undefined) return ok({ type: 'notSent', reason: 'invalidRequest' });

      const progress = { dispatched: false };
      try {
        const answer = await transact(async (wallet) => {
          if (!(await stillAuthorizes(wallet, account))) return undefined;

          progress.dispatched = true;
          return wallet.signAndSendTransactions({
            payloads: [payload],
            options: { min_context_slot: Number(blockhash.minContextSlot) },
          });
        });
        if (answer === undefined) return ok({ type: 'notSent', reason: 'authorizationExpired' });

        const parsed = signAndSendResultSchema.safeParse(answer);
        if (!parsed.success) return ok({ type: 'unconfirmed' });

        const [first] = parsed.data.signatures;
        if (first === undefined) return ok({ type: 'notSent', reason: 'declined' });

        const signature = base64ToBase58(first, 64);
        return signature !== undefined && isSolanaSignature(signature)
          ? ok({ type: 'submitted', signature })
          : ok({ type: 'unconfirmed' });
      } catch (cause) {
        const phase = progress.dispatched ? 'afterDispatch' : 'beforeDispatch';
        const code = walletErrorSchema.safeParse(cause);
        const outcome = depositOutcomeForError(code.success ? code.data.code : undefined, phase);

        return outcome === undefined ? err(fromUnknown(cause)) : ok(outcome);
      }

      async function stillAuthorizes(wallet: MobileWallet, current: ExternalWalletAccount) {
        const authorization = await wallet.authorize({
          identity: IDENTITY,
          chain,
          auth_token: current.authToken,
        });
        return readAccount(authorization)?.address === current.address;
      }
    },
  };
}

function readAccount(authorization: unknown): ExternalWalletAccount | undefined {
  const parsed = authorizationResultSchema.safeParse(authorization);
  if (!parsed.success) return undefined;

  const [first] = parsed.data.accounts;
  const address = first === undefined ? undefined : base64ToBase58(first.address, 32);
  return address === undefined ? undefined : { address, authToken: parsed.data.auth_token };
}
