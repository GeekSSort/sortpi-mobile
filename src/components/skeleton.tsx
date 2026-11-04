import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n/prefs';

/** Grey bars that pulse where a list's rows will be, so the first load does not show a spinner or an empty state. */
export function SkeletonRows({ count = 7 }: { count?: number }) {
  const theme = useTheme();
  const t = useT();
  const pulse = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    // Plain React Native animation does not follow the system "remove animations" setting by itself, so check it.
    let loop: Animated.CompositeAnimation | undefined;
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled || reduce) return;
      loop = Animated.loop(Animated.sequence([Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }), Animated.timing(pulse, { toValue: 0.45, duration: 700, useNativeDriver: true })]));
      loop.start();
    });
    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [pulse]);
  const bar = (w: `${number}%`, h: number) => <View style={{ width: w, height: h, borderRadius: Radius.sm, backgroundColor: theme.backgroundSelected }} />;
  return (
    <Animated.View accessibilityLabel={t('Loading')} style={{ opacity: pulse }}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: 16, backgroundColor: theme.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
          <View style={{ flex: 1, gap: 8 }}>
            {bar('60%', 14)}
            {bar('35%', 10)}
          </View>
          <View style={{ width: 64 }}>{bar('100%', 14)}</View>
        </View>
      ))}
    </Animated.View>
  );
}
