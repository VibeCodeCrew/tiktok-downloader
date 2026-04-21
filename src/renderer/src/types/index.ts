// Re-export all shared types so renderer code only needs one import
export type {
  VideoMetadata,
  DownloadItem,
  DownloadStatus,
  DownloadFormat,
  DownloadSettings,
  FetchResult,
  DownloadProgressEvent,
  FetchProgressEvent,
  StartDownloadPayload,
} from '@shared/types'

// ── Renderer-only types ───────────────────────────────────────────────────

export type AppPhase =
  | 'idle'        // Initial state
  | 'fetching'    // yt-dlp is extracting metadata
  | 'fetched'     // Videos ready for selection
  | 'downloading' // Downloads in progress
  | 'complete'    // All done

export interface FetchState {
  phase: AppPhase
  videos: import('./index').VideoMetadata[]
  errors: Array<{ url: string; error: string }>
  activeUrl?: string
}
