import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ES } from './locales/es';
import { setFormatLocale } from './utils';

/**
 * Internationalization.
 *
 * English is the source language: the translation key *is* the English string,
 * so the code reads naturally and an untranslated string degrades to English
 * instead of showing a raw key. Spanish lives in `locales/es.ts`.
 *
 * Adding a third language is one more dictionary file plus one entry in
 * `LANGUAGES` — nothing else changes.
 */

export type Lang = 'en' | 'es';

export const LANGUAGES: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
];

const DICTIONARIES: Record<Lang, Record<string, string>> = { en: {}, es: ES };

const STORAGE_KEY = 'mwc.lang';

export type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

const I18nCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: TranslateFn } | null>(null);

/** Replaces `{name}` placeholders. Keeps the token if no value was supplied. */
function interpolate(text: string, vars?: Record<string, string | number>) {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (stored && stored in DICTIONARIES) return stored;
    // Un usuario con el navegador en español arranca en español; el resto, inglés.
    return navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en';
  });

  // Se aplica de forma síncrona para que el primer render ya formatee bien.
  setFormatLocale(localeFor(lang));

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback<TranslateFn>(
    (key, vars) => interpolate(DICTIONARIES[lang][key] ?? key, vars),
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang: setLangState, t }), [lang, t]);

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}

/** Shorthand for components that only need to translate. */
export function useT(): TranslateFn {
  return useI18n().t;
}

/** Locale used by Intl for dates, numbers and currency. */
export function localeFor(lang: Lang) {
  return lang === 'es' ? 'es-US' : 'en-US';
}
