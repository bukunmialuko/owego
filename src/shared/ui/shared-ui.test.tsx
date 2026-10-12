import { screen, userEvent, within } from '@testing-library/react-native';
import { Dimensions, StyleSheet, Text, View, processColor, type ViewStyle } from 'react-native';
import { darkTheme, lightTheme, typography } from '@/core/design-system';
import { renderWithProviders } from '@/test/render-with-providers';
import { ActionSheet, type ActionSheetItem } from './action-sheet';
import { Avatar } from './avatar';
import { BottomSheet } from './bottom-sheet';
import { Button } from './button';
import { DetailList } from './detail-list';
import { EmptyState } from './empty-state';
import { ListRow } from './list-row';
import { Calendar } from './calendar';
import { ChoiceRow } from './choice-row';
import { CountryFlag } from './country-flag';
import { ProgressBar } from './progress-bar';
import { QrCode } from './qr-code';
import { SelectField } from './select-field';
import { ProgressRing } from './progress-ring';
import { ScreenHeader } from './screen-header';
import { Stepper } from './stepper';
import { Switch } from './switch';
import { SegmentedControl } from './segmented-control';
import { TransactionRow, TransactionRowPlaceholder } from './transaction-row';

jest.useFakeTimers();

describe('Button', () => {
  it('calls back when pressed', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await renderWithProviders(<Button label="Continue" onPress={onPress} />);

    await user.press(await screen.findByRole('button', { name: 'Continue' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does nothing while disabled', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await renderWithProviders(<Button label="Continue" onPress={onPress} disabled />);

    await user.press(await screen.findByRole('button', { name: 'Continue' }));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('does nothing while loading', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await renderWithProviders(<Button label="Continue" onPress={onPress} isLoading />);

    await user.press(await screen.findByRole('button'));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('announces its busy and disabled state', async () => {
    await renderWithProviders(<Button label="Continue" onPress={jest.fn()} isLoading />);

    const button = await screen.findByRole('button');
    expect(button).toBeBusy();
    expect(button).toBeDisabled();
  });

  it('dims its icon with its label while disabled', async () => {
    await renderWithProviders(
      <Button label="Continue" icon="arrow-forward" onPress={jest.fn()} disabled />,
    );

    const label = await screen.findByText('Continue');
    const [glyph] = label.parent?.children ?? [];
    if (typeof glyph === 'string' || glyph === undefined) throw new Error('no glyph');

    expect(label).toHaveStyle({ color: lightTheme.color.textDisabled });
    expect(glyph).toHaveStyle({ color: lightTheme.color.iconDisabled });
  });

  it.each([
    ['light', lightTheme],
    ['dark', darkTheme],
  ] as const)('draws the dark variant legibly in %s mode', async (mode, theme) => {
    await renderWithProviders(<Button label="Learn more" variant="dark" onPress={jest.fn()} />, {
      theme: mode,
    });

    expect(await screen.findByRole('button', { name: 'Learn more' })).toHaveStyle({
      backgroundColor: theme.color.fillActionElevated,
    });
    expect(screen.getByText('Learn more')).toHaveStyle({
      color: theme.color.iconOnActionElevated,
    });
  });
});

describe('ListRow', () => {
  it('announces title, subtitle and trailing value as one label', async () => {
    await renderWithProviders(
      <ListRow title="Solana" subtitle="SOL" trailing="1 - 2 min · 1% fee" onPress={jest.fn()} />,
    );

    expect(
      await screen.findByRole('button', { name: 'Solana, SOL, 1 - 2 min · 1% fee' }),
    ).toBeOnTheScreen();
  });

  it('is not a button without a press handler', async () => {
    await renderWithProviders(<ListRow title="Solana" />);

    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  });

  it('does not call back while disabled', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await renderWithProviders(<ListRow title="Thai Baht" onPress={onPress} disabled />);

    await user.press(await screen.findByRole('button', { name: 'Thai Baht' }));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders a trailing node in place of a trailing string', async () => {
    await renderWithProviders(
      <ListRow title="Verification" trailingNode={<Text>Completed</Text>} onPress={jest.fn()} />,
    );

    expect(await screen.findByText('Completed')).toBeOnTheScreen();
  });

  it('leaves a trailing control pressable on its own', async () => {
    const user = userEvent.setup();
    const onRowPress = jest.fn();
    const onSwitch = jest.fn();

    await renderWithProviders(
      <ListRow
        title="Biometric sign-in"
        onPress={onRowPress}
        trailingNode={<Switch checked={false} onChange={onSwitch} label="Biometric sign-in" />}
      />,
    );

    await user.press(await screen.findByRole('switch', { name: 'Biometric sign-in' }));

    expect(onSwitch).toHaveBeenCalledWith(true);
    expect(onRowPress).not.toHaveBeenCalled();
  });
});

describe('BottomSheet', () => {
  it('renders its content when open', async () => {
    await renderWithProviders(
      <BottomSheet isOpen title="Select network" closeLabel="Close" onClose={jest.fn()}>
        <Text>Solana</Text>
      </BottomSheet>,
    );

    expect(await screen.findByRole('header', { name: 'Select network' })).toBeOnTheScreen();
    expect(await screen.findByText('Solana')).toBeOnTheScreen();
  });

  it('renders nothing when closed', async () => {
    await renderWithProviders(
      <BottomSheet isOpen={false} closeLabel="Close" onClose={jest.fn()}>
        <Text>Solana</Text>
      </BottomSheet>,
    );

    expect(screen.queryByText('Solana')).not.toBeOnTheScreen();
  });

  it('closes when the scrim is pressed', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    await renderWithProviders(
      <BottomSheet isOpen closeLabel="Close" onClose={onClose}>
        <Text>Solana</Text>
      </BottomSheet>,
    );

    await user.press(await screen.findByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('BottomSheet close button', () => {
  it('is absent unless asked for, so the scrim stays the only way out', async () => {
    await renderWithProviders(
      <BottomSheet isOpen title="Select Balance" closeLabel="Close" onClose={jest.fn()}>
        <Text>USDC</Text>
      </BottomSheet>,
    );

    expect(await screen.findAllByRole('button', { name: 'Close' })).toHaveLength(1);
  });

  it('closes from the button as well as the scrim', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    await renderWithProviders(
      <BottomSheet
        isOpen
        title="Select Balance"
        closeLabel="Close"
        onClose={onClose}
        hasCloseButton
      >
        <Text>USDC</Text>
      </BottomSheet>,
    );

    const controls = await screen.findAllByRole('button', { name: 'Close' });
    expect(controls).toHaveLength(2);

    await user.press(controls[1]!);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('ActionSheet', () => {
  const items: ActionSheetItem[] = [
    {
      id: 'receive',
      title: 'Receive money',
      description: 'Add funds from another wallet',
      icon: 'arrow-down' as const,
      tone: 'success' as const,
    },
    {
      id: 'cards',
      title: 'Virtual cards',
      description: 'Spend online anywhere',
      icon: 'card-outline' as const,
      tone: 'error' as const,
      disabled: true,
    },
  ];

  it('announces each action as its title and description together', async () => {
    await renderWithProviders(
      <ActionSheet
        isOpen
        items={items}
        closeLabel="Close"
        onClose={jest.fn()}
        onSelect={jest.fn()}
      />,
    );

    expect(
      await screen.findByRole('button', { name: 'Receive money, Add funds from another wallet' }),
    ).toBeTruthy();
  });

  it('does not act on an action that has nowhere to go', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    await renderWithProviders(
      <ActionSheet
        isOpen
        items={items}
        closeLabel="Close"
        onClose={jest.fn()}
        onSelect={onSelect}
      />,
    );

    await user.press(await screen.findByRole('button', { name: /Virtual cards/ }));

    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Virtual cards/ })).toBeDisabled();
  });

  it('renders nothing when closed', async () => {
    await renderWithProviders(
      <ActionSheet
        isOpen={false}
        items={items}
        closeLabel="Close"
        onClose={jest.fn()}
        onSelect={jest.fn()}
      />,
    );

    expect(screen.queryByText('Receive money')).toBeNull();
  });

  it.each([
    ['light', lightTheme],
    ['dark', darkTheme],
  ] as const)('follows the app theme in %s mode', async (mode, theme) => {
    await renderWithProviders(
      <ActionSheet
        isOpen
        items={items}
        closeLabel="Close"
        onClose={jest.fn()}
        onSelect={jest.fn()}
      />,
      { theme: mode },
    );

    expect(await screen.findByTestId('quick-actions-panel')).toHaveStyle({
      backgroundColor: theme.color.bgCanvas,
    });
    expect(screen.getByText('Receive money')).toHaveStyle({ color: theme.color.textPrimary });
    expect(screen.getByTestId('quick-actions-close')).toHaveStyle({
      backgroundColor: theme.color.fillOnTint,
    });
  });

  it('draws a design-exported glyph in place of the icon name', async () => {
    function Gift() {
      return <View testID="gift-glyph" />;
    }

    await renderWithProviders(
      <ActionSheet
        isOpen
        items={[
          {
            id: 'refer',
            title: 'Refer & earn',
            description: 'Invite friends and earn rewards',
            glyph: Gift,
            tone: 'brand',
          },
        ]}
        closeLabel="Close"
        onClose={jest.fn()}
        onSelect={jest.fn()}
      />,
    );

    expect(screen.getByTestId('gift-glyph', { includeHiddenElements: true })).toBeOnTheScreen();
  });
});

describe('DetailList', () => {
  it('renders each label and value', async () => {
    await renderWithProviders(
      <DetailList
        items={[
          { label: 'Fee', value: '$0.25', secondaryValue: '£0.19' },
          { label: 'Recipient gets', value: '$14.75' },
        ]}
      />,
    );

    expect(await screen.findByLabelText('Fee, $0.25')).toBeOnTheScreen();
    expect(await screen.findByLabelText('Recipient gets, $14.75')).toBeOnTheScreen();
  });

  it('shows the second currency alongside the first', async () => {
    await renderWithProviders(
      <DetailList
        items={[{ label: 'Total amount paid', value: '$15', secondaryValue: '£11.15' }]}
      />,
    );

    expect(await screen.findByText(/£11\.15/)).toBeOnTheScreen();
  });

  it('draws a payment breakdown at the designed size', async () => {
    await renderWithProviders(
      <DetailList size="m" items={[{ label: 'Fee', value: '$0.25', emphasis: true }]} />,
    );

    expect(await screen.findByText('Fee')).toHaveStyle({ fontSize: 16 });
    expect(screen.getByText('$0.25')).toHaveStyle({ fontSize: 16 });
  });

  it('stays compact by default', async () => {
    await renderWithProviders(<DetailList items={[{ label: 'Fee', value: '$0.25' }]} />);

    expect(await screen.findByText('Fee')).toHaveStyle({ fontSize: 14 });
    expect(screen.getByText('$0.25')).toHaveStyle({ fontSize: 14 });
  });

  describe('a row with an action', () => {
    const ID = '1012875124998468061206884765';

    it('offers the action as its own control and runs it', async () => {
      const onPress = jest.fn();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      await renderWithProviders(
        <DetailList
          items={[
            {
              label: 'Transaction ID',
              value: ID,
              truncate: true,
              action: { icon: 'copy', label: 'Copy transaction ID', onPress },
            },
          ]}
        />,
      );

      await user.press(await screen.findByRole('button', { name: 'Copy transaction ID' }));

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('still reads its label and value as one', async () => {
      await renderWithProviders(
        <DetailList
          items={[
            {
              label: 'Transaction ID',
              value: ID,
              action: { icon: 'copy', label: 'Copy transaction ID', onPress: jest.fn() },
            },
          ]}
        />,
      );

      expect(await screen.findByLabelText(`Transaction ID, ${ID}`)).toBeOnTheScreen();
    });

    it('keeps a truncated value to one line', async () => {
      await renderWithProviders(
        <DetailList items={[{ label: 'Transaction ID', value: ID, truncate: true }]} />,
      );

      expect(await screen.findByText(ID)).toHaveProp('numberOfLines', 1);
    });
  });
});

describe('EmptyState', () => {
  it('reads as information rather than an error', async () => {
    await renderWithProviders(
      <EmptyState title="You haven’t taken a loan yet" description="Once you take a loan…" />,
    );

    expect(await screen.findByLabelText('You haven’t taken a loan yet')).toBeOnTheScreen();
  });
});

describe('ProgressBar', () => {
  it('announces a value rather than reading as decoration', async () => {
    await renderWithProviders(
      <ProgressBar value={0.72} tone="success" accessibilityLabel="Credit score" />,
    );

    const bar = await screen.findByRole('progressbar', { name: 'Credit score' });
    expect(bar).toHaveAccessibilityValue({ min: 0, max: 100, now: 72 });
  });

  it('clamps a value outside the range', async () => {
    await renderWithProviders(<ProgressBar value={1.4} accessibilityLabel="Amount repaid" />);

    expect(await screen.findByRole('progressbar')).toHaveAccessibilityValue({
      min: 0,
      max: 100,
      now: 100,
    });
  });
});

describe('SegmentedControl', () => {
  const segments = [
    { id: 'active' as const, label: 'Active loan' },
    { id: 'history' as const, label: 'Loan history' },
  ];

  it('reads as a tab list, not as two buttons', async () => {
    await renderWithProviders(
      <SegmentedControl segments={segments} activeId="active" onSelect={jest.fn()} />,
    );

    expect(await screen.findByRole('tab', { name: 'Active loan' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Loan history' })).not.toBeSelected();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('stays a tab list at its compact size', async () => {
    await renderWithProviders(
      <SegmentedControl segments={segments} activeId="active" onSelect={jest.fn()} size="sm" />,
    );

    expect(await screen.findByRole('tab', { name: 'Active loan' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Loan history' })).not.toBeSelected();
  });

  it('reports the segment that was chosen', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    await renderWithProviders(
      <SegmentedControl segments={segments} activeId="active" onSelect={onSelect} />,
    );

    await user.press(await screen.findByRole('tab', { name: 'Loan history' }));

    expect(onSelect).toHaveBeenCalledWith('history');
  });
});

describe('TransactionRow', () => {
  it('announces what, how much and when as one sentence', async () => {
    await renderWithProviders(
      <TransactionRow title="Loan repayment" subtitle="Today, 23:17" amount="+$50.00" />,
    );

    expect(await screen.findByLabelText('Loan repayment, +$50.00, Today, 23:17')).toBeTruthy();
  });

  it('is not a button when there is nothing behind it', async () => {
    await renderWithProviders(
      <TransactionRow title="Loan collected" subtitle="Today, 23:17" amount="-$50.00" />,
    );

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('calls back when it does lead somewhere', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await renderWithProviders(
      <TransactionRow
        title="Loan repayment"
        subtitle="Today, 23:17"
        amount="+$50.00"
        onPress={onPress}
      />,
    );

    await user.press(await screen.findByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['regular', 'md'],
    ['compact', 'sm'],
  ] as const)('spaces a %s row by its density', async (density, padding) => {
    await renderWithProviders(
      <TransactionRow
        title="Loan repayment"
        subtitle="Today, 23:17"
        amount="+$50.00"
        density={density}
      />,
    );

    const row = await screen.findByLabelText('Loan repayment, +$50.00, Today, 23:17');
    expect(row.children[0]).toHaveStyle({ paddingVertical: lightTheme.spacing[padding] });
  });

  describe('the amount', () => {
    it.each([
      ['incoming', '+$50.00', lightTheme.color.textSuccess],
      ['outgoing', '-$50.00', lightTheme.color.textPrimary],
      ['failed', '-$50.00', lightTheme.color.textError],
    ] as const)('is drawn in its tone when %s', async (amountTone, amount, color) => {
      await renderWithProviders(
        <TransactionRow
          title="Money added via Apple Pay"
          subtitle="Today, 23:17"
          amount={amount}
          amountTone={amountTone}
          isMuted={amountTone === 'failed'}
        />,
      );

      expect(await screen.findByText(amount)).toHaveStyle({ color });
    });

    it('stays in the primary ink when no tone is asked for', async () => {
      await renderWithProviders(
        <TransactionRow title="Loan repayment" subtitle="Today, 23:17" amount="+$50.00" />,
      );

      expect(await screen.findByText('+$50.00')).toHaveStyle({
        color: lightTheme.color.textPrimary,
      });
    });

    it('is drawn back with a muted row that asks for no tone', async () => {
      await renderWithProviders(
        <TransactionRow title="Loan reversed" subtitle="Today, 23:17" amount="-$50.00" isMuted />,
      );

      expect(await screen.findByText('-$50.00')).toHaveStyle({
        color: lightTheme.color.textTertiary,
      });
    });
  });
});

describe('TransactionRowPlaceholder', () => {
  const { size, spacing, typography } = lightTheme;
  const window = Dimensions.get('window');

  afterEach(() => {
    jest.restoreAllMocks();
  });

  async function renderPlaceholder() {
    await renderWithProviders(<TransactionRowPlaceholder />);

    return screen.findByTestId('transaction-row-placeholder');
  }

  it('grows with the text size, as the row’s two lines do', async () => {
    const row = await renderPlaceholder();

    expect(window.fontScale).toBe(2);
    expect(row).toHaveStyle({ paddingVertical: spacing.md });
    expect(row.children[0]).toHaveStyle({
      height:
        (typography['body.mEmphasis'].lineHeight + typography['body.s'].lineHeight) *
          window.fontScale +
        spacing.xxs,
    });
  });

  it('stands in for a compact row at the compact row’s spacing', async () => {
    await renderWithProviders(<TransactionRowPlaceholder density="compact" />);

    expect(
      await screen.findByTestId('transaction-row-placeholder', { includeHiddenElements: true }),
    ).toHaveStyle({ paddingVertical: spacing.sm });
  });

  it('stays as tall as the row’s avatar when the text is set small', async () => {
    jest.spyOn(Dimensions, 'get').mockReturnValue({ ...window, fontScale: 0.8 });

    const row = await renderPlaceholder();

    expect(row.children[0]).toHaveStyle({ height: size.avatar.row });
  });
});

describe('ScreenHeader', () => {
  it('offers only the controls it was given', async () => {
    await renderWithProviders(<ScreenHeader title="Get eSIM" onBack={jest.fn()} />);

    expect(await screen.findByRole('button', { name: 'Back' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  });

  it('carries both when a screen needs both', async () => {
    const user = userEvent.setup();
    const onBack = jest.fn();
    const onClose = jest.fn();
    await renderWithProviders(
      <ScreenHeader title="Review & pay" onBack={onBack} onClose={onClose} />,
    );

    await user.press(await screen.findByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onBack).not.toHaveBeenCalled();
  });

  it('paints its controls on the surface when asked', async () => {
    await renderWithProviders(
      <ScreenHeader title="Refer & earn" onClose={jest.fn()} tone="surface" />,
    );

    expect(await screen.findByRole('button', { name: 'Close' })).toHaveStyle({
      backgroundColor: lightTheme.color.bgSurface,
    });
  });

  it('draws both discs from the dark palette in dark mode', async () => {
    await renderWithProviders(
      <>
        <ScreenHeader title="Credit" onBack={jest.fn()} />
        <ScreenHeader title="Refer & earn" onClose={jest.fn()} tone="surface" />
      </>,
      { theme: 'dark' },
    );

    expect(await screen.findByRole('button', { name: 'Back' })).toHaveStyle({
      backgroundColor: darkTheme.color.fillNeutral,
    });
    expect(screen.getByRole('button', { name: 'Close' })).toHaveStyle({
      backgroundColor: darkTheme.color.bgSurface,
    });
  });
});

describe('Avatar', () => {
  it('draws at most two initials from a name', async () => {
    await renderWithProviders(<Avatar name="Esther Howard" />);

    expect(await screen.findByText('EH')).toBeOnTheScreen();
  });

  it('drops the brand tint when it sits on a white row', async () => {
    await renderWithProviders(<Avatar name="Albert Luna" tint="surface" />);

    expect(await screen.findByText('AL')).toBeOnTheScreen();
  });

  it.each([
    ['light', lightTheme],
    ['dark', darkTheme],
  ] as const)('draws the initials on the subtle neutral disc in %s mode', async (mode, theme) => {
    await renderWithProviders(<Avatar name="Apple Pay" tint="neutralSubtle" />, { theme: mode });

    const initials = await screen.findByText('AP');
    expect(initials.parent).toHaveStyle({ backgroundColor: theme.color.fillNeutralSubtle });
    expect(initials).toHaveStyle({ color: theme.color.textBrand });
  });

  it.each([
    ['incoming', 'plus'],
    ['outgoing', 'minus'],
    ['failed', 'cross'],
    ['credited', 'plus'],
  ] as const)('marks %s with a small %s in the middle of the badge', async (badge, sign) => {
    await renderWithProviders(<Avatar name="Mia Chen" badge={badge} />);

    const disc = await screen.findByTestId('avatar-badge', { includeHiddenElements: true });
    const mark = within(disc).getByTestId(`avatar-badge-${sign}`, { includeHiddenElements: true });
    const { width, borderWidth } = StyleSheet.flatten(disc.props['style']) as ViewStyle;
    const inside = Number(width) - 2 * Number(borderWidth);

    expect(disc).toHaveStyle({ alignItems: 'center', justifyContent: 'center' });
    expect(mark).toHaveProp('width', mark.props['height']);
    expect(Number(mark.props['width'])).toBeLessThan(inside);
    expect(screen.queryByTestId('avatar-badge')).toBeNull();
  });

  it('marks a pending reward differently from a credited one', async () => {
    await renderWithProviders(<Avatar name="Mia Chen" badge="pending" />);

    expect(await screen.findByText('MC')).toBeOnTheScreen();
    expect(screen.queryByTestId('avatar-badge-plus', { includeHiddenElements: true })).toBeNull();
  });

  it.each([
    ['light', lightTheme],
    ['dark', darkTheme],
  ] as const)('draws the outgoing sign legibly in %s mode', async (mode, theme) => {
    await renderWithProviders(<Avatar name="Mia Chen" badge="outgoing" />, { theme: mode });

    const disc = await screen.findByTestId('avatar-badge', { includeHiddenElements: true });
    expect(disc).toHaveStyle({ backgroundColor: theme.color.fillNeutralPressed });
    expect(JSON.stringify(screen.toJSON())).toContain(
      `"payload":${String(processColor(theme.color.iconPrimary))}`,
    );
  });

  it('carries a country flag in the corner', async () => {
    await renderWithProviders(<Avatar name="Hannah Nuggest" badgeCountryCode="gb" />);

    expect(await screen.findByText('HN')).toBeOnTheScreen();
    expect(screen.getByTestId('avatar-flag', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.queryByTestId('avatar-flag')).toBeNull();
  });

  it('draws no flag unless given a country', async () => {
    await renderWithProviders(<Avatar name="Hannah Nuggest" />);

    await screen.findByText('HN');
    expect(screen.queryByTestId('avatar-flag', { includeHiddenElements: true })).toBeNull();
  });

  it('keeps an initial whole when a name starts with an emoji', async () => {
    await renderWithProviders(<Avatar name="😀mile Doe" />);

    expect(await screen.findByText('😀D')).toBeOnTheScreen();
  });

  it('keeps only the first code point of a joined emoji', async () => {
    await renderWithProviders(<Avatar name="👩‍💻 Dev" />);

    expect(await screen.findByText('👩D')).toBeOnTheScreen();
  });

  it('fills the circle with the chosen swatch', async () => {
    await renderWithProviders(<Avatar name="Albert Luna" swatch="coral" />);

    expect((await screen.findByText('AL')).parent).toHaveStyle({
      backgroundColor: lightTheme.color.fillAvatarCoral,
    });
  });

  it('draws dark initials on a light swatch and light initials on a dark one', async () => {
    await renderWithProviders(
      <View>
        <Avatar name="Albert Luna" swatch="coral" />
        <Avatar name="Mia Chen" swatch="violet" />
      </View>,
    );

    expect(await screen.findByText('AL')).toHaveStyle({ color: lightTheme.color.textAvatarDark });
    expect(screen.getByText('MC')).toHaveStyle({ color: lightTheme.color.textAvatarLight });
  });

  it('sets swatch initials in the swatch type', async () => {
    await renderWithProviders(<Avatar name="Albert Luna" size="swatch" swatch="coral" />);

    expect(await screen.findByText('AL')).toHaveStyle({
      fontSize: typography['body.sEmphasis'].fontSize,
    });
    expect(screen.getByText('AL').parent).toHaveStyle({ width: lightTheme.size.avatar.swatch });
  });

  it("keeps the small avatar's initials in the label type", async () => {
    await renderWithProviders(<Avatar name="Albert Luna" size="sm" />);

    expect(await screen.findByText('AL')).toHaveStyle({
      fontSize: typography['label.s'].fontSize,
    });
  });
});

describe('Stepper', () => {
  it('keeps its signs visible against the disc in dark mode', async () => {
    await renderWithProviders(
      <Stepper
        value={2}
        min={1}
        max={9}
        onChange={jest.fn()}
        accessibilityLabel="Travellers"
        decrementLabel="Remove"
        incrementLabel="Add"
      />,
      { theme: 'dark' },
    );

    const disc = await screen.findByRole('button', { name: 'Add' });
    const [glyph] = disc.children;
    if (typeof glyph === 'string' || glyph === undefined) throw new Error('no glyph');

    expect(disc).toHaveStyle({ backgroundColor: darkTheme.color.bgInverse });
    expect(glyph).not.toHaveStyle({ color: darkTheme.color.bgInverse });
    expect(glyph).toHaveStyle({ color: darkTheme.color.textInverse });
  });

  it('is one adjustable control, not two buttons and a number', async () => {
    await renderWithProviders(
      <Stepper
        value={2}
        min={1}
        max={9}
        onChange={jest.fn()}
        accessibilityLabel="Travellers"
        decrementLabel="Remove"
        incrementLabel="Add"
      />,
    );

    expect(await screen.findByLabelText('Travellers')).toHaveAccessibilityValue({
      min: 1,
      max: 9,
      now: 2,
    });
  });

  it('will not go below its floor', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    await renderWithProviders(
      <Stepper
        value={1}
        min={1}
        onChange={onChange}
        accessibilityLabel="Travellers"
        decrementLabel="Remove"
        incrementLabel="Add"
      />,
    );

    const decrement = await screen.findByRole('button', { name: 'Remove' });
    expect(decrement).toBeDisabled();

    await user.press(decrement);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('ProgressRing', () => {
  it('announces its value and prints it too', async () => {
    await renderWithProviders(<ProgressRing value={0.1} accessibilityLabel="10% used" />);

    expect(await screen.findByRole('progressbar', { name: '10% used' })).toHaveAccessibilityValue({
      min: 0,
      max: 100,
      now: 10,
    });
    expect(screen.getByText('10%')).toBeTruthy();
  });
});

describe('ChoiceRow', () => {
  it('is a radio, so choosing one unchooses the rest', async () => {
    await renderWithProviders(
      <ChoiceRow
        title="Deluxe"
        description="Triples medical cover"
        value="$90"
        badgeLabel="Most popular"
        isSelected
        onSelect={jest.fn()}
      />,
    );

    expect(await screen.findByRole('radio', { name: 'Deluxe, Most popular, $90' })).toBeChecked();
  });
});

describe('Calendar', () => {
  it('names each day in full rather than by its number', async () => {
    await renderWithProviders(
      <Calendar
        value="2026-08-14"
        onSelect={jest.fn()}
        locale="en-US"
        previousLabel="Previous month"
        nextLabel="Next month"
      />,
    );

    expect(await screen.findByRole('button', { name: 'August 14, 2026' })).toBeSelected();
  });

  it('disables a day outside the allowed range', async () => {
    await renderWithProviders(
      <Calendar
        value="2026-08-14"
        minDate="2026-08-10"
        onSelect={jest.fn()}
        locale="en-US"
        previousLabel="Previous month"
        nextLabel="Next month"
      />,
    );

    expect(await screen.findByRole('button', { name: 'August 9, 2026' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'August 10, 2026' })).toBeEnabled();
  });

  it('moves between months', async () => {
    const user = userEvent.setup();
    await renderWithProviders(
      <Calendar
        value="2026-08-14"
        onSelect={jest.fn()}
        locale="en-US"
        previousLabel="Previous month"
        nextLabel="Next month"
      />,
    );

    await user.press(await screen.findByRole('button', { name: 'Next month' }));

    expect(await screen.findByRole('button', { name: 'September 1, 2026' })).toBeTruthy();
  });
});

describe('CountryFlag', () => {
  it('is hidden from the screen reader', async () => {
    await renderWithProviders(<CountryFlag code="ke" />);

    expect(screen.queryByLabelText(/Kenya/)).toBeNull();
  });
});

describe('QrCode', () => {
  it('names what the code is for rather than being an unlabelled image', async () => {
    await renderWithProviders(
      <QrCode value="4k3Dyjzvzp8e2X9q" accessibilityLabel="QR code for your Solana address" />,
    );

    expect(
      await screen.findByRole('image', { name: 'QR code for your Solana address' }),
    ).toBeTruthy();
  });

  it('stays dark-on-light in dark mode', async () => {
    await renderWithProviders(<QrCode value="4k3Dyjzvzp8e2X9q" accessibilityLabel="QR code" />, {
      theme: 'dark',
    });

    expect(await screen.findByRole('image', { name: 'QR code' })).toHaveStyle({
      backgroundColor: lightTheme.color.bgSurfaceSunken,
    });
    expect(JSON.stringify(screen.toJSON())).toContain(
      `"payload":${String(processColor(lightTheme.color.textPrimary))}`,
    );
  });
});

describe('SelectField', () => {
  it('reads the same to a screen reader whichever way the label is placed', async () => {
    await renderWithProviders(
      <SelectField
        label="Network"
        value="Solana"
        placeholder="Select a network"
        labelPlacement="inside"
        onPress={jest.fn()}
      />,
    );

    const field = await screen.findByRole('button', { name: 'Network' });
    expect(field).toHaveAccessibilityValue({ text: 'Solana' });
  });

  it('shows the placeholder until something is chosen', async () => {
    await renderWithProviders(
      <SelectField label="Network" placeholder="Select a network" onPress={jest.fn()} />,
    );

    expect(await screen.findByText('Select a network')).toBeTruthy();
  });

  it('announces a validation error', async () => {
    await renderWithProviders(
      <SelectField
        label="Network"
        placeholder="Select a network"
        errorMessage="Select a network"
        onPress={jest.fn()}
      />,
    );

    expect(await screen.findByRole('alert')).toBeTruthy();
  });
});
