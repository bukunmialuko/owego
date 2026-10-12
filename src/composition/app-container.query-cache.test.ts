import { QueryClient } from '@tanstack/react-query';
import { testAppConfig } from '@/test/test-config';
import { createComposedContainer } from './app-container';

describe('signing out', () => {
  it('clears the query cache along with everything else', async () => {
    const container = createComposedContainer(testAppConfig);
    const queryClient = container.resolve('queryClient');

    queryClient.setQueryData(['settings', 'profile'], { email: 'a@example.com' });

    await container.resolve('signOutUseCase').execute();

    expect(queryClient.getQueryData(['settings', 'profile'])).toBeUndefined();
  });

  it('hands the same client to every consumer', () => {
    const container = createComposedContainer(testAppConfig);

    expect(container.resolve('queryClient')).toBeInstanceOf(QueryClient);
    expect(container.resolve('queryClient')).toBe(container.resolve('queryClient'));
  });
});
