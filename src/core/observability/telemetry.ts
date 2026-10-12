import type { AppError } from '@/core/errors/app-error';

type AnalyticsEvent =
  | { name: 'sign_in_started'; provider: 'google' | 'apple' | 'email' }
  | { name: 'sign_in_succeeded'; provider: 'google' | 'apple' | 'email' }
  | { name: 'sign_in_failed'; provider: 'google' | 'apple' | 'email'; code: string }
  | { name: 'payment_started'; rail: 'bank' | 'mobile_money' | 'zelle' | 'qr_scan' | 'crypto' }
  | { name: 'payment_confirmed'; rail: string; currency: string }
  | { name: 'payment_failed'; rail: string; code: string }
  | { name: 'screen_viewed'; screen: string };

export interface Telemetry {
  captureError(error: AppError, context?: Readonly<Record<string, unknown>>): void;
  track(event: AnalyticsEvent): void;
  identify(userId: string | undefined): void;
}

export function createNoopTelemetry(): Telemetry {
  return {
    captureError() {},
    track() {},
    identify() {},
  };
}
