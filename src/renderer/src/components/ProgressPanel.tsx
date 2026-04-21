import React from 'react'
import type { DownloadItem } from '../types'
import { useLanguage } from '../i18n/LanguageContext'

interface ProgressPanelProps {
  items: DownloadItem[]
  overallProgress: number
  isComplete: boolean
  onClear: () => void
}

function ItemRow({ item }: { item: DownloadItem }): React.JSX.Element {
  const { t } = useLanguage()
  const statusLabels = t.progress.status

  const isActive    = item.status === 'downloading' || item.status === 'processing'
  const isDone      = item.status === 'done'
  const isError     = item.status === 'error'
  const isCancelled = item.status === 'cancelled'

  return (
    <div className="flex flex-col gap-1.5 py-2 border-b border-white/5 last:border-0">
      <div className="flex items-center justify-between gap-2">
        {/* Status icon */}
        <div className="flex-shrink-0">
          {isDone ? (
            <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : isError ? (
            <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          ) : isCancelled ? (
            <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
              <svg className="w-3 h-3 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
              </svg>
            </div>
          ) : isActive ? (
            <div className="w-5 h-5 rounded-full border-2 border-tt-cyan border-t-transparent animate-spin" />
          ) : (
            <div className="w-5 h-5 rounded-full border border-white/20" />
          )}
        </div>

        {/* Title */}
        <p className="flex-1 text-xs text-white/80 truncate min-w-0" title={item.title}>
          {item.title}
        </p>

        {/* Right info */}
        <div className="flex-shrink-0 text-right">
          {isActive && (
            <div className="flex flex-col items-end">
              <span className="text-xs font-medium text-tt-cyan">{item.progress.toFixed(0)}%</span>
              {item.speed && <span className="text-xs text-white/30">{item.speed}</span>}
            </div>
          )}
          {isDone      && <span className="text-xs text-green-400 font-medium">{statusLabels.done}</span>}
          {isError     && <span className="text-xs text-red-400" title={item.error}>{statusLabels.error}</span>}
          {isCancelled && <span className="text-xs text-white/30">{statusLabels.cancelled}</span>}
          {item.status === 'pending' && <span className="text-xs text-white/30">{statusLabels.pending}</span>}
        </div>
      </div>

      {/* Progress bar */}
      {(isActive || item.progress > 0) && (
        <div className="ml-7 h-1 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.max(2, item.progress)}%`,
              background: isDone ? '#22c55e' : isError ? '#ef4444' : 'linear-gradient(90deg, #25f4ee, #fe2c55)',
            }}
          />
        </div>
      )}

      {isError && item.error && (
        <p className="ml-7 text-xs text-red-400/60 leading-tight">{item.error}</p>
      )}
    </div>
  )
}

export default function ProgressPanel({
  items,
  overallProgress,
  isComplete,
  onClear,
}: ProgressPanelProps): React.JSX.Element {
  const { t } = useLanguage()
  const p = t.progress

  if (items.length === 0) return <></>

  const doneCount   = items.filter((i) => i.status === 'done').length
  const errorCount  = items.filter((i) => i.status === 'error').length
  const activeCount = items.filter((i) => i.status === 'downloading' || i.status === 'processing').length

  return (
    <div className="glass-panel p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">{p.title}</h3>
          <p className="text-xs text-white/40 mt-0.5">
            {isComplete
              ? p.summary(doneCount, errorCount)
              : p.active(activeCount, doneCount, items.length)}
          </p>
        </div>
        {isComplete && (
          <button onClick={onClear} className="btn-secondary text-xs py-1.5 px-3">
            {p.clear}
          </button>
        )}
      </div>

      {/* Overall progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${overallProgress}%`,
              background: isComplete
                ? errorCount > 0 ? 'linear-gradient(90deg, #22c55e, #ef4444)' : '#22c55e'
                : 'linear-gradient(90deg, #25f4ee, #fe2c55)',
            }}
          />
        </div>
        <span className="text-xs font-semibold text-white/60 w-9 text-right flex-shrink-0">
          {overallProgress}%
        </span>
      </div>

      <div className="overflow-y-auto max-h-40">
        {items.map((item) => <ItemRow key={item.id} item={item} />)}
      </div>
    </div>
  )
}
