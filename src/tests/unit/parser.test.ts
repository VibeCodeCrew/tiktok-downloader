import { describe, it, expect } from 'vitest'
import { parseYtDlpJson, parseProgressLine, formatBytes, truncateTitle } from '@renderer/utils/parser'
import { MOCK_SINGLE_VIDEO } from '../mocks/ytdlp'

describe('parseYtDlpJson', () => {
  it('parses a complete yt-dlp JSON object', () => {
    const raw = {
      id: '7123456789012345678',
      webpage_url: 'https://www.tiktok.com/@testuser/video/7123456789012345678',
      title: 'Amazing TikTok Dance #viral',
      thumbnail: 'https://p16-sign.tiktokcdn.com/mock-thumbnail.jpg',
      duration: 30,
      uploader: 'testuser',
      extractor: 'TikTok',
    }

    const result = parseYtDlpJson(raw)

    expect(result.id).toBe(MOCK_SINGLE_VIDEO.id)
    expect(result.url).toBe(MOCK_SINGLE_VIDEO.url)
    expect(result.title).toBe(MOCK_SINGLE_VIDEO.title)
    expect(result.thumbnail).toBe(MOCK_SINGLE_VIDEO.thumbnail)
    expect(result.duration).toBe(30)
    expect(result.uploader).toBe('testuser')
    expect(result.extractor).toBe('TikTok')
  })

  it('uses fallback fields when primary fields are missing', () => {
    const raw = {
      display_id: 'alt-id',
      url: 'https://example.com/video',
      fulltitle: 'Full Title',
      channel: 'channel-name',
      ie_key: 'Extractor',
    }

    const result = parseYtDlpJson(raw)

    expect(result.id).toBe('alt-id')
    expect(result.url).toBe('https://example.com/video')
    expect(result.title).toBe('Full Title')
    expect(result.uploader).toBe('channel-name')
    expect(result.extractor).toBe('Extractor')
  })

  it('falls back to Untitled when title is missing', () => {
    const result = parseYtDlpJson({ id: '1' })
    expect(result.title).toBe('Untitled')
  })

  it('picks the highest-resolution thumbnail from thumbnails array', () => {
    const raw = {
      id: '1',
      thumbnails: [
        { url: 'https://small.jpg', width: 100, height: 100 },
        { url: 'https://large.jpg', width: 1280, height: 720 },
        { url: 'https://medium.jpg', width: 720, height: 480 },
      ],
    }

    const result = parseYtDlpJson(raw)
    expect(result.thumbnail).toBe('https://large.jpg')
  })

  it('prefers direct thumbnail over thumbnails array', () => {
    const raw = {
      id: '1',
      thumbnail: 'https://direct.jpg',
      thumbnails: [{ url: 'https://array.jpg', width: 9999, height: 9999 }],
    }

    const result = parseYtDlpJson(raw)
    expect(result.thumbnail).toBe('https://direct.jpg')
  })

  it('returns empty string for thumbnail when neither field exists', () => {
    const result = parseYtDlpJson({ id: '1' })
    expect(result.thumbnail).toBe('')
  })
})

describe('parseProgressLine', () => {
  it('parses a standard progress line', () => {
    const line = '[download]  45.6% of 12.34MiB at   1.23MiB/s ETA 00:05'
    const result = parseProgressLine(line, 'test-id')

    expect(result).not.toBeNull()
    expect(result!.id).toBe('test-id')
    expect(result!.progress).toBeCloseTo(45.6)
    expect(result!.speed).toBe('1.23MiB/s')
    expect(result!.eta).toBe('00:05')
    expect(result!.status).toBe('downloading')
  })

  it('marks status as processing when progress reaches 100%', () => {
    const line = '[download] 100.0% of 12.34MiB at   5.00MiB/s ETA 00:00'
    const result = parseProgressLine(line, 'test-id')

    expect(result).not.toBeNull()
    expect(result!.status).toBe('processing')
    expect(result!.progress).toBe(100.0)
  })

  it('returns null for non-progress lines', () => {
    expect(parseProgressLine('[download] Destination: /some/path.mp4', 'id')).toBeNull()
    expect(parseProgressLine('[ffmpeg] Merging formats', 'id')).toBeNull()
    expect(parseProgressLine('', 'id')).toBeNull()
    expect(parseProgressLine('INFO: Some info message', 'id')).toBeNull()
  })

  it('handles ~ in file size (approximate size)', () => {
    const line = '[download]  30.0% of ~10.00MiB at 500.00KiB/s ETA 01:14'
    const result = parseProgressLine(line, 'id')
    expect(result).not.toBeNull()
    expect(result!.progress).toBeCloseTo(30.0)
  })
})

describe('formatBytes', () => {
  it('formats bytes correctly', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1024)).toBe('1.0 KB')
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB')
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB')
  })

  it('formats decimal values correctly', () => {
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(2.5 * 1024 * 1024)).toBe('2.5 MB')
  })
})

describe('truncateTitle', () => {
  it('does not truncate short titles', () => {
    expect(truncateTitle('Short title')).toBe('Short title')
  })

  it('truncates titles exceeding maxLen', () => {
    const long = 'A'.repeat(70)
    const result = truncateTitle(long, 60)
    expect(result).toHaveLength(60)
    expect(result.endsWith('…')).toBe(true)
  })

  it('respects custom maxLen', () => {
    const result = truncateTitle('Hello World', 5)
    expect(result).toBe('Hell…')
  })

  it('returns original when exactly at maxLen', () => {
    const title = 'A'.repeat(60)
    expect(truncateTitle(title, 60)).toBe(title)
  })
})
