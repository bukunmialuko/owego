export type TransferChallengeRequest = {
  walletId: string;
  tokenId: string;
  destinationAddress: string;
  amountMinor: number;
};

export type TransferChallenge = {
  challengeId: string;
  userToken: string;
  encryptionKey: string;
};
