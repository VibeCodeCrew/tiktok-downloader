import React, { useState, useCallback } from 'react'
import Header from './components/Header'
import InputPanel from './components/InputPanel'
import VideoGrid from './components/VideoGrid'
import DownloadSettingsPanel from './components/DownloadSettings'
import ProgressPanel from './components/ProgressPanel'
import { useVideoFetch } from './hooks/useVideoFetch'
import { useDownload } from './hooks/useDownload'
import { usePersistedSettings } from './hooks/usePersistedSettings'
import { useLanguage } from './i18n/LanguageContext'
import type { DownloadFormat, VideoMetadata, VideoQuality, AudioQuality } from './types'

export default function App(): React.JSX.Element {
  // ── State ────────────────────────────────────────────────────────────────
  const { t } = useLanguage()
  const [fetchState, { fetchVideos, clearVideos }] = useVideoFetch()
  const [downloadState, { startDownload, cancelAll, clearQueue }] = useDownload()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [settings, setSettings] = usePersistedSettings()

  const isFetching = fetchState.phase === 'fetching'
  const hasFetched = fetchState.phase === 'done' || fetchState.phase === 'error'
  const isDownloading = downloadState.phase === 'downloading'
  const isComplete = downloadState.phase === 'complete'

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleFetch = useCallback(
    async (urls: string[]) => {
      clearQueue()
      await fetchVideos(urls)
      // Auto-select all after fetch
      setSelectedIds(new Set(fetchState.videos.map((v) => v.id)))
    },
    [fetchVideos, clearQueue, fetchState.videos]
  )

  // When fetch completes, videos stream in → keep selectedIds in sync
  React.useEffect(() => {
    if (fetchState.phase === 'done') {
      setSelectedIds(new Set(fetchState.videos.map((v) => v.id)))
    }
  }, [fetchState.phase, fetchState.videos])

  const handleToggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(fetchState.videos.map((v) => v.id)))
  }, [fetchState.videos])

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const handleSelectDirectory = useCallback(async () => {
    const dir = await window.api.selectDirectory()
    if (dir) setSettings((prev) => ({ ...prev, outputDir: dir }))
  }, [])

  const handleChangeFormat = useCallback((format: DownloadFormat) => {
    setSettings((prev) => ({ ...prev, format }))
  }, [])

  const handleChangeVideoQuality = useCallback((videoQuality: VideoQuality) => {
    setSettings((prev) => ({ ...prev, videoQuality }))
  }, [])

  const handleChangeAudioQuality = useCallback((audioQuality: AudioQuality) => {
    setSettings((prev) => ({ ...prev, audioQuality }))
  }, [])

  const handleDownload = useCallback(async () => {
    const selected: VideoMetadata[] = fetchState.videos.filter((v) => selectedIds.has(v.id))
    if (selected.length === 0 || !settings.outputDir) return
    await startDownload(selected, settings)
  }, [fetchState.videos, selectedIds, settings, startDownload])

  const handleCancelDownload = useCallback(() => {
    cancelAll()
  }, [cancelAll])

  const handleClearQueue = useCallback(() => {
    clearQueue()
  }, [clearQueue])

  const handleMinimize = (): void => window.electron.ipcRenderer.send('minimize-window')
  const handleMaximize = (): void => window.electron.ipcRenderer.send('maximize-window')
  const handleClose = (): void => window.electron.ipcRenderer.send('close-window')

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen w-screen h-screen overflow-hidden flex flex-col bg-gradient-to-br from-slate-900 to-slate-800 text-white relative">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="bg-orb w-96 h-96 animate-float"
          style={{
            background: 'radial-gradient(circle, rgba(254,44,85,0.18) 0%, transparent 70%)',
            top: '-100px',
            left: '-80px',
          }}
        />
        <div
          className="bg-orb w-80 h-80 animate-float-delayed"
          style={{
            background: 'radial-gradient(circle, rgba(37,244,238,0.12) 0%, transparent 70%)',
            top: '20%',
            right: '-60px',
          }}
        />
        <div
          className="bg-orb w-72 h-72 animate-float"
          style={{
            background: 'radial-gradient(circle, rgba(147,51,234,0.15) 0%, transparent 70%)',
            bottom: '-60px',
            left: '30%',
            animationDelay: '3s',
          }}
        />
      </div>

      {/* Window chrome */}
      <Header onMinimize={handleMinimize} onMaximize={handleMaximize} onClose={handleClose} />

      {/* Main layout */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left column: Input + (when downloaded) progress */}
        <aside className="w-80 flex-shrink-0 p-4 flex flex-col gap-3 overflow-y-auto border-r border-white/5">
          <InputPanel
            onFetch={handleFetch}
            isLoading={isFetching}
          />

          {/* Error list from fetching */}
          {fetchState.errors.length > 0 && (
            <div className="glass-panel p-4">
              <h3 className="text-xs font-semibold text-red-400 mb-2 uppercase tracking-wide">
                {t.app.fetchErrors(fetchState.errors.length)}
              </h3>
              <div className="flex flex-col gap-2 max-h-32 overflow-y-auto">
                {fetchState.errors.map((e, i) => (
                  <div key={i} className="text-xs">
                    <p className="text-white/40 truncate">{e.url}</p>
                    <p className="text-red-400/80 leading-tight">{e.error}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fetching status */}
          {isFetching && fetchState.activeUrl && (
            <div className="glass-panel p-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-tt-pink border-t-transparent animate-spin flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-white/60">{t.app.scanning}</p>
                  <p className="text-xs text-white/40 truncate">{fetchState.activeUrl}</p>
                </div>
              </div>
              {fetchState.videos.length > 0 && (
                <p className="text-xs text-tt-cyan mt-2">
                  {t.app.videosFoundLive(fetchState.videos.length)}
                </p>
              )}
            </div>
          )}

          {/* Settings + Download – show once we have results */}
          {(hasFetched || isDownloading || isComplete) && (
            <DownloadSettingsPanel
              settings={settings}
              selectedCount={selectedIds.size}
              isDownloading={isDownloading}
              onChangeOutputDir={handleSelectDirectory}
              onChangeFormat={handleChangeFormat}
              onChangeVideoQuality={handleChangeVideoQuality}
              onChangeAudioQuality={handleChangeAudioQuality}
              onDownload={handleDownload}
              onCancel={handleCancelDownload}
            />
          )}

          {/* Progress panel */}
          {(isDownloading || isComplete) && downloadState.items.length > 0 && (
            <ProgressPanel
              items={downloadState.items}
              overallProgress={downloadState.overallProgress}
              isComplete={isComplete}
              onClear={handleClearQueue}
            />
          )}
        </aside>

        {/* Right column: Video grid */}
        <main className="flex-1 p-4 overflow-hidden flex flex-col gap-3">
          {fetchState.videos.length > 0 ? (
            <VideoGrid
              videos={fetchState.videos}
              selectedIds={selectedIds}
              downloadItems={downloadState.items}
              onToggle={handleToggle}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              isDownloading={isDownloading || isComplete}
            />
          ) : (
            /* Empty / welcome state */
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
              <div className="relative">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-tt-pink/20 to-purple-600/20 border border-tt-pink/20 flex items-center justify-center">
                  <svg className="w-12 h-12 text-tt-pink/60" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.16 8.16 0 004.77 1.52V6.75a4.86 4.86 0 01-1-.06z" />
                  </svg>
                </div>
                <div className="absolute -inset-3 rounded-4xl bg-tt-pink/5 blur-xl animate-pulse-slow" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-white mb-2">{t.app.emptyTitle}</h2>
                <p className="text-sm text-white/40 max-w-xs leading-relaxed">
                  {t.app.emptySubtitle(t.input.fetchBtn).split(`«${t.input.fetchBtn}»`).map((part, i, arr) =>
                    i < arr.length - 1
                      ? <React.Fragment key={i}>{part}<strong className="text-white/60">«{t.input.fetchBtn}»</strong></React.Fragment>
                      : <React.Fragment key={i}>{part}</React.Fragment>
                  )}
                </p>
              </div>

              <div className="flex flex-col gap-2 text-xs text-white/30">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-tt-pink/60 flex-shrink-0" />
                  {t.app.feature1}
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-tt-cyan/60 flex-shrink-0" />
                  {t.app.feature2}
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400/60 flex-shrink-0" />
                  {t.app.feature3}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
