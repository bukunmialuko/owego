import { Linking } from 'react-native';
import type { LinkingOptions } from '@react-navigation/native';
import { APP_URL_SCHEME } from '@/core/config/app-url-scheme';
import type { AppStackParamList } from './param-list';

export type DeferredLinking = {
  options: LinkingOptions<AppStackParamList>;
  setReady: (ready: boolean) => void;
};

export type ExternalLinkSource = {
  getInitialURL(): Promise<string | undefined>;
  subscribe(listener: (url: string) => void): () => void;
};

export function createDeferredLinking(source?: ExternalLinkSource): DeferredLinking {
  let queued: string | undefined;
  let ready = false;
  let deliver: ((url: string) => void) | undefined;

  const isReady = () => ready;

  const options: LinkingOptions<AppStackParamList> = {
    ...linking,

    async getInitialURL() {
      const url = (await Linking.getInitialURL()) ?? (await source?.getInitialURL()) ?? null;
      if (url === null) return null;

      if (isReady()) return url;

      queued = url;
      return null;
    },

    subscribe(listener) {
      deliver = listener;

      const handle = (url: string) => {
        if (isReady()) {
          listener(url);
          return;
        }

        queued = url;
      };

      const subscription = Linking.addEventListener('url', ({ url }) => {
        handle(url);
      });
      const stopSource = source?.subscribe(handle);

      return () => {
        deliver = undefined;
        subscription.remove();
        stopSource?.();
      };
    },
  };

  return {
    options,

    setReady(next) {
      ready = next;
      if (!next) return;

      const url = queued;
      queued = undefined;
      if (url !== undefined) deliver?.(url);
    },
  };
}

export const linking: LinkingOptions<AppStackParamList> = {
  prefixes: [APP_URL_SCHEME],
  config: {
    screens: {
      Tabs: {
        screens: {
          Home: '',
          Wealth: 'wealth',
          Travel: 'travel',
        },
      },
      Receive: 'receive',
      Payment: 'pay',
      NewLoan: 'credit/new-loan',
      EsimCatalog: 'travel/esim',
      TravelPolicies: 'travel/policies',
      Insurance: 'travel/insurance',
    },
  },
};
