import { useState } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import {
  Banner,
  Button,
  DetailList,
  EmptyState,
  Gradient,
  Screen,
  ScreenHeader,
  Skeleton,
  VStack,
  type DetailItem,
} from '@/shared/ui';
import type { TFunction } from 'i18next';
import type { Beneficiary } from '../../domain/entity/beneficiary';
import type { DetailRow } from '../../domain/corridor/corridor-spec';
import { corridorFor, walletBeneficiaryCorridor } from '../../domain/corridor/registry';
import { bankRows } from '../../domain/corridor/recipient-record';
import { useBeneficiary, useRemoveBeneficiary } from '../hook/use-beneficiaries';
import { usePayAgain } from '../hook/use-pay-again';
import { tabOf } from '../../domain/beneficiary/filter-beneficiaries';
import { merchantDetailRows } from '../../domain/beneficiary/merchant-beneficiary';
import { BeneficiaryCard } from './widget/beneficiary-card';
import { BeneficiaryHero } from './widget/beneficiary-hero';
import { RemoveBeneficiarySheet } from './widget/remove-beneficiary-sheet';
import type { BeneficiariesParamList } from './beneficiaries-param-list';

const HEADER_HEIGHT = 207;

export function BeneficiaryDetailsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<BeneficiariesParamList>>();
  const { beneficiaryId } = useRoute<RouteProp<BeneficiariesParamList, 'Details'>>().params;
  const beneficiary = useBeneficiary(beneficiaryId);
  const remove = useRemoveBeneficiary();
  const [isConfirming, setIsConfirming] = useState(false);
  const payAgain = usePayAgain();

  const loaded = beneficiary.data;
  const pay = loaded === undefined ? undefined : payAgain(loaded);

  function confirmRemoval() {
    if (loaded === undefined || remove.isPending) return;

    remove.mutate(loaded.id, {
      onSuccess: () => {
        setIsConfirming(false);
        navigation.popTo('List', { tab: tabOf(loaded) });
      },
      onError: () => {
        setIsConfirming(false);
      },
    });
  }

  return (
    <Screen
      scroll
      variant="surface"
      backdrop={<Gradient name="referHeader" style={[styles.band, { height: HEADER_HEIGHT }]} />}
      {...(loaded === undefined
        ? {}
        : {
            footer: (
              <VStack gap="sm">
                {pay !== undefined && (
                  <Button
                    label={t('spend.beneficiaries.pay')}
                    disabled={remove.isPending}
                    onPress={pay}
                  />
                )}
                <Button
                  variant="destructive"
                  label={t('spend.beneficiaries.remove')}
                  disabled={remove.isPending}
                  onPress={() => {
                    setIsConfirming(true);
                  }}
                />
              </VStack>
            ),
          })}
    >
      <VStack paddingX="lg" gap="md">
        <ScreenHeader
          title={t('spend.beneficiaries.detailsTitle')}
          tone="surface"
          onBack={() => {
            navigation.goBack();
          }}
        />
      </VStack>

      <BeneficiaryHero />

      <VStack paddingX="lg" gap="xs">
        {remove.isError && (
          <VStack paddingBottom="sm">
            <Banner tone="error" message={t('spend.beneficiaries.removeFailed')} />
          </VStack>
        )}

        {loaded === undefined ? (
          beneficiary.isError ? (
            <EmptyState
              title={t('spend.beneficiaries.detailsUnavailable')}
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  label={t('common.retry')}
                  onPress={() => {
                    void beneficiary.refetch();
                  }}
                />
              }
            />
          ) : (
            <VStack gap="xs" testID="beneficiary-loading">
              <Skeleton height={80} radius="md" />
              <Skeleton height={160} radius="md" />
            </VStack>
          )
        ) : (
          <>
            <BeneficiaryCard beneficiary={loaded} />
            <DetailList items={detailItems(loaded, t)} />
          </>
        )}
      </VStack>

      {loaded !== undefined && (
        <RemoveBeneficiarySheet
          beneficiary={loaded}
          isOpen={isConfirming}
          isRemoving={remove.isPending}
          onConfirm={confirmRemoval}
          onClose={() => {
            setIsConfirming(false);
          }}
        />
      )}
    </Screen>
  );
}

function detailItems(beneficiary: Beneficiary, t: TFunction): DetailItem[] {
  return rowsOf(beneficiary).map((row) => ({
    label: t(row.labelKey),
    value: 'valueKey' in row ? t(row.valueKey) : row.value,
  }));
}

function rowsOf(beneficiary: Beneficiary): readonly DetailRow[] {
  switch (beneficiary.kind) {
    case 'merchant':
      return merchantDetailRows(beneficiary.qrString);

    case 'wallet':
      return (
        walletBeneficiaryCorridor().beneficiary?.details(beneficiary.fields) ??
        bankRows(beneficiary.fields)
      );

    case 'bank': {
      const block =
        beneficiary.corridor === undefined
          ? undefined
          : corridorFor(beneficiary.corridor.currency, beneficiary.corridor.method)?.beneficiary;

      return block?.details(beneficiary.fields) ?? bankRows(beneficiary.fields);
    }
  }
}

const styles = StyleSheet.create({
  band: { left: 0, position: 'absolute', right: 0, top: 0 },
});
