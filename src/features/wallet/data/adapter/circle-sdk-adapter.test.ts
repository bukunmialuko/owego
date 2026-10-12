import ProgrammablewalletRnSdk, { ErrorCode, WalletSdk } from '@circle-fin/w3s-pw-react-native-sdk';
import type { WalletChallenge } from '../../domain/entity/wallet-entity';
import type {
  CircleChallengeOutcome,
  CircleExecuteStatus,
  CircleFailureReason,
  CircleResultType,
} from '../../domain/port/circle-wallet-port';
import en from '@/core/i18n/locales/en.json';
import { CIRCLE_ENDPOINT, createCircleSdkAdapter } from './circle-sdk-adapter';

const init = jest.mocked(WalletSdk.init);
const execute = jest.mocked(WalletSdk.execute);
const setSecurityQuestions = jest.mocked(WalletSdk.setSecurityQuestions);
const setImageMap = jest.mocked(WalletSdk.setImageMap);
const setIconTextConfigsMap = jest.mocked(WalletSdk.setIconTextConfigsMap);
const addListener = jest.mocked(ProgrammablewalletRnSdk.addListener);
const setDismissOnCallbackMap = jest.mocked(WalletSdk.setDismissOnCallbackMap);

const APP_ID = 'app-id-1';
const challenge: WalletChallenge = {
  challengeId: 'chal-1',
  userToken: 'token-1',
  encryptionKey: 'key-1',
};

function succeedsWith(status: string, resultType = 'INITIALIZE', data?: unknown) {
  execute.mockImplementation((_t, _k, _ids, onSuccess) => {
    onSuccess({ result: { status, resultType, ...(data === undefined ? {} : { data }) } } as never);
  });
}

function failsWith(code: string | number | undefined, message = 'boom') {
  execute.mockImplementation((_t, _k, _ids, _onSuccess, onError) => {
    onError({ code, message } as never);
  });
}

function build() {
  return createCircleSdkAdapter({ appId: APP_ID, translate: (key) => `t:${key}` });
}

async function outcomeOf(): Promise<CircleChallengeOutcome> {
  const result = await build().executeChallenge(challenge);

  if (!result.ok) throw new Error(`expected ok, got err ${result.error.code}`);

  return result.value;
}

beforeEach(() => {
  init.mockReset().mockResolvedValue(undefined);
  execute.mockReset();
  setSecurityQuestions.mockClear();
  setImageMap.mockClear();
  setIconTextConfigsMap.mockClear();
  addListener.mockClear();
  setDismissOnCallbackMap.mockClear();
});

describe('CircleSdkAdapter — init', () => {
  it('initialises against the documented endpoint with the configured app id', async () => {
    succeedsWith('COMPLETE');

    await build().executeChallenge(challenge);

    expect(init).toHaveBeenCalledWith({
      endpoint: CIRCLE_ENDPOINT,
      appId: APP_ID,
      settingsManagement: { enableBiometricsPin: false },
    });
  });

  it('uses the documented api.circle.com host rather than v1s legacy one', () => {
    expect(CIRCLE_ENDPOINT).toBe('https://api.circle.com/v1/w3s/');
  });

  it('initialises once however many challenges it executes', async () => {
    succeedsWith('COMPLETE');
    const adapter = build();

    await adapter.executeChallenge(challenge);
    await adapter.executeChallenge(challenge);

    expect(init).toHaveBeenCalledTimes(1);
  });

  it('reports an init rejection as an error rather than an outcome', async () => {
    init.mockRejectedValue(new Error('bad app id'));

    const result = await build().executeChallenge(challenge);

    expect(result.ok).toBe(false);
    expect(execute).not.toHaveBeenCalled();
  });

  it('hands the challenge triple to the sdk as a single-element id list', async () => {
    succeedsWith('COMPLETE');

    await build().executeChallenge(challenge);

    expect(execute).toHaveBeenCalledWith(
      'token-1',
      'key-1',
      ['chal-1'],
      expect.any(Function),
      expect.any(Function),
    );
  });
});

