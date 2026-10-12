import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const rootBuildGradle = readFileSync(join(__dirname, '../..', 'android/build.gradle'), 'utf8');

describe('Android dependency pins', () => {
  it('pins the facebook-login version Circle’s Android SDK leaves dynamic', () => {
    const pinned =
      /requested\.group == 'com\.facebook\.android' && details\.requested\.name == 'facebook-login'\)\s*\{\s*details\.useVersion '([^']+)'/.exec(
        rootBuildGradle,
      )?.[1];

    expect(pinned).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
