import { NavigationContainer, useRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { screen, userEvent } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { serverError } from '@/core/errors/app-error';
import { err, ok } from '@/core/result/result';
import { Text } from '@/shared/ui';
import { buildMerchantCode, PIX_STATIC_PAYLOAD } from '@/test/qr-payloads';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import type {
  MerchantBeneficiaryRepository,
  MerchantToSave,
} from '../../domain/repository/merchant-beneficiary-repository';
import { AddMerchantBeneficiaryScreen } from './add-merchant-beneficiary-screen';
import type { BeneficiariesParamList } from './beneficiaries-param-list';

jest.useFakeTimers();

const Stack = createNativeStackNavigator<BeneficiariesParamList>();

const opened: { route: string; params: unknown }[] = [];

function Probe() {
  const route = useRoute();
  opened.push({ route: route.name, params: route.params });

  return <Text accessibilityRole="header">{route.name}</Text>;
}

beforeEach(() => {
  opened.length = 0;
});

function merchantSave(answer: 'saved' | 'refused' = 'saved') {
  const handed: MerchantToSave[] = [];
  const repository: MerchantBeneficiaryRepository = {
    save: (merchant) => {
      handed.push(merchant);
      return Promise.resolve(answer === 'saved' ? ok(undefined) : err(serverError(400)));
    },
  };

  return { handed, repository };
}

function renderPreview(qrString: string, save = merchantSave()) {
  return renderWithProviders(
    <NavigationContainer
      initialState={{
        index: 2,
        routes: [
          { name: 'List' },
          { name: 'AddBank' },
          { name: 'AddMerchant', params: { qrString } },
        ],
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="List" component={Probe} />
        <Stack.Screen name="AddBank" component={Probe} />
        <Stack.Screen name="AddMerchant" component={AddMerchantBeneficiaryScreen} />
      </Stack.Navigator>
    </NavigationContainer>,
    { container: createTestContainer({ merchantBeneficiaryRepository: asValue(save.repository) }) },
  );
}

const STICKER = buildMerchantCode({ merchantName: 'PHO 24', merchantCity: 'Hanoi' });

describe('the merchant preview', () => {
  it('shows who the code pays, where, in what currency, and that the amount is typed when paying', async () => {
    await renderPreview(STICKER);

    expect(await screen.findByRole('header', { name: 'Save merchant' })).toBeOnTheScreen();
    expect(screen.getAllByText('PHO 24').length).toBeGreaterThan(0);
    expect(screen.getByText('Hanoi')).toBeOnTheScreen();
    expect(screen.getByText('VND')).toBeOnTheScreen();
    expect(screen.getByText('Entered when paying')).toBeOnTheScreen();
  });

  it('shows the currency of a code in another currency than the one picked', async () => {
    await renderPreview(buildMerchantCode({ currencyNumeric: '608', country: 'PH' }));

    expect(await screen.findByText('PHP')).toBeOnTheScreen();
  });

  it('shows the amount a reusable code carries as its default', async () => {
    await renderPreview(buildMerchantCode({ amount: '45000', initiation: '11' }));

    expect(await screen.findByText('₫45,000')).toBeOnTheScreen();
  });

  it('calls a merchant whose code names nobody "(No merchant name)"', async () => {
    await renderPreview(buildMerchantCode({ merchantName: '' }));

    expect((await screen.findAllByText('(No merchant name)')).length).toBeGreaterThan(0);
  });

  it('refuses a code made for a single payment, and offers nothing to save', async () => {
    await renderPreview(buildMerchantCode({ amount: '45000', initiation: '12' }));

    expect(
      await screen.findByText('This code is for a single payment, so it can’t be saved'),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Save beneficiary' })).not.toBeOnTheScreen();
  });
});

describe('naming and saving the merchant', () => {
  it('asks for no tag, and offers Save straight away', async () => {
    await renderPreview(STICKER);

    expect(await screen.findByRole('button', { name: 'Save beneficiary' })).toBeEnabled();
    expect(screen.queryByLabelText('Merchant tag')).not.toBeOnTheScreen();
  });

  it('keeps the code, and returns to the bank accounts', async () => {
    const save = merchantSave();
    const user = userEvent.setup();
    await renderPreview(STICKER, save);

    await user.press(await screen.findByRole('button', { name: 'Save beneficiary' }));

    expect(await screen.findByRole('header', { name: 'List' })).toBeOnTheScreen();
    expect(opened.at(-1)).toEqual({ route: 'List', params: { tab: 'bank' } });
    expect(save.handed).toEqual([{ qrString: STICKER }]);
  });

  it('says the save failed, and stays, when the server refuses it', async () => {
    const user = userEvent.setup();
    await renderPreview(STICKER, merchantSave('refused'));

    await user.press(await screen.findByRole('button', { name: 'Save beneficiary' }));

    expect(
      await screen.findByText('We couldn’t save this beneficiary. Try again.'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Save merchant' })).toBeOnTheScreen();
  });

  it('names the merchant already saved instead of keeping it twice', async () => {
    const save = merchantSave();
    const user = userEvent.setup();
    await renderPreview(PIX_STATIC_PAYLOAD, save);

    await user.press(await screen.findByRole('button', { name: 'Save beneficiary' }));

    expect(
      await screen.findByText('Fulano de Tal is already saved with these details.'),
    ).toBeOnTheScreen();
    expect(save.handed).toEqual([]);
  });
});
