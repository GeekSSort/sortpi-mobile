import Svg, { Path } from 'react-native-svg';

import { brandIcons, type BrandIconName } from './brand-icons.generated';

/**
 * The web app's own sidebar icons (saas/client/public/icons/sidebar), drawn in one colour.
 * Use the system icons (see ./icon) for interface icons; this file is only for the web sidebar's own brand drawings.
 */
export function BrandIcon({ name, size = 20, color }: { name: BrandIconName; size?: number; color: string }) {
  const icon = brandIcons[name];
  const [, , w, h] = icon.viewBox.split(' ').map(Number);
  const scale = size / Math.max(w, h);
  return (
    <Svg width={w * scale} height={h * scale} viewBox={icon.viewBox} accessibilityElementsHidden>
      {icon.paths.map((p, i) => (
        <Path
          key={i}
          d={p.d}
          fill={p.fill ? color : 'none'}
          fillRule={p.evenodd ? 'evenodd' : undefined}
          stroke={p.stroke ? color : undefined}
          strokeWidth={p.sw}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}
