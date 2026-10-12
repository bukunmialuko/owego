import { useState } from 'react';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Clipboard from '@react-native-clipboard/clipboard';
import { Pressable } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { z } from 'zod';
import {
  AssetMark,
  Button,
  HStack,
  IconButton,
  Screen,
  ScreenHeader,
  SelectField,
  Text,
  TextField,
  VStack,
} from '@/shared/ui';
import ScanGlyph from '@/assets/icons/scan.svg';
import { resolveFundingToken } from '../../domain/asset/funding-token';
import {
  SEND_NETWORKS,
  defaultSendNetwork,
  isSendableToken,
} from '../../domain/asset/send-networks';
import type { AssetNetwork } from '../../domain/entity/asset-transfer';
import type { Beneficiary } from '../../domain/entity/beneficiary';
import { walletPrefillFor } from '../../domain/beneficiary/prefill';
import { tokenForNetwork } from '../../domain/beneficiary/token-for-network';
import { validateSendAddress } from '../../domain/usecase/validate-send-address-usecase';
import { SavedBeneficiariesSheet } from '../widget/saved-beneficiaries-sheet';
import { TokenPicker } from '../widget/token-picker';
import { useSendableOptions } from './hook/use-sendable-options';
import { SelectAssetNetworkSheet } from './widget/select-asset-network-sheet';
import type { DigitalAssetParamList } from './digital-asset-param-list';

const TAP_SLOP = { top: 12, bottom: 12, left: 8, right: 8 };

const pastedAddressSchema = z.string().trim().min(1).max(128);

export function SendAssetScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<DigitalAssetParamList>>();
  const rootNavigation = useNavigation<NavigationProp<ReactNavigation.RootParamList>>();

  const { prefill } = useRoute<RouteProp<DigitalAssetParamList, 'Recipient'>>().params ?? {};
  const [chosenToken, setChosenToken] = useState(prefill?.tokenSymbol);
  const [network, setNetwork] = useState<AssetNetwork>(() =>
    defaultSendNetwork(prefill?.networkCode),
  );
  const funding = useSendableOptions(network.code);
  const token = resolveFundingToken(funding.options, chosenToken);
  const [address, setAddress] = useState(prefill?.address ?? '');
  const [hasEditedAddress, setHasEditedAddress] = useState(prefill !== undefined);
  const [openSheet, setOpenSheet] = useState<'network' | 'beneficiaries' | undefined>();

  const validation = validateSendAddress(address, network.code);
  const isReady = validation.valid && token !== undefined;

  const addressError =
    hasEditedAddress && !validation.valid
      ? t(validation.messageKey, { network: network.name })
      : undefined;

  function close() {
    setOpenSheet(undefined);
  }

  function apply(beneficiary: Beneficiary) {
    const prefill = walletPrefillFor(beneficiary);
    if (prefill === undefined || beneficiary.kind !== 'wallet') return;

    setAddress(prefill.address);
    setHasEditedAddress(true);
    close();
  }

  return (
    <Screen
      avoidsKeyboard
      footer={
        <Button
          label={t('common.continue')}
          disabled={!isReady}
          onPress={() => {
            if (token === undefined) return;

            navigation.navigate('Amount', {
              recipient: {
                address: address.trim(),
                tokenSymbol: token,
                networkCode: network.code,
                networkName: network.name,
              },
            });
          }}
        />
      }
    >
      <VStack paddingX="lg" gap="lg">
        <ScreenHeader
          title={t('spend.send')}
          align="leading"
          onBack={() => {
            navigation.goBack();
          }}
          trailing={
            <IconButton
              label={t('spend.scanToPay')}
              glyph={ScanGlyph}
              tone="surface"
              color="brand"
              onPress={() => {
                rootNavigation.navigate(
                  'ScanToPay',
                  token === undefined ? undefined : { fundingToken: token },
                );
              }}
            />
          }
        />

        <HStack justify="space-between" align="center" gap="md">
          <TokenPicker
            options={funding.options}
            selected={token}
            isPending={funding.isPending}
            isError={funding.isError}
            onRetry={funding.retry}
            onSelect={setChosenToken}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('spend.savedBeneficiaries')}
            hitSlop={TAP_SLOP}
            onPress={() => {
              setOpenSheet('beneficiaries');
            }}
          >
            <Text variant="body.mEmphasis" color="brand">
              {t('spend.savedBeneficiaries')}
            </Text>
          </Pressable>
        </HStack>

        <SelectField
          label={t('spend.network')}
          value={network.name}
          placeholder={t('spend.networkPlaceholder')}
          labelPlacement="inside"
          isRequired
          leading={<AssetMark symbol={network.code} size="md" />}
          onPress={() => {
            setOpenSheet('network');
          }}
        />

        <TextField
          label={t('spend.walletAddress')}
          placeholder={t('spend.walletAddressPlaceholder')}
          value={address}
          labelPlacement="inside"
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          onChangeText={(next) => {
            setAddress(next);
            setHasEditedAddress(true);
          }}
          {...(addressError === undefined ? {} : { errorMessage: addressError })}
          {...(address === ''
            ? {
                trailingAction: {
                  label: t('common.paste'),
                  onPress: () => {
                    void Clipboard.getString().then((pasted) => {
                      const parsed = pastedAddressSchema.safeParse(pasted);
                      if (!parsed.success) return;

                      setAddress(parsed.data);
                      setHasEditedAddress(true);
                    });
                  },
                },
              }
            : {
                clearLabel: t('spend.clearAddress'),
                onClear: () => {
                  setAddress('');
                },
              })}
        />
      </VStack>

      <SelectAssetNetworkSheet
        isOpen={openSheet === 'network'}
        networks={[...SEND_NETWORKS]}
        selectedCode={network.code}
        onSelect={(selected) => {
          setNetwork(selected);
          if (token !== undefined) {
            const symbol = tokenForNetwork(token, selected.code);
            if (isSendableToken(symbol)) setChosenToken(symbol);
          }
          close();
        }}
        onClose={close}
      />

      <SavedBeneficiariesSheet
        isOpen={openSheet === 'beneficiaries'}
        kind="wallet"
        canPay={(beneficiary) => walletPrefillFor(beneficiary) !== undefined}
        onSelect={apply}
        onClose={close}
      />
    </Screen>
  );
}
