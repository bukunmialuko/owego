import { Easing, type EasingFunction } from 'react-native';

const duration = {
  instant: 100,
  fast: 150,
  normal: 250,
  slow: 400,
  ambient: 1500,
} as const;

export type Duration = typeof duration;

const easing = {
  standard: Easing.bezier(0.2, 0, 0, 1),
  decelerate: Easing.bezier(0, 0, 0, 1),
  accelerate: Easing.bezier(0.3, 0, 1, 1),
  ambient: Easing.inOut(Easing.ease),
} as const satisfies Record<string, EasingFunction>;

export type Easings = typeof easing;

const spring = {
  snappy: { friction: 5, tension: 200 },
} as const;

type Springs = typeof spring;

export type Motion = { duration: Duration; easing: Easings; spring: Springs };

export const motion: Motion = { duration, easing, spring };
