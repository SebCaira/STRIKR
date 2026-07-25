import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DICT, Lang, LANGS, LANG_LABELS } from './dict';

const KEY = 'strikr_lang';

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  tArray: (key: string) => string[];
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fr');

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => {
      if (v && (LANGS as string[]).includes(v)) setLangState(v as Lang);
    });
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem(KEY, l).catch(() => {});
  }, []);

  const t = useCallback(
    (key: string): string => {
      const d = DICT[lang] || DICT.fr;
      const v = key in d ? d[key] : DICT.fr[key] !== undefined ? DICT.fr[key] : key;
      return Array.isArray(v) ? v.join(', ') : v;
    },
    [lang]
  );

  const tArray = useCallback(
    (key: string): string[] => {
      const d = DICT[lang] || DICT.fr;
      const v = key in d ? d[key] : DICT.fr[key];
      return Array.isArray(v) ? v : [];
    },
    [lang]
  );

  return <I18nContext.Provider value={{ lang, setLang, t, tArray }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export { LANGS, LANG_LABELS };
export type { Lang };
