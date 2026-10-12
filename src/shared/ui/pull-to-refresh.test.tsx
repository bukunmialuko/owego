import { screen } from '@testing-library/react-native';
import { Component } from 'react';
import { RefreshControl, ScrollView, Text } from 'react-native';
import { z } from 'zod';
import { darkTheme, lightTheme } from '@/core/design-system';
import { renderWithProviders } from '@/test/render-with-providers';
import { PullToRefresh } from './pull-to-refresh';

const renderedProps = z.object({
  refreshing: z.boolean(),
  tintColor: z.string(),
  colors: z.array(z.string()),
  progressBackgroundColor: z.string(),
});

function nativeControl() {
  const latest: unknown = Reflect.get(RefreshControl, 'latestRef');
  if (!(latest instanceof Component)) throw new Error('No refresh control is mounted');

  return renderedProps.parse(latest.props);
}

function renderInList(refreshing: boolean, theme: 'light' | 'dark' = 'light') {
  return renderWithProviders(
    <ScrollView refreshControl={<PullToRefresh refreshing={refreshing} onRefresh={jest.fn()} />}>
      <Text>Rows</Text>
    </ScrollView>,
    { theme },
  );
}

describe('PullToRefresh', () => {
  it('tints the spinner from the theme', async () => {
    await renderInList(true);

    expect(screen.getByText('Rows')).toBeOnTheScreen();
    expect(nativeControl()).toEqual({
      refreshing: true,
      tintColor: lightTheme.color.iconSecondary,
      colors: [lightTheme.color.fillBrandStrong],
      progressBackgroundColor: lightTheme.color.bgSurface,
    });
  });

  it('follows the theme into dark mode', async () => {
    await renderInList(false, 'dark');

    expect(nativeControl()).toMatchObject({
      refreshing: false,
      tintColor: darkTheme.color.iconSecondary,
      progressBackgroundColor: darkTheme.color.bgSurface,
    });
  });
});
