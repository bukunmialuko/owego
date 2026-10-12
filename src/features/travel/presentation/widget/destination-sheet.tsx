import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BottomSheet, CountryFlag, ListRow, TextField, VStack } from '@/shared/ui';
import { searchDestinations, type EsimDestination } from '../../domain/entity/esim-entity';
import { useDestinations } from '../hook/use-travel';

type Props = {
  isOpen: boolean;
  onSelect: (destination: EsimDestination) => void;
  onClose: () => void;
};

export function DestinationSheet({ isOpen, onSelect, onClose }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const destinations = useDestinations();

  const matches = searchDestinations(destinations.data ?? [], query).filter(
    (destination) => destination.code !== 'global',
  );

  return (
    <BottomSheet
      isOpen={isOpen}
      title={t('insurance.destination')}
      closeLabel={t('common.close')}
      onClose={onClose}
      hasCloseButton
    >
      <VStack gap="sm">
        <TextField
          label={t('travel.searchCountry')}
          value={query}
          onChangeText={setQuery}
          leadingIcon="search"
        />

        {matches.map((destination) => (
          <ListRow
            key={destination.code}
            title={destination.name}
            leading={<CountryFlag code={destination.code} size="sm" />}
            onPress={() => {
              onSelect(destination);
            }}
          />
        ))}
      </VStack>
    </BottomSheet>
  );
}
