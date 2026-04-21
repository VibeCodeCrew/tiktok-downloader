import React from 'react'
import type { DownloadSettings, DownloadFormat, VideoQuality, AudioQuality } from '../types'
import { useLanguage } from '../i18n/LanguageContext'

interface DownloadSettingsProps {
  settings: DownloadSettings
  selectedCount: number
  isDownloading: boolean
  onChangeOutputDir: () => void
  onChangeFormat: (format: DownloadFormat) => void
  onChangeVideoQuality: (q: VideoQuality) => void
  onChangeAudioQuality: (q: AudioQuality) => void
  onDownload: () => void
  onCancel: () => void
}

function QualitySelect<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  disabled: boolean
}): React.JSX.Element {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        disabled={disabled}
        className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl
                   px-3 py-2 text-sm text-white outline-none cursor-pointer
                   hover:bg-white/10 hover:border-white/20 transition-all duration-200
                   disabled:opacity-40 disabled:cursor-not-allowed
                   focus:border-tt-pink/50 focus:bg-white/10"
        style={{ WebkitAppearance: 'none' }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-slate-900 text-white">
            {o.label}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40"
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  )
}

export default function DownloadSettingsPanel({
  settings,
  selectedCount,
  isDownloading,
  onChangeOutputDir,
  onChangeFormat,
  onChangeVideoQuality,
  onChangeAudioQuality,
  onDownload,
  onCancel,
}: DownloadSettingsProps): React.JSX.Element {
  const { t } = useLanguage()
  const s = t.settings

  const dirName = settings.outputDir
    ? settings.outputDir.split(/[\\/]/).filter(Boolean).pop() ?? settings.outputDir
    : s.chooseFolder

  const videoQualityOptions = Object.entries(s.videoQualityOptions).map(([value, label]) => ({
    value: value as VideoQuality,
    label,
  }))
  const audioQualityOptions = Object.entries(s.audioQualityOptions).map(([value, label]) => ({
    value: value as AudioQuality,
    label,
  }))

  return (
    <div className="glass-panel p-5 flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-white">{s.title}</h2>
        <p className="text-xs text-white/40 mt-0.5">{s.subtitle}</p>
      </div>

      {/* Output directory */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-white/60 uppercase tracking-wide">
          {s.saveTo}
        </label>
        <button
          onClick={onChangeOutputDir}
          disabled={isDownloading}
          className="flex items-center gap-3 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3
                     hover:bg-white/10 hover:border-white/20 transition-all duration-200 text-left
                     disabled:opacity-40 disabled:cursor-not-allowed group"
        >
          <div className="w-8 h-8 rounded-lg bg-tt-cyan/10 border border-tt-cyan/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-tt-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/40">{s.outputFolder}</p>
            <p className={`text-sm font-medium truncate ${settings.outputDir ? 'text-white' : 'text-white/30'}`}
               title={settings.outputDir || undefined}>
              {dirName}
            </p>
          </div>
          <svg className="w-4 h-4 text-white/30 group-hover:text-white/50 transition-colors flex-shrink-0"
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Format toggle */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-white/60 uppercase tracking-wide">
          {s.format}
        </label>
        <div className="flex gap-2">
          {(['video', 'audio'] as DownloadFormat[]).map((fmt) => (
            <button
              key={fmt}
              onClick={() => onChangeFormat(fmt)}
              disabled={isDownloading}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                flex items-center justify-center gap-2 border
                disabled:opacity-40 disabled:cursor-not-allowed
                ${settings.format === fmt
                  ? fmt === 'video'
                    ? 'bg-tt-pink/20 border-tt-pink/40 text-tt-pink'
                    : 'bg-tt-cyan/20 border-tt-cyan/40 text-tt-cyan'
                  : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white/60'
                }`}
            >
              {fmt === 'video' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 10l4.553-2.069A1 1 0 0121 8.869v6.262a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              )}
              {fmt === 'video' ? s.videoFmt : s.audioFmt}
            </button>
          ))}
        </div>
      </div>

      {/* Quality selector */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-white/60 uppercase tracking-wide">
          {settings.format === 'video' ? s.videoQuality : s.audioQuality}
        </label>
        {settings.format === 'video' ? (
          <QualitySelect
            value={settings.videoQuality}
            options={videoQualityOptions}
            onChange={onChangeVideoQuality}
            disabled={isDownloading}
          />
        ) : (
          <QualitySelect
            value={settings.audioQuality}
            options={audioQualityOptions}
            onChange={onChangeAudioQuality}
            disabled={isDownloading}
          />
        )}
      </div>

      {/* Download / Cancel */}
      <div className="pt-1">
        {isDownloading ? (
          <button onClick={onCancel}
            className="w-full btn-secondary flex items-center justify-center gap-2 text-sm py-3">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            {s.cancelBtn}
          </button>
        ) : (
          <button
            data-testid="download-button"
            onClick={onDownload}
            disabled={selectedCount === 0 || !settings.outputDir}
            className="w-full btn-primary flex items-center justify-center gap-2 text-sm py-3"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {s.downloadBtn(selectedCount, settings.format)}
          </button>
        )}

        {!settings.outputDir && !isDownloading && (
          <p className="text-xs text-yellow-400/60 text-center mt-2">
            {s.selectFolderHint}
          </p>
        )}
      </div>
    </div>
  )
}
