import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/core/design-system/theme-provider';
import { Banner, type BannerTone } from './banner';
import { useReducedMotion } from './use-reduced-motion';

const DEFAULT_DURATION_MS = 4_000;

export type ToastMessage = { id: number; message: string; tone: BannerTone };

export function useToast({ durationMs = DEFAULT_DURATION_MS }: { durationMs?: number } = {}) {
  const [toast, setToast] = useState<ToastMessage | undefined>(undefined);
  const nextId = useRef(0);

  const show = useCallback((message: string, tone: BannerTone = 'error') => {
    nextId.current += 1;
    setToast({ id: nextId.current, message, tone });
  }, []);

  const hide = useCallback(() => {
    setToast(undefined);
  }, []);

  useEffect(() => {
    if (toast === undefined) return;

    const timer = setTimeout(hide, durationMs);

    return () => {
      clearTimeout(timer);
    };
  }, [toast, durationMs, hide]);

  return { toast, show, hide };
}

type Props = {
  toast: ToastMessage | undefined;
  dismissLabel: string;
  onDismiss: () => void;
};

export function Toast({ toast, dismissLabel, onDismiss }: Props) {
  if (toast === undefined) return null;

  return (
    <FadingToast key={toast.id} toast={toast} dismissLabel={dismissLabel} onDismiss={onDismiss} />
  );
}

function FadingToast({
  toast,
  dismissLabel,
  onDismiss,
}: {
  toast: ToastMessage;
  dismissLabel: string;
  onDismiss: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isMotionReduced = useReducedMotion();
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (isMotionReduced) {
      opacity.setValue(1);
      return;
    }

    Animated.timing(opacity, {
      toValue: 1,
      duration: theme.motion.duration.fast,
      easing: theme.motion.easing.decelerate,
      useNativeDriver: true,
    }).start();
  }, [isMotionReduced, opacity, theme.motion]);

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.floating,
        {
          left: theme.spacing.lg,
          opacity,
          right: theme.spacing.lg,
          top: insets.top + theme.spacing.sm,
          zIndex: theme.zIndex.toast,
        },
      ]}
    >
      <View style={[theme.elevation.floating, { borderRadius: theme.radius.lg }]}>
        <View style={[styles.clipsCornersBelowShadow, { borderRadius: theme.radius.lg }]}>
          <Banner
            tone={toast.tone}
            message={toast.message}
            dismissLabel={dismissLabel}
            onDismiss={onDismiss}
          />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  floating: { position: 'absolute' },
  clipsCornersBelowShadow: { overflow: 'hidden' },
});
