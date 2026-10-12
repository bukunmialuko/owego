import type { CoverTier, TripDetails } from '../../domain/entity/insurance-entity';

export type InsuranceParamList = {
  Trip: undefined;
  Cover: { trip: TripDetails };
  Review: { trip: TripDetails; tier: CoverTier };
  Issued: { reference: string };
};
