/**
 * Utility functions for parsing yt-dlp output and transforming data.
 */

import type { VideoMetadata, DownloadProgressEvent, DownloadStatus } from '@shared/types'

// ---------------------------------------------------------------------------
// yt-dlp JSON → VideoMetadata
// ---------------------------------------------------------------------------

export function parseYtDlpJson(raw: Record<string, unknown>): VideoMetadata {
  const id = String(raw.id ?? raw.display_id ?? '')
  const url = String(raw.webpage_url ?? raw.url ?? '')
  const thumbnail = extractBestThumbnail(raw)

  return {
    id,
    url,
    title: String(raw.title ?? raw.fulltitle ?? 'Untitled'),
    thumbnail,
    duration: typeof raw.duration === 'number' ? raw.duration : undefined,
    uploader: String(raw.uploader ?? raw.channel ?? raw.creator ?? ''),
    webpage_url: url,
    extractor: String(raw.extractor ?? raw.ie_key ?? ''),
  }
}

function extractBestThumbnail(raw: Record<string, unknown>): string {
  if (typeof raw.thumbnail === 'string' && raw.thumbnail) return raw.thumbnail

  if (Array.isArray(raw.thumbnails)) {
    type Thumb = { url?: string; width?: number; height?: number }
    const sorted = (raw.thumbnails as Thumb[])
      .filter((t) => !!t.url)
      .sort((a, b) => (b.width ?? 0) * (b.height ?? 0) - (a.width ?? 0) * (a.height ?? 0))
    return sorted[0]?.url ?? ''
  }

  return ''
}

// ---------------------------------------------------------------------------
// yt-dlp progress line → DownloadProgressEvent
// ---------------------------------------------------------------------------

const PROGRESS_RE = /\[download\]\s+([\d.]+)%\s+of\s+~?\s*([\S]+)\s+at\s+([\S]+)\s+ETA\s+([\S]+)/

/**
 * Parse a single line from yt-dlp stdout.
 * Returns a partial DownloadProgressEvent or null if the line isn't a progress line.
 */
export function parseProgressLine(
  line: string,
  id: string
): Partial<DownloadProgressEvent> | null {
  const m = PROGRESS_RE.exec(line)
  if (!m) return null

  const progress = parseFloat(m[1])
  const status: DownloadStatus = progress >= 100 ? 'processing' : 'downloading'

  return {
    id,
    progress,
    speed: m[3],
    eta: m[4],
    status,
  }
}

// ---------------------------------------------------------------------------
// Misc formatting
// ---------------------------------------------------------------------------

/** Format bytes to a human-readable string (B, KB, MB, GB). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

/** Truncate a title to maxLen chars, appending '…'. */
export function truncateTitle(title: string, maxLen = 60): string {
  return title.length > maxLen ? title.slice(0, maxLen - 1) + '…' : title
}
