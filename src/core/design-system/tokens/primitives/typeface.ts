export const typeface = {
  display: 'Geist-Bold',
  heading: 'Geist-SemiBold',

  regular: 'Geist-Regular',
  medium: 'Geist-Medium',
  semibold: 'Geist-SemiBold',
  bold: 'Geist-Bold',

  mono: 'GeistMono-Regular',
  monoMedium: 'GeistMono-Medium',
} as const;

/** @public */
export type Typeface = typeof typeface;
