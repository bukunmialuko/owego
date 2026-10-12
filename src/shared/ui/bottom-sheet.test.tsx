import { fireEvent, screen, within } from '@testing-library/react-native';
import { StyleSheet, View } from 'react-native';
import { darkTheme, lightTheme } from '@/core/design-system';
import { emitKeyboard } from '@/test/emit-keyboard';
import { renderWithProviders } from '@/test/render-with-providers';
import { Banner } from './banner';
import { BottomSheet, useSheetBodyFrame } from './bottom-sheet';
import { ListRow } from './list-row';
import { Text } from './text';

const TITLE = 'Select country';
const KEYBOARD_HEIGHT = 336;
const BOTTOM_INSET = 34;
const SHEET_PADDING = 16;
const WINDOW_HEIGHT = 1334;
const SHEET_SHARE = 0.8;

const panel = () => screen.getByText(TITLE).parent?.parent;
const frame = () => screen.getByText(TITLE).parent?.parent?.parent;

function renderSheet() {
  return renderWithProviders(
    <BottomSheet isOpen title={TITLE} closeLabel="Close" hasCloseButton onClose={jest.fn()}>
      <ListRow title="United Kingdom" hasChevron onPress={jest.fn()} />
    </BottomSheet>,
  );
}

describe('BottomSheet and the keyboard', () => {
  it('reserves the home-indicator inset while the keyboard is down', async () => {
    await renderSheet();

    expect(panel()).toHaveStyle({ paddingBottom: BOTTOM_INSET + SHEET_PADDING });
  });

  it('holds its content clear of the keyboard when it comes up', async () => {
    await renderSheet();

    await emitKeyboard('keyboardWillShow', KEYBOARD_HEIGHT);

    expect(panel()).toHaveStyle({ paddingBottom: KEYBOARD_HEIGHT + SHEET_PADDING });
  });

  it('settles back onto the home-indicator inset once the keyboard goes', async () => {
    await renderSheet();

    await emitKeyboard('keyboardWillShow', KEYBOARD_HEIGHT);
    await emitKeyboard('keyboardWillHide', 0);

    expect(panel()).toHaveStyle({ paddingBottom: BOTTOM_INSET + SHEET_PADDING });
  });

  it('runs its surface behind the keyboard rather than stopping at its edge', async () => {
    await renderSheet();

    await emitKeyboard('keyboardWillShow', KEYBOARD_HEIGHT);

    expect(StyleSheet.flatten(frame()?.props['style']).paddingBottom).toBeUndefined();
  });

  it('caps itself at its share of the height the keyboard leaves', async () => {
    await renderSheet();

    expect(panel()).toHaveStyle({ maxHeight: WINDOW_HEIGHT * SHEET_SHARE });

    await emitKeyboard('keyboardWillShow', KEYBOARD_HEIGHT);

    expect(panel()).toHaveStyle({
      maxHeight: (WINDOW_HEIGHT - KEYBOARD_HEIGHT) * SHEET_SHARE + KEYBOARD_HEIGHT,
    });
  });

  it('keeps a row selectable on the first tap with the keyboard up', async () => {
    await renderSheet();

    await emitKeyboard('keyboardWillShow', KEYBOARD_HEIGHT);

    const list = screen.getByRole('button', { name: 'United Kingdom' }).parent?.parent;
    expect(list).toHaveProp('keyboardShouldPersistTaps', 'handled');
  });
});

describe('BottomSheet overlay', () => {
  it('draws the overlay inside the modal but outside the panel, where content cannot clip it', async () => {
    await renderWithProviders(
      <BottomSheet
        isOpen
        title={TITLE}
        closeLabel="Close"
        onClose={jest.fn()}
        overlay={<Banner tone="error" message="We couldn’t save that change." />}
      >
        <ListRow title="United Kingdom" hasChevron onPress={jest.fn()} />
      </BottomSheet>,
    );

    expect(screen.getByRole('alert')).toBeOnTheScreen();
    const sheetPanel = panel();
    if (sheetPanel == null) throw new Error('expected the panel');
    expect(within(sheetPanel).queryByRole('alert')).toBeNull();
  });
});

