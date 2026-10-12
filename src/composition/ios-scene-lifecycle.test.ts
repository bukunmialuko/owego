import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

const root = join(__dirname, '../..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const infoPlist = read('ios/owego/Info.plist');
const appDelegate = read('ios/owego/AppDelegate.swift');

describe('the iOS scene life cycle', () => {
  it('declares a single-scene manifest', () => {
    expect(infoPlist).toMatch(/<key>UIApplicationSceneManifest<\/key>\s*<dict>/);
    expect(infoPlist).toMatch(/<key>UIApplicationSupportsMultipleScenes<\/key>\s*<false\/>/);
  });

  it('names a scene delegate the app declares', () => {
    const named =
      /<key>UISceneDelegateClassName<\/key>\s*<string>\$\(PRODUCT_MODULE_NAME\)\.(\w+)<\/string>/.exec(
        infoPlist,
      )?.[1];

    expect(named).toBe('SceneDelegate');
    expect(appDelegate).toMatch(/\bclass SceneDelegate: ExpoAppSceneDelegate\b/);
  });

  it('hands the scene delegate an app delegate it can start React Native from', () => {
    expect(appDelegate).toMatch(
      /\bclass AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider\b/,
    );
  });

  it('starts the component index.js registers, not the provider’s default "main"', () => {
    const { name } = z.object({ name: z.string() }).parse(JSON.parse(read('app.json')));

    expect(appDelegate).toContain(`var reactNativeFactoryModuleName: String { "${name}" }`);
  });

  it('leaves the window to the scene', () => {
    expect(appDelegate).not.toMatch(/UIWindow\(frame:/);
  });
});
