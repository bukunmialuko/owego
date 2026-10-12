# Installation guide

How to set the project up, run it, and check your work.

**What you can do without any credentials:** install the dependencies and run `npm run verify`.
That covers the type check, lint, the layer rules, type coverage and the whole test suite.

**What needs credentials:** building and running the app. The Firebase configuration, the Circle
SDK download token and the signing keys are not in this repository. See
[Files that are not in the repository](#files-that-are-not-in-the-repository).

## Requirements

| Tool           | Version                                          |
| -------------- | ------------------------------------------------ |
| Node           | 22.11 or newer                                   |
| Ruby           | 3.4, with Bundler 4 (for CocoaPods and fastlane) |
| JDK            | 17                                               |
| Xcode          | A current release, for iOS builds (macOS only)   |
| Android Studio | With the Android SDK and an emulator or a phone  |

## 1. Install dependencies

```bash
npm install
bundle install                            # gems into vendor/bundle (.bundle/config)
cd ios && bundle exec pod install && cd ..
```

A bare macOS shell resolves `/usr/bin/bundle`, which is the system Ruby 2.6. Install Ruby 3.4
(`brew install ruby@3.4`) and put `/opt/homebrew/opt/ruby@3.4/bin` first on your `PATH`.

## 2. Create your env files

```bash
cp .env.example .env
cp .env.example .env.development
cp .env.example .env.staging      # then set OWEGO_ENV=staging
cp .env.example .env.production   # then set OWEGO_ENV=production
```

The app refuses to start when a required value is missing, and names the field.

| Key                          | Required | What it is                                                           |
| ---------------------------- | -------- | -------------------------------------------------------------------- |
| `OWEGO_ENV`                  | Yes      | `development`, `staging` or `production`                             |
| `OWEGO_API_BASE_URL`         | Yes      | Backend base URL, ending in `/api/v1`                                |
| `OWEGO_GOOGLE_WEB_CLIENT_ID` | Yes      | Google Sign-In web client ID                                         |
| `OWEGO_GOOGLE_IOS_CLIENT_ID` | Yes      | Google Sign-In iOS client ID                                         |
| `OWEGO_CIRCLE_APP_ID`        | Yes      | Circle Programmable Wallets app ID                                   |
| `OWEGO_SOLANA_CLUSTER`       | Yes      | `devnet` for development and staging, `mainnet-beta` for production  |
| `OWEGO_SOLANA_RPC_URL`       | Yes      | The https JSON-RPC endpoint for that cluster                         |
| `OWEGO_SENTRY_DSN`           | No       | Error reporting                                                      |
| `OWEGO_PREVIEW_DATA`         | No       | `true` serves screens from fixtures while the backend is unavailable |

> **`.env` is not a vault.** Babel inlines these values into the JavaScript bundle, so anything in
> a `.env` file ships inside the app and can be extracted from it. Client IDs and app IDs are
> public by design and belong here. A real secret never does.

`.env.test` is committed on purpose. It holds dummy values that keep the tests deterministic.

## 3. Files that are not in the repository

The platform reads these before any JavaScript runs, so they cannot come from `.env`. All of them
are gitignored.

| File                                | Where it goes                                                  | Needed for             |
| ----------------------------------- | -------------------------------------------------------------- | ---------------------- |
| `google-services.json`              | `android/app/src/<environment>/`                               | Every Android build    |
| `GoogleService-Info.plist`          | `ios/flavors/<flavor>/`                                        | Every iOS build        |
| Circle SDK Maven credentials        | Environment variables, or `android/circlefin-maven.properties` | Every Android build    |
| Android keystores, `key.properties` | `android/app/`, `android/`                                     | Every Android build    |
| iOS signing certificate and profile | Your keychain                                                  | iOS builds for a phone |

Each Firebase file comes from the Firebase project for that environment. One file per environment
serves both Android stores.

### Circle wallet SDK on Android

Circle publishes its Android SDK to GitHub Packages, behind authentication. Without credentials an
Android build fails at configuration time and says so. Provide them as environment variables:

```bash
export PWSDK_MAVEN_URL=https://maven.pkg.github.com/circlefin/w3s-android-sdk
export PWSDK_MAVEN_USERNAME=<github-username>
export PWSDK_MAVEN_PASSWORD=<github-token-with-read:packages>
```

Or copy `android/circlefin-maven.properties.example` to `android/circlefin-maven.properties` and
fill it in. The environment wins where both are present.

The token is a real secret. It needs `read:packages` and nothing more, it is used at build time
only, and it must never go in a `.env` file.

iOS needs no credential: Circle's CocoaPods spec repo is public.

### Android signing

Every Android variant signs with its store's release key, debug builds included, because Google
Sign-In accepts only a registered SHA-1. A missing key fails the build instead of falling back to
the debug keystore.

## 4. Run

```bash
npm start                 # Metro, on .env
npm run ios:dev           # iOS simulator
npm run android:dev       # Android emulator or a connected phone
```

### Environments

Three environments install side by side.

| Environment | Application ID           | App name      | Env file           | Run                                 |
| ----------- | ------------------------ | ------------- | ------------------ | ----------------------------------- |
| development | `app.owego.superapp.dev` | `[DEV] Owego` | `.env.development` | `npm run ios:dev` / `android:dev`   |
| staging     | `app.owego.superapp.stg` | `[STG] Owego` | `.env.staging`     | `npm run ios:stg` / `android:stg`   |
| production  | `app.owego.superapp`     | `Owego`       | `.env.production`  | `npm run ios:prod` / `android:prod` |

Start Metro on the same environment you are running, for example `npm run start:stg` before
`npm run ios:stg`. In a debug build the app loads its bundle from Metro, so the env file Metro
started with decides the configuration.

On Android a second dimension, `store`, picks the signing key: `play` for Google Play and
`dappStore` for the Solana dApp Store. The two are otherwise the same app.

### On a phone

Anything after `--` goes to the React Native CLI, which is where the device flags go.

```bash
npm run ios:stg -- --device                  # the first connected iPhone
npm run ios:stg -- --device "My iPhone"      # by name
npm run android:dev -- --device "Pixel 8"    # pick one of several
```

- **iPhone:** turn on _Settings → Privacy & Security → Developer Mode_, and install a signing
  certificate and provisioning profile that include the phone. Only the Staging and Production
  schemes are set up to sign for a device. The phone and the Mac must be on the same Wi-Fi network
  so the phone can reach Metro.
- **Android:** enable _Developer options → USB debugging_ and accept the prompt on the phone.
  `adb devices` must list it as `device`. The CLI runs `adb reverse tcp:8081 tcp:8081`, so the
  phone reaches Metro over the cable.

## Checking your work

```bash
npm run verify
```

| Script                                 | What it does                                        |
| -------------------------------------- | --------------------------------------------------- |
| `npm run verify`                       | typecheck → lint → depcruise → type-coverage → test |
| `npm run typecheck`                    | `tsc --noEmit`                                      |
| `npm run lint` / `format`              | ESLint / Prettier                                   |
| `npm test`                             | Jest. Also `test:watch` and `test:coverage`         |
| `npm run depcruise`                    | Enforce the layer boundaries                        |
| `npm run type-coverage`                | Fail below 98% typed                                |
| `npm run knip`                         | Find unused files, exports and dependencies         |
| `npm run ios:pods`                     | `pod install` with the pinned CocoaPods             |
| `npm run android:clean`                | `./gradlew clean`                                   |
| `npm run start:dev` / `:stg` / `:prod` | Metro on that environment's env file                |

## Debugging

- **JavaScript:** React Native DevTools is the debugger for Hermes. With Metro running, press `j`
  in the Metro terminal, open **Sources**, and click a line number. A `debugger;` statement works
  too.
- **Tests:** the domain and data layers are plain TypeScript, so a breakpoint in a use case under
  Jest is the fastest loop. `.vscode/launch.json` has a configuration for the whole suite and one
  for the open file.
- **iOS native:** open `ios/owego.xcworkspace` (the workspace, not the project) in Xcode.
- **Android native:** open `android/` in Android Studio.

## Troubleshooting

**A changed `.env` value has no effect.** Babel inlines the values when it transforms the code, so
a cached bundle keeps the old ones. Restart Metro with `npm start -- --reset-cache`.

**Google Sign-In fails on the iOS simulator with `GIDSignIn Code=-2 "keychain error"`.** This is a
signing limitation, not a configuration mistake. Google's SDK stores its session in the
data-protection keychain, which needs a keychain access group, and a simulator build of this
project carries no entitlements. Run on a phone with the Staging or Production scheme.

**`java` is not found during an Android build.** On macOS `/usr/bin/java` exists but does not run
without `JAVA_HOME`. Install JDK 17 (`brew install openjdk@17`) and export `JAVA_HOME`.

**An Android flavor will not build.** Check that `google-services.json` is in that environment's
folder under `android/app/src/`. Each folder has a short README naming the Firebase project it
expects.
