import React from 'react'
import type { VideoMetadata, DownloadItem } from '../types'
import VideoCard from './VideoCard'
import { useLanguage } from '../i18n/LanguageContext'

interface VideoGridProps {
  videos: VideoMetadata[]
  selectedIds: Set<string>
  downloadItems: DownloadItem[]
  onToggle: (id: string) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  isDownloading: boolean
}

export default function VideoGrid({
  videos,
  selectedIds,
  downloadItems,
  onToggle,
  onSelectAll,
  onDeselectAll,
  isDownloading,
}: VideoGridProps): React.JSX.Element {
  const { t } = useLanguage()
  const g = t.grid

  const allSelected = videos.length > 0 && selectedIds.size === videos.length
  const noneSelected = selectedIds.size === 0
  const downloadMap = new Map(downloadItems.map((d) => [d.id, d]))

  if (videos.length === 0) return <></>

  return (
    <div className="flex flex-col gap-3 min-h-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white">
            {g.videosFound(videos.length)}
          </span>
          {!isDownloading && (
            <span className="text-xs text-white/40">{g.selected(selectedIds.size)}</span>
          )}
        </div>

        {!isDownloading && (
          <button
            onClick={allSelected ? onDeselectAll : onSelectAll}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
          >
            <div
              className={`w-3.5 h-3.5 rounded border transition-colors ${
                allSelected
                  ? 'bg-tt-pink border-tt-pink'
                  : noneSelected
                  ? 'border-white/30'
                  : 'bg-tt-pink/40 border-tt-pink/60'
              } flex items-center justify-center`}
            >
              {!noneSelected && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {allSelected ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
                  )}
                </svg>
              )}
            </div>
            {allSelected ? g.deselectAll : g.selectAll}
          </button>
        )}
      </div>

      {/* Grid */}
      <div
        className="grid gap-3 overflow-y-auto pr-1"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}
      >
        {videos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            isSelected={selectedIds.has(video.id)}
            downloadItem={downloadMap.get(video.id)}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  )
}
