import type { MovementKind, YieldTarget } from '../domain/entity/yield-entity';
import type { YieldEnding } from '../domain/entity/yield-move-outcome';
import type { YieldQuote } from '../domain/entity/yield-quote';

export type YieldParamList = {
  Dashboard: undefined;
  Amount: { kind: MovementKind; vaultId?: string };
  Confirm: { target: YieldTarget; quote: YieldQuote; adjustedFromMinor?: number };
  Success: { target: YieldTarget; quote: YieldQuote; ending: YieldEnding };
};
