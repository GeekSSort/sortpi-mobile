import { View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { haptics } from '@/lib/haptics';

import { Icon } from './icons/icon';
import { ThemedText } from './themed-text';

/** Fixed red with white text: it must read the same in light and dark, and white on this red passes 4.5:1. */
const RED = '#b91c1c';

/** Drag a row left to remove it. The caller removes and offers Undo; the visible trash button stays for anyone who does not swipe. */
export function SwipeToRemove({ onRemove, children }: { onRemove: () => void; children: React.ReactNode }) {
  return (
    <ReanimatedSwipeable
      overshootRight={false}
      friction={1.6}
      rightThreshold={72}
      onSwipeableOpen={() => {
        haptics.tap();
        onRemove();
      }}
      renderRightActions={() => (
        <View style={{ width: 96, alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: RED }}>
          <Icon name="Trash2" size={22} color="#ffffff" />
          <ThemedText type="caption" style={{ color: '#ffffff' }}>
            Remove
          </ThemedText>
        </View>
      )}
    >
      {children}
    </ReanimatedSwipeable>
  );
}
