import { isValidElement, type ReactNode } from 'react';
import { FlatList, ScrollView, useWindowDimensions, View, type FlatListProps } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useShellSidebarWidth } from '@/hooks/use-desktop-shell';
import { useWideLandscape } from '@/hooks/use-wide-landscape';

type Props<Item> = FlatListProps<Item> & { landscapeSidebar?: boolean; landscapeResultsHeader?: ReactNode };

/** Keep list controls in view alongside the results on wider Android screens. */
export function AdaptiveList<Item>({
  landscapeSidebar, landscapeResultsHeader, ListHeaderComponent, contentContainerStyle, style, ...props
}: Props<Item>) {
  const { wideLandscape, desktopShell, contentWidth } = useWideLandscape();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const shellWidth = useShellSidebarWidth();
  // Beside the open menu a small tablet has too little room for a panel and a list: it keeps the single column.
  const roomForPanel = !desktopShell || width - shellWidth >= 880;
  // On the very wide screen every list page puts its summary and search beside the results, unless a page says otherwise.
  const sidebar = wideLandscape && roomForPanel && (landscapeSidebar ?? desktopShell) && isValidElement(ListHeaderComponent) ? ListHeaderComponent : null;
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
          style={{ width: desktopShell ? '32%' : '30%', maxWidth: desktopShell ? 440 : 340, flexGrow: 0, flexShrink: 0, backgroundColor: theme.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: theme.border }}
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
