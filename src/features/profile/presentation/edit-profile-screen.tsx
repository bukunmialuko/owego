import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { countryFixture } from '@/core/reference-data/reference-data';
import {
  Banner,
  Button,
  DetailList,
  Screen,
  ScreenHeader,
  Skeleton,
  VStack,
  type DetailItem,
} from '@/shared/ui';
import { useSettingsProfile } from './hook/use-settings';
import { ChangeAvatarSheet } from './widget/change-avatar-sheet';
import { AccountAvatar } from '@/core/avatar/account-avatar';
import type { TFunction } from 'i18next';
import type { SettingsProfile } from '../domain/port/settings-profile-port';

const ABSENT = '—';

export function EditProfileScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const profile = useSettingsProfile();
  const [isAvatarSheetOpen, setAvatarSheetOpen] = useState(false);
  const name = fullName(profile.data);

  return (
    <Screen
      scroll
      footer={
        <Banner
          tone="warning"
          icon="person-circle-outline"
          message={`${t('profile.contactUsHint')} ${t('profile.contactEmail')}`}
        />
      }
    >
      <VStack paddingX="lg">
        <ScreenHeader
          title={t('profile.editProfile')}
          onBack={() => {
            navigation.goBack();
          }}
        />
      </VStack>

      <VStack paddingX="lg" gap="xl">
        <VStack align="center" gap="md" paddingY="lg">
          <AccountAvatar name={name} size="lg" />
          <Button
            variant="secondary"
            size="sm"
            label={t('profile.changeAvatar')}
            onPress={() => {
              setAvatarSheetOpen(true);
            }}
            disabled={name.trim() === ''}
          />
        </VStack>

        {profile.isPending ? (
          <Skeleton width="100%" height={280} />
        ) : (
          <DetailList items={rows(profile.data, t)} />
        )}
      </VStack>

      <ChangeAvatarSheet
        isOpen={isAvatarSheetOpen}
        name={name}
        onClose={() => {
          setAvatarSheetOpen(false);
        }}
      />
    </Screen>
  );
}

function fullName(profile: SettingsProfile | undefined): string {
  return [profile?.firstName, profile?.lastName].filter(Boolean).join(' ');
}

function rows(profile: SettingsProfile | undefined, t: TFunction): DetailItem[] {
  const value = (raw: string | undefined) => (raw === undefined || raw === '' ? ABSENT : raw);

  return [
    { label: t('profile.name'), value: value(fullName(profile)), emphasis: true },
    { label: t('profile.email'), value: value(profile?.email), emphasis: true },
    { label: t('profile.phoneNumber'), value: value(profile?.phone), emphasis: true },
    { label: t('profile.gender'), value: ABSENT, emphasis: true },
    { label: t('profile.dateOfBirth'), value: ABSENT, emphasis: true },
    { label: t('profile.address'), value: ABSENT, emphasis: true },
    { label: t('profile.country'), value: countryName(profile?.country), emphasis: true },
  ];
}

function countryName(code: string | undefined): string {
  if (code === undefined || code === '') return ABSENT;

  const countries = countryFixture.read();
  if (!countries.ok) return code;

  const match = countries.value.find(
    (country) => country.code.toLowerCase() === code.toLowerCase(),
  );

  return match?.name ?? code;
}
