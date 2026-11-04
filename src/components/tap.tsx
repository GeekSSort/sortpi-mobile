import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

/**
 * A rounded tappable thing (a choice tile, a pill) that dims while pressed. Android's ripple is drawn as a square layer
 * over the view and spills past rounded corners, so for these shapes the press is shown by dimming instead.
 */
export function Tap({ style, ...rest }: Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle> }) {
  return <Pressable {...rest} style={({ pressed }) => [style, pressed && { opacity: 0.6 }]} />;
}
