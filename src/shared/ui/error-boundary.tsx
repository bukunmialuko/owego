import { Component, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  fallback: (retry: () => void) => ReactNode;
  onError?: (error: unknown) => void;
};

type State = { hasFailed: boolean };

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasFailed: false };

  static getDerivedStateFromError(): State {
    return { hasFailed: true };
  }

  override componentDidCatch(error: unknown) {
    this.props.onError?.(error);
  }

  private readonly retry = () => {
    this.setState({ hasFailed: false });
  };

  override render() {
    return this.state.hasFailed ? this.props.fallback(this.retry) : this.props.children;
  }
}
