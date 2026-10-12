import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import {
  ThemeProvider,
  useTheme,
  useThemePreference,
  type ThemePreference,
} from '@/core/design-system/theme-provider';
import type { TranslationKey } from '@/core/i18n/translation-key';
import { BottomSheet, HStack, Icon, Text, VStack, useSheetBodyFrame } from '@/shared/ui';
import type { IoniconsIconName } from '@react-native-vector-icons/ionicons';
import AppearancePattern from '@/assets/illustrations/appearance-pattern.svg';
import { useQuickSendPreview } from '../hook/use-quick-send-preview';
import { DashboardPreview } from './dashboard-preview';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const PREVIEW_BALANCE = { major: '$5,136', minor: '.98' };
const PREVIEW_SECONDARY = { label: '£3,817.55', countryCode: 'GB' };
const PREVIEW_NAME = 'Precious';

const PATTERN = { width: 393, height: 533 };

const CHOICES: { id: ThemePreference; label: TranslationKey; icon: IoniconsIconName }[] = [
  { id: 'light', label: 'profile.day', icon: 'sunny' },
  { id: 'dark', label: 'profile.night', icon: 'moon' },
  { id: 'system', label: 'profile.system', icon: 'contrast' },
];

export function AppearanceSheet({ isOpen, onClose }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { preference, setPreference } = useThemePreference();
  const quickSend = useQuickSendPreview();
  const patternHeight = (width * PATTERN.height) / PATTERN.width;

  const [pending, setPending] = useState<ThemePreference>(preference);

  return (
    <BottomSheet
      isOpen={isOpen}
      title={t('profile.appearance')}
      closeLabel={t('common.close')}
      onClose={onClose}
      hasCloseButton
      closeTone="onTint"
      backdrop={
        <View style={[styles.ground, { backgroundColor: theme.color.fillBrandFaint }]}>
          <AppearancePattern testID="appearance-pattern" width={width} height={patternHeight} />
        </View>
      }
      footer={
        <HStack gap="sm" paddingTop="xl" paddingX="xxl" align="flex-start">
          {CHOICES.map((choice) => (
            <AppearanceTile
              key={choice.id}
              label={t(choice.label)}
              icon={choice.icon}
              isSelected={pending === choice.id}
              onSelect={() => {
                setPending(choice.id);
                setPreference(choice.id);
              }}
            />
          ))}
        </HStack>
      }
    >
      <FittedPreview patternHeight={patternHeight}>
        {(maxHeight) => (
          <ThemeProvider initialPreference={pending} key={pending}>
            <DashboardPreview
              name={PREVIEW_NAME}
              balance={PREVIEW_BALANCE}
              secondary={PREVIEW_SECONDARY}
              quickSend={quickSend}
              maxHeight={maxHeight}
            />
          </ThemeProvider>
        )}
      </FittedPreview>
    </BottomSheet>
  );
}

function FittedPreview({
  patternHeight,
  children,
}: {
  patternHeight: number;
  children: (maxHeight: number | undefined) => React.ReactNode;
}) {
  const frame = useSheetBodyFrame();

  return children(
    frame === undefined ? undefined : Math.min(frame.room, patternHeight - frame.top),
  );
}

function AppearanceTile({
  label,
  icon,
  isSelected,
  onSelect,
}: {
  label: string;
  icon: IoniconsIconName;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: isSelected }}
      onPress={onSelect}
      style={styles.tile}
    >
      <VStack gap="sm" align="center">
        <VStack
          align="center"
          justify="center"
          radius="md"
          padding="lg"
          style={[
            styles.swatch,
            {
              backgroundColor: isSelected
                ? theme.color.fillBrandFaint
                : theme.color.fillNeutralSubtle,
              borderColor: isSelected ? theme.color.borderBrandSubtle : 'transparent',
              borderWidth: theme.borderWidth.thin,
            },
          ]}
        >
          <Icon name={icon} size="lg" color={isSelected ? 'onBrandFaint' : 'onNeutralSubtle'} />
        </VStack>

        <Text variant="body.s" color="secondary">
          {label}
        </Text>

        {isSelected && <Icon name="checkmark" size="sm" color="success" />}
      </VStack>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ground: { flex: 1 },
  tile: { flex: 1 },
  swatch: { width: '100%' },
});
