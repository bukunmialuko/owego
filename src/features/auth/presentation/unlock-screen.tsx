import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSession } from '@/core/session/use-session';
import { BottomSheet, Button, PinEntryLayout, Text, VStack } from '@/shared/ui';
import { useUnlock } from './hook/use-unlock';

export function UnlockScreen() {
  const { t } = useTranslation();
  const { user } = useSession();
  const { message, attemptsLeft, isBusy, offersBiometrics, promptBiometric, submitPin, abandon } =
    useUnlock();
  const [pin, setPin] = useState('');
  const [isResetOpen, setResetOpen] = useState(false);

  const firstName = user?.firstName ?? '';

  return (
    <PinEntryLayout
      title={firstName === '' ? t('auth.unlockTitle') : t('auth.welcomeBack', { firstName })}
      subtitle={t('auth.enterPinToContinue')}
      pin={pin}
      onChangePin={setPin}
      {...(message === undefined ? {} : { message })}
      hint={t('auth.attemptsLeft', { count: attemptsLeft })}
      helper={{
        text: t('auth.forgotPin'),
        linkLabel: t('auth.resetPin'),
        onLinkPress: () => {
          setResetOpen(true);
        },
      }}
      submitLabel={t('common.continue')}
      onSubmit={() => {
        void submitPin(pin);
        setPin('');
      }}
      isBusy={isBusy}
      action={{
        label: t('auth.wrongAccount'),
        onPress: () => {
          void abandon();
        },
      }}
      {...(offersBiometrics
        ? {
            accessory: {
              icon: 'finger-print',
              label: t('auth.retryBiometrics'),
              onPress: () => {
                void promptBiometric();
              },
            },
          }
        : {})}
    >
      <BottomSheet
        isOpen={isResetOpen}
        title={t('auth.resetPinTitle')}
        closeLabel={t('common.close')}
        hasCloseButton
        onClose={() => {
          setResetOpen(false);
        }}
      >
        <VStack gap="lg">
          <Text variant="body.m" color="secondary">
            {t('auth.resetPinBody')}
          </Text>
          <Button
            variant="destructive"
            label={t('auth.resetPinConfirm')}
            onPress={() => {
              setResetOpen(false);
              void abandon();
            }}
          />
          <Button
            variant="secondary"
            label={t('common.cancel')}
            onPress={() => {
              setResetOpen(false);
            }}
          />
        </VStack>
      </BottomSheet>
    </PinEntryLayout>
  );
}
