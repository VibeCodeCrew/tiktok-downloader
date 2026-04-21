import React, { useState } from 'react'
import type { VideoMetadata, DownloadItem } from '../types'
import { formatDuration } from '../utils/urlUtils'
import { truncateTitle } from '../utils/parser'
import { useLanguage } from '../i18n/LanguageContext'

interface VideoCardProps {
  video: VideoMetadata
  isSelected: boolean
  downloadItem?: DownloadItem
  onToggle: (id: string) => void
}

const STATUS_COLORS: Record<string, string> = {
  pending:     'text-white/40',
  downloading: 'text-tt-cyan',
  processing:  'text-purple-400',
  done:        'text-green-400',
  error:       'text-red-400',
  cancelled:   'text-white/30',
}

export default function VideoCard({
  video,
  isSelected,
  downloadItem,
  onToggle,
}: VideoCardProps): React.JSX.Element {
  const { t } = useLanguage()
  const statusLabels = t.progress.status

  const [thumbError, setThumbError] = useState(false)
  const status = downloadItem?.status
  const progress = downloadItem?.progress ?? 0

  return (
    <div
      data-testid={`video-card-${video.id}`}
      onClick={() => !downloadItem && onToggle(video.id)}
      className={`relative glass-panel-hover p-3 flex flex-col gap-2 cursor-pointer select-none
        transition-all duration-200
        ${isSelected && !downloadItem ? 'ring-1 ring-tt-pink/50 bg-tt-pink/5' : ''}
        ${downloadItem ? 'cursor-default' : ''}
      `}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-white/5">
        {!thumbError && video.thumbnail ? (
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-full object-cover"
            onError={() => setThumbError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-10 h-10 text-white/20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.16 8.16 0 004.77 1.52V6.75a4.86 4.86 0 01-1-.06z" />
            </svg>
          </div>
        )}

        {/* Duration badge */}
        {video.duration && (
          <span className="absolute bottom-1.5 right-1.5 bg-black/70 backdrop-blur-sm text-white text-xs px-1.5 py-0.5 rounded-md">
            {formatDuration(video.duration)}
          </span>
        )}

        {/* Download overlay */}
        {downloadItem && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center gap-2 p-3">
            {status === 'done' ? (
              <div className="w-10 h-10 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : status === 'error' ? (
              <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            ) : (status === 'downloading' || status === 'processing') ? (
              <>
                <div className="text-white font-bold text-lg">{progress.toFixed(0)}%</div>
                <div className="w-full bg-white/20 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${progress}%`,
                      background: 'linear-gradient(90deg, #25f4ee, #fe2c55)',
                    }}
                  />
                </div>
                {downloadItem.speed && (
                  <span className="text-xs text-white/60">{downloadItem.speed}</span>
                )}
              </>
            ) : null}
          </div>
        )}

        {/* Checkbox */}
        {!downloadItem && (
          <div
            className={`absolute top-2 left-2 w-5 h-5 rounded-md border-2 transition-all duration-150
              flex items-center justify-center
              ${isSelected
                ? 'bg-tt-pink border-tt-pink'
                : 'bg-black/40 border-white/30 backdrop-blur-sm'
              }`}
          >
            {isSelected && (
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium text-white leading-tight line-clamp-2" title={video.title}>
          {truncateTitle(video.title, 80)}
        </p>
        {video.uploader && (
          <p className="text-xs text-white/40 truncate">@{video.uploader.replace(/^@/, '')}</p>
        )}
        {downloadItem && status && (
          <span className={`text-xs font-medium ${STATUS_COLORS[status] ?? 'text-white/40'}`}>
            {statusLabels[status] ?? status}
            {status === 'error' && downloadItem.error && (
              <span className="ml-1 text-red-400/70" title={downloadItem.error}> (!)</span>
            )}
          </span>
        )}
      </div>
    </div>
  )
}
