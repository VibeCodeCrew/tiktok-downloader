import { spawn } from 'child_process'
import type { VideoMetadata } from '@shared/types'
import { getYtDlpBinary } from '../utils/binary'

// ---------------------------------------------------------------------------
// Metadata parsing helpers
// ---------------------------------------------------------------------------

function extractThumbnail(data: Record<string, unknown>): string {
  if (typeof data.thumbnail === 'string' && data.thumbnail) {
    return data.thumbnail
  }
  if (Array.isArray(data.thumbnails) && data.thumbnails.length > 0) {
    const sorted = [...(data.thumbnails as Array<{ url?: string; width?: number; height?: number }>)]
      .filter((t) => t.url)
      .sort((a, b) => (b.width ?? 0) * (b.height ?? 0) - (a.width ?? 0) * (a.height ?? 0))
    return sorted[0]?.url ?? ''
  }
  return ''
}

export function parseVideoMetadata(data: Record<string, unknown>): VideoMetadata {
  const id = String(data.id ?? data.display_id ?? '')
  const url = String(data.webpage_url ?? data.url ?? '')

  return {
    id,
    url,
    title: String(data.title ?? data.fulltitle ?? 'Untitled'),
    thumbnail: extractThumbnail(data),
    duration: typeof data.duration === 'number' ? data.duration : undefined,
    uploader: String(data.uploader ?? data.channel ?? data.creator ?? ''),
    webpage_url: url,
    extractor: String(data.extractor ?? data.ie_key ?? ''),
  }
}

// ---------------------------------------------------------------------------
// Metadata fetching
// ---------------------------------------------------------------------------

/**
 * Fetches metadata for a single URL or a playlist/channel URL.
 *
 * For playlists yt-dlp emits one JSON object per line; we stream those
 * back via the `onVideo` callback so the UI updates progressively.
 */
export function fetchMetadata(
  url: string,
  onVideo: (video: VideoMetadata) => void,
  signal?: AbortSignal
): Promise<VideoMetadata[]> {
  return new Promise((resolve, reject) => {
    const binary = getYtDlpBinary()
    const args = [
      '--dump-json',
      '--flat-playlist',
      '--no-warnings',
      '--no-check-certificate',
      url,
    ]

    const proc = spawn(binary, args, { stdio: ['ignore', 'pipe', 'pipe'] })

    if (signal) {
      signal.addEventListener('abort', () => {
        proc.kill('SIGTERM')
      })
    }

    const videos: VideoMetadata[] = []
    let buffer = ''
    let stderrBuffer = ''

    proc.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf8')
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        try {
          const parsed = JSON.parse(trimmed) as Record<string, unknown>
          const video = parseVideoMetadata(parsed)
          if (video.id) {
            videos.push(video)
            onVideo(video)
          }
        } catch {
          // Non-JSON line (yt-dlp warnings/info) – ignore
        }
      }
    })

    proc.stderr.on('data', (chunk: Buffer) => {
      stderrBuffer += chunk.toString('utf8')
    })

    proc.on('error', (err) => {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(
          new Error(
            'yt-dlp binary not found. Please run `npm install` to download it automatically.'
          )
        )
      } else {
        reject(err)
      }
    })

    proc.on('close', (code) => {
      // Flush remaining buffer
      if (buffer.trim()) {
        try {
          const parsed = JSON.parse(buffer.trim()) as Record<string, unknown>
          const video = parseVideoMetadata(parsed)
          if (video.id) {
            videos.push(video)
            onVideo(video)
          }
        } catch {
          /* ignore */
        }
      }

      if (code === 0 || videos.length > 0) {
        resolve(videos)
      } else {
        const errMsg =
          stderrBuffer.trim() ||
          `yt-dlp exited with code ${code}. The URL may be private, geo-blocked, or invalid.`
        reject(new Error(errMsg))
      }
    })
  })
}
