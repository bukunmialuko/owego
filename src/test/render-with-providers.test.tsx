import { asValue } from 'awilix';
import { Text, View } from 'react-native';
import { useResolve } from '@/core/di/container-provider';
import { createTestContainer, renderWithProviders } from './render-with-providers';

function ShowsEnvironment() {
  const config = useResolve('config');

  return (
    <View accessibilityRole="summary" accessibilityLabel="environment">
      <Text>{config.environment}</Text>
    </View>
  );
}

describe('renderWithProviders', () => {
  it('mounts a component with the container available', async () => {
    const { getByLabelText } = await renderWithProviders(<ShowsEnvironment />);

    expect(getByLabelText('environment')).toBeOnTheScreen();
  });

  it('lets a test replace any dependency', () => {
    const flags = { isEnabled: () => true };
    const container = createTestContainer({ featureFlags: asValue(flags) });

    expect(container.resolve('featureFlags')).toBe(flags);
  });
});