describe('BottomSheet backdrop', () => {
  function renderWithBackdrop() {
    return renderWithProviders(
      <BottomSheet
        isOpen
        title={TITLE}
        closeLabel="Close"
        onClose={jest.fn()}
        backdrop={<View testID="artwork" />}
      >
        <ListRow title="United Kingdom" hasChevron onPress={jest.fn()} />
      </BottomSheet>,
    );
  }

  const artwork = () => screen.getByTestId('artwork', { includeHiddenElements: true });

  it('paints the backdrop inside the panel, clipped to its rounded top', async () => {
    await renderWithBackdrop();

    const sheetPanel = panel();
    if (sheetPanel == null) throw new Error('expected the panel');
    expect(
      within(sheetPanel).getByTestId('artwork', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
    expect(artwork().parent).toHaveStyle({
      borderTopLeftRadius: lightTheme.radius.sheet,
      borderTopRightRadius: lightTheme.radius.sheet,
      overflow: 'hidden',
      position: 'absolute',
    });
  });

  it('keeps the backdrop out of the screen reader and out of the way of touches', async () => {
    await renderWithBackdrop();

    expect(screen.queryByTestId('artwork')).toBeNull();
    expect(artwork().parent).toHaveProp('pointerEvents', 'none');
  });
});

describe('BottomSheet footer', () => {
  function renderWithFooter(theme: 'light' | 'dark' = 'light') {
    return renderWithProviders(
      <BottomSheet
        isOpen
        title={TITLE}
        closeLabel="Close"
        onClose={jest.fn()}
        backdrop={<View testID="artwork" />}
        footer={<Text>Pinned choices</Text>}
      >
        <ListRow title="United Kingdom" hasChevron onPress={jest.fn()} />
      </BottomSheet>,
      { theme },
    );
  }

  it('pins the footer inside the panel but outside the scrolling content', async () => {
    await renderWithFooter();

    const sheetPanel = panel();
    if (sheetPanel == null) throw new Error('expected the panel');
    expect(within(sheetPanel).getByText('Pinned choices')).toBeOnTheScreen();

    const list = screen.getByRole('button', { name: 'United Kingdom' }).parent?.parent;
    if (list == null) throw new Error('expected the scrolling list');
    expect(within(list).queryByText('Pinned choices')).toBeNull();
  });

  it.each([
    ['light', lightTheme.color.bgSurface],
    ['dark', darkTheme.color.bgSurface],
  ] as const)('covers the backdrop edge to edge in %s mode', async (theme, backgroundColor) => {
    await renderWithFooter(theme);

    expect(screen.getByText('Pinned choices').parent).toHaveStyle({
      backgroundColor,
      marginHorizontal: -SHEET_PADDING,
      paddingHorizontal: SHEET_PADDING,
      marginBottom: -(BOTTOM_INSET + SHEET_PADDING),
      paddingBottom: BOTTOM_INSET + SHEET_PADDING,
    });
  });

  it.each([
    ['light', lightTheme.color.bgSurfaceOverlay],
    ['dark', darkTheme.color.bgSurfaceOverlay],
  ] as const)(
    'is the sheet’s own surface in %s mode when there is no backdrop to cover',
    async (theme, backgroundColor) => {
      await renderWithProviders(
        <BottomSheet
          isOpen
          title={TITLE}
          closeLabel="Close"
          onClose={jest.fn()}
          footer={<Text>Save</Text>}
        >
          <Text>Wallet tag</Text>
        </BottomSheet>,
        { theme },
      );

      expect(screen.getByText('Save').parent).toHaveStyle({ backgroundColor });
    },
  );
});

function BodyFrameProbe() {
  const frame = useSheetBodyFrame();

  return (
    <Text>{frame === undefined ? 'unmeasured' : `${frame.top}/${Math.round(frame.room)}`}</Text>
  );
}

describe('BottomSheet body frame', () => {
  const layout = (y: number, height: number) => ({
    nativeEvent: { layout: { x: 0, y, width: 750, height } },
  });
  const body = () => screen.getByText(/unmeasured|\//).parent?.parent?.parent;

  it('tells its content nothing until it has been laid out', async () => {
    await renderWithProviders(
      <BottomSheet isOpen title={TITLE} closeLabel="Close" onClose={jest.fn()}>
        <BodyFrameProbe />
      </BottomSheet>,
    );

    expect(screen.getByText('unmeasured')).toBeOnTheScreen();
  });

  it('gives its content the room left under its cap, above the home-indicator padding', async () => {
    await renderWithProviders(
      <BottomSheet isOpen title={TITLE} closeLabel="Close" onClose={jest.fn()}>
        <BodyFrameProbe />
      </BottomSheet>,
    );

    const scrollBody = body();
    if (scrollBody == null) throw new Error('expected the scroll body');
    await fireEvent(scrollBody, 'layout', layout(88, 300));

    const room = WINDOW_HEIGHT * SHEET_SHARE - 88 - (BOTTOM_INSET + SHEET_PADDING);
    expect(screen.getByText(`88/${Math.round(room)}`)).toBeOnTheScreen();
  });

  it('takes a footer out of that room', async () => {
    await renderWithProviders(
      <BottomSheet
        isOpen
        title={TITLE}
        closeLabel="Close"
        onClose={jest.fn()}
        footer={<Text>Pinned choices</Text>}
      >
        <BodyFrameProbe />
      </BottomSheet>,
    );

    const scrollBody = body();
    if (scrollBody == null) throw new Error('expected the scroll body');
    await fireEvent(scrollBody, 'layout', layout(88, 300));
    const pinned = screen.getByText('Pinned choices').parent;
    if (pinned == null) throw new Error('expected the footer');
    await fireEvent(pinned, 'layout', layout(388, 190));

    const room = WINDOW_HEIGHT * SHEET_SHARE - 88 - 190;
    expect(screen.getByText(`88/${Math.round(room)}`)).toBeOnTheScreen();
  });
});

describe('BottomSheet close button', () => {
  it.each([
    ['grey by default', 'light', undefined, lightTheme.color.fillNeutral],
    ['grey when neutral', 'light', 'neutral', lightTheme.color.fillNeutral],
    ['white over artwork in light', 'light', 'onTint', lightTheme.color.fillOnTint],
    ['black over artwork in dark', 'dark', 'onTint', darkTheme.color.fillOnTint],
  ] as const)('paints the close button %s', async (_name, theme, closeTone, backgroundColor) => {
    await renderWithProviders(
      <BottomSheet
        isOpen
        title={TITLE}
        closeLabel="Close"
        onClose={jest.fn()}
        hasCloseButton
        {...(closeTone === undefined ? {} : { closeTone })}
      >
        <ListRow title="United Kingdom" hasChevron onPress={jest.fn()} />
      </BottomSheet>,
      { theme },
    );

    const sheetPanel = panel();
    if (sheetPanel == null) throw new Error('expected the panel');
    expect(within(sheetPanel).getByRole('button', { name: 'Close' })).toHaveStyle({
      backgroundColor,
    });
  });
});
