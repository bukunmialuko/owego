import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BottomSheet, Button, TextField, VStack } from '@/shared/ui';

type Props = {
  isOpen: boolean;
  title: string;
  label: string;
  placeholder: string;
  onSave: (tag: string) => void;
  onClose: () => void;
};

export function TagSheet({ isOpen, title, label, placeholder, onSave, onClose }: Props) {
  const { t } = useTranslation();
  const [tag, setTag] = useState('');
  const trimmed = tag.trim();

  function save() {
    if (trimmed !== '') onSave(trimmed);
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      title={title}
      closeLabel={t('common.close')}
      onClose={onClose}
      hasCloseButton
      footer={
        <VStack paddingTop="md">
          <Button label={t('common.save')} disabled={trimmed === ''} onPress={save} />
        </VStack>
      }
    >
      <TextField
        label={label}
        labelPlacement="inside"
        placeholder={placeholder}
        value={tag}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="done"
        onChangeText={setTag}
        onSubmitEditing={save}
      />
    </BottomSheet>
  );
}
