import type { CameraPermission } from '../../domain/port/camera-scanner-port';
import type { ScanOutcome } from '../../domain/scan/scan-outcome';

export const NOTICE_MS = 2500;

export const COOLDOWN_MS = 3000;

type NoticeReason = 'readFailed' | 'captureFailed';

export type ScannerState =
  | { kind: 'checkingPermission' }
  | { kind: 'permission'; permission: Exclude<CameraPermission, 'granted'> }
  | { kind: 'starting' }
  | { kind: 'scanning'; cooldown?: { raw: string; until: number } }
  | {
      kind: 'notice';
      until: number;
      outcome?: ScanOutcome;
      reason?: NoticeReason;
      cooldown?: { raw: string; until: number };
    }
  | { kind: 'capturing' }
  | { kind: 'reading' }
  | { kind: 'confirming'; outcome: ScanOutcome; cooldown?: { raw: string; until: number } }
  | { kind: 'leaving'; outcome?: ScanOutcome; cooldown?: { raw: string; until: number } }
  | { kind: 'cameraError' };

export type ScannerEvent =
  | { type: 'permissionRead'; permission: CameraPermission }
  | { type: 'cameraReady' }
  | { type: 'cameraFailed' }
  | { type: 'codeScanned'; raw: string; outcome: ScanOutcome; now: number }
  | { type: 'noticeElapsed' }
  | { type: 'captureRequested' }
  | { type: 'captureTaken' }
  | { type: 'captureFailed'; now: number }
  | { type: 'readSucceeded'; outcome: ScanOutcome }
  | { type: 'readFailed'; now: number }
  | { type: 'sheetDismissed'; now: number }
  | { type: 'continued'; now: number }
  | { type: 'refocused'; now: number };

export const initialScannerState: ScannerState = { kind: 'checkingPermission' };

export function scannerReducer(state: ScannerState, event: ScannerEvent): ScannerState {
  switch (event.type) {
    case 'permissionRead': {
      if (event.permission !== 'granted') {
        return { kind: 'permission', permission: event.permission };
      }

      return state.kind === 'checkingPermission' || state.kind === 'permission'
        ? { kind: 'starting' }
        : state;
    }

    case 'cameraReady':
      return state.kind === 'starting' ? { kind: 'scanning' } : state;

    case 'cameraFailed':
      return { kind: 'cameraError' };

    case 'codeScanned': {
      if (state.kind !== 'scanning' || isCoolingOff(state.cooldown, event.raw, event.now)) {
        return state;
      }

      return afterReading(
        event.outcome,
        {
          raw: event.raw,
          until: event.now + COOLDOWN_MS,
        },
        event.now,
      );
    }

    case 'noticeElapsed':
      return state.kind === 'notice' ? scanningWith(state.cooldown, state.until) : state;

    case 'captureRequested':
      return state.kind === 'scanning' ? { kind: 'capturing' } : state;

    case 'captureTaken':
      return state.kind === 'capturing' ? { kind: 'reading' } : state;

    case 'captureFailed':
      return { kind: 'notice', until: event.now + NOTICE_MS, reason: 'captureFailed' };

    case 'readSucceeded':
      return state.kind === 'reading' ? { kind: 'confirming', outcome: event.outcome } : state;

    case 'readFailed':
      return { kind: 'notice', until: event.now + NOTICE_MS, reason: 'readFailed' };

    case 'sheetDismissed':
      return scanningWith(state.kind === 'confirming' ? state.cooldown : undefined, event.now);

    case 'continued':
      if (state.kind !== 'confirming') return state;

      return { kind: 'leaving', outcome: state.outcome, ...pick(state.cooldown) };

    case 'refocused':
      return state.kind === 'leaving' ? scanningWith(state.cooldown, event.now) : state;
  }
}

function afterReading(
  outcome: ScanOutcome,
  cooldown: { raw: string; until: number },
  now: number,
): ScannerState {
  switch (outcome.kind) {
    case 'account':
      return { kind: 'confirming', outcome, cooldown };

    case 'merchant':
    case 'prefillRecipient':
    case 'prefillAddress':
      return { kind: 'leaving', outcome, cooldown };

    case 'unsupported':
      return { kind: 'notice', until: now + NOTICE_MS, outcome, cooldown };
  }
}

function scanningWith(
  cooldown: { raw: string; until: number } | undefined,
  now: number,
): ScannerState {
  if (cooldown === undefined) return { kind: 'scanning' };

  return { kind: 'scanning', cooldown: { raw: cooldown.raw, until: now + COOLDOWN_MS } };
}

function pick(cooldown: { raw: string; until: number } | undefined) {
  return cooldown === undefined ? {} : { cooldown };
}

function isCoolingOff(
  cooldown: { raw: string; until: number } | undefined,
  raw: string,
  now: number,
): boolean {
  return cooldown !== undefined && cooldown.raw === raw && now < cooldown.until;
}