describe('CircleSdkAdapter — closing Circle’s screens', () => {
  it('closes Circle’s screens on every error the sdk can report', async () => {
    succeedsWith('COMPLETE');

    await build().executeChallenge(challenge);

    const policy = setDismissOnCallbackMap.mock.calls[0]?.[0];
    expect([...(policy?.keys() ?? [])].sort()).toEqual(Object.values(ErrorCode).sort());
    expect([...(policy?.values() ?? [])].every((dismisses) => dismisses)).toBe(true);
  });

  it('registers the policy once however many challenges run', async () => {
    succeedsWith('COMPLETE');
    const adapter = build();

    await adapter.executeChallenge(challenge);
    await adapter.executeChallenge(challenge);

    expect(setDismissOnCallbackMap).toHaveBeenCalledTimes(1);
  });

  it('registers it before the first challenge executes', async () => {
    succeedsWith('COMPLETE');

    await build().executeChallenge(challenge);

    expect(setDismissOnCallbackMap.mock.invocationCallOrder[0]).toBeLessThan(
      execute.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it('reads a rejected promise’s code the same as an event’s', async () => {
    execute.mockImplementation((_t, _k, _ids, _onSuccess, onError) => {
      onError(Object.assign(new Error('Calling the execute function failed'), { code: '155706' }));
    });

    await expect(outcomeOf()).resolves.toMatchObject({ type: 'failed', reason: 'network' });
  });
});

describe('CircleSdkAdapter — statuses', () => {
  const STATUSES: [string, CircleExecuteStatus][] = [
    ['UNKNOWN', 'unknown'],
    ['PENDING', 'pending'],
    ['IN_PROGRESS', 'in-progress'],
    ['COMPLETE', 'complete'],
    ['FAILED', 'failed'],
    ['EXPIRED', 'expired'],
  ];

  it.each(STATUSES)('maps %s to %s', async (raw, expected) => {
    succeedsWith(raw);

    await expect(outcomeOf()).resolves.toEqual({
      type: 'settled',
      status: expected,
      resultType: 'initialize',
    });
  });

  it('treats a status it does not recognise as unknown rather than throwing', async () => {
    succeedsWith('SOMETHING_NEW');

    await expect(outcomeOf()).resolves.toMatchObject({ type: 'settled', status: 'unknown' });
  });
});

describe('CircleSdkAdapter — result types', () => {
  const TYPES: [string, CircleResultType][] = [
    ['INITIALIZE', 'initialize'],
    ['CREATE_WALLET', 'create-wallet'],
    ['SET_PIN', 'set-pin'],
    ['RESTORE_PIN', 'restore-pin'],
    ['SET_SECURITY_QUESTIONS', 'set-security-questions'],
    ['CREATE_TRANSACTION', 'create-transaction'],
    ['SET_BIOMETRICS_PIN', 'set-biometrics-pin'],
    ['WALLET_UPGRADE', 'other'],
  ];

  it.each(TYPES)('carries %s as %s', async (raw, expected) => {
    succeedsWith('COMPLETE', raw);

    await expect(outcomeOf()).resolves.toMatchObject({ resultType: expected });
  });

  it('carries the raw SIGN_TRANSACTION the native sdks send as sign-transaction', async () => {
    succeedsWith('COMPLETE', 'SIGN_TRANSACTION');

    await expect(outcomeOf()).resolves.toMatchObject({ resultType: 'sign-transaction' });
  });

  it('carries a result type no enum declares as other rather than undefined', async () => {
    succeedsWith('COMPLETE', 'SOMETHING_NEWER');

    await expect(outcomeOf()).resolves.toMatchObject({ resultType: 'other' });
  });
});

describe('CircleSdkAdapter — the signed transaction', () => {
  it('carries what a signing challenge produced', async () => {
    succeedsWith('COMPLETE', 'SIGN_TRANSACTION', { signedTransaction: 'c2lnbmVk' });

    await expect(outcomeOf()).resolves.toEqual({
      type: 'settled',
      status: 'complete',
      resultType: 'sign-transaction',
      signedTransaction: 'c2lnbmVk',
    });
  });

  it.each([
    ['absent', undefined],
    ['null', { signedTransaction: null }],
    ['empty', { signedTransaction: '' }],
    ['not a string', { signedTransaction: 42 }],
  ])('leaves it out when it is %s', async (_case, data) => {
    succeedsWith('COMPLETE', 'SIGN_TRANSACTION', data);

    await expect(outcomeOf()).resolves.not.toHaveProperty('signedTransaction');
  });

  it('refuses a signature from an execute that overlapped another', async () => {
    const pending: ((result: unknown) => void)[] = [];
    execute.mockImplementation((_t, _k, _ids, onSuccess) => {
      pending.push((result) => {
        onSuccess(result as never);
      });
    });
    const adapter = build();

    const first = adapter.executeChallenge(challenge);
    const second = adapter.executeChallenge({ ...challenge, challengeId: 'chal-2' });
    await Promise.resolve();
    await Promise.resolve();
    const signed = {
      result: {
        status: 'COMPLETE',
        resultType: 'SIGN_TRANSACTION',
        data: { signedTransaction: 'x' },
      },
    };
    for (const deliver of pending) deliver(signed);

    for (const result of await Promise.all([first, second])) {
      expect(result).toEqual({
        ok: true,
        value: expect.objectContaining({ type: 'failed', reason: 'unknown' }),
      });
    }
  });

  it('carries a signature again once nothing overlaps', async () => {
    const adapter = build();
    succeedsWith('COMPLETE', 'SIGN_TRANSACTION', { signedTransaction: 'one' });
    await adapter.executeChallenge(challenge);
    succeedsWith('COMPLETE', 'SIGN_TRANSACTION', { signedTransaction: 'two' });

    await expect(adapter.executeChallenge(challenge)).resolves.toEqual({
      ok: true,
      value: expect.objectContaining({ signedTransaction: 'two' }),
    });
  });

  describe('an execute whose sheet never answers', () => {
    const MINUTE = 60_000;

    function hangThenSign(signedAt: number) {
      execute
        .mockImplementationOnce(() => undefined)
        .mockImplementation((_t, _k, _ids, onSuccess) => {
          onSuccess({
            result: {
              status: 'COMPLETE',
              resultType: 'SIGN_TRANSACTION',
              data: { signedTransaction: 'fresh' },
            },
          } as never);
        });
      const adapter = createCircleSdkAdapter({
        appId: APP_ID,
        translate: (key) => `t:${key}`,
        now: jest.fn().mockReturnValueOnce(0).mockReturnValue(signedAt),
      });

      void adapter.executeChallenge(challenge);

      return () => adapter.executeChallenge({ ...challenge, challengeId: 'chal-2' });
    }

    it('stops blocking signatures once every caller has given up on it', async () => {
      const signLater = hangThenSign(3 * MINUTE);

      await expect(signLater()).resolves.toEqual({
        ok: true,
        value: expect.objectContaining({ signedTransaction: 'fresh' }),
      });
    });

    it('still blocks them while a caller may be waiting on it', async () => {
      const signLater = hangThenSign(3 * MINUTE - 1);

      await expect(signLater()).resolves.toEqual({
        ok: true,
        value: expect.objectContaining({ type: 'failed', reason: 'unknown' }),
      });
    });
  });

  it('leaves an overlapped result without a signature untouched', async () => {
    const pending: ((result: unknown) => void)[] = [];
    execute.mockImplementation((_t, _k, _ids, onSuccess) => {
      pending.push((result) => {
        onSuccess(result as never);
      });
    });
    const adapter = build();

    const first = adapter.executeChallenge(challenge);
    const second = adapter.executeChallenge(challenge);
    await Promise.resolve();
    await Promise.resolve();
    for (const deliver of pending)
      deliver({ result: { status: 'COMPLETE', resultType: 'INITIALIZE' } });

    await expect(first).resolves.toEqual({
      ok: true,
      value: { type: 'settled', status: 'complete', resultType: 'initialize' },
    });
    await second;
  });
});

describe('CircleSdkAdapter — error codes', () => {
  it('reports 155701 as a cancellation, not a failure', async () => {
    failsWith('155701', '(155701) circle.programmablewallet → User canceled');

    await expect(outcomeOf()).resolves.toEqual({ type: 'cancelled' });
  });

  it('reports 155701 as a cancellation when the sdk sends the code as a number', async () => {
    failsWith(155701);

    await expect(outcomeOf()).resolves.toEqual({ type: 'cancelled' });
  });

  const REASONS: [string, CircleFailureReason][] = [
    ['155112', 'incorrect-pin'],
    ['155703', 'incorrect-pin'],
    ['155119', 'pin-locked'],
    ['155120', 'pin-locked'],
    ['155704', 'insecure-pin'],
    ['155104', 'challenge-invalid'],
    ['155105', 'challenge-invalid'],
    ['155116', 'challenge-invalid'],
    ['155118', 'challenge-invalid'],
    ['155718', 'challenge-invalid'],
    ['155706', 'network'],
    ['155708', 'biometrics-unavailable'],
    ['155711', 'biometrics-unavailable'],
    ['155716', 'biometrics-unavailable'],
  ];

  it.each(REASONS)('maps %s to %s', async (code, reason) => {
    failsWith(code);

    await expect(outcomeOf()).resolves.toMatchObject({ type: 'failed', reason });
  });

  it.each(['155106', '155107'])('advances on %s rather than failing', async (code) => {
    failsWith(code);

    await expect(outcomeOf()).resolves.toEqual({
      type: 'settled',
      status: 'complete',
      resultType: 'other',
    });
  });

  it.each(['155114', '155702', '155719'])(
    'reports %s as an error, not an outcome',
    async (code) => {
      failsWith(code);

      const result = await build().executeChallenge(challenge);

      expect(result.ok).toBe(false);
    },
  );

  it('falls through to unknown with the flattened message', async () => {
    failsWith('155999', '(155999) circle.programmablewallet.sdk → Something specific went wrong');

    await expect(outcomeOf()).resolves.toEqual({
      type: 'failed',
      reason: 'unknown',
      message: 'Something specific went wrong',
    });
  });

  it('falls through to unknown when the sdk sends no code at all', async () => {
    failsWith(undefined, 'no code here');

    await expect(outcomeOf()).resolves.toMatchObject({
      reason: 'unknown',
      message: 'no code here',
    });
  });

  it('never logs the raw sdk error', async () => {
    const spies = [
      jest.spyOn(console, 'log').mockImplementation(() => undefined),
      jest.spyOn(console, 'warn').mockImplementation(() => undefined),
      jest.spyOn(console, 'error').mockImplementation(() => undefined),
    ];
    failsWith('155999', 'token-1 leaked in here');

    await outcomeOf();

    spies.forEach((spy) => {
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});

describe('CircleSdkAdapter — branding', () => {
  beforeEach(async () => {
    succeedsWith('COMPLETE');
    await build().executeChallenge(challenge);
  });

  it('registers exactly the seven security questions v1 established', () => {
    expect(setSecurityQuestions).toHaveBeenCalledTimes(1);
    expect(setSecurityQuestions.mock.calls[0]?.[0]).toHaveLength(7);
  });

  it('asks for the birthday with a date picker', () => {
    const questions = setSecurityQuestions.mock.calls[0]?.[0] ?? [];

    expect(questions[6]).toMatchObject({ inputType: 'datePicker' });
    expect(questions.slice(0, 6).every((q) => q.inputType === undefined)).toBe(true);
  });

  it('overrides exactly the seven images v1 overrides', () => {
    const map = setImageMap.mock.calls[0]?.[0] as Map<string, unknown>;

    expect([...map.keys()].sort()).toEqual(
      [
        'back',
        'close',
        'dropdownArrow',
        'hidePin',
        'securityConfirmMain',
        'securityIntroMain',
        'showPin',
      ].sort(),
    );
  });

  it('hands the sdk resolved raster assets rather than components', () => {
    const map = setImageMap.mock.calls[0]?.[0] as Map<string, unknown>;

    [...map.values()].forEach((source) => {
      expect(typeof source === 'number' || typeof source === 'object').toBe(true);
      expect(typeof source).not.toBe('function');
    });
  });

  it('registers the three confirmation items', () => {
    const map = setIconTextConfigsMap.mock.calls[0]?.[0] as Map<string, unknown[]>;

    expect(map.get('securityConfirmationItems')).toHaveLength(3);
  });

  it('brands once however many challenges the same adapter executes', async () => {
    setSecurityQuestions.mockClear();
    setImageMap.mockClear();
    succeedsWith('COMPLETE');
    const adapter = build();

    await adapter.executeChallenge(challenge);
    await adapter.executeChallenge(challenge);
    await adapter.executeChallenge(challenge);

    expect(setSecurityQuestions).toHaveBeenCalledTimes(1);
    expect(setImageMap).toHaveBeenCalledTimes(1);
  });
});

describe('the security question copy is byte-identical to v1', () => {
  const RSQUO = '’';

  it.each([
    ['securityQuestionFathersMiddleName', `What is your father${RSQUO}s middle name?`],
    ['securityQuestionFavoriteSportsTeam', 'What is your favorite sports team?'],
    ['securityQuestionMothersMaidenName', `What is your mother${RSQUO}s maiden name?`],
    ['securityQuestionFirstPet', 'What is the name of your first pet?'],
    ['securityQuestionBirthCity', 'What is the name of the city you were born in?'],
    ['securityQuestionFirstStreet', 'What is the name of the first street you lived on?'],
    ['securityQuestionFathersBirthday', `When is your father${RSQUO}s birthday?`],
  ])('%s', (key, expected) => {
    expect(en.wallet[key as keyof typeof en.wallet]).toBe(expected);
  });

  it.each([
    'securityQuestionFathersMiddleName',
    'securityQuestionMothersMaidenName',
    'securityQuestionFathersBirthday',
    'securityConfirmNotStored',
  ])('%s uses U+2019 and never an ASCII apostrophe', (key) => {
    const value = en.wallet[key as keyof typeof en.wallet];

    expect(value).toContain('’');
    expect(value).not.toContain("'");
  });

  it('keeps v1s US spelling of favorite', () => {
    expect(en.wallet.securityQuestionFavoriteSportsTeam).toContain('favorite');
  });

  it('states the consequences without softening them', () => {
    expect(en.wallet.securityConfirmOnlyRecovery).toBe(
      'This is the only way to recover my account access.',
    );
    expect(en.wallet.securityConfirmNotStored).toBe(
      `Owego won${RSQUO}t store my answers so it${RSQUO}s my responsibility to remember them.`,
    );
    expect(en.wallet.securityConfirmLoseAccess).toBe(
      'I will lose access to my wallet and my digital assets if I forget my answers.',
    );
  });
});

describe('CircleSdkAdapter — the forgot-PIN event', () => {
  it('subscribes to the sdk event rather than hunting for the button', async () => {
    succeedsWith('COMPLETE');
    const onForgotPin = jest.fn();

    await createCircleSdkAdapter({
      appId: APP_ID,
      translate: (key) => `t:${key}`,
      onForgotPin,
    }).executeChallenge(challenge);

    expect(addListener).toHaveBeenCalledWith('CirclePwOnEvent', expect.any(Function));
  });

  it('reports only the forgotPin event, not every event the sdk emits', async () => {
    succeedsWith('COMPLETE');
    const onForgotPin = jest.fn();

    await createCircleSdkAdapter({
      appId: APP_ID,
      translate: (key) => `t:${key}`,
      onForgotPin,
    }).executeChallenge(challenge);

    const handler = addListener.mock.calls.at(-1)?.[1] as (e: { name: string }) => void;
    handler({ name: 'resendOtp' });
    expect(onForgotPin).not.toHaveBeenCalled();

    handler({ name: 'forgotPin' });
    expect(onForgotPin).toHaveBeenCalledTimes(1);
  });

  it('does not subscribe when nobody is listening', async () => {
    succeedsWith('COMPLETE');

    await build().executeChallenge(challenge);

    expect(addListener).not.toHaveBeenCalled();
  });
});
