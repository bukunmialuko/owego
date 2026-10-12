import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { darkTheme, lightTheme } from '@/core/design-system';

const res = join(__dirname, '../..', 'android/app/src/main/res');

function windowBackground(folder: 'values' | 'values-night'): string | undefined {
  const path = join(res, folder, 'colors.xml');
  if (!existsSync(path)) return undefined;

  return /<color name="window_background">(#[0-9A-Fa-f]{6})<\/color>/.exec(
    readFileSync(path, 'utf8'),
  )?.[1];
}

describe('the Android window behind the app', () => {
  it('is painted by AppTheme', () => {
    const styles = readFileSync(join(res, 'values/styles.xml'), 'utf8');
    const appTheme = /<style name="AppTheme"[^>]*>([\s\S]*?)<\/style>/.exec(styles)?.[1] ?? '';

    expect(appTheme).toContain(
      '<item name="android:windowBackground">@color/window_background</item>',
    );
  });

  it.each([
    ['values', lightTheme.color.bgCanvas],
    ['values-night', darkTheme.color.bgCanvas],
  ] as const)('is the canvas in %s', (folder, canvas) => {
    expect(windowBackground(folder)?.toUpperCase()).toBe(canvas.toUpperCase());
  });
});
