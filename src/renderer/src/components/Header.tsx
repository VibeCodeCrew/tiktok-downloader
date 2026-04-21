import React from 'react'
import { useLanguage } from '../i18n/LanguageContext'

interface HeaderProps {
  onMinimize?: () => void
  onMaximize?: () => void
  onClose?: () => void
}

const LANG_LABEL: Record<string, string> = { en: 'EN', ru: 'РУС' }

export default function Header({ onMinimize, onMaximize, onClose }: HeaderProps): React.JSX.Element {
  const { lang, t, toggle } = useLanguage()

  return (
    <header className="drag-region flex items-center justify-between px-5 py-3 border-b border-white/5">
      {/* Logo + Title */}
      <div className="no-drag flex items-center gap-3">
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-tt-pink to-purple-600 blur-sm opacity-70" />
          <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-tt-pink to-purple-600 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.16 8.16 0 004.77 1.52V6.75a4.86 4.86 0 01-1-.06z" />
            </svg>
          </div>
        </div>
        <div>
          <h1 className="text-sm font-bold text-white leading-none">TikTok Downloader</h1>
          <p className="text-xs text-white/40 mt-0.5">{t.header.poweredBy}</p>
        </div>
      </div>

      {/* Window controls + language toggle */}
      <div className="no-drag flex items-center gap-2">
        <button
          onClick={toggle}
          title={t.header.langLabel}
          className="flex items-center gap-1 px-2 py-0.5 rounded-lg
                     text-white/50 hover:text-white transition-colors duration-200
                     text-xs font-medium select-none"
        >
          <span className="tracking-wide">{LANG_LABEL[lang]}</span>
        </button>

        <div className="w-px h-3 bg-white/15" />

        <button onClick={onMinimize}
          className="w-3 h-3 rounded-full bg-yellow-400/80 hover:bg-yellow-400 transition-colors"
          title="Minimize" />
        <button onClick={onMaximize}
          className="w-3 h-3 rounded-full bg-green-400/80 hover:bg-green-400 transition-colors"
          title="Maximize" />
        <button onClick={onClose}
          className="w-3 h-3 rounded-full bg-red-400/80 hover:bg-red-400 transition-colors"
          title="Close" />
      </div>
    </header>
  )
}
