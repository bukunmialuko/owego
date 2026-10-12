import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { readAppVersion } from '@/core/config/app-version';
import { useResolve } from '@/core/di/container-provider';
import { toKycState } from '@/core/session/onboarding-gate';
import { Card, Screen, ScreenHeader, Text, useContactSupport, VStack } from '@/shared/ui';
import { useChangePin } from './hook/use-change-pin';
import { useStartVerification } from './hook/use-start-verification';
import { useDisplayCurrency } from '@/core/display-currency/use-display-currency';
import { stablecoinHoldings } from '@/core/wallet/stablecoin-holdings';
import { useAvailableBalance } from '@/core/wallet/use-available-balance';
import { useWalletsQuery } from '@/core/wallet/use-wallets-query';
import { useSettingsProfile } from './hook/use-settings';
import { AppearanceSheet } from './widget/appearance-sheet';
import { CurrencySheet } from './widget/currency-sheet';
import { NotificationsSheet } from './widget/notifications-sheet';
import { BalanceSummaryCard } from './widget/balance-summary-card';
import { SignInSecurityRows } from './widget/sign-in-security-rows';
import { ProfileIdentity } from './widget/profile-identity';
import { SettingsRow } from './widget/settings-row';
import { VerificationBadge } from './widget/verification-badge';

const APP_VERSION = readAppVersion();

export function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const [openSheet, setOpenSheet] = useState<
    'appearance' | 'currency' | 'notifications' | undefined
  >();
  const currency = useDisplayCurrency();
  const changePin = useChangePin();
  const signOut = useResolve('signOutUseCase');
  const contactSupport = useContactSupport();
  const verification = useStartVerification();

  const profile = useSettingsProfile();
  const available = useAvailableBalance();
  const stablecoins = useWalletsQuery(stablecoinHoldings);

  const kycState = toKycState(profile.data?.kycState ?? '');
  const canVerify = kycState === 'NOT_STARTED' || kycState === 'REJECTED';

  return (
    <Screen
      scroll
      header={
        <VStack paddingX="lg">
          <ScreenHeader
            title={t('profile.settings')}
            onBack={() => {
              navigation.goBack();
            }}
          />
        </VStack>
      }
    >
      <VStack paddingX="lg" gap="xl">
        <ProfileIdentity
          firstName={profile.data?.firstName ?? ''}
          lastName={profile.data?.lastName ?? ''}
          email={profile.data?.email ?? ''}
          isLoading={profile.isPending}
          onPressEdit={() => {
            navigation.navigate('EditProfile');
          }}
        />

        <BalanceSummaryCard
          total={available.balance}
          tokens={stablecoins.data ?? []}
          isLoading={available.isPending}
          hasFailed={available.isError}
          locale={i18n.language}
        />

        <VStack gap="sm">
          <Text variant="body.s" color="secondary">
            {t('profile.settings')}
          </Text>

          <Card variant="sunken" padding="md" gap="none">
            <SettingsRow
              icon="person-circle-outline"
              title={t('profile.verification')}
              trailingNode={<VerificationBadge state={kycState} />}
              {...(canVerify
                ? {
                    onPress: () => {
                      void verification.start();
                    },
                    hasChevron: true,
                  }
                : {})}
            />
            <SettingsRow
              icon="logo-usd"
              title={t('profile.currency')}
              trailing={currency.code}
              onPress={() => {
                setOpenSheet('currency');
              }}
            />
            <SettingsRow
              icon="sunny-outline"
              title={t('profile.appearance')}
              onPress={() => {
                setOpenSheet('appearance');
              }}
            />
            <SettingsRow
              icon="notifications-outline"
              title={t('profile.notifications')}
              onPress={() => {
                setOpenSheet('notifications');
              }}
            />
            <SettingsRow
              icon="lock-closed-outline"
              title={t('profile.changePin')}
              onPress={() => {
                void changePin.start();
              }}
            />

            <SignInSecurityRows />
          </Card>
        </VStack>

        <VStack gap="sm">
          <Text variant="body.s" color="secondary">
            {t('profile.moreOptions')}
          </Text>

          <Card variant="sunken" padding="md" gap="none">
            <SettingsRow
              icon="mail-outline"
              title={t('common.sendEmail')}
              onPress={() => {
                void contactSupport();
              }}
            />
            <SettingsRow
              icon="log-out-outline"
              title={t('profile.signOut')}
              onPress={() => {
                void signOut.execute();
              }}
            />
            <SettingsRow
              icon="trash-outline"
              title={t('profile.deleteAccount')}
              onPress={() => {
                navigation.navigate('DeleteAccount');
              }}
            />
          </Card>
        </VStack>

        <Text variant="mono.s" color="tertiary" align="center">
          {t('profile.version', { version: APP_VERSION.version, build: APP_VERSION.build })}
        </Text>
      </VStack>

      <AppearanceSheet
        isOpen={openSheet === 'appearance'}
        onClose={() => {
          setOpenSheet(undefined);
        }}
      />

      <CurrencySheet
        isOpen={openSheet === 'currency'}
        onClose={() => {
          setOpenSheet(undefined);
        }}
      />

      <NotificationsSheet
        isOpen={openSheet === 'notifications'}
        onClose={() => {
          setOpenSheet(undefined);
        }}
      />
    </Screen>
  );
}
