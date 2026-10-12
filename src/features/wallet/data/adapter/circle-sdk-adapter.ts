import ProgrammablewalletRnSdk, {
  CIRCLE_PW_ON_EVENT,
  ErrorCode as CircleErrorCode,
  ExecuteEvent,
  ExecuteResultStatus,
  ExecuteResultType,
  IconTextConfig,
  IconTextsKey,
  ImageKey,
  InputType,
  SecurityQuestion,
  TextConfig,
  WalletSdk,
  type SuccessResult,
} from '@circle-fin/w3s-pw-react-native-sdk';
import { unknownError, type AppError } from '@/core/errors/app-error';
import type { TranslationKey } from '@/core/i18n/translation-key';
import { err, ok, type Result } from '@/core/result/result';
import type { WalletChallenge } from '../../domain/entity/wallet-entity';
import type {
  CircleChallengeOutcome,
  CircleExecuteStatus,
  CircleResultType,
  CircleWalletPort,
} from '../../domain/port/circle-wallet-port';
import { flattenCircleErrorMessage } from '../../util/circle-error';
import backIcon from '@/assets/circle/back.png';
import chevronDownIcon from '@/assets/circle/chevron-down.png';
import closeIcon from '@/assets/circle/close.png';
import eyeIcon from '@/assets/circle/eye.png';
import eyeOffIcon from '@/assets/circle/eye-off.png';
import numberOneBadge from '@/assets/circle/number-1.png';
import numberThreeBadge from '@/assets/circle/number-3.png';
import numberTwoBadge from '@/assets/circle/number-2.png';
import owegoLogo from '@/assets/circle/owego-logo.png';

export const CIRCLE_ENDPOINT = 'https://api.circle.com/v1/w3s/';

type Dependencies = {
  appId: string;
  translate: (key: TranslationKey) => string;
  onForgotPin?: () => void;
  now?: () => number;
};

const ABANDONED_AFTER_MS = 3 * 60_000;

type SdkError = { code?: string | number; message?: string };

export function createCircleSdkAdapter({
  appId,
  translate,
  onForgotPin,
  now = Date.now,
}: Dependencies): CircleWalletPort {
  let initialised: Promise<void> | undefined;

  const inFlight = new Set<{ overlapped: boolean; startedAt: number }>();

  function initOnce(): Promise<void> {
    initialised ??= WalletSdk.init({
      endpoint: CIRCLE_ENDPOINT,
      appId,
      settingsManagement: { enableBiometricsPin: false },
    }).then(() => {
      closeScreensOnEveryError();
      applyBranding(translate);
      subscribeToForgotPin(onForgotPin);
    });

    return initialised;
  }

  return {
    async executeChallenge(
      challenge: WalletChallenge,
    ): Promise<Result<CircleChallengeOutcome, AppError>> {
      try {
        await initOnce();
      } catch (cause) {
        initialised = undefined;

        return err(unknownError('Circle SDK initialisation failed.', cause));
      }

      const startedAt = now();
      for (const other of inFlight) {
        if (startedAt - other.startedAt >= ABANDONED_AFTER_MS) inFlight.delete(other);
        else other.overlapped = true;
      }
      const execution = { overlapped: inFlight.size > 0, startedAt };
      inFlight.add(execution);

      return new Promise((resolve) => {
        WalletSdk.execute(
          challenge.userToken,
          challenge.encryptionKey,
          [challenge.challengeId],
          (result: SuccessResult) => {
            inFlight.delete(execution);
            const settled = toSettled(result);
            resolve(
              ok(
                execution.overlapped && settled.signedTransaction !== undefined
                  ? failed('unknown', '')
                  : settled,
              ),
            );
          },
          (error: SdkError) => {
            inFlight.delete(execution);
            resolve(toErrorOutcome(error));
          },
        );
      });
    },
  };
}

function toSettled(result: SuccessResult): Extract<CircleChallengeOutcome, { type: 'settled' }> {
  const signedTransaction: unknown = result.result.data?.signedTransaction;

  return {
    type: 'settled',
    status: toStatus(result.result.status),
    resultType: toResultType(String(result.result.resultType)),
    ...(typeof signedTransaction === 'string' && signedTransaction !== ''
      ? { signedTransaction }
      : {}),
  };
}

function toStatus(status: ExecuteResultStatus): CircleExecuteStatus {
  switch (status) {
    case ExecuteResultStatus.PENDING:
      return 'pending';
    case ExecuteResultStatus.IN_PROGRESS:
      return 'in-progress';
    case ExecuteResultStatus.COMPLETE:
      return 'complete';
    case ExecuteResultStatus.FAILED:
      return 'failed';
    case ExecuteResultStatus.EXPIRED:
      return 'expired';
    case ExecuteResultStatus.UNKNOWN:
    default:
      return 'unknown';
  }
}

const RAW_SIGN_TRANSACTION = 'SIGN_TRANSACTION';

function toResultType(raw: string): CircleResultType {
  if (raw === RAW_SIGN_TRANSACTION) return 'sign-transaction';

  const declared: readonly string[] = Object.values(ExecuteResultType);

  return isDeclaredResultType(raw, declared) ? fromDeclaredResultType(raw) : 'other';
}

function isDeclaredResultType(raw: string, declared: readonly string[]): raw is ExecuteResultType {
  return declared.includes(raw);
}

