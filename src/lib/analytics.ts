import { getAnalytics, logEvent, logScreenView, setAnalyticsCollectionEnabled } from '@react-native-firebase/analytics';
import { useSegments } from 'expo-router';
import { useEffect } from 'react';

/**
 * Firebase Analytics, kept small and private: which screens are used and three business milestones.
 * Only names and small counts are sent, never a customer, an item name, a phone number or an amount.
 * The advertising ID and ad personalization are switched off in firebase.json, and only release builds send anything.
 */
export function initAnalytics(): void {
  try {
    void setAnalyticsCollectionEnabled(getAnalytics(), !__DEV__);
  } catch {
    // no Firebase app here (web or the build's route export)
  }
}

type Milestone = 'sale_completed' | 'item_added' | 'day_closed';

export function track(event: Milestone, params?: Record<string, string | number>): void {
  try {
    void logEvent(getAnalytics(), event, params);
  } catch {
    // analytics must never break a sale
  }
}

/** One screen_view per screen. The route pattern is sent ("customer/[id]"), not the real address with its ids. */
export function useScreenTracking(): void {
  const screen = useSegments().join('/');
  useEffect(() => {
    if (!screen) return;
    try {
      void logScreenView(getAnalytics(), { screen_name: screen, screen_class: screen });
    } catch {
      // ignore
    }
  }, [screen]);
}
