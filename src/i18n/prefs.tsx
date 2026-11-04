import * as SecureStore from 'expo-secure-store';
import { Appearance } from 'react-native';
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { bn } from './bn';
import { defaultLang, translate, type Lang, type TextSize, type Vars } from './translate';

const K = { lang: 'sortpi.lang', size: 'sortpi.textsize', guide: 'sortpi.guide.done', scheme: 'sortpi.scheme' };

/** Screen colours: follow the phone, or always light, or always dark (a shop counter at night). */
export type Scheme = 'auto' | 'light' | 'dark';
const applyScheme = (s: Scheme) => Appearance.setColorScheme(s === 'auto' ? 'unspecified' : s);

type Prefs = {
  ready: boolean;
  lang: Lang;
  /** False until the person has picked a language on the first screen. */
  langChosen: boolean;
  size: TextSize;
  scheme: Scheme;
  guideDone: boolean;
  setLang: (l: Lang) => Promise<void>;
  setSize: (s: TextSize) => Promise<void>;
  setScheme: (s: Scheme) => Promise<void>;
  setGuideDone: (done: boolean) => Promise<void>;
  t: (text: string, vars?: Vars) => string;
};

const Ctx = createContext<Prefs | null>(null);

/** Language, text size and "help seen" live on the phone, so they are there before anyone signs in. */
export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [lang, setLangState] = useState<Lang>(defaultLang(Intl.DateTimeFormat().resolvedOptions().locale));
  const [langChosen, setLangChosen] = useState(false);
  const [size, setSizeState] = useState<TextSize>('normal');
  const [scheme, setSchemeState] = useState<Scheme>('auto');
  const [guideDone, setGuideState] = useState(false);
  const reported = useRef(new Set<string>());

  useEffect(() => {
    void (async () => {
      try {
        const [l, s, g, c] = await Promise.all([SecureStore.getItemAsync(K.lang), SecureStore.getItemAsync(K.size), SecureStore.getItemAsync(K.guide), SecureStore.getItemAsync(K.scheme)]);
        if (c === 'light' || c === 'dark') {
          setSchemeState(c);
          applyScheme(c);
        }
        if (l === 'en' || l === 'bn') {
          setLangState(l);
          setLangChosen(true);
        }
        if (s === 'normal' || s === 'large' || s === 'xlarge') setSizeState(s);
        setGuideState(g === '1');
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setLang = useCallback(async (l: Lang) => {
    setLangState(l);
    setLangChosen(true);
    await SecureStore.setItemAsync(K.lang, l);
  }, []);
  const setSize = useCallback(async (s: TextSize) => {
    setSizeState(s);
    await SecureStore.setItemAsync(K.size, s);
  }, []);
  const setScheme = useCallback(async (c: Scheme) => {
    setSchemeState(c);
    applyScheme(c);
    await SecureStore.setItemAsync(K.scheme, c);
  }, []);
  const setGuideDone = useCallback(async (done: boolean) => {
    setGuideState(done);
    if (done) await SecureStore.setItemAsync(K.guide, '1');
    else await SecureStore.deleteItemAsync(K.guide);
  }, []);

  const t = useCallback(
    (text: string, vars?: Vars) =>
      translate(bn, lang, text, vars, (missing) => {
        if (__DEV__ && !reported.current.has(missing)) {
          reported.current.add(missing);
          console.log(`[i18n] no Bangla for: ${missing}`);
        }
      }),
    [lang],
  );

  const value = useMemo(() => ({ ready, lang, langChosen, size, scheme, guideDone, setLang, setSize, setScheme, setGuideDone, t }), [ready, lang, langChosen, size, scheme, guideDone, setLang, setSize, setScheme, setGuideDone, t]);
  return <Ctx value={value}>{children}</Ctx>;
}

export function usePrefs(): Prefs {
  const v = use(Ctx);
  if (!v) throw new Error('usePrefs needs <PrefsProvider>');
  return v;
}

/** `const t = useT(); t('Start selling')` gives the line in the chosen language. */
export const useT = () => usePrefs().t;
