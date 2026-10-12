import { useMemo, useState } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { formatMinor, isCurrencyCode } from '@/core/money/money';
import {
  Banner,
  Button,
  DetailList,
  Screen,
  ScreenHeader,
  VStack,
  type DetailItem,
} from '@/shared/ui';
import {
  merchantDetailRows,
  toMerchantBeneficiary,
} from '../../domain/beneficiary/merchant-beneficiary';
import { resolveSaveableMerchant } from '../../domain/usecase/resolve-saveable-merchant-usecase';
import { useBeneficiaryDirectory, useSaveMerchant } from '../hook/use-beneficiaries';
import { beneficiaryTitle } from '../widget/beneficiary-text';
import { UNSUPPORTED_MESSAGE } from '../scan/unsupported-message';
import type { SaveNotice } from './hook/use-save-and-return';
import { BeneficiaryCard } from './widget/beneficiary-card';
import { SaveNoticeBanner } from './widget/save-notice-banner';
import type { BeneficiariesParamList } from './beneficiaries-param-list';

export function AddMerchantBeneficiaryScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<BeneficiariesParamList>>();
  const { qrString } = useRoute<RouteProp<BeneficiariesParamList, 'AddMerchant'>>().params;
  const resolved = useMemo(() => resolveSaveableMerchant(qrString), [qrString]);

  const [notice, setNotice] = useState<SaveNotice | undefined>(undefined);
  const directory = useBeneficiaryDirectory();
  const save = useSaveMerchant();

  const preview = toMerchantBeneficiary({
    id: 'preview',
    qrString,
    createdAt: '',
    updatedAt: '',
  });

  const items: DetailItem[] =
    resolved.kind === 'merchant'
      ? [
          ...merchantDetailRows(qrString).map((row) => ({
            label: t(row.labelKey),
            value: 'valueKey' in row ? t(row.valueKey) : row.value,
          })),
          {
            label: t('spend.beneficiaries.defaultAmount'),
            value:
              resolved.amountMinor === undefined || !isCurrencyCode(resolved.recipient.currency)
                ? t('spend.beneficiaries.amountAtPayment')
                : formatMinor(resolved.amountMinor, resolved.recipient.currency, i18n.language),
          },
        ]
      : [];

  function submit() {
    if (save.isPending) return;

    setNotice(undefined);
    save.mutate(
      { qrString, existing: directory.data ?? [] },
      {
        onSuccess: (outcome) => {
          switch (outcome.kind) {
            case 'saved':
              navigation.popTo('List', { tab: 'bank' });
              return;
            case 'duplicate':
              setNotice({ kind: 'duplicate', name: beneficiaryTitle(outcome.existing, t) });
              return;
            case 'notSaveable':
              setNotice({ kind: 'failed' });
              return;
          }
        },
        onError: () => {
          setNotice({ kind: 'failed' });
        },
      },
    );
  }

  return (
    <Screen
      avoidsKeyboard
      scroll
      {...(resolved.kind === 'merchant'
        ? {
            footer: (
              <Button
                label={t('spend.beneficiaries.save')}
                disabled={save.isPending}
                isLoading={save.isPending}
                onPress={submit}
              />
            ),
          }
        : {})}
    >
      <VStack paddingX="lg" gap="lg">
        <ScreenHeader
          title={t('spend.beneficiaries.addMerchantTitle')}
          onBack={() => {
            navigation.goBack();
          }}
        />

        {resolved.kind === 'unsupported' ? (
          <Banner
            tone="warning"
            message={t(UNSUPPORTED_MESSAGE[resolved.reason], {
              currency: resolved.currencyName ?? '',
            })}
          />
        ) : (
          <>
            <SaveNoticeBanner notice={notice} />

            <BeneficiaryCard beneficiary={preview} />
            <DetailList items={items} />
          </>
        )}
      </VStack>
    </Screen>
  );
}
