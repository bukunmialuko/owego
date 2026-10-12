import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { useEffect, useRef } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { asValue } from 'awilix';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import { Text } from 'react-native';
import { ok } from '@/core/result/result';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { testAppConfig } from '@/test/test-config';
import type { DepositConfirmation } from '../../domain/entity/external-deposit';
import type { AwaitDepositConfirmationUseCase } from '../../domain/usecase/await-deposit-confirmation-usecase';
import { ExternalWalletDepositResultScreen } from './external-wallet-deposit-result-screen';
import type { ExternalWalletDepositParamList } from './external-wallet-deposit-param-list';

type TestParamList = ExternalWalletDepositParamList & { Home: undefined };

const Stack = createNativeStackNavigator<TestParamList>();

const SIGNATURE =
  '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW';

function homeOpening(params: ExternalWalletDepositParamList['Result']) {
  return function HomeProbe({ navigation }: NativeStackScreenProps<TestParamList, 'Home'>) {
    const opened = useRef(false);
    useEffect(() => {
      if (opened.current) return;
      opened.current = true;
      navigation.navigate('Result', params);
    }, [navigation]);
    return <Text>home</Text>;
  };
}

function confirming(answer: DepositConfirmation | Promise<DepositConfirmation>) {
  const execute = jest.fn((_signature: string) => Promise.resolve(answer).then(ok));
  const useCase: AwaitDepositConfirmationUseCase = { execute };
  return { useCase, execute };
}

function watchedQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
}

async function renderResult({
  signature = SIGNATURE,
  confirmation = confirming('confirmed'),
  queryClient = watchedQueryClient(),
}: {
  signature?: string | null;
  confirmation?: ReturnType<typeof confirming>;
  queryClient?: QueryClient;
} = {}) {
  const container = createTestContainer({
    awaitDepositConfirmationUseCase: asValue(confirmation.useCase),
  });

  await renderWithProviders(
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="Home"
        component={homeOpening({ amountMinor: 1234, tokenSymbol: 'USDC', signature })}
      />
      <Stack.Screen name="Result" component={ExternalWalletDepositResultScreen} />
    </Stack.Navigator>,
    { withNavigation: true, container, queryClient },
  );

  return confirmation;
}

describe('ExternalWalletDepositResultScreen', () => {
  it('shows the amount deposited', async () => {
    await renderResult();

    expect(await screen.findByText('$12.34 USDC')).toBeTruthy();
  });

  it('says the deposit is confirmed once the cluster confirms it, and refreshes the balance', async () => {
    const queryClient = watchedQueryClient();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    const confirmation = await renderResult({ queryClient });

    expect(await screen.findByText('Deposit confirmed')).toBeTruthy();
    expect(confirmation.execute).toHaveBeenCalledWith(SIGNATURE, expect.anything());
    expect(invalidate).toHaveBeenCalled();
  });

  it('says it is confirming while it waits', async () => {
    await renderResult({ confirmation: confirming(new Promise(() => undefined)) });

    expect(await screen.findByText('Confirming on Solana…')).toBeTruthy();
  });

  it('says it was submitted when confirmation took too long', async () => {
    await renderResult({ confirmation: confirming('pending') });

    expect(await screen.findByText('Deposit submitted')).toBeTruthy();
    expect(
      screen.getByText(
        'Your wallet sent it. It can take a few minutes to confirm and show in your balance.',
      ),
    ).toBeTruthy();
  });

  it('says it failed when it landed with an error', async () => {
    await renderResult({ confirmation: confirming('failed') });

    expect(await screen.findByText('Deposit failed')).toBeTruthy();
    expect(
      screen.getByText(
        "The transaction didn't go through, so no USDC left your wallet. The network fee may still have been charged.",
      ),
    ).toBeTruthy();
  });

  it('asks to check the wallet, and watches nothing, when it cannot tell whether it was sent', async () => {
    const confirmation = await renderResult({ signature: null });

    expect(await screen.findByText('Deposit status unknown')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'View on Solscan' })).toBeNull();
    expect(confirmation.execute).not.toHaveBeenCalled();
  });

  it('opens the transaction on Solscan for this cluster', async () => {
    await renderResult();

    await userEvent.setup().press(await screen.findByRole('button', { name: 'View on Solscan' }));

    await waitFor(() => {
      expect(InAppBrowser.open).toHaveBeenCalledWith(
        `https://solscan.io/tx/${SIGNATURE}?cluster=${testAppConfig.solanaCluster}`,
      );
    });
  });

  it('closes the whole flow on Done', async () => {
    await renderResult();

    await userEvent.setup().press(await screen.findByRole('button', { name: 'Done' }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Done' })).toBeNull();
    });
    expect(screen.getByText('home')).toBeTruthy();
  });
});
