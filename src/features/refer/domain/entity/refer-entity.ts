export type ReferralSummary = {
  code: string;
  shareUrl: string;
  totalEarnedMinor: number;
  currency: string;
};

export type ReferralPayout = {
  id: string;
  referredName: string;
  amountMinor: number;
  currency: string;
  createdAt: string;
};

export type Referral =
  | { id: string; name: string; createdAt: string; status: 'pending' }
  | {
      id: string;
      name: string;
      createdAt: string;
      status: 'settled';
      rewardMinor: number;
      currency: string;
    };
