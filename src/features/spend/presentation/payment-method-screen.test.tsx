import { useRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { screen, userEvent } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { ok } from '@/core/result/result';
import type { AppStackParamList } from '@/navigation/param-list';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { createPreviewBeneficiaryRepository } from '../data/repository/preview-beneficiary-repository';
import { BLANK_RECIPIENT_FIELDS } from '../domain/entity/beneficiary';
import { buildMerchantCode } from '@/test/qr-payloads';
import { toMerchantBeneficiary } from '../domain/beneficiary/merchant-beneficiary';
import { toBeneficiary } from '../domain/beneficiary/to-beneficiary';
import type { BeneficiaryRepository } from '../domain/repository/beneficiary-repository';
import { PaymentMethodScreen } from './payment-method-screen';

jest.useFakeTimers();

const Stack = createNativeStackNavigator<AppStackParamList>();

const opened: { route: string; params: unknown }[] = [];

function Probe() {
  const route = useRoute();
  opened.push({ route: route.name, params: route.params });

  return null;
}

beforeEach(() => {
  opened.length = 0;
});

function renderScreen(beneficiaryRepository?: BeneficiaryRepository) {
  return renderWithProviders(
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Payment" component={PaymentMethodScreen} />
      <Stack.Screen name="BankTransfer" component={Probe} />
      <Stack.Screen name="SendAsset" component={Probe} />
      <Stack.Screen name="ScanToPay" component={Probe} />
    </Stack.Navigator>,
    {
      withNavigation: true,
      container: createTestContainer(
        beneficiaryRepository === undefined
          ? {}
          : { beneficiaryRepository: asValue(beneficiaryRepository) },
      ),
    },
  );
}

function recentOnly(...records: Parameters<typeof toBeneficiary>[0][]): BeneficiaryRepository {
  return {
    ...createPreviewBeneficiaryRepository(),
    getRecent: () => Promise.resolve(ok(records.map(toBeneficiary))),
  };
}

describe('PaymentMethodScreen', () => {
  it('offers every way to pay, each with its own description', async () => {
    await renderScreen();

    expect(await screen.findByRole('button', { name: /Scan to pay/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Transfer/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Send digital asset/ })).toBeTruthy();
  });

  it('lets a payer reach the scanner', async () => {
    await renderScreen();

    expect(await screen.findByRole('button', { name: /Scan to pay/ })).toBeEnabled();
  });

  it('names the screen for a screen reader', async () => {
    await renderScreen();

    expect(await screen.findByRole('header', { name: 'Make payment' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
  });

  it('puts the close control at the leading edge', async () => {
    await renderScreen();

    const close = await screen.findByRole('button', { name: 'Close' });

    expect(close.parent?.children.indexOf(close)).toBe(0);
  });

  it('lists recent payees with the account they were paid on, masked', async () => {
    await renderScreen();

    expect(
      await screen.findByRole('button', { name: /Jasper Nwosu, Guaranty Trust Bank • \*\*7803/ }),
    ).toBeTruthy();
  });

  it('shows an untagged wallet payee by its truncated address', async () => {
    await renderScreen(
      recentOnly({
        id: 'w1',
        fields: {
          ...BLANK_RECIPIENT_FIELDS,
          bankName: 'BASE',
          accountNumber: '0xb249000000000000000000000000000000003901',
        },
        createdAt: '',
        updatedAt: '',
      }),
    );

    expect(await screen.findByRole('button', { name: /0xb249…3901/ })).toBeTruthy();
  });

  it('shows nothing under recent payments when nobody has been paid', async () => {
    await renderScreen(recentOnly());

    expect(await screen.findByText('Recent payments')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Guaranty Trust Bank/ })).toBeNull();
  });

  it('opens the send form filled in for a payee a form can pay', async () => {
    const user = userEvent.setup();
    await renderScreen();

    await user.press(await screen.findByRole('button', { name: /Jasper Nwosu/ }));

    expect(opened.at(-1)).toEqual({
      route: 'BankTransfer',
      params: {
        screen: 'Recipient',
        params: {
          prefill: {
            currency: 'NGN',
            method: 'bank_transfer',
            values: { bankCode: '058', accountNumber: '0152847803' },
          },
        },
      },
    });
  });

  it('opens the wallet send form for a saved wallet', async () => {
    const user = userEvent.setup();
    await renderScreen();

    await user.press(await screen.findByRole('button', { name: /Nina Alvarez/ }));

    expect(opened.at(-1)).toEqual({
      route: 'SendAsset',
      params: {
        screen: 'Recipient',
        params: {
          prefill: { address: '0xb249000000000000000000000000000000003901', networkCode: 'BASE' },
        },
      },
    });
  });

  it('opens the merchant amount page with the code of a recently paid merchant', async () => {
    const sticker = buildMerchantCode({ merchantName: 'PHO 24' });
    const user = userEvent.setup();
    await renderScreen({
      ...createPreviewBeneficiaryRepository(),
      getRecent: () =>
        Promise.resolve(
          ok([
            toMerchantBeneficiary({
              id: 'm1',
              qrString: sticker,
              createdAt: '2026-10-01T00:00:00Z',
              updatedAt: '2026-10-01T00:00:00Z',
            }),
          ]),
        ),
    });

    await user.press(await screen.findByRole('button', { name: /PHO 24/ }));

    expect(opened.at(-1)).toEqual({
      route: 'BankTransfer',
      params: { screen: 'MerchantAmount', params: { qrString: sticker } },
    });
  });

  it('does not offer a payee no form can pay', async () => {
    await renderScreen();

    expect(await screen.findByRole('button', { name: /Lena Fischer/ })).toBeDisabled();
  });
});
