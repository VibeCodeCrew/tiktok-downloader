import React, { useState, useRef } from 'react'
import { parseUrlList, mergeUrls, isValidUrl } from '../utils/urlUtils'
import { useLanguage } from '../i18n/LanguageContext'

interface InputPanelProps {
  onFetch: (urls: string[]) => void
  isLoading: boolean
}

export default function InputPanel({ onFetch, isLoading }: InputPanelProps): React.JSX.Element {
  const { t } = useLanguage()
  const i = t.input

  const [singleUrl, setSingleUrl] = useState('')
  const [multiUrls, setMultiUrls] = useState('')
  const [fileError, setFileError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'single' | 'multi'>('single')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const collectUrls = (): string[] => {
    const fromSingle = singleUrl.trim() && isValidUrl(singleUrl.trim()) ? [singleUrl.trim()] : []
    const fromMulti = parseUrlList(multiUrls)
    return mergeUrls(fromSingle, fromMulti)
  }

  const handleFetch = (): void => {
    const urls = collectUrls()
    if (urls.length === 0) return
    onFetch(urls)
  }

  const handleFileUpload = async (): Promise<void> => {
    setFileError(null)
    try {
      const content = await window.api.readTextFile()
      if (content === null) return

      const urls = parseUrlList(content)
      if (urls.length === 0) {
        setFileError(i.noUrlsInFile)
        return
      }

      const existing = parseUrlList(multiUrls)
      setMultiUrls(mergeUrls(existing, urls).join('\n'))
      setActiveTab('multi')
    } catch (err) {
      setFileError(err instanceof Error ? err.message : i.noUrlsInFile)
    }
  }

  const urlCount = collectUrls().length
  const isReady = urlCount > 0 && !isLoading

  return (
    <div className="glass-panel p-5 flex flex-col gap-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">{i.title}</h2>
          <p className="text-xs text-white/40 mt-0.5">{i.subtitle}</p>
        </div>
        {urlCount > 0 && (
          <span className="tag-badge bg-tt-pink/20 text-tt-pink border border-tt-pink/30">
            {i.urlCount(urlCount)}
          </span>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-xl">
        {(['single', 'multi'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
              activeTab === tab
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            {tab === 'single' ? i.tabSingle : i.tabMulti}
          </button>
        ))}
      </div>

      {/* Input area */}
      {activeTab === 'single' ? (
        <input
          data-testid="single-url-input"
          type="url"
          value={singleUrl}
          onChange={(e) => setSingleUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && isReady && handleFetch()}
          placeholder={i.placeholderSingle}
          className="glass-input text-sm"
          disabled={isLoading}
        />
      ) : (
        <div className="relative">
          <textarea
            data-testid="multi-url-input"
            value={multiUrls}
            onChange={(e) => setMultiUrls(e.target.value)}
            placeholder={i.placeholderMulti}
            className="glass-input text-sm resize-none h-28 leading-relaxed font-mono text-xs"
            disabled={isLoading}
          />
          <span className="absolute bottom-3 right-3 text-xs text-white/25 pointer-events-none">
            {i.onePerLine}
          </span>
        </div>
      )}

      {/* File upload row */}
      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            const text = await file.text()
            const urls = parseUrlList(text)
            const existing = parseUrlList(multiUrls)
            setMultiUrls(mergeUrls(existing, urls).join('\n'))
            setActiveTab('multi')
            e.target.value = ''
          }}
        />
        <button
          onClick={handleFileUpload}
          disabled={isLoading}
          className="btn-secondary text-xs flex items-center gap-2"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          {i.loadTxt}
        </button>

        {fileError && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd" />
            </svg>
            {fileError}
          </p>
        )}
      </div>

      {/* Fetch button */}
      <button
        data-testid="fetch-button"
        onClick={handleFetch}
        disabled={!isReady}
        className="btn-primary flex items-center justify-center gap-2 text-sm"
      >
        {isLoading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {i.fetchingBtn}
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {i.fetchBtn}
          </>
        )}
      </button>
    </div>
  )
}
