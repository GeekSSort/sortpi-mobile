import { CameraView, useCameraPermissions, type BarcodeType } from 'expo-camera';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Pressable, Vibration, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/components/icons/icon';
import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { nextRead } from './debounce';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n/prefs';

/** QR plus the 1D codes shops use (the web label printer draws EAN-13/UPC/EAN-8, else Code 128). */
const TYPES: BarcodeType[] = ['qr', 'ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'];

type Props = { onCode: (code: string) => void; paused?: boolean; height?: number };

export function Scanner({ onCode, paused = false, height = 220 }: Props) {
  const t = useT();
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const last = useRef<{ code: string; at: number }>({ code: '', at: 0 });

  // The preview can stay black the first time a screen opens, or after the app comes back from the background.
  // Mounting a fresh CameraView each time the screen is shown, and again when the app returns, brings it back; it also
  // releases the camera while the screen is not showing.
  const [focused, setFocused] = useState(true);
  const [mountKey, setMountKey] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setMountKey((k) => k + 1);
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => state === 'active' && setMountKey((k) => k + 1));
    return () => sub.remove();
  }, []);

  if (!permission) return <View style={{ height }} />;

  // Explain first, ask second: the system only lets an app ask once, and a "Don't allow" sends people to Settings.
  if (!permission.granted) {
    return (
      <View style={{ minHeight: height, borderRadius: Radius.lg, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16 }}>
        <Icon name="ScanLine" size={28} color={theme.brand} />
        <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
          SortPi uses your camera to scan barcodes and QR codes. Nothing is recorded or saved.
        </ThemedText>
        {permission.canAskAgain ? <Button title="Allow camera" onPress={() => void requestPermission()} /> : <Button title="Open Settings" variant="secondary" onPress={() => void Linking.openSettings()} />}
      </View>
    );
  }

  function handle({ data }: { data: string }) {
    const { accept, last: next } = nextRead(last.current, data, Date.now());
    last.current = next; // updated on every read, so a code held in view stays "seen" and does not repeat
    if (!accept) return;
    Vibration.vibrate(40);
    onCode(data);
  }

  return (
    <View style={{ height, borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: '#000' }}>
      {focused ? <CameraView key={mountKey} style={{ flex: 1 }} facing="back" enableTorch={torch} barcodeScannerSettings={{ barcodeTypes: TYPES }} onBarcodeScanned={paused ? undefined : handle} /> : null}
      <View pointerEvents="none" style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: '70%', height: '55%', borderRadius: Radius.md, borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)' }} />
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={t(torch ? 'Turn torch off' : 'Turn torch on')} onPress={() => setTorch((t) => !t)} style={{ position: 'absolute', top: 10, right: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={torch ? 'FlashlightOff' : 'Flashlight'} size={20} color="#fff" />
      </Pressable>
    </View>
  );
}
