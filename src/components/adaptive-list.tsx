import { isValidElement } from 'react';
import { FlatList, ScrollView, View, type FlatListProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWideLandscape } from '@/hooks/use-wide-landscape';

type Props<Item> = FlatListProps<Item> & { landscapeSidebar?: boolean };

/** Keep list controls in view alongside the results on wider Android screens. */
export function AdaptiveList<Item>({
  landscapeSidebar, ListHeaderComponent, contentContainerStyle, style, ...props
}: Props<Item>) {
  const { wideLandscape, contentWidth } = useWideLandscape();
  const theme = useTheme();
  const sidebar = wideLandscape && landscapeSidebar && isValidElement(ListHeaderComponent) ? ListHeaderComponent : null;
  return (
    <View style={{ flex: 1, flexDirection: sidebar ? 'row' : 'column', maxWidth: contentWidth, width: '100%', alignSelf: 'center' }}>
      {sidebar ? (
        <ScrollView
          style={{ width: '34%', maxWidth: 380, flexGrow: 0, flexShrink: 0, backgroundColor: theme.canvas, borderEndWidth: 1, borderEndColor: theme.border }}
          contentContainerStyle={{ paddingBottom: Spacing.four }}
          keyboardShouldPersistTaps="handled"
        >
          {sidebar}
        </ScrollView>
      ) : null}
      <FlatList
        {...props}
        style={[{ flex: 1, minWidth: 0 }, style]}
        ListHeaderComponent={sidebar ? undefined : ListHeaderComponent}
        contentContainerStyle={contentContainerStyle}
      />
    </View>
  );
}
