import { isValidElement, type ReactNode } from 'react';
import { FlatList, ScrollView, View, type FlatListProps } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWideLandscape } from '@/hooks/use-wide-landscape';

type Props<Item> = FlatListProps<Item> & { landscapeSidebar?: boolean; landscapeResultsHeader?: ReactNode };

/** Keep list controls in view alongside the results on wider Android screens. */
export function AdaptiveList<Item>({
  landscapeSidebar, landscapeResultsHeader, ListHeaderComponent, contentContainerStyle, style, ...props
}: Props<Item>) {
  const { wideLandscape, contentWidth } = useWideLandscape();
  const theme = useTheme();
  const sidebar = wideLandscape && landscapeSidebar && isValidElement(ListHeaderComponent) ? ListHeaderComponent : null;
  const list = (
    <FlatList
      {...props}
      style={[{ flex: 1, minWidth: 0 }, style]}
      ListHeaderComponent={sidebar ? undefined : ListHeaderComponent}
      contentContainerStyle={contentContainerStyle}
    />
  );
  return (
    <View style={{ flex: 1, flexDirection: sidebar ? 'row' : 'column', gap: sidebar ? Spacing.three : 0, padding: sidebar ? Spacing.three : 0, maxWidth: contentWidth, width: '100%', alignSelf: 'center' }}>
      {sidebar ? (
        <ScrollView
          style={{ width: '30%', maxWidth: 340, flexGrow: 0, flexShrink: 0, backgroundColor: theme.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: theme.border }}
          contentContainerStyle={{ paddingBottom: Spacing.four }}
          keyboardShouldPersistTaps="handled"
        >
          {sidebar}
        </ScrollView>
      ) : null}
      {sidebar ? (
        <View style={{
          flex: 1, minWidth: 0, backgroundColor: theme.card, borderWidth: 1,
          borderColor: theme.border, borderRadius: Radius.lg, overflow: 'hidden',
        }}>
          {landscapeResultsHeader}
          {list}
        </View>
      ) : list}
    </View>
  );
}
