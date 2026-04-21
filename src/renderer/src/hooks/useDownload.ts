import { useState, useCallback, useRef } from 'react'
import type { DownloadItem, DownloadProgressEvent, DownloadSettings, VideoMetadata } from '../types'

export type DownloadPhase = 'idle' | 'downloading' | 'complete'

export interface UseDownloadState {
  phase: DownloadPhase
  items: DownloadItem[]
  overallProgress: number
}

export interface UseDownloadActions {
  startDownload: (selected: VideoMetadata[], settings: DownloadSettings) => Promise<void>
  cancelAll: () => void
  clearQueue: () => void
}

function buildInitialItems(videos: VideoMetadata[]): DownloadItem[] {
  return videos.map((v) => ({
    ...v,
    status: 'pending' as const,
    progress: 0,
  }))
}

function calcOverallProgress(items: DownloadItem[]): number {
  if (items.length === 0) return 0
  const total = items.reduce((sum, item) => {
    if (item.status === 'done') return sum + 100
    if (item.status === 'error' || item.status === 'cancelled') return sum + 100
    return sum + item.progress
  }, 0)
  return Math.round(total / items.length)
}

export function useDownload(): [UseDownloadState, UseDownloadActions] {
  const [state, setState] = useState<UseDownloadState>({
    phase: 'idle',
    items: [],
    overallProgress: 0,
  })

  const unsubscribeRef = useRef<(() => void) | null>(null)
  const itemsRef = useRef<DownloadItem[]>([])

  const startDownload = useCallback(
    async (selected: VideoMetadata[], settings: DownloadSettings) => {
      const initialItems = buildInitialItems(selected)
      itemsRef.current = initialItems

      setState({ phase: 'downloading', items: initialItems, overallProgress: 0 })

      // Subscribe to progress events
      unsubscribeRef.current = window.api.onDownloadProgress((event: DownloadProgressEvent) => {
        itemsRef.current = itemsRef.current.map((item) =>
          item.id === event.id
            ? {
                ...item,
                status: event.status,
                progress: event.progress,
                speed: event.speed,
                eta: event.eta,
                error: event.error,
                outputPath: event.outputPath ?? item.outputPath,
              }
            : item
        )
        const items = itemsRef.current
        const overall = calcOverallProgress(items)

        // Check if all done
        const allSettled = items.every(
          (i) => i.status === 'done' || i.status === 'error' || i.status === 'cancelled'
        )

        setState({
          phase: allSettled ? 'complete' : 'downloading',
          items,
          overallProgress: overall,
        })
      })

      try {
        await window.api.startDownload({
          items: selected.map((v) => ({ id: v.id, url: v.url, title: v.title })),
          settings,
        })
      } catch (err) {
        console.error('Download error:', err)
      } finally {
        unsubscribeRef.current?.()
        unsubscribeRef.current = null
        // Final state sync
        setState((prev) => ({
          ...prev,
          phase: 'complete',
          overallProgress: calcOverallProgress(itemsRef.current),
        }))
      }
    },
    []
  )

  const cancelAll = useCallback(async () => {
    unsubscribeRef.current?.()
    unsubscribeRef.current = null
    await window.api.cancelDownload()
    setState((prev) => ({
      ...prev,
      phase: 'idle',
      items: prev.items.map((i) =>
        i.status === 'downloading' || i.status === 'pending'
          ? { ...i, status: 'cancelled' as const }
          : i
      ),
    }))
  }, [])

  const clearQueue = useCallback(() => {
    itemsRef.current = []
    setState({ phase: 'idle', items: [], overallProgress: 0 })
  }, [])

  return [state, { startDownload, cancelAll, clearQueue }]
}
