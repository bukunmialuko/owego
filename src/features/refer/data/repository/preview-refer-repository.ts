import { ok } from '@/core/result/result';
import type { Referral, ReferralPayout } from '../../domain/entity/refer-entity';
import type { ReferRepository } from '../../domain/repository/refer-repository';

const CURRENCY = 'USD';

const REWARD_MINOR = 50_00;

export function createPreviewReferRepository(): ReferRepository {
  const now = new Date();

  const at = (daysAgo: number, hours: number, minutes: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(hours, minutes, 0, 0);

    return date.toISOString();
  };

  const payouts: ReferralPayout[] = [
    { id: 'payout-1', referredName: 'Esther Howard', createdAt: at(0, 23, 17) },
    { id: 'payout-2', referredName: 'Albert Luna', createdAt: at(0, 18, 42) },
    { id: 'payout-3', referredName: 'Esther Howard', createdAt: at(0, 12, 30) },
    { id: 'payout-4', referredName: 'Mia Chen', createdAt: at(0, 9, 5) },
    { id: 'payout-5', referredName: 'Esther Howard', createdAt: at(1, 23, 17) },
    { id: 'payout-6', referredName: 'Albert Luna', createdAt: at(1, 18, 42) },
    { id: 'payout-7', referredName: 'Mia Chen', createdAt: at(1, 9, 5) },
  ].map((row) => ({ ...row, amountMinor: REWARD_MINOR, currency: CURRENCY }));

  const referrals: Referral[] = [
    { id: 'referral-1', name: 'Esther Howard', createdAt: at(0, 23, 17), status: 'pending' },
    { id: 'referral-2', name: 'Albert Luna', createdAt: at(0, 18, 42), status: 'pending' },
    { id: 'referral-3', name: 'Esther Howard', createdAt: at(0, 12, 30), status: 'pending' },
    { id: 'referral-4', name: 'Mia Chen', createdAt: at(0, 9, 5), status: 'pending' },
    {
      id: 'referral-5',
      name: 'Esther Howard',
      createdAt: at(1, 23, 17),
      status: 'settled',
      rewardMinor: REWARD_MINOR,
      currency: CURRENCY,
    },
    {
      id: 'referral-6',
      name: 'Albert Luna',
      createdAt: at(1, 18, 42),
      status: 'settled',
      rewardMinor: REWARD_MINOR,
      currency: CURRENCY,
    },
    {
      id: 'referral-7',
      name: 'Mia Chen',
      createdAt: at(1, 9, 5),
      status: 'settled',
      rewardMinor: REWARD_MINOR,
      currency: CURRENCY,
    },
  ];

  return {
    getSummary: () =>
      Promise.resolve(
        ok({
          code: 'FJFOW342',
          shareUrl: 'https://owego.app/join/FJFOW342',
          totalEarnedMinor: 513_698,
          currency: CURRENCY,
        }),
      ),
    getPayouts: () => Promise.resolve(ok([...payouts])),
    getReferrals: () => Promise.resolve(ok([...referrals])),
  };
}
