export type EsimDestination = {
  code: string;
  name: string;
  planCount: number;
  fromPriceMinor: number;
  currency: string;
};

export type EsimPlan = {
  id: string;
  dataLabel: string;
  durationDays: number;
  priceMinor: number;
  currency: string;
};

export type InstalledEsim = {
  id: string;
  destinationCode: string;
  destinationName: string;
  dataLabel: string;
  durationDays: number;
  dataUsedFraction: number;
  isInstalled: boolean;
};

export function usedPercent(esim: InstalledEsim): number {
  return Math.round(Math.min(Math.max(esim.dataUsedFraction, 0), 1) * 100);
}

export function searchDestinations(
  destinations: EsimDestination[],
  query: string,
): EsimDestination[] {
  const normalized = query.trim().toLowerCase();
  if (normalized === '') return destinations;

  return destinations.filter(
    (destination) =>
      destination.name.toLowerCase().includes(normalized) ||
      destination.code.toLowerCase() === normalized,
  );
}