function fromDeclaredResultType(resultType: ExecuteResultType): CircleResultType {
  switch (resultType) {
    case ExecuteResultType.INITIALIZE:
      return 'initialize';
    case ExecuteResultType.CREATE_WALLET:
      return 'create-wallet';
    case ExecuteResultType.SET_PIN:
      return 'set-pin';
    case ExecuteResultType.RESTORE_PIN:
      return 'restore-pin';
    case ExecuteResultType.SET_SECURITY_QUESTIONS:
      return 'set-security-questions';
    case ExecuteResultType.CREATE_TRANSACTION:
      return 'create-transaction';
    case ExecuteResultType.SET_BIOMETRICS_PIN:
      return 'set-biometrics-pin';

    case ExecuteResultType.UNKNOWN:
    case ExecuteResultType.ACCELERATE_TRANSACTION:
    case ExecuteResultType.CANCEL_TRANSACTION:
    case ExecuteResultType.CONTRACT_EXECUTION:
    case ExecuteResultType.SIGN_MESSAGE:
    case ExecuteResultType.SIGN_TYPEDDATA:
    case ExecuteResultType.WALLET_UPGRADE:
      return 'other';
  }
}

const CODE = {
  userTokenExpired: '155104',
  invalidUserToken: '155105',
  userWasInitialized: '155106',
  userHasSetPin: '155107',
  incorrectAppId: '155114',
  incorrectUserPin: '155112',
  invalidChallengeId: '155116',
  invalidEncryptionKey: '155118',
  userPinLocked: '155119',
  securityAnswersLocked: '155120',
  userCanceled: '155701',
  launchUiFailed: '155702',
  pinCodeNotMatched: '155703',
  insecurePinCode: '155704',
  networkError: '155706',
  invalidUserTokenFormat: '155718',
  userTokenMismatch: '155719',
} as const;

const BIOMETRICS_FIRST = 155_708;
const BIOMETRICS_LAST = 155_716;

function toErrorOutcome(error: SdkError): Result<CircleChallengeOutcome, AppError> {
  const code = error.code === undefined ? '' : String(error.code);
  const message = error.message ?? '';

  switch (code) {
    case CODE.userCanceled:
      return ok({ type: 'cancelled' });

    case CODE.userWasInitialized:
    case CODE.userHasSetPin:
      return ok({ type: 'settled', status: 'complete', resultType: 'other' });

    case CODE.userPinLocked:
    case CODE.securityAnswersLocked:
      return ok(failed('pin-locked', message));

    case CODE.insecurePinCode:
      return ok(failed('insecure-pin', message));

    case CODE.incorrectUserPin:
    case CODE.pinCodeNotMatched:
      return ok(failed('incorrect-pin', message));

    case CODE.userTokenExpired:
    case CODE.invalidUserToken:
    case CODE.invalidChallengeId:
    case CODE.invalidEncryptionKey:
    case CODE.invalidUserTokenFormat:
      return ok(failed('challenge-invalid', message));

    case CODE.networkError:
      return ok(failed('network', message));

    case CODE.incorrectAppId:
    case CODE.launchUiFailed:
    case CODE.userTokenMismatch:
      return err(unknownError(`Circle SDK could not run [${code}].`));

    default:
      break;
  }

  const numeric = Number(code);
  if (numeric >= BIOMETRICS_FIRST && numeric <= BIOMETRICS_LAST) {
    return ok(failed('biometrics-unavailable', message));
  }

  return ok(failed('unknown', message));
}

function failed(
  reason: Exclude<CircleChallengeOutcome & { type: 'failed' }, never>['reason'],
  rawMessage: string,
): CircleChallengeOutcome {
  return { type: 'failed', reason, message: flattenCircleErrorMessage(rawMessage) ?? rawMessage };
}

function closeScreensOnEveryError(): void {
  WalletSdk.setDismissOnCallbackMap(
    new Map(Object.values(CircleErrorCode).map((code) => [code, true] as const)),
  );
}

function applyBranding(translate: (key: TranslationKey) => string): void {
  WalletSdk.setSecurityQuestions([
    new SecurityQuestion(translate('wallet.securityQuestionFathersMiddleName')),
    new SecurityQuestion(translate('wallet.securityQuestionFavoriteSportsTeam')),
    new SecurityQuestion(translate('wallet.securityQuestionMothersMaidenName')),
    new SecurityQuestion(translate('wallet.securityQuestionFirstPet')),
    new SecurityQuestion(translate('wallet.securityQuestionBirthCity')),
    new SecurityQuestion(translate('wallet.securityQuestionFirstStreet')),
    new SecurityQuestion(translate('wallet.securityQuestionFathersBirthday'), InputType.datePicker),
  ]);

  WalletSdk.setImageMap(
    new Map([
      [ImageKey.securityIntroMain, owegoLogo],
      [ImageKey.securityConfirmMain, owegoLogo],
      [ImageKey.naviBack, backIcon],
      [ImageKey.naviClose, closeIcon],
      [ImageKey.showPin, eyeIcon],
      [ImageKey.hidePin, eyeOffIcon],
      [ImageKey.dropdownArrow, chevronDownIcon],
    ]),
  );

  WalletSdk.setIconTextConfigsMap(
    new Map([
      [
        IconTextsKey.securityConfirmationItems,
        [
          new IconTextConfig(
            numberOneBadge,
            new TextConfig(translate('wallet.securityConfirmOnlyRecovery')),
          ),
          new IconTextConfig(
            numberTwoBadge,
            new TextConfig(translate('wallet.securityConfirmNotStored')),
          ),
          new IconTextConfig(
            numberThreeBadge,
            new TextConfig(translate('wallet.securityConfirmLoseAccess')),
          ),
        ],
      ],
    ]),
  );
}

function subscribeToForgotPin(onForgotPin: (() => void) | undefined): void {
  if (onForgotPin === undefined) return;

  ProgrammablewalletRnSdk.addListener(CIRCLE_PW_ON_EVENT, (event) => {
    if (event.name === ExecuteEvent.forgotPin) onForgotPin();
  });
}
