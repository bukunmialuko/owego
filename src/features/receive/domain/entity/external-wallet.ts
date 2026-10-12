export type ExternalWalletAccount = {
  address: string;
  authToken: string;
};

export type ConnectFailure = 'noWallet' | 'cancelled' | 'unreachable' | 'unsupported';

export type ConnectOutcome =
  | { type: 'connected'; account: ExternalWalletAccount }
  | { type: 'failed'; reason: ConnectFailure };
