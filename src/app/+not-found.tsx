import { useRouter } from 'expo-router';

import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';

/** A link that goes nowhere (an old shared link, a typo): say so kindly and offer the way back, not a framework error page. */
export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <Screen>
      <EmptyState icon="Search" title="We could not find that page" hint="The link may be old or mistyped. Let us start again from the beginning." action={{ title: 'Take me back', onPress: () => router.replace('/') }} />
    </Screen>
  );
}
