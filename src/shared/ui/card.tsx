import { Box, type BoxProps } from './box';

type Props = Omit<BoxProps, 'background' | 'elevation'> & {
  variant?: 'plain' | 'raised' | 'sunken' | 'canvas';
};

const BACKGROUND = {
  plain: 'surface',
  raised: 'surfaceRaised',
  sunken: 'surfaceSunken',
  canvas: 'canvas',
} as const;

export function Card({ variant = 'plain', radius = 'lg', padding = 'lg', ...rest }: Props) {
  return (
    <Box
      background={BACKGROUND[variant]}
      elevation={variant === 'plain' ? 'card' : 'none'}
      radius={radius}
      padding={padding}
      {...rest}
    />
  );
}
