import type { PayoutRecipient } from '../../domain/entity/payout-recipient';
import type { ScanOutcome } from '../../domain/scan/scan-outcome';
import {
  COOLDOWN_MS,
  initialScannerState,
  NOTICE_MS,
  scannerReducer,
  type ScannerState,
} from './scanner-state';

const RECIPIENT: PayoutRecipient = {
  displayName: 'EXAMPLE MERCHANT',
  subtitle: 'VND',
  currency: 'VND',
  method: 'crypto',
  rail: 'wallet',
  endpoint: '/transaction/qr-pay',
  requiresNarration: false,
  limits: [],
  countryCode: 'VN',
  values: { qrString: 'RAW' },
  labels: {},
};

const MERCHANT: ScanOutcome = {
  kind: 'merchant',
  amountMinor: 10_000_000,
  qrString: 'RAW',
  recipient: RECIPIENT,
};

const ACCOUNT: ScanOutcome = { kind: 'account', isVerified: true, recipient: RECIPIENT };
const UNSUPPORTED: ScanOutcome = { kind: 'unsupported', reason: 'comingSoon' };
const PREFILL: ScanOutcome = { kind: 'prefillAddress', address: '0xabc', networkCode: undefined };

function run(from: ScannerState, ...events: Parameters<typeof scannerReducer>[1][]): ScannerState {
  return events.reduce(scannerReducer, from);
}

const scanning = run(
  initialScannerState,
  { type: 'permissionRead', permission: 'granted' },
  { type: 'cameraReady' },
);

describe('getting to the camera', () => {
  it('starts by finding out where the permission stands', () => {
    expect(initialScannerState.kind).toBe('checkingPermission');
  });

  it('waits for the camera before it claims to be scanning', () => {
    const started = scannerReducer(initialScannerState, {
      type: 'permissionRead',
      permission: 'granted',
    });

    expect(started.kind).toBe('starting');
    expect(scannerReducer(started, { type: 'cameraReady' }).kind).toBe('scanning');
  });

  it.each(['undetermined', 'denied', 'blocked'] as const)('stops at %s', (permission) => {
    expect(scannerReducer(initialScannerState, { type: 'permissionRead', permission })).toEqual({
      kind: 'permission',
      permission,
    });
  });

  it('says so when the camera will not start', () => {
    expect(
      run(
        initialScannerState,
        { type: 'permissionRead', permission: 'granted' },
        { type: 'cameraFailed' },
      ).kind,
    ).toBe('cameraError');
  });
});

describe('holding the gate', () => {
  it('takes the first reading of a code', () => {
    const held = scannerReducer(scanning, {
      type: 'codeScanned',
      raw: 'RAW',
      outcome: ACCOUNT,
      now: 0,
    });

    expect(held.kind).toBe('confirming');
  });

  it('ignores every reading that arrives while one is being confirmed', () => {
    const confirming = scannerReducer(scanning, {
      type: 'codeScanned',
      raw: 'RAW',
      outcome: ACCOUNT,
      now: 0,
    });

    const again = scannerReducer(confirming, {
      type: 'codeScanned',
      raw: 'OTHER',
      outcome: ACCOUNT,
      now: 10,
    });

    expect(again).toBe(confirming);
  });

  it('ignores the same code again while it is still cooling off', () => {
    const dismissed = run(
      scanning,
      { type: 'codeScanned', raw: 'RAW', outcome: ACCOUNT, now: 0 },
      { type: 'sheetDismissed', now: 100 },
    );

    const again = scannerReducer(dismissed, {
      type: 'codeScanned',
      raw: 'RAW',
      outcome: ACCOUNT,
      now: 100 + COOLDOWN_MS - 1,
    });

    expect(again).toBe(dismissed);
  });

  it('takes the same code once it has cooled off, so a second payment is still possible', () => {
    const dismissed = run(
      scanning,
      { type: 'codeScanned', raw: 'RAW', outcome: ACCOUNT, now: 0 },
      { type: 'sheetDismissed', now: 100 },
    );

    const again = scannerReducer(dismissed, {
      type: 'codeScanned',
      raw: 'RAW',
      outcome: ACCOUNT,
      now: 100 + COOLDOWN_MS,
    });

    expect(again.kind).toBe('confirming');
  });

  it('takes a different code straight away', () => {
    const dismissed = run(
      scanning,
      { type: 'codeScanned', raw: 'RAW', outcome: ACCOUNT, now: 0 },
      { type: 'sheetDismissed', now: 100 },
    );

    expect(
      scannerReducer(dismissed, { type: 'codeScanned', raw: 'OTHER', outcome: ACCOUNT, now: 101 })
        .kind,
    ).toBe('confirming');
  });
});

