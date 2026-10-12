import { useState, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import type { SvgProps } from 'react-native-svg';
import {
  BottomSheet,
  Button,
  CountryFlag,
  HStack,
  SelectField,
  Text,
  VStack,
  useIconColor,
} from '@/shared/ui';
import type { TranslationKey } from '@/core/i18n/translation-key';
import DollarCircleGlyph from '@/assets/icons/dollar-circle.svg';
import GlobeGlyph from '@/assets/icons/globe.svg';
import SimCardGlyph from '@/assets/icons/sim-card.svg';
import type { EsimDestination, EsimPlan } from '../../domain/entity/esim-entity';
import { formatTravelPrice } from '../../util/format';
import { PlanPickerSheet } from './plan-picker-sheet';

type Props = {
  isOpen: boolean;
  destination: EsimDestination;
  plans: EsimPlan[];
  isPurchasing: boolean;
  onBuy: (plan: EsimPlan) => void;
  onClose: () => void;
};

const GLYPH_SIZE = 24;

const STEPS: {
  id: string;
  glyph: ComponentType<SvgProps>;
  title: TranslationKey;
  detail?: TranslationKey;
}[] = [
  {
    id: 'buy',
    glyph: DollarCircleGlyph,
    title: 'travel.installStepBuy',
    detail: 'travel.installStepBuyDetail',
  },
  {
    id: 'tap',
    glyph: SimCardGlyph,
    title: 'travel.installStepTap',
    detail: 'travel.installStepTapDetail',
  },
  { id: 'auto', glyph: GlobeGlyph, title: 'travel.installStepAuto' },
];

export function EsimPlanSheet({ isOpen, destination, plans, isPurchasing, onBuy, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const glyphColor = useIconColor('brand');
  const [planId, setPlanId] = useState<string | undefined>(undefined);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const selected = plans.find((plan) => plan.id === planId) ?? plans[0];

  return (
    <BottomSheet isOpen={isOpen} closeLabel={t('common.close')} onClose={onClose} hasCloseButton>
      <VStack align="center" gap="sm" paddingBottom="lg">
        <CountryFlag code={destination.code} size="lg" />
        <Text variant="heading.h4">
          {t('travel.countryEsimTitle', { country: destination.name })}
        </Text>
        <Text variant="body.m" color="secondary" align="center">
          {t('travel.countryEsimSubtitle')}
        </Text>
      </VStack>

      <SelectField
        label={t('travel.dataPlan')}
        value={
          selected === undefined
            ? undefined
            : t('travel.planLabel', { data: selected.dataLabel, days: selected.durationDays })
        }
        placeholder={t('travel.dataPlan')}
        onPress={() => {
          setIsPickerOpen(true);
        }}
      />

      <VStack gap="lg" paddingY="lg">
        <Text variant="body.m" color="secondary">
          {t('travel.howInstallWorks')}
        </Text>

        {STEPS.map(({ id, glyph: Glyph, title, detail }) => (
          <HStack key={id} gap="md" align="flex-start">
            <Glyph width={GLYPH_SIZE} height={GLYPH_SIZE} color={glyphColor} />
            <VStack style={{ flex: 1 }} gap="xxs">
              <Text variant="body.mEmphasis">{t(title)}</Text>
              {detail !== undefined && (
                <Text variant="body.s" color="tertiary">
                  {t(detail)}
                </Text>
              )}
            </VStack>
          </HStack>
        ))}
      </VStack>

      <Button
        label={t('travel.buyFor', {
          price:
            selected === undefined
              ? ''
              : formatTravelPrice(selected.priceMinor, selected.currency, i18n.language),
        })}
        disabled={selected === undefined}
        isLoading={isPurchasing}
        onPress={() => {
          if (selected !== undefined) onBuy(selected);
        }}
      />

      <PlanPickerSheet
        isOpen={isPickerOpen}
        plans={plans}
        selectedId={selected?.id}
        onSelect={(plan) => {
          setPlanId(plan.id);
          setIsPickerOpen(false);
        }}
        onClose={() => {
          setIsPickerOpen(false);
        }}
      />
    </BottomSheet>
  );
}
