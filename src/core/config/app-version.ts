import DeviceInfo from 'react-native-device-info';

export type AppVersion = {
  version: string;
  build: string;
};

export function readAppVersion(): AppVersion {
  return { version: DeviceInfo.getVersion(), build: DeviceInfo.getBuildNumber() };
}
