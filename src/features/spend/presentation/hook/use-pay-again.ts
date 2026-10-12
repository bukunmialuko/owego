import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { payAgainDestination } from '../../domain/beneficiary/pay-again';
import type { Beneficiary } from '../../domain/entity/beneficiary';

export function usePayAgain(): (beneficiary: Beneficiary) => (() => void) | undefined {
  const navigation = useNavigation();

  return useCallback(
    (beneficiary) => {
      const destination = payAgainDestination(beneficiary);

      switch (destination.kind) {
        case 'walletSend':
          return () => {
            navigation.navigate('SendAsset', {
              screen: 'Recipient',
              params: { prefill: destination.prefill },
            });
          };
        case 'bankTransfer':
          return () => {
            navigation.navigate('BankTransfer', {
              screen: 'Recipient',
              params: { prefill: destination.prefill },
            });
          };
        case 'merchantPay':
          return () => {
            navigation.navigate('BankTransfer', {
              screen: 'MerchantAmount',
              params: { qrString: destination.qrString },
            });
          };
        case 'details':
          return undefined;
      }
    },
    [navigation],
  );
}
