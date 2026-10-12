import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CHAIN_METADATA } from '@/core/reference-data/chain-metadata';
import { AssetMark, Avatar, Card, HStack, Text, VStack } from '@/shared/ui';
import type { TransactionDirection } from '../../domain/entity/home-entity';
import type { Counterparty } from '../../domain/entity/transaction-detail';

type Props = {
  counterparty: Counterparty;
  direction: TransactionDirection;
};

const SEPARATOR = ' · ';

export function CounterpartyCard({ counterparty, direction }: Props) {
  const { t } = useTranslation();
  const { mark, title, subtitle, spoken } = describe(counterparty);
  const lead = t(direction === 'outgoing' ? 'common.to' : 'common.from');

  return (
    <Card
      variant="sunken"
      radius="md"
      padding="md"
      accessible
      accessibilityRole="text"
      accessibilityLabel={[lead, spoken, subtitle].filter((part) => part !== '').join(', ')}
    >
      <HStack gap="md">
        {mark}

        <VStack gap="xxs" style={styles.body}>
          <Text variant="body.mEmphasis" numberOfLines={1}>
            {title}
          </Text>
          {subtitle !== '' && (
            <Text variant="body.m" color="tertiary" numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </VStack>
      </HStack>
    </Card>
  );
}

type Description = { mark: React.ReactNode; title: string; subtitle: string; spoken: string };

function describe(counterparty: Counterparty): Description {
  switch (counterparty.kind) {
    case 'bank': {
      const flag =
        counterparty.countryCode === undefined
          ? {}
          : { badgeCountryCode: counterparty.countryCode };
      const title = counterparty.name === '' ? counterparty.accountNumber : counterparty.name;
      const subtitle = [
        counterparty.bankName,
        counterparty.name === '' ? '' : counterparty.accountNumber,
      ]
        .filter((part) => part !== '')
        .join(SEPARATOR);

      return {
        mark:
          counterparty.name === '' ? (
            <AssetMark symbol={counterparty.accountNumber} {...flag} />
          ) : (
            <Avatar name={counterparty.name} size="lg" tint="surface" {...flag} />
          ),
        title,
        subtitle,
        spoken: title,
      };
    }
    case 'wallet': {
      const chain = counterparty.network.split('-')[0] ?? '';
      const known = CHAIN_METADATA[chain];

      return {
        mark: (
          <AssetMark
            symbol={counterparty.address}
            {...(known === undefined ? {} : { badgeSymbol: chain })}
          />
        ),
        title: counterparty.address,
        subtitle: known?.name ?? counterparty.network,
        spoken: counterparty.address,
      };
    }
  }
}

const styles = StyleSheet.create({ body: { flexShrink: 1 } });
