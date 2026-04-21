// ---------------------------------------------------------------------------
// Video metadata returned by yt-dlp --dump-json / --flat-playlist
// ---------------------------------------------------------------------------

export interface VideoMetadata {
  id: string
  url: string
  title: string
  thumbnail: string
  duration?: number
  uploader?: string
  webpage_url?: string
  extractor?: string
}

// ---------------------------------------------------------------------------
// Download items & state
// ---------------------------------------------------------------------------

export type DownloadStatus =
  | 'pending'
  | 'downloading'
  | 'processing'
  | 'done'
  | 'error'
  | 'cancelled'

export interface DownloadItem extends VideoMetadata {
  status: DownloadStatus
  /** 0-100 */
  progress: number
  speed?: string
  eta?: string
  error?: string
  outputPath?: string
}

export type DownloadFormat = 'video' | 'audio'

/**
 * Video resolution cap. 'best' = no cap (highest available).
 * Values correspond to max height passed to yt-dlp format selector.
 */
export type VideoQuality = 'best' | '1080' | '720' | '480' | '360' | '240'

/**
 * Audio bitrate for MP3 output.
 * 'best' = VBR 0 (highest quality variable bitrate).
 */
export type AudioQuality = 'best' | '320' | '192' | '128' | '64'

export interface DownloadSettings {
  outputDir: string
  format: DownloadFormat
  videoQuality: VideoQuality
  audioQuality: AudioQuality
}

// ---------------------------------------------------------------------------
// IPC payloads
// ---------------------------------------------------------------------------

export interface FetchResult {
  videos: VideoMetadata[]
  errors: Array<{ url: string; error: string }>
}

export interface DownloadProgressEvent {
  id: string
  /** 0-100 */
  progress: number
  speed?: string
  eta?: string
  status: DownloadStatus
  error?: string
  outputPath?: string
}

export interface FetchProgressEvent {
  url: string
  status: 'fetching' | 'partial' | 'done' | 'error'
  video?: VideoMetadata
  error?: string
}

export interface StartDownloadPayload {
  items: Array<{ id: string; url: string; title: string }>
  settings: DownloadSettings
}
