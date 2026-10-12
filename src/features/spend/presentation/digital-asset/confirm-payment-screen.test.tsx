import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { QueryClient } from '@tanstack/react-query';
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { asFunction, asValue, type Resolver } from 'awilix';
import { Text } from 'react-native';
import { offline, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import type { NotSentReason, SendOutcome } from '../../domain/entity/send-outcome';
import type { BeneficiaryRepository } from '../../domain/repository/beneficiary-repository';
import type {
  SavePaidRecipientInput,
  SavePaidRecipientUseCase,
} from '../../domain/usecase/save-paid-recipient-usecase';
import type { SendAssetRequest, SendAssetUseCase } from '../../domain/usecase/send-asset-usecase';
import { walletRecipientFor } from '../../domain/beneficiary/wallet-recipient';
import { toBeneficiary } from '../../domain/beneficiary/to-beneficiary';
import { recipientFor } from '../../domain/corridor/recipient-corridor';
import { cryptoWallet } from '../../domain/corridor/crypto';
import { createPreviewBeneficiaryRepository } from '../../data/repository/preview-beneficiary-repository';
import { ConfirmPaymentScreen } from './confirm-payment-screen';
import type { DigitalAssetParamList } from './digital-asset-param-list';

const Stack = createNativeStackNavigator<DigitalAssetParamList>();

const SOLANA_ADDRESS = 'Axxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx1';

type Answer = Result<SendOutcome, AppError>;

function SuccessProbe({ route }: NativeStackScreenProps<DigitalAssetParamList, 'Success'>) {
  return <Text>{`ended ${route.params.outcome} for ${String(route.params.amountMinor)}`}</Text>;
}

function sendAnswering(answer: Answer | Promise<Answer>) {
  const execute = jest.fn<Promise<Answer>, [SendAssetRequest]>(() => Promise.resolve(answer));
  const useCase: SendAssetUseCase = { execute };

  return { useCase, execute };
}

const PAID = {
  address: SOLANA_ADDRESS,
  tokenSymbol: 'USDC',
  networkCode: 'SOL',
  networkName: 'Solana',
};

function recordingSave() {
  const handed: SavePaidRecipientInput[] = [];
  const useCase: SavePaidRecipientUseCase = {
    execute: (input) => {
      handed.push(input);

      return Promise.resolve(ok({ kind: 'skipped' }));
    },
  };

  return { useCase, handed };
}

function bookWithThisWallet(): BeneficiaryRepository {
  const preview = createPreviewBeneficiaryRepository();
  const saved = toBeneficiary({
    id: 'already',
    fields: recipientFor(
      cryptoWallet,
      { walletTag: 'Main wallet', network: 'SOL', walletAddress: SOLANA_ADDRESS },
      () => '',
    ),
    createdAt: '2026-09-01',
    updatedAt: '2026-09-01',
  });

  return { ...preview, list: () => Promise.resolve(ok([saved])) };
}

async function renderConfirm({
  send = sendAnswering(ok({ type: 'sent' })).useCase,
  save = recordingSave().useCase,
  beneficiaries,
  queryClient,
  sendRegistration,
}: {
  send?: SendAssetUseCase;
  save?: SavePaidRecipientUseCase;
  beneficiaries?: BeneficiaryRepository;
  queryClient?: QueryClient;
  sendRegistration?: Resolver<SendAssetUseCase>;
} = {}) {
  await renderWithProviders(
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="Confirm"
        component={ConfirmPaymentScreen}
        initialParams={{ recipient: PAID, amountMinor: 5_000 }}
      />
      <Stack.Screen name="Success" component={SuccessProbe} />
    </Stack.Navigator>,
    {
      withNavigation: true,
      ...(queryClient === undefined ? {} : { queryClient }),
      container: createTestContainer({
        sendAssetUseCase: sendRegistration ?? asValue(send),
        savePaidRecipientUseCase: asValue(save),
        ...(beneficiaries === undefined ? {} : { beneficiaryRepository: asValue(beneficiaries) }),
      }),
    },
  );
}

async function confirm() {
  const user = userEvent.setup();
  await user.press(await screen.findByRole('button', { name: 'Confirm' }));
  return user;
}

function watchedQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
}

