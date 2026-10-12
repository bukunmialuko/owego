import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  AVATAR_SWATCH_IDS,
  type AvatarAppearance,
  type AvatarSwatchId,
} from '@/core/avatar/avatar-appearance';
import { useAvatarAppearance, useSaveAvatarAppearance } from '@/core/avatar/use-avatar-appearance';
import { useTheme } from '@/core/design-system/theme-provider';
import { Avatar, BottomSheet, Button, HStack, Icon, VStack } from '@/shared/ui';
import { AVATAR_SWATCHES } from '@/core/avatar/avatar-swatches';

type Props = {
  isOpen: boolean;
  name: string;
  onClose: () => void;
};

export function ChangeAvatarSheet({ isOpen, name, onClose }: Props) {
  const { t } = useTranslation();

  return (
    <BottomSheet
      isOpen={isOpen}
      title={t('profile.changeAvatar')}
      closeLabel={t('common.close')}
      onClose={onClose}
      hasCloseButton
    >
      <SwatchPicker name={name} onSaved={onClose} />
    </BottomSheet>
  );
}

function SwatchPicker({ name, onSaved }: { name: string; onSaved: () => void }) {
  const { t } = useTranslation();
  const saved = savedSwatch(useAvatarAppearance());
  const save = useSaveAvatarAppearance();
  const [draft, setDraft] = useState(saved);

  return (
    <VStack gap="xl">
      <HStack wrap>
        {AVATAR_SWATCH_IDS.map((id) => (
          <SwatchOption
            key={id}
            id={id}
            name={name}
            isChecked={id === draft}
            onSelect={() => {
              setDraft(id);
            }}
          />
        ))}
      </HStack>

      <Button
        label={t('common.save')}
        disabled={draft === undefined || draft === saved}
        onPress={() => {
          if (draft === undefined) return;

          save({ kind: 'initials', swatch: draft });
          onSaved();
        }}
      />
    </VStack>
  );
}

function savedSwatch(appearance: AvatarAppearance): AvatarSwatchId | undefined {
  switch (appearance.kind) {
    case 'default':
      return undefined;
    case 'initials':
      return appearance.swatch;
  }
}

function SwatchOption({
  id,
  name,
  isChecked,
  onSelect,
}: {
  id: AvatarSwatchId;
  name: string;
  isChecked: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { swatch, label } = AVATAR_SWATCHES[id];

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={t(label)}
      accessibilityState={{ checked: isChecked }}
      onPress={onSelect}
      style={({ pressed }) => [
        styles.option,
        {
          paddingVertical: theme.spacing.xxs,
          opacity: pressed ? theme.opacity.pressed : theme.opacity.full,
        },
      ]}
    >
      <VStack align="center" gap="xs">
        <View
          style={[
            styles.ring,
            {
              width: theme.size.swatchRing,
              height: theme.size.swatchRing,
              borderRadius: theme.radius.pill,
              borderWidth: theme.borderWidth.thin,
              borderColor: isChecked ? theme.color.borderBrand : 'transparent',
            },
          ]}
        >
          <Avatar name={name} size="swatch" swatch={swatch} />
        </View>

        <View style={{ height: theme.size.icon.xs }}>
          {isChecked && <Icon name="checkmark" size="xs" color="success" />}
        </View>
      </VStack>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: { alignItems: 'center', width: '20%' },
  ring: { alignItems: 'center', justifyContent: 'center' },
});
