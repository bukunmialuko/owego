export type CoverTier = 'essential' | 'deluxe' | 'platinum';

export type TripDetails = {
  destinationCode: string;
  destinationName: string;
  departure: string;
  returnDate: string;
  travellers: number;
  tripCostMinor: number;
  currency: string;
};

export type CoverOption = {
  tier: CoverTier;
  priceMinor: number;
  currency: string;
  isMostPopular: boolean;
};

export type CoverageLine = {
  id: string;
  label: string;
  value: string;
};

export type Policy = {
  reference: string;
  tier: CoverTier;
  underwriter: string;
  trip: TripDetails;
  amountMinor: number;
};

const MS_PER_DAY = 86_400_000;

export function tripNights(trip: Pick<TripDetails, 'departure' | 'returnDate'>): number {
  const departure = Date.parse(`${trip.departure}T00:00:00Z`);
  const back = Date.parse(`${trip.returnDate}T00:00:00Z`);

  if (Number.isNaN(departure) || Number.isNaN(back)) return 0;

  return Math.max(Math.round((back - departure) / MS_PER_DAY), 0);
}

export function isTripValid(trip: TripDetails): boolean {
  return (
    trip.destinationCode !== '' &&
    trip.departure !== '' &&
    trip.returnDate !== '' &&
    trip.returnDate >= trip.departure &&
    trip.travellers >= 1 &&
    trip.tripCostMinor > 0
  );
}
