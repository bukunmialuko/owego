import { useTranslation } from 'react-i18next';
import { Button, Skeleton, Text, VStack } from '@/shared/ui';
import { AccountAvatar } from '@/core/avatar/account-avatar';

type Props = {
  firstName: string;
  lastName: string;
  email: string;
  isLoading: boolean;
  onPressEdit: () => void;
};

export function ProfileIdentity({ firstName, lastName, email, isLoading, onPressEdit }: Props) {
  const { t } = useTranslation();
  const fullName = [firstName, lastName].filter(Boolean).join(' ');

  return (
    <VStack align="center" gap="md" paddingY="lg">
      <AccountAvatar name={fullName} size="lg" />

      {isLoading ? (
        <Skeleton width={180} height={20} />
      ) : (
        <VStack align="center" gap="xxs">
          <Text variant="heading.h4" numberOfLines={1}>
            {fullName}
          </Text>
          <Text variant="body.m" color="secondary" numberOfLines={1}>
            {email}
          </Text>
        </VStack>
      )}

      <Button
        variant="secondary"
        size="sm"
        label={t('profile.editProfile')}
        onPress={onPressEdit}
      />
    </VStack>
  );
}
