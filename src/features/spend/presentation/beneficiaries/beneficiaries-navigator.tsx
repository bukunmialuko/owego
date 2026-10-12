import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AddBankBeneficiaryScreen } from './add-bank-beneficiary-screen';
import { AddBankDetailsScreen } from './add-bank-details-screen';
import { AddMerchantBeneficiaryScreen } from './add-merchant-beneficiary-screen';
import { AddWalletBeneficiaryScreen } from './add-wallet-beneficiary-screen';
import { BeneficiaryDetailsScreen } from './beneficiary-details-screen';
import { BeneficiaryListScreen } from './beneficiary-list-screen';
import { ScanAddressScreen } from './scan-address-screen';
import { ScanMerchantScreen } from './scan-merchant-screen';
import type { BeneficiariesParamList } from './beneficiaries-param-list';

const Stack = createNativeStackNavigator<BeneficiariesParamList>();

export function BeneficiariesNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="List" component={BeneficiaryListScreen} />
      <Stack.Screen name="Details" component={BeneficiaryDetailsScreen} />
      <Stack.Screen name="AddBank" component={AddBankBeneficiaryScreen} />
      <Stack.Screen name="AddBankDetails" component={AddBankDetailsScreen} />
      <Stack.Screen name="AddWallet" component={AddWalletBeneficiaryScreen} />
      <Stack.Screen
        name="ScanAddress"
        component={ScanAddressScreen}
        options={{ presentation: 'fullScreenModal' }}
      />
      <Stack.Screen
        name="ScanMerchant"
        component={ScanMerchantScreen}
        options={{ presentation: 'fullScreenModal' }}
      />
      <Stack.Screen name="AddMerchant" component={AddMerchantBeneficiaryScreen} />
    </Stack.Navigator>
  );
}
