import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useResolve } from '@/core/di/container-provider';
import { formatMinor } from '@/core/money/money';
import type { TranslationKey } from '@/core/i18n/translation-key';
import {
  Banner,
  Button,
  Checkbox,
  HStack,
  Icon,
  Screen,
  ScreenHeader,
  Text,
  VStack,
} from '@/shared/ui';
import type { DeletionBlocker } from '../domain/usecase/delete-account-usecase';

const BLOCKER_COPY = {
  funds: {
    title: 'profile.blockerFundsTitle',
    body: 'profile.blockerFundsBody',
    icon: 'cash-outline',
  },
  pending: {
    title: 'profile.blockerPendingTitle',
    body: 'profile.blockerPendingBody',
    icon: 'time-outline',
  },
} as const satisfies Record<
  DeletionBlocker['type'],
  { title: TranslationKey; body: TranslationKey; icon: string }
>;

export function DeleteAccountScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const deleteAccountUseCase = useResolve('deleteAccountUseCase');
  const signOut = useResolve('signOutUseCase');

  const [hasConsented, setConsented] = useState(false);
  const [isBusy, setBusy] = useState(false);
  const [blockers, setBlockers] = useState<DeletionBlocker[] | undefined>();
  const [message, setMessage] = useState<string | undefined>();

  const confirm = useCallback(async () => {
    setBusy(true);
    setMessage(undefined);

    try {
      const result = await deleteAccountUseCase.execute();

      if (!result.ok) {
        setMessage(t(result.error.titleKey));
        return;
      }

      if (result.value.type === 'blocked') {
        setBlockers(result.value.blockers);
        return;
      }

      await signOut.execute();
      navigation.navigate('AccountDeleted');
    } finally {
      setBusy(false);
    }
  }, [deleteAccountUseCase, navigation, signOut, t]);

  const isBlocked = blockers !== undefined && blockers.length > 0;

  return (
    <Screen
      scroll
      footer={
        isBlocked ? undefined : (
          <VStack paddingX="lg" gap="md">
            <HStack gap="md" align="flex-start">
              <Checkbox
                isChecked={hasConsented}
                accessibilityLabel={t('profile.deleteAccountConsent')}
                onChange={setConsented}
              />
              <Text variant="body.s" color="secondary" style={{ flex: 1 }}>
                {t('profile.deleteAccountConsent')}
              </Text>
            </HStack>

            <Button
              variant="secondary"
              label={t('profile.deleteAccountCancel')}
              onPress={() => {
                navigation.goBack();
              }}
            />

            <Button
              variant="destructive"
              label={t('profile.deleteAccountConfirmation')}
              isLoading={isBusy}
              disabled={!hasConsented}
              onPress={() => {
                void confirm();
              }}
            />
          </VStack>
        )
      }
    >
      <VStack paddingX="lg">
        <ScreenHeader
          title={t('profile.deleteAccount')}
          onBack={() => {
            navigation.goBack();
          }}
        />
      </VStack>

      {message !== undefined && <Banner tone="error" message={message} />}

      <VStack paddingX="lg" gap="lg" paddingTop="xl">
        <VStack align="center" gap="md">
          <Icon name="warning" size="xl" color="error" />

          <Text variant="heading.h3" align="center">
            {isBlocked ? t('profile.deletionPausedTitle') : t('profile.deleteAccountTitle')}
          </Text>

          <Text variant="body.m" color="secondary" align="center">
            {isBlocked ? t('profile.deletionPausedBody') : t('profile.deleteAccountDescription')}
          </Text>
        </VStack>

        {isBlocked && (
          <VStack gap="lg" paddingTop="lg">
            {blockers.map((blocker) => (
              <HStack key={blocker.type} gap="md" align="flex-start">
                <Icon name={BLOCKER_COPY[blocker.type].icon} size="md" color="brand" />

                <VStack gap="xxs" style={{ flex: 1 }}>
                  <Text variant="body.mEmphasis">{t(BLOCKER_COPY[blocker.type].title)}</Text>
                  <Text variant="body.s" color="secondary">
                    {t(BLOCKER_COPY[blocker.type].body, {
                      amount: formatMinor(blocker.amountMinor, blocker.currency, i18n.language),
                    })}
                  </Text>
                </VStack>
              </HStack>
            ))}
          </VStack>
        )}
      </VStack>
    </Screen>
  );
}
