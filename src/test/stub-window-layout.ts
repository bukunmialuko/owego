import { View } from 'react-native';

type WindowLayout = { x: number; y: number; width: number; height: number };

export function stubWindowLayout({ x, y, width, height }: WindowLayout) {
  return jest.spyOn(View.prototype, 'measureInWindow').mockImplementation((callback) => {
    callback(x, y, width, height);
  });
}