describe('what a reading leads to', () => {
  it('confirms a recipient the payer has to look at', () => {
    expect(
      scannerReducer(scanning, { type: 'codeScanned', raw: 'RAW', outcome: ACCOUNT, now: 0 }),
    ).toMatchObject({ kind: 'confirming', outcome: ACCOUNT });
  });

  it('leaves with the account once the payer continues from the sheet', () => {
    expect(
      run(
        scanning,
        { type: 'codeScanned', raw: 'RAW', outcome: ACCOUNT, now: 0 },
        { type: 'continued', now: 50 },
      ),
    ).toMatchObject({ kind: 'leaving', outcome: ACCOUNT });
  });

  it('leaves for the merchant page as soon as a merchant code is read, with nothing to confirm', () => {
    expect(
      scannerReducer(scanning, { type: 'codeScanned', raw: 'RAW', outcome: MERCHANT, now: 0 }),
    ).toMatchObject({ kind: 'leaving', outcome: MERCHANT });
  });

  it('ignores every reading that arrives while it is on its way to a merchant', () => {
    const leaving = scannerReducer(scanning, {
      type: 'codeScanned',
      raw: 'RAW',
      outcome: MERCHANT,
      now: 0,
    });

    expect(
      scannerReducer(leaving, { type: 'codeScanned', raw: 'OTHER', outcome: MERCHANT, now: 10 }),
    ).toBe(leaving);
  });

  it('leaves for another screen when the reading is a form to finish', () => {
    expect(
      scannerReducer(scanning, { type: 'codeScanned', raw: '0xabc', outcome: PREFILL, now: 0 }),
    ).toMatchObject({ kind: 'leaving' });
  });

  it('shows a notice for something it cannot pay, and says when it lapses', () => {
    expect(
      scannerReducer(scanning, { type: 'codeScanned', raw: 'RAW', outcome: UNSUPPORTED, now: 500 }),
    ).toMatchObject({ kind: 'notice', outcome: UNSUPPORTED, until: 500 + NOTICE_MS });
  });

  it('goes back to scanning once the notice has been read', () => {
    const noticed = scannerReducer(scanning, {
      type: 'codeScanned',
      raw: 'RAW',
      outcome: UNSUPPORTED,
      now: 0,
    });

    expect(scannerReducer(noticed, { type: 'noticeElapsed' }).kind).toBe('scanning');
  });

  it('keeps the code that caused a notice on cooldown afterwards', () => {
    const resumed = run(
      scanning,
      { type: 'codeScanned', raw: 'RAW', outcome: UNSUPPORTED, now: 0 },
      { type: 'noticeElapsed' },
    );

    expect(
      scannerReducer(resumed, { type: 'codeScanned', raw: 'RAW', outcome: UNSUPPORTED, now: 10 }),
    ).toBe(resumed);
  });
});

describe('capturing a photograph of an account', () => {
  it('can only start while scanning', () => {
    const confirming = scannerReducer(scanning, {
      type: 'codeScanned',
      raw: 'RAW',
      outcome: ACCOUNT,
      now: 0,
    });

    expect(scannerReducer(confirming, { type: 'captureRequested' })).toBe(confirming);
  });

  it('reads the photograph once it has been taken', () => {
    const capturing = scannerReducer(scanning, { type: 'captureRequested' });

    expect(capturing.kind).toBe('capturing');
    expect(scannerReducer(capturing, { type: 'captureTaken' }).kind).toBe('reading');
  });

  it('confirms the account the server read', () => {
    const reading = run(scanning, { type: 'captureRequested' }, { type: 'captureTaken' });
    const account: ScanOutcome = { kind: 'account', isVerified: true, recipient: RECIPIENT };

    expect(scannerReducer(reading, { type: 'readSucceeded', outcome: account })).toMatchObject({
      kind: 'confirming',
      outcome: account,
    });
  });

  it('says a photograph it could not read was not read, and keeps scanning', () => {
    const reading = run(scanning, { type: 'captureRequested' }, { type: 'captureTaken' });
    const failed = scannerReducer(reading, { type: 'readFailed', now: 0 });

    expect(failed).toMatchObject({ kind: 'notice', reason: 'readFailed' });
    expect(scannerReducer(failed, { type: 'noticeElapsed' }).kind).toBe('scanning');
  });

  it('says a photograph it could not take was not taken', () => {
    const capturing = scannerReducer(scanning, { type: 'captureRequested' });

    expect(scannerReducer(capturing, { type: 'captureFailed', now: 0 })).toMatchObject({
      kind: 'notice',
      reason: 'captureFailed',
    });
  });
});

describe('coming back', () => {
  it('scans again when the screen is returned to', () => {
    const left = scannerReducer(scanning, {
      type: 'codeScanned',
      raw: '0xabc',
      outcome: PREFILL,
      now: 0,
    });

    expect(scannerReducer(left, { type: 'refocused', now: 60 }).kind).toBe('scanning');
  });

  it('holds the code it left with on cooldown when it comes back', () => {
    const returned = run(
      scanning,
      { type: 'codeScanned', raw: 'RAW', outcome: MERCHANT, now: 0 },
      { type: 'refocused', now: 60 },
    );

    expect(
      scannerReducer(returned, { type: 'codeScanned', raw: 'RAW', outcome: MERCHANT, now: 60 }),
    ).toBe(returned);
  });

  it('does nothing when the screen was never left', () => {
    for (const state of [
      initialScannerState,
      { kind: 'permission', permission: 'undetermined' } as const,
      { kind: 'starting' } as const,
      scanning,
    ]) {
      expect(scannerReducer(state, { type: 'refocused', now: 0 })).toBe(state);
    }
  });

  it('checks the permission again when it is read a second time', () => {
    expect(scannerReducer(scanning, { type: 'permissionRead', permission: 'blocked' })).toEqual({
      kind: 'permission',
      permission: 'blocked',
    });
  });

  it('leaves a running camera alone when the permission has not changed', () => {
    expect(scannerReducer(scanning, { type: 'permissionRead', permission: 'granted' })).toBe(
      scanning,
    );
  });
});
