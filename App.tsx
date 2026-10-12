import { AppLockGate } from '@/composition/app-lock-gate';
import { AppProviders } from '@/composition/app-providers';
import { ForegroundNotificationBanner } from '@/composition/foreground-notification-banner';
import { readRuntimeConfig } from '@/core/config/read-runtime-config';
import { RootNavigator } from '@/navigation/root-navigator';

function App() {
  return (
    <AppProviders config={readRuntimeConfig()}>
      <AppLockGate>
        <RootNavigator />
        <ForegroundNotificationBanner />
      </AppLockGate>
    </AppProviders>
  );
}

export default App;
