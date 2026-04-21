import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { dict, type Lang, type Translations } from './translations'

// ── Persistence ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'tiktok-dl:lang'

function loadLang(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'en' || v === 'ru') return v
  } catch { /* ignore */ }
  return 'en'
}

// ── Context ───────────────────────────────────────────────────────────────────

interface LangCtx {
  lang: Lang
  t: Translations
  toggle: () => void
}

const LanguageContext = createContext<LangCtx>({
  lang: 'en',
  t: dict.en,
  toggle: () => {},
})

// ── Provider ──────────────────────────────────────────────────────────────────

export function LanguageProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [lang, setLang] = useState<Lang>(loadLang)

  const toggle = useCallback(
    () => setLang((prev) => (prev === 'en' ? 'ru' : 'en')),
    []
  )

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, lang) } catch { /* ignore */ }
  }, [lang])

  return (
    <LanguageContext.Provider value={{ lang, t: dict[lang], toggle }}>
      {children}
    </LanguageContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/** Returns `{ lang, t, toggle }` */
export function useLanguage(): LangCtx {
  return useContext(LanguageContext)
}
