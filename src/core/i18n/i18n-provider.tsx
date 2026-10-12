import { type ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { useResolve } from '@/core/di/container-provider';

export function I18nProvider({ children }: { children: ReactNode }) {
  const instance = useResolve('i18n');

  return <I18nextProvider i18n={instance}>{children}</I18nextProvider>;
}
