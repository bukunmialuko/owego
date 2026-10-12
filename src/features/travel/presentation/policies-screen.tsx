import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CountryFlag,
  EmptyState,
  HStack,
  ProgressRing,
  Screen,
  ScreenHeader,
  SegmentedControl,
  Text,
  VStack,
  type Segment,
} from '@/shared/ui';
import { usedPercent } from '../domain/entity/esim-entity';
import { useInstalledEsims, usePolicies } from './hook/use-travel';
import { TIER_NAME } from './insurance/tier-copy';

type Tab = 'covers' | 'esim';

export function PoliciesScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [tab, setTab] = useState<Tab>('covers');

  const policies = usePolicies();
  const esims = useInstalledEsims();

  const segments: Segment<Tab>[] = [
    { id: 'covers', label: t('travel.covers') },
    { id: 'esim', label: t('travel.myEsim') },
  ];

  return (
    <Screen scroll>
      <VStack paddingX="lg" gap="xl">
        <ScreenHeader
          title={t('travel.myPolicies')}
          onBack={() => {
            navigation.goBack();
          }}
        />

        <SegmentedControl segments={segments} activeId={tab} onSelect={setTab} />

        {tab === 'covers' ? <CoverList /> : <EsimList />}
      </VStack>
    </Screen>
  );

  function CoverList() {
    const list = policies.data ?? [];

    if (list.length === 0) {
      return (
        <EmptyState
          title={t('travel.noPoliciesTitle')}
          description={t('travel.noPoliciesDescription')}
        />
      );
    }

    return (
      <VStack gap="sm">
        {list.map((policy) => (
          <Card key={policy.reference} variant="sunken" radius="pill" padding="md">
            <HStack gap="md">
              <CountryFlag code={policy.trip.destinationCode} />
              <VStack gap="xxs">
                <Text variant="heading.h6">
                  {`${policy.trip.destinationName} ${t('travel.title').toLowerCase()}`}
                </Text>
                <Text variant="body.m" color="tertiary">
                  {`${t(TIER_NAME[policy.tier])} ${t('insurance.coverName')} · ${policy.reference}`}
                </Text>
              </VStack>
            </HStack>
          </Card>
        ))}
      </VStack>
    );
  }

  function EsimList() {
    const list = esims.data ?? [];

    if (list.length === 0) {
      return (
        <EmptyState title={t('travel.noEsimTitle')} description={t('travel.noEsimDescription')} />
      );
    }

    return (
      <VStack gap="sm">
        {list.map((esim) => (
          <Card key={esim.id} variant="sunken" radius="pill" padding="md">
            <HStack gap="md">
              <CountryFlag code={esim.destinationCode} />

              <VStack style={{ flex: 1 }} gap="xxs">
                <Text variant="heading.h6">{esim.destinationName}</Text>
                <Text variant="body.m" color="tertiary">
                  {`${esim.isInstalled ? t('travel.esimInstalled') : t('travel.installLater')} · ${t(
                    'travel.esimSummary',
                    { data: esim.dataLabel, days: esim.durationDays },
                  )}`}
                </Text>
              </VStack>

              <ProgressRing
                value={esim.dataUsedFraction}
                accessibilityLabel={t('travel.dataUsed', { percent: usedPercent(esim) })}
              />
            </HStack>
          </Card>
        ))}
      </VStack>
    );
  }
}
