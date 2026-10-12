import { useCallback, useMemo } from 'react';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useResolve } from '@/core/di/container-provider';
import type { AppStackParamList } from '@/navigation/param-list';
import { resolveFundingToken } from '../../../domain/asset/funding-token';
import type { SendableToken } from '../../../domain/asset/send-networks';
import type { ScannerHandle } from '../../../domain/port/camera-scanner-port';
import {
  resolveCapturedAccount,
  resolveScanOutcome,
} from '../../../domain/usecase/resolve-scan-outcome-usecase';
import type { CapturedAccount } from '../../../domain/entity/captured-account';
import type { ScanOutcome } from '../../../domain/scan/scan-outcome';
import type { ScannerState } from '../scanner-state';
import { usePayoutFundingOptions } from '../../hook/use-payout-funding-options';
import { useScannerLifecycle } from './use-scanner-lifecycle';

const UNHELD_FALLBACK_TOKEN: SendableToken = 'USDC';

export type ScanToPay = {
  state: ScannerState;
  torch: boolean;
  isCameraActive: boolean;
  handleRef: { current: ScannerHandle | null };
  onCodeScanned: (raw: string) => void;
  onCameraReady: () => void;
  onCameraError: () => void;
  onToggleTorch: () => void;
  onAllowCamera: () => void;
  onCapture: () => void;
  onContinue: () => void;
  onDismiss: () => void;
};

export function useScanToPay(): ScanToPay {
  const navigation = useNavigation<RootNavigation>();
  const chosenToken = useRoute<RouteProp<AppStackParamList, 'ScanToPay'>>().params?.fundingToken;
  const { i18n } = useTranslation();
  const accountCaptureRepository = useResolve('accountCaptureRepository');
  const funding = usePayoutFundingOptions();
  const fundingToken = resolveFundingToken(funding.options, chosenToken) ?? UNHELD_FALLBACK_TOKEN;
  const scanner = useScannerLifecycle({
    resolve: resolveScanOutcome,
    onLeave: (outcome) => {
      navigateTo(navigation, outcome, fundingToken);
    },
  });
  const { state, dispatch, handleRef } = scanner;

  const readAccount = useMutation({
    mutationFn: async (): Promise<CaptureAttempt> => {
      const captured = await handleRef.current?.capture();
      if (captured === undefined || !captured.ok) return { kind: 'notTaken' };

      dispatch({ type: 'captureTaken' });

      const read = await accountCaptureRepository.readAccount(captured.value);
      if (!read.ok || read.value === undefined) return { kind: 'notRead' };

      return { kind: 'read', account: read.value };
    },
  });

  const onCapture = useCallback(() => {
    if (state.kind !== 'scanning' || readAccount.isPending) return;

    dispatch({ type: 'captureRequested' });

    void readAccount.mutateAsync().then((attempt) => {
      const now = Date.now();

      if (attempt.kind === 'notTaken') {
        dispatch({ type: 'captureFailed', now });

        return;
      }

      if (attempt.kind === 'notRead') {
        dispatch({ type: 'readFailed', now });

        return;
      }

      dispatch({ type: 'readSucceeded', outcome: resolveCapturedAccount(attempt.account) });
    });
  }, [dispatch, readAccount, state.kind]);

  return useMemo(
    () => ({
      state,
      torch: scanner.torch,
      isCameraActive: scanner.isCameraActive,
      handleRef,
      onCodeScanned: scanner.onCodeScanned,
      onCameraReady: scanner.onCameraReady,
      onCameraError: scanner.onCameraError,
      onToggleTorch: scanner.onToggleTorch,
      onAllowCamera: scanner.onAllowCamera,
      onCapture,
      onContinue: scanner.onContinue,
      onDismiss: scanner.onDismiss,
      locale: i18n.language,
    }),
    [handleRef, i18n.language, onCapture, scanner, state],
  );
}

type RootNavigation = NavigationProp<ReactNavigation.RootParamList>;

type CaptureAttempt =
  { kind: 'notTaken' } | { kind: 'notRead' } | { kind: 'read'; account: CapturedAccount };

function navigateTo(
  navigation: RootNavigation,
  outcome: ScanOutcome,
  fundingToken: SendableToken,
): void {
  switch (outcome.kind) {
    case 'merchant':
      navigation.navigate('BankTransfer', {
        screen: 'MerchantAmount',
        params: { qrString: outcome.qrString, fundingToken },
      });

      return;

    case 'account':
      navigation.navigate('BankTransfer', {
        screen: 'Amount',
        params: { recipient: outcome.recipient, fundingToken, origin: 'scan' },
      });

      return;

    case 'prefillRecipient':
      navigation.navigate('BankTransfer', {
        screen: 'Recipient',
        params: {
          prefill: {
            currency: outcome.currency,
            values: { ...outcome.values },
            fundingToken,
            origin: 'scan',
          },
        },
      });

      return;

    case 'prefillAddress':
      navigation.navigate('SendAsset', {
        screen: 'Recipient',
        params: {
          prefill: {
            address: outcome.address,
            ...(outcome.networkCode === undefined ? {} : { networkCode: outcome.networkCode }),
            tokenSymbol: fundingToken,
          },
        },
      });

      return;

    case 'unsupported':
      return;
  }
}
