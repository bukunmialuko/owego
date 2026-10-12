import { screen, userEvent } from '@testing-library/react-native';
import { darkTheme, lightTheme } from '@/core/design-system';
import { renderWithProviders } from '@/test/render-with-providers';
import { Badge } from './badge';
import { Banner } from './banner';
import { Card } from './card';
import { Text } from './text';
import { TextField } from './text-field';

jest.useFakeTimers();

describe('Text', () => {
  it('resolves a variant into the ramp rather than raw numbers', async () => {
    await renderWithProviders(<Text variant="heading.h1">Available balance</Text>);

    expect(await screen.findByText('Available balance')).toHaveStyle(
      lightTheme.typography['heading.h1'],
    );
  });

  it('resolves a colour name into a token', async () => {
    await renderWithProviders(<Text color="secondary">Available balance</Text>);

    expect(await screen.findByText('Available balance')).toHaveStyle({
      color: lightTheme.color.textSecondary,
    });
  });

  it('announces heading tiers as headers', async () => {
    await renderWithProviders(<Text variant="heading.h3">Transactions</Text>);

    expect(await screen.findByRole('header', { name: 'Transactions' })).toBeTruthy();
  });

  it('leaves body tiers as plain text', async () => {
    await renderWithProviders(<Text variant="body.m">Transactions</Text>);

    expect(screen.queryByRole('header', { name: 'Transactions' })).toBeNull();
  });

  it('caps scaling on the numeric tiers and leaves body text uncapped', async () => {
    await renderWithProviders(
      <>
        <Text variant="numeric.xl">$5,136.98</Text>
        <Text variant="body.m">Deposit</Text>
      </>,
    );

    expect((await screen.findByText('$5,136.98')).props['maxFontSizeMultiplier']).toBe(1.3);
    expect(screen.getByText('Deposit').props['maxFontSizeMultiplier']).toBeUndefined();
  });
});

describe('Card', () => {
  it('paints a surface token, not a hex', async () => {
    await renderWithProviders(
      <Card>
        <Text>Balance</Text>
      </Card>,
    );

    expect((await screen.findByText('Balance')).parent).toBeTruthy();
  });
});

describe('Badge', () => {
  it('carries its meaning in the label, not only the colour', async () => {
    await renderWithProviders(<Badge label="Pending" tone="warning" />);

    expect(await screen.findByText('Pending')).toBeTruthy();
  });

  it('draws the accent glyph in the ink its gold carries, in dark mode too', async () => {
    await renderWithProviders(<Badge label="Reward" tone="accent" icon="gift" />, {
      theme: 'dark',
    });

    const [glyph] = (await screen.findByText('Reward')).parent?.children ?? [];
    if (typeof glyph === 'string' || glyph === undefined) throw new Error('no glyph');

    expect(glyph).toHaveStyle({ color: darkTheme.color.textOnAccent });
  });
});

describe('Banner', () => {
  it('announces itself as an alert', async () => {
    await renderWithProviders(<Banner tone="success" message="Your account has been verified." />);

    expect(await screen.findByRole('alert')).toBeTruthy();
  });

  it('dismisses through a labelled control', async () => {
    const user = userEvent.setup();
    const onDismiss = jest.fn();
    await renderWithProviders(
      <Banner message="Verified" dismissLabel="Close" onDismiss={onDismiss} />,
    );

    await user.press(await screen.findByRole('button', { name: 'Close' }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe('TextField', () => {
  it('is reachable by its label', async () => {
    await renderWithProviders(
      <TextField label="Account number" value="" onChangeText={jest.fn()} />,
    );

    expect(await screen.findByLabelText('Account number')).toBeTruthy();
  });

  it('announces a validation error and drops the hint', async () => {
    await renderWithProviders(
      <TextField
        label="Account number"
        hint="Ten digits"
        errorMessage="Enter a valid account number"
        value=""
        onChangeText={jest.fn()}
      />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid account number');
    expect(screen.queryByText('Ten digits')).toBeNull();
  });

  it('takes the error border rather than the resting one', async () => {
    await renderWithProviders(
      <TextField
        label="Account number"
        errorMessage="Required"
        value=""
        onChangeText={jest.fn()}
      />,
    );

    const input = await screen.findByLabelText('Account number');
    expect(input.parent).toHaveStyle({ borderColor: lightTheme.color.borderError });
  });
});
