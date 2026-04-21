import { useState, useCallback, useRef } from 'react'
import type { VideoMetadata, FetchProgressEvent } from '../types'

type FetchPhase = 'idle' | 'fetching' | 'done' | 'error'

export interface UseFetchState {
  phase: FetchPhase
  videos: VideoMetadata[]
  errors: Array<{ url: string; error: string }>
  activeUrl: string | null
}

export interface UseFetchActions {
  fetchVideos: (urls: string[]) => Promise<void>
  clearVideos: () => void
}

export function useVideoFetch(): [UseFetchState, UseFetchActions] {
  const [state, setState] = useState<UseFetchState>({
    phase: 'idle',
    videos: [],
    errors: [],
    activeUrl: null,
  })

  // Keep a ref to accumulated videos so the progress callback has fresh data
  const videosRef = useRef<VideoMetadata[]>([])
  const errorsRef = useRef<Array<{ url: string; error: string }>>([])

  const fetchVideos = useCallback(async (urls: string[]) => {
    videosRef.current = []
    errorsRef.current = []

    setState({ phase: 'fetching', videos: [], errors: [], activeUrl: urls[0] ?? null })

    // Subscribe to streaming progress events
    const unsubscribe = window.api.onFetchProgress((event: FetchProgressEvent) => {
      if (event.status === 'fetching') {
        setState((prev) => ({ ...prev, activeUrl: event.url }))
      }

      if (event.status === 'partial' && event.video) {
        // Avoid duplicates (same id from multiple events)
        if (!videosRef.current.some((v) => v.id === event.video!.id)) {
          videosRef.current = [...videosRef.current, event.video!]
          setState((prev) => ({
            ...prev,
            videos: videosRef.current,
          }))
        }
      }

      if (event.status === 'error' && event.error) {
        errorsRef.current = [...errorsRef.current, { url: event.url, error: event.error }]
        setState((prev) => ({ ...prev, errors: errorsRef.current }))
      }
    })

    try {
      const result = await window.api.fetchMetadata(urls)

      // Merge any errors returned from the IPC call itself
      if (result.errors.length > 0) {
        errorsRef.current = [...errorsRef.current, ...result.errors]
      }

      setState((prev) => ({
        ...prev,
        phase: videosRef.current.length === 0 && errorsRef.current.length > 0 ? 'error' : 'done',
        errors: errorsRef.current,
        activeUrl: null,
      }))
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      errorsRef.current = [...errorsRef.current, { url: urls[0] ?? '', error }]
      setState((prev) => ({ ...prev, phase: 'error', errors: errorsRef.current, activeUrl: null }))
    } finally {
      unsubscribe()
    }
  }, [])

  const clearVideos = useCallback(() => {
    videosRef.current = []
    errorsRef.current = []
    setState({ phase: 'idle', videos: [], errors: [], activeUrl: null })
  }, [])

  return [state, { fetchVideos, clearVideos }]
}
