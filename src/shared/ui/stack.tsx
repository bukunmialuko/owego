import type { ViewStyle } from 'react-native';
import { Box, type BoxProps } from './box';

type StackProps = BoxProps & {
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  wrap?: boolean;
};

export function VStack({ align, justify, style, ...rest }: StackProps) {
  return (
    <Box
      {...rest}
      style={[{ flexDirection: 'column', alignItems: align, justifyContent: justify }, style]}
    />
  );
}

export function HStack({ align = 'center', justify, wrap = false, style, ...rest }: StackProps) {
  return (
    <Box
      {...rest}
      style={[
        {
          flexDirection: 'row',
          alignItems: align,
          justifyContent: justify,
          flexWrap: wrap ? 'wrap' : 'nowrap',
        },
        style,
      ]}
    />
  );
}
