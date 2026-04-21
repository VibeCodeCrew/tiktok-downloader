import { spawn, ChildProcess } from 'child_process'
import { join } from 'path'
import type { DownloadProgressEvent, DownloadSettings, VideoQuality, AudioQuality } from '@shared/types'
import { getYtDlpBinary } from '../utils/binary'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DownloadTask {
  id: string
  url: string
  title: string
}

export interface CancelableDownload {
  promise: Promise<string | undefined>
  cancel: () => void
}

// ---------------------------------------------------------------------------
// Format / quality helpers
// ---------------------------------------------------------------------------

/**
 * Build a yt-dlp format selector for video that ALWAYS includes audio.
 *
 * TikTok streams come in several shapes:
 *   • Single container with muxed video+audio  (format id like "download")
 *   • Separate DASH video + DASH audio streams  (need ffmpeg merge)
 *
 * Using bare `bestvideo[ext=mp4]+bestaudio[ext=m4a]` is too strict and
 * silently falls back to a video-only stream on many TikTok videos.
 *
 * The wildcard form `bestvideo*+bestaudio*` accepts any container and
 * reliably selects audio together with video.
 */
function buildVideoFormat(quality: VideoQuality): string {
  if (quality === 'best') {
    // No height cap — pick best video stream that has audio, or merge best pair
    return 'bestvideo*+bestaudio*/best'
  }
  // Height-capped — still require audio
  return (
    `bestvideo*[height<=${quality}]+bestaudio*/` +
    `bestvideo*[height<=${quality}]+bestaudio/` +
    `best[height<=${quality}]/best`
  )
}

/**
 * Map AudioQuality to yt-dlp --audio-quality value.
 * '0' = best VBR; numeric string = CBR target kbps.
 */
function buildAudioQuality(quality: AudioQuality): string {
  return quality === 'best' ? '0' : `${quality}K`
}

// ---------------------------------------------------------------------------
// Argument builder
// ---------------------------------------------------------------------------

function buildArgs(url: string, settings: DownloadSettings): string[] {
  const output = join(settings.outputDir, '%(uploader)s - %(title)s.%(ext)s')
  const common = [
    '--no-warnings',
    '--newline',
    '-o', output,
    '--no-check-certificate',
  ]

  if (settings.format === 'audio') {
    return [
      ...common,
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', buildAudioQuality(settings.audioQuality),
      url,
    ]
  }

  // Video: always merge with audio, output as mp4
  return [
    ...common,
    '-f', buildVideoFormat(settings.videoQuality),
    '--merge-output-format', 'mp4',
    url,
  ]
}

// ---------------------------------------------------------------------------
// Progress parsing
// ---------------------------------------------------------------------------

const PROGRESS_RE =
  /\[download\]\s+([\d.]+)%\s+of\s+~?\s*([\S]+)\s+at\s+([\S]+)\s+ETA\s+([\S]+)/

const DESTINATION_RE = /\[download\]\s+Destination:\s+(.+)/
const MERGE_RE       = /\[(?:ffmpeg|Merger)\]\s+Merging formats into\s+"(.+)"/
const ALREADY_DL_RE  = /\[download\]\s+(.+)\s+has already been downloaded/

function parseProgressLine(line: string): {
  progress?: number
  speed?: string
  eta?: string
  outputPath?: string
  alreadyDownloaded?: boolean
} {
  const pm = PROGRESS_RE.exec(line)
  if (pm) return { progress: parseFloat(pm[1]), speed: pm[3], eta: pm[4] }

  const dm = DESTINATION_RE.exec(line)
  if (dm) return { outputPath: dm[1].trim() }

  const mm = MERGE_RE.exec(line)
  if (mm) return { outputPath: mm[1].trim() }

  const am = ALREADY_DL_RE.exec(line)
  if (am) return { alreadyDownloaded: true, outputPath: am[1].trim() }

  return {}
}

// ---------------------------------------------------------------------------
// Download manager
// ---------------------------------------------------------------------------

class DownloadManager {
  private activeProcesses = new Map<string, ChildProcess>()

  startDownload(
    task: DownloadTask,
    settings: DownloadSettings,
    onProgress: (event: DownloadProgressEvent) => void
  ): CancelableDownload {
    const args = buildArgs(task.url, settings)
    const proc = spawn(getYtDlpBinary(), args, { stdio: ['ignore', 'pipe', 'pipe'] })

    this.activeProcesses.set(task.id, proc)

    let outputPath: string | undefined
    let lastProgress = 0

    proc.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf8')
      for (const line of text.split('\n')) {
        const parsed = parseProgressLine(line)

        if (parsed.alreadyDownloaded) {
          outputPath = parsed.outputPath
          onProgress({ id: task.id, progress: 100, status: 'done', outputPath })
          return
        }

        if (parsed.outputPath) outputPath = parsed.outputPath

        if (parsed.progress !== undefined) {
          lastProgress = parsed.progress
          onProgress({
            id: task.id,
            progress: parsed.progress,
            speed: parsed.speed,
            eta: parsed.eta,
            status: parsed.progress >= 100 ? 'processing' : 'downloading',
          })
        }
      }
    })

    proc.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf8').trim()
      if (!text) return
      const errorLines = text.split('\n').filter((l) => l.includes('ERROR:') || l.includes('error:'))
      if (errorLines.length > 0) {
        onProgress({ id: task.id, progress: lastProgress, status: 'error', error: errorLines.join(' | ') })
      }
    })

    const promise = new Promise<string | undefined>((resolve, reject) => {
      proc.on('close', (code, signal) => {
        this.activeProcesses.delete(task.id)

        if (signal === 'SIGTERM' || signal === 'SIGKILL') {
          onProgress({ id: task.id, progress: lastProgress, status: 'cancelled' })
          resolve(undefined)
          return
        }

        if (code === 0) {
          onProgress({ id: task.id, progress: 100, status: 'done', outputPath })
          resolve(outputPath)
        } else {
          const err = new Error(`yt-dlp exited with code ${code} for: ${task.title}`)
          onProgress({ id: task.id, progress: lastProgress, status: 'error', error: err.message })
          reject(err)
        }
      })

      proc.on('error', (err) => {
        this.activeProcesses.delete(task.id)
        onProgress({ id: task.id, progress: 0, status: 'error', error: err.message })
        reject(err)
      })
    })

    return {
      promise,
      cancel: () => {
        const p = this.activeProcesses.get(task.id)
        if (p) { p.kill('SIGTERM'); this.activeProcesses.delete(task.id) }
      },
    }
  }

  cancelAll(): void {
    for (const [, proc] of this.activeProcesses) proc.kill('SIGTERM')
    this.activeProcesses.clear()
  }
}

export const downloadManager = new DownloadManager()
