import { render, screen } from '@testing-library/react-native';
import { LoadingAnimation } from './loading-animation';

describe('LoadingAnimation', () => {
  it('renders at the size it is given', async () => {
    await render(<LoadingAnimation size={200} accessibilityLabel="Loading" />);

    const animation = screen.getByLabelText('Loading');
    expect(animation).toBeTruthy();
  });

  it('announces the wait once, not per layer', async () => {
    await render(<LoadingAnimation size={200} accessibilityLabel="Setting up your wallet" />);

    expect(screen.getByLabelText('Setting up your wallet')).toBeTruthy();
    expect(screen.queryAllByLabelText('Setting up your wallet')).toHaveLength(1);
  });

  it('exposes itself as a progress indicator', async () => {
    await render(<LoadingAnimation size={120} accessibilityLabel="Loading" />);

    expect(screen.getByRole('progressbar')).toBeTruthy();
  });
});
