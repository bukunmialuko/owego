import type { ComponentProps, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, type GestureResponderHandlers } from 'react-native';
import { AmountKeypad } from './amount-keypad';
import { Button } from './button';
import { PasscodeDots } from './passcode-dots';
import { Screen } from './screen';
import { ScreenHeader } from './screen-header';
import { HStack, VStack } from './stack';
import { Text } from './text';

export const PIN_LENGTH = 4;

type Control = { label: string; onPress: () => void };

type Props = {
  title: string;
  subtitle?: string;
  pin: string;
  onChangePin: (next: string) => void;
  message?: string;
  hint?: string;
  helper?: { text: string; linkLabel: string; onLinkPress: () => void };
  submitLabel: string;
  onSubmit: () => void;
  isBusy?: boolean;
  onBack?: () => void;
  action?: Control;
  accessory?: ComponentProps<typeof AmountKeypad>['accessory'];
  panHandlers?: GestureResponderHandlers;
  children?: ReactNode;
};

export function PinEntryLayout({
  title,
  subtitle,
  pin,
  onChangePin,
  message,
  hint,
  helper,
  submitLabel,
  onSubmit,
  isBusy = false,
  onBack,
  action,
  accessory,
  panHandlers,
  children,
}: Props) {
  const { t } = useTranslation();

  return (
    <Screen
      {...(panHandlers === undefined ? {} : { panHandlers })}
      footer={
        <VStack gap="md">
          <Button
            label={submitLabel}
            disabled={pin.length < PIN_LENGTH || isBusy}
            isLoading={isBusy}
            onPress={onSubmit}
          />

          <AmountKeypad
            hasDecimalKey={false}
            {...(accessory === undefined ? {} : { accessory })}
            disabled={isBusy}
            decimalLabel={t('common.decimalPoint')}
            deleteLabel={t('pin.delete')}
            onKey={(key) => {
              if (key === 'delete') {
                onChangePin(pin.slice(0, -1));
                return;
              }
              if (/^\d$/.test(key) && pin.length < PIN_LENGTH) onChangePin(pin + key);
            }}
          />
        </VStack>
      }
    >
      <VStack paddingX="lg" gap="xl" style={{ flex: 1 }}>
        <ScreenHeader
          {...(onBack === undefined ? {} : { onBack })}
          {...(action === undefined
            ? {}
            : {
                trailing: (
                  <Button
                    size="sm"
                    variant="secondary"
                    label={action.label}
                    onPress={action.onPress}
                  />
                ),
              })}
        />

        <VStack gap="sm" align="center">
          <Text variant="heading.h3" align="center">
            {title}
          </Text>
          {subtitle !== undefined && (
            <Text variant="body.m" color="secondary" align="center">
              {subtitle}
            </Text>
          )}
        </VStack>

        <PasscodeDots
          length={PIN_LENGTH}
          filled={pin.length}
          accessibilityLabel={t('pin.progress', { entered: pin.length, length: PIN_LENGTH })}
        />

        <VStack gap="xs" align="center">
          {message !== undefined && (
            <Text variant="body.s" color="error" align="center" accessibilityLiveRegion="polite">
              {message}
            </Text>
          )}
          {hint !== undefined && (
            <Text variant="body.s" color="secondary" align="center">
              {hint}
            </Text>
          )}
        </VStack>

        {helper !== undefined && (
          <HStack gap="xs" justify="center" align="center">
            <Text variant="body.s" color="secondary">
              {helper.text}
            </Text>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={helper.linkLabel}
              onPress={helper.onLinkPress}
              hitSlop={12}
            >
              <Text variant="label.m" color="brand">
                {helper.linkLabel}
              </Text>
            </Pressable>
          </HStack>
        )}
      </VStack>

      {children}
    </Screen>
  );
}