describe('confirming a payment', () => {
  it('lays the payment out as designed, with no fee or rate row', async () => {
    await renderConfirm();

    expect(await screen.findByLabelText('Total amount paid, $50.00')).toBeOnTheScreen();
    expect(screen.getByLabelText('Recipient gets, 50.00 USDC')).toBeOnTheScreen();
    expect(screen.getByLabelText('From, Wallet')).toBeOnTheScreen();
    expect(await screen.findByLabelText('Balance, $5,136.98')).toBeOnTheScreen();
    expect(screen.queryByLabelText(/^Fee/)).not.toBeOnTheScreen();
    expect(screen.queryByLabelText(/^Rate/)).not.toBeOnTheScreen();
  });

  it('draws the breakdown at the size the design does', async () => {
    await renderConfirm();

    expect(await screen.findByText('Total amount paid')).toHaveStyle({ fontSize: 16 });
    expect(screen.getByText('50.00 USDC')).toHaveStyle({ fontSize: 16 });
  });

  it('asks to send exactly the recipient, token, network and amount the payer confirmed', async () => {
    const { useCase, execute } = sendAnswering(ok({ type: 'sent' }));
    await renderConfirm({ send: useCase });

    await confirm();

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith({
      networkCode: 'SOL',
      tokenSymbol: 'USDC',
      destinationAddress: SOLANA_ADDRESS,
      amountMinor: 5_000,
    });
  });

  it.each(['sent', 'processing', 'unconfirmed'] as const)(
    'ends on the result screen when the payment is %s',
    async (type) => {
      await renderConfirm({ send: sendAnswering(ok({ type })).useCase });

      await confirm();

      expect(await screen.findByText(`ended ${type} for 5000`)).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeOnTheScreen();
    },
  );

  it('stays, saying nothing, when the PIN sheet is closed', async () => {
    await renderConfirm({ send: sendAnswering(ok({ type: 'cancelled' })).useCase });

    await confirm();

    expect(await screen.findByRole('button', { name: 'Confirm' })).toBeEnabled();
    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
  });

  it.each<[NotSentReason, RegExp]>([
    ['failed', /Payment could not be completed/],
    ['expired', /expired before it was approved/],
    ['pinLocked', /PIN is locked/],
    ['insufficientBalance', /Insufficient balance/],
    ['invalidRequest', /Payment could not be completed/],
  ])('says why nothing was sent: %s', async (reason, message) => {
    await renderConfirm({ send: sendAnswering(ok({ type: 'notSent', reason })).useCase });

    await confirm();

    expect(await screen.findByRole('alert', { name: message })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeEnabled();
  });

  it('says the payment could not be completed when it never reached the PIN sheet', async () => {
    await renderConfirm({ send: sendAnswering(err(offline())).useCase });

    await confirm();

    expect(
      await screen.findByRole('alert', { name: /Payment could not be completed/ }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeEnabled();
  });

  it('swallows a second press while the first is in flight', async () => {
    let settle: (answer: Answer) => void = () => undefined;
    const held = new Promise<Answer>((resolve) => {
      settle = resolve;
    });
    const { useCase, execute } = sendAnswering(held);
    await renderConfirm({ send: useCase });
    const user = userEvent.setup();

    const button = await screen.findByRole('button', { name: 'Confirm' });
    await user.press(button);
    await user.press(button);

    expect(execute).toHaveBeenCalledTimes(1);
    settle(ok({ type: 'cancelled' }));
  });

  it('offers no way back or out while a send is in flight', async () => {
    let settle: (answer: Answer) => void = () => undefined;
    const held = new Promise<Answer>((resolve) => {
      settle = resolve;
    });
    await renderConfirm({ send: sendAnswering(held).useCase });

    expect(await screen.findAllByRole('button', { name: 'Close' })).not.toHaveLength(0);

    await confirm();

    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeOnTheScreen();
    settle(ok({ type: 'cancelled' }));
    expect(await screen.findAllByRole('button', { name: 'Close' })).not.toHaveLength(0);
  });

  it.each(['sent', 'processing', 'unconfirmed'] as const)(
    'still reaches the result screen when a %s answer lands while the lock is on',
    async (type) => {
      let settle: (answer: Answer) => void = () => undefined;
      const held = new Promise<Answer>((resolve) => {
        settle = resolve;
      });
      await renderConfirm({ send: sendAnswering(held).useCase });

      await confirm();
      expect(screen.queryByRole('button', { name: 'Close' })).not.toBeOnTheScreen();

      settle(ok({ type }));

      expect(await screen.findByText(`ended ${type} for 5000`)).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeOnTheScreen();
    },
  );

  it('resolves the send only when Confirm is pressed', async () => {
    await renderConfirm({
      sendRegistration: asFunction((): SendAssetUseCase => {
        throw new Error('native module missing');
      }),
    });

    expect(await screen.findByRole('header', { name: 'Confirm payment' })).toBeOnTheScreen();

    await confirm();

    expect(
      await screen.findByRole('alert', { name: /Payment could not be completed/ }),
    ).toBeOnTheScreen();
  });

  it('refreshes balances and history once money may have moved', async () => {
    const queryClient = watchedQueryClient();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    await renderConfirm({ send: sendAnswering(ok({ type: 'processing' })).useCase, queryClient });

    await confirm();
    await screen.findByText('ended processing for 5000');

    expect(invalidate).toHaveBeenCalled();
  });

  it('refreshes nothing when nothing was sent', async () => {
    const queryClient = watchedQueryClient();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    await renderConfirm({ send: sendAnswering(ok({ type: 'cancelled' })).useCase, queryClient });

    await confirm();
    await screen.findByRole('button', { name: 'Confirm' });

    expect(invalidate).not.toHaveBeenCalled();
  });
});

describe('saving the wallet', () => {
  const saveSwitch = () => screen.findByRole('switch', { name: 'Save as beneficiary' });

  it('starts with saving switched off', async () => {
    await renderConfirm();

    expect(await saveSwitch()).not.toBeChecked();
  });

  it('asks for a wallet tag before switching saving on', async () => {
    await renderConfirm();
    const user = userEvent.setup();

    await user.press(await saveSwitch());

    expect(await screen.findByText('Add wallet tag')).toBeOnTheScreen();
    expect(await saveSwitch()).not.toBeChecked();
  });

  it('saves the wallet under its tag after the payment', async () => {
    const save = recordingSave();
    await renderConfirm({ save: save.useCase });
    const user = userEvent.setup();

    await user.press(await saveSwitch());
    await user.type(await screen.findByLabelText('Wallet tag'), 'Tunde’s wallet');
    await user.press(screen.getByRole('button', { name: 'Save' }));
    expect(await saveSwitch()).toBeChecked();

    await user.press(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText('ended sent for 5000')).toBeOnTheScreen();
    expect(save.handed).toEqual([
      {
        recipient: walletRecipientFor(PAID, 'Tunde’s wallet'),
        outcome: { type: 'sent' },
        saveAsBeneficiary: true,
      },
    ]);
  });

  it('leaves saving off when the tag sheet is closed', async () => {
    const save = recordingSave();
    await renderConfirm({ save: save.useCase });
    const user = userEvent.setup();

    await user.press(await saveSwitch());
    await user.type(await screen.findByLabelText('Wallet tag'), 'Tunde’s wallet');
    const [scrim] = screen.getAllByRole('button', { name: 'Close' });
    if (scrim === undefined) throw new Error('no way to close the sheet');
    await user.press(scrim);
    expect(await saveSwitch()).not.toBeChecked();

    await user.press(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText('ended sent for 5000')).toBeOnTheScreen();
    expect(save.handed).toEqual([
      expect.objectContaining({ outcome: { type: 'sent' }, saveAsBeneficiary: false }),
    ]);
  });

  it('turns saving off without asking anything', async () => {
    await renderConfirm();
    const user = userEvent.setup();

    await user.press(await saveSwitch());
    await user.type(await screen.findByLabelText('Wallet tag'), 'Main wallet');
    await user.press(screen.getByRole('button', { name: 'Save' }));
    await user.press(await saveSwitch());

    expect(await saveSwitch()).not.toBeChecked();
  });

  it('offers no switch for a wallet already saved', async () => {
    await renderConfirm({ beneficiaries: bookWithThisWallet() });

    expect(await screen.findByLabelText('Total amount paid, $50.00')).toBeOnTheScreen();
    await waitFor(() => {
      expect(screen.queryByRole('switch', { name: 'Save as beneficiary' })).not.toBeOnTheScreen();
    });
  });

  it('hands nothing to save when the payment never reached the PIN sheet', async () => {
    const save = recordingSave();
    await renderConfirm({ send: sendAnswering(err(offline())).useCase, save: save.useCase });

    await confirm();

    expect(
      await screen.findByRole('alert', { name: /Payment could not be completed/ }),
    ).toBeOnTheScreen();
    expect(save.handed).toEqual([]);
  });
});
