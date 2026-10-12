export type VerificationFailureReason =
  'camera-access-denied' | 'session-expired' | 'retry-blocked' | 'network' | 'unknown';

export type VerificationOutcome =
  | { type: 'completed' }
  | { type: 'cancelled' }
  | { type: 'failed'; reason: VerificationFailureReason };
