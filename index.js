import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { registerBackgroundMessageHandler } from '@/features/notification/data/adapter/firebase-messaging-adapter';

try {
  registerBackgroundMessageHandler();
} catch {
  // Reported by the adapter's getToken when registration runs.
}

AppRegistry.registerComponent(appName, () => App);
