import { useEffect, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n/prefs';

import { ThemedText } from './themed-text';

/**
 * A sheet that slides up from the bottom, dims what is behind, and keeps its content above the keyboard. It closes three ways:
 * a tap outside, the system back gesture, or by dragging the handle or title down (the handle looks draggable, so it is).
 * Pickers use it instead of dropdowns inside the page.
 */
export function BottomSheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const drag = useSharedValue(0);
  useEffect(() => {
    if (!visible) drag.value = 0;
  }, [visible, drag]);

  // On Android the keyboard opens over a sheet instead of pushing it up, so the sheet lifts itself by the keyboard's height
  // (iOS does it through KeyboardAvoidingView). Without this a search box in a sheet hides the results under the keyboard.
  const [keyboard, setKeyboard] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKeyboard(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const pan = Gesture.Pan()
    .onChange((e) => {
      drag.value = Math.max(0, drag.value + e.changeY);
    })
    .onEnd((e) => {
      if (drag.value > 100 || e.velocityY > 900) scheduleOnRN(onClose);
      else drag.value = withSpring(0, { damping: 20, stiffness: 300 });
    });
  const lift = useAnimatedStyle(() => ({ transform: [{ translateY: drag.value }] }));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      {/* A Modal is its own window, so it needs its own gesture root. */}
      <GestureHandlerRootView style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('Close')} onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ marginBottom: keyboard }}>
          <Animated.View style={[{ maxHeight: Math.min(height * 0.8, height - keyboard - insets.top - 24), width: '100%', maxWidth: 640, alignSelf: 'center', backgroundColor: theme.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderCurve: 'continuous', paddingBottom: insets.bottom }, lift]}>
            <GestureDetector gesture={pan}>
              <View>
                <View style={{ alignItems: 'center', paddingTop: Spacing.two, paddingBottom: Spacing.one }}>
                  <View style={{ width: 36, height: 4, borderRadius: Radius.full, backgroundColor: theme.inputBorder }} />
                </View>
                <ThemedText type="title" style={{ paddingHorizontal: Spacing.three, paddingTop: Spacing.two, paddingBottom: Spacing.two }}>
                  {title}
                </ThemedText>
              </View>
            </GestureDetector>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: Spacing.three }}>
              {children}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}
