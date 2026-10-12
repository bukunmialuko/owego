import { err, ok } from '@/core/result/result';
import { unknownError } from '@/core/errors/app-error';
import type { EsimDestination, EsimPlan, InstalledEsim } from '../../domain/entity/esim-entity';
import type {
  CoverOption,
  CoverTier,
  CoverageLine,
  Policy,
} from '../../domain/entity/insurance-entity';
import type { EsimRepository } from '../../domain/repository/esim-repository';
import type { InsuranceRepository } from '../../domain/repository/insurance-repository';

const DESTINATIONS: EsimDestination[] = [
  { code: 'global', name: 'Global', planCount: 2, fromPriceMinor: 1_900, currency: 'USD' },
  { code: 'al', name: 'Albania', planCount: 3, fromPriceMinor: 499, currency: 'USD' },
  { code: 'dz', name: 'Algeria', planCount: 3, fromPriceMinor: 750, currency: 'USD' },
  { code: 'ad', name: 'Andorra', planCount: 3, fromPriceMinor: 325, currency: 'USD' },
  { code: 'ao', name: 'Angola', planCount: 3, fromPriceMinor: 899, currency: 'USD' },
  { code: 'ag', name: 'Antigua and Barbuda', planCount: 3, fromPriceMinor: 575, currency: 'USD' },
  { code: 'ar', name: 'Argentina', planCount: 3, fromPriceMinor: 649, currency: 'USD' },
  { code: 'am', name: 'Armenia', planCount: 3, fromPriceMinor: 299, currency: 'USD' },
  { code: 'au', name: 'Australia', planCount: 3, fromPriceMinor: 925, currency: 'USD' },
  { code: 'at', name: 'Austria', planCount: 3, fromPriceMinor: 150, currency: 'USD' },
  { code: 'us', name: 'USA', planCount: 3, fromPriceMinor: 450, currency: 'USD' },
  { code: 'ke', name: 'Kenya', planCount: 3, fromPriceMinor: 599, currency: 'USD' },
  { code: 'gb', name: 'United Kingdom', planCount: 3, fromPriceMinor: 399, currency: 'USD' },
];

const PLANS: Record<string, EsimPlan[]> = {
  default: [
    { id: 'p-1gb', dataLabel: '1GB', durationDays: 7, priceMinor: 450, currency: 'USD' },
    { id: 'p-3gb', dataLabel: '3GB', durationDays: 15, priceMinor: 1_100, currency: 'USD' },
    { id: 'p-10gb', dataLabel: '10GB', durationDays: 30, priceMinor: 2_400, currency: 'USD' },
  ],
};

const COVERAGE: Record<CoverTier, CoverageLine[]> = {
  essential: [
    { id: 'medical', label: 'Emergency medical', value: '$50,000' },
    { id: 'cancellation', label: 'Trip cancellation', value: '100% of trip cost' },
    { id: 'baggage', label: 'Baggage loss/delay', value: '$500' },
  ],
  deluxe: [
    { id: 'medical', label: 'Emergency medical', value: '$150,000' },
    { id: 'evacuation', label: 'Medical evacuation', value: '$500,000' },
    { id: 'cancellation', label: 'Trip cancellation', value: '100% of trip cost' },
    { id: 'interruption', label: 'Trip interruption', value: '150% of trip cost' },
    { id: 'baggage', label: 'Baggage loss/delay', value: '$1,500' },
    { id: 'delay', label: 'Travel delay (6hr+)', value: '$500' },
  ],
  platinum: [
    { id: 'medical', label: 'Emergency medical', value: '$250,000' },
    { id: 'evacuation', label: 'Medical evacuation', value: '$1,000,000' },
    { id: 'cancellation', label: 'Trip cancellation', value: '100% of trip cost' },
    { id: 'interruption', label: 'Trip interruption', value: '150% of trip cost' },
    { id: 'baggage', label: 'Baggage loss/delay', value: '$3,000' },
    { id: 'delay', label: 'Missed connections', value: 'Included' },
  ],
};

export function createPreviewEsimRepository(): EsimRepository {
  const installed: InstalledEsim[] = [
    {
      id: 'esim-usa',
      destinationCode: 'us',
      destinationName: 'USA',
      dataLabel: '1GB',
      durationDays: 7,
      dataUsedFraction: 0.1,
      isInstalled: true,
    },
  ];

  return {
    getDestinations: () => Promise.resolve(ok([...DESTINATIONS])),
    getPlans: () => Promise.resolve(ok([...(PLANS['default'] ?? [])])),
    getInstalled: () => Promise.resolve(ok([...installed])),

    purchase: (planId) => {
      const plan = PLANS['default']?.find((entry) => entry.id === planId);
      if (plan === undefined) return Promise.resolve(err(unknownError()));

      const esim: InstalledEsim = {
        id: `esim-${planId}`,
        destinationCode: 'us',
        destinationName: 'USA',
        dataLabel: plan.dataLabel,
        durationDays: plan.durationDays,
        dataUsedFraction: 0,
        isInstalled: false,
      };
      installed.unshift(esim);

      return Promise.resolve(ok(esim));
    },

    install: (esimId) => {
      const index = installed.findIndex((entry) => entry.id === esimId);
      const existing = installed[index];
      if (existing === undefined) return Promise.resolve(err(unknownError()));

      const updated = { ...existing, isInstalled: true };
      installed[index] = updated;

      return Promise.resolve(ok(updated));
    },
  };
}

const COVER_PRICES: Record<CoverTier, number> = {
  essential: 6_100,
  deluxe: 9_000,
  platinum: 13_000,
};

export function createPreviewInsuranceRepository(): InsuranceRepository {
  const policies: Policy[] = [];

  return {
    getCovers: (trip) => {
      const covers: CoverOption[] = (['essential', 'deluxe', 'platinum'] as const).map((tier) => ({
        tier,
        priceMinor: COVER_PRICES[tier],
        currency: trip.currency,
        isMostPopular: tier === 'deluxe',
      }));

      return Promise.resolve(ok(covers));
    },

    getCoverage: (tier) => Promise.resolve(ok([...COVERAGE[tier]])),

    buyPolicy: (trip, tier) => {
      const policy: Policy = {
        reference: 'POL-WGXJUJ',
        tier,
        underwriter: 'Roamr Assure',
        trip,
        amountMinor: COVER_PRICES[tier],
      };
      policies.unshift(policy);

      return Promise.resolve(ok(policy));
    },

    getPolicies: () => Promise.resolve(ok([...policies])),
  };
}
