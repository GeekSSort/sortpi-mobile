import { requireOptionalNativeModule } from 'expo';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { androidPosDevice } from './device-printer';
import { sunmiScanPair } from './sunmi-scan-pair';

type ScanListener = { remove(): void };
type Basket = { title: string; lines: string[]; totalLabel: string; total: string; segmentTotal: string | null };

const sunmi = androidPosDevice?.name === 'SUNMI';
const scanner = sunmi ? requireOptionalNativeModule<{
  addListener(event: 'onBarcode', listener: (event: { code: string }) => void): ScanListener;
}>('SortPiSunmiScanner') : null;
const display = sunmi ? requireOptionalNativeModule<{
  showBasket(title: string, lines: string[], totalLabel: string, total: string): Promise<void>;
  hideBasket(): Promise<void>;
}>('SortPiSunmiCustomerDisplay') : null;

// The D3 MINI 58mm SKUs expose a segment LCD through the printer service.
const segmentDisplay = sunmi && /^t172[01]$/i.test(androidPosDevice?.model ?? '')
  ? requireOptionalNativeModule<{ setSegmentTotal(total: string | null): Promise<void> }>('SortPiSunmiPrinter')
  : null;
let segmentWrite = Promise.resolve();

function updateSegment(total: string | null) {
  if (segmentDisplay) {
    segmentWrite = segmentWrite.then(() => segmentDisplay.setSegmentTotal(total)).catch(() => undefined);
  }
}

function hideCustomerDisplay() {
  void display?.hideBasket().catch(() => undefined);
  updateSegment(null);
}

export const sunmiHandheldScanHint = !!scanner && /\bv3\b|^t5f1a$/i.test(androidPosDevice?.model ?? '');

export function useSunmiScanner(enabled: boolean, onBarcode: (code: string) => void) {
  const accept = useRef(sunmiScanPair());
  const inputListener = useRef<((code: string) => void) | null>(null);
  const subscribeToBroadcast = useCallback((listener: (code: string) => void) => {
    inputListener.current = listener;
    return () => { if (inputListener.current === listener) inputListener.current = null; };
  }, []);
  const handler = useRef(onBarcode);
  useEffect(() => { handler.current = onBarcode; }, [onBarcode]);

  useFocusEffect(useCallback(() => {
    if (!enabled || !scanner) return;
    accept.current = sunmiScanPair();
    const subscription = scanner.addListener('onBarcode', ({ code }) => {
      if (AppState.currentState !== 'active') return;
      if (accept.current(code, 'broadcast')) handler.current(code);
      inputListener.current?.(code);
    });
    return () => subscription.remove();
  }, [enabled]));

  return {
    acceptKeyboardCode: enabled && scanner
      ? (code: string, willAct: boolean) => accept.current(code, 'keyboard', Date.now(), willAct)
      : undefined,
    subscribeToBroadcast,
  };
}

export function useSunmiCustomerDisplay(enabled: boolean, basket: Basket) {
  const latest = useRef(basket);
  const active = useRef(false);
  const send = useCallback(() => {
    if (!active.current || AppState.currentState !== 'active') return;
    const { title, lines, totalLabel, total, segmentTotal } = latest.current;
    if (segmentDisplay) updateSegment(segmentTotal);
    else void display?.showBasket(title, lines, totalLabel, total).catch(() => undefined);
  }, []);

  useEffect(() => {
    latest.current = basket;
    send();
  }, [basket, send]);

  useFocusEffect(useCallback(() => {
    if (!enabled || (!display && !segmentDisplay)) return;
    active.current = true;
    send();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') send();
      else hideCustomerDisplay();
    });
    return () => {
      active.current = false;
      subscription.remove();
      hideCustomerDisplay();
    };
  }, [enabled, send]));
}
