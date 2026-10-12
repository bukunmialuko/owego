import LottieView from 'lottie-react-native';
import { View } from 'react-native';
import loadingAnimation from '@/assets/lottie/loading.json';

type Props = {
  size: number;
  accessibilityLabel: string;
};

export function LoadingAnimation({ size, accessibilityLabel }: Props) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      style={{ height: size, width: size }}
    >
      <LottieView source={loadingAnimation} autoPlay loop style={{ height: size, width: size }} />
    </View>
  );
}
