import { screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { renderWithProviders } from '@/test/render-with-providers';
import { Button } from './button';
import { ErrorBoundary } from './error-boundary';

let rendersFail = false;

function Fragile() {
  if (rendersFail) throw new Error('render failed');

  return <Text>rendered</Text>;
}

async function renderGuarded(onError = jest.fn()) {
  await renderWithProviders(
    <ErrorBoundary onError={onError} fallback={(retry) => <Button label="Retry" onPress={retry} />}>
      <Fragile />
    </ErrorBoundary>,
  );

  return onError;
}

beforeEach(() => {
  rendersFail = false;
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('draws its children while they render', async () => {
    await renderGuarded();

    expect(screen.getByText('rendered')).toBeOnTheScreen();
  });

  it('draws the fallback in their place once they throw, and reports it once', async () => {
    rendersFail = true;
    const onError = await renderGuarded();

    expect(screen.queryByText('rendered')).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeOnTheScreen();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'render failed' }));
  });

  it('draws the children again on retry', async () => {
    rendersFail = true;
    await renderGuarded();

    rendersFail = false;
    await userEvent.setup().press(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('rendered')).toBeOnTheScreen();
  });
});
