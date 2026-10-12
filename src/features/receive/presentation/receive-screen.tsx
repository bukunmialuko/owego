import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import {
  AssetMark,
  Banner,
  Chip,
  HStack,
  Screen,
  ScreenHeader,
  SelectField,
  Skeleton,
  VStack,
} from '@/shared/ui';
import { NATIVE_SOLANA_CHAIN, type Chain } from '../domain/entity/receive-entity';
import { useChains, useDepositAddress } from './hook/use-receive';
import { DepositAddressPanel } from './widget/deposit-address-panel';
import { SelectNetworkSheet } from './widget/select-network-sheet';
import { SelectTokenSheet } from './widget/select-token-sheet';

export function ReceiveScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();

  const [token, setToken] = useState('USDC');
  const [chain, setChain] = useState<Chain>(NATIVE_SOLANA_CHAIN);
  const [isNetworkOpen, setIsNetworkOpen] = useState(false);
  const [isTokenOpen, setIsTokenOpen] = useState(false);

  const chains = useChains();
  const address = useDepositAddress(chain.code);

  return (
    <Screen scroll contentStyle={styles.content}>
      <VStack paddingX="lg" gap="lg">
        <ScreenHeader
          title={t('receive.title')}
          align="leading"
          onBack={() => {
            navigation.goBack();
          }}
        />

        <HStack>
          <Chip
            label={token}
            accessibilityLabel={`${t('receive.tokenLabel')}, ${token}`}
            leading={<AssetMark symbol={token} size="sm" />}
            hasChevron
            onPress={() => {
              setIsTokenOpen(true);
            }}
          />
        </HStack>

        <SelectField
          label={t('receive.networkLabel')}
          value={chain.name}
          placeholder={t('receive.networkPlaceholder')}
          labelPlacement="inside"
          isRequired
          leading={<AssetMark symbol={chain.name} size="md" />}
          onPress={() => {
            setIsNetworkOpen(true);
          }}
        />

        <AddressSection />
      </VStack>

      <SelectNetworkSheet
        isOpen={isNetworkOpen}
        chains={chains.data ?? [NATIVE_SOLANA_CHAIN]}
        selectedCode={chain.code}
        onSelect={(selected) => {
          setChain(selected);
          setIsNetworkOpen(false);
          if (!selected.supportedTokens.includes(token)) {
            setToken(selected.supportedTokens[0] ?? 'USDC');
          }
        }}
        onClose={() => {
          setIsNetworkOpen(false);
        }}
      />

      <SelectTokenSheet
        isOpen={isTokenOpen}
        tokens={chain.supportedTokens}
        selectedSymbol={token}
        onSelect={(symbol) => {
          setToken(symbol);
          setIsTokenOpen(false);
        }}
        onClose={() => {
          setIsTokenOpen(false);
        }}
      />
    </Screen>
  );

  function AddressSection() {
    if (address.isPending) {
      return (
        <VStack gap="lg" paddingTop="lg">
          <Skeleton height={220} />
          <Skeleton height={20} />
        </VStack>
      );
    }

    if (address.isError) {
      return <Banner tone="error" message={t('receive.addressUnavailable')} />;
    }

    if (address.data === null || address.data === undefined) {
      return <Banner tone="warning" message={t('receive.addressUnavailable')} />;
    }

    return <DepositAddressPanel chain={chain} token={token} deposit={address.data} />;
  }
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
});
