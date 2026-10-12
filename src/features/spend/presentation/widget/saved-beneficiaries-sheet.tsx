import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AvatarStrip,
  BottomSheet,
  EmptyState,
  HStack,
  Icon,
  Skeleton,
  Text,
  TextField,
  VStack,
  type AvatarTint,
} from '@/shared/ui';
import type { Beneficiary } from '../../domain/entity/beneficiary';
import { searchBeneficiaries } from '../../domain/beneficiary/beneficiary-search';
import type { BeneficiaryTab } from '../../domain/beneficiary/filter-beneficiaries';
import { useBeneficiaryDirectory, useRecentBeneficiaries } from '../hook/use-beneficiaries';
import { BeneficiaryRow } from './beneficiary-row';
import { beneficiaryTitle } from './beneficiary-text';

const QUICK_SEND_LIMIT = 5;

const TINTS: AvatarTint[] = ['brand', 'error', 'success', 'warning', 'neutral'];

type Props = {
  isOpen: boolean;
  kind: BeneficiaryTab;
  canPay: (beneficiary: Beneficiary) => boolean;
  onSelect: (beneficiary: Beneficiary) => void;
  onClose: () => void;
};

export function SavedBeneficiariesSheet({ isOpen, kind, canPay, onSelect, onClose }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const directory = useBeneficiaryDirectory({ enabled: isOpen });
  const recent = useRecentBeneficiaries({ enabled: isOpen });

  const eligible = (beneficiary: Beneficiary) =>
    (kind === 'wallet' ? beneficiary.kind === 'wallet' : beneficiary.kind === 'bank') &&
    canPay(beneficiary);

  const recentPayable = (recent.data ?? []).filter(eligible);
  const quick = (
    query.trim() === '' ? recentPayable : searchBeneficiaries(recentPayable, query)
  ).slice(0, QUICK_SEND_LIMIT);
  const saved = searchBeneficiaries((directory.data ?? []).filter(eligible), query, {
    dedupe: true,
  });

  function choose(beneficiary: Beneficiary) {
    setQuery('');
    onSelect(beneficiary);
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      title={t('spend.savedBeneficiaries')}
      closeLabel={t('common.close')}
      onClose={onClose}
      hasCloseButton
    >
      <TextField
        label={t('spend.searchBeneficiaries')}
        placeholder={t('spend.searchBeneficiaries')}
        value={query}
        onChangeText={setQuery}
        leadingIcon="search"
        isLabelHidden
        shape="pill"
        autoCorrect={false}
        autoCapitalize="none"
      />

      {quick.length > 0 && (
        <VStack gap="sm" paddingTop="md">
          <HStack gap="xs">
            <Icon name="flash" size="sm" color="secondary" />
            <Text variant="body.mMedium" color="secondary">
              {t('spend.quickSend')}
            </Text>
          </HStack>

          <AvatarStrip
            items={quick.map((beneficiary, index) => ({
              id: beneficiary.id,
              label: beneficiaryTitle(beneficiary, t),
              tint: TINTS[index % TINTS.length] ?? 'neutral',
              initialsFor: beneficiaryTitle(beneficiary, t),
            }))}
            onSelect={(id) => {
              const beneficiary = quick.find((candidate) => candidate.id === id);
              if (beneficiary !== undefined) choose(beneficiary);
            }}
          />
        </VStack>
      )}

      <VStack gap="xs" paddingTop="md">
        <Text variant="body.m" color="tertiary">
          {t('spend.beneficiaries.savedHeading')}
        </Text>

        {directory.isPending ? (
          <VStack gap="sm" paddingY="sm">
            <Skeleton height={40} />
            <Skeleton height={40} />
          </VStack>
        ) : saved.length === 0 ? (
          <EmptyState title={t('spend.noBeneficiaries')} />
        ) : (
          saved.map((beneficiary) => (
            <BeneficiaryRow
              key={beneficiary.id}
              beneficiary={beneficiary}
              onPress={() => {
                choose(beneficiary);
              }}
            />
          ))
        )}
      </VStack>
    </BottomSheet>
  );
}
