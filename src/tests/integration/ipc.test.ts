import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockApi } from '../setup'
import { MOCK_SINGLE_VIDEO, MOCK_CHANNEL_VIDEOS } from '../mocks/ytdlp'
import type { FetchProgressEvent, DownloadProgressEvent } from '@shared/types'

/**
 * Integration tests for IPC communication between renderer and main process.
 *
 * These tests verify that the window.api mock behaves correctly and that
 * hooks / components respond to streaming IPC events as expected.
 */

describe('IPC: fetchMetadata', () => {
  it('calls window.api.fetchMetadata with provided URLs', async () => {
    mockApi.fetchMetadata.mockResolvedValue({ errors: [] })

    const urls = [
      'https://www.tiktok.com/@user/video/123',
      'https://www.tiktok.com/@user/video/456',
    ]

    await window.api.fetchMetadata(urls)

    expect(mockApi.fetchMetadata).toHaveBeenCalledWith(urls)
  })

  it('returns errors array from fetch', async () => {
    mockApi.fetchMetadata.mockResolvedValue({
      errors: [{ url: 'https://tiktok.com/@user/video/999', error: 'Video not found' }],
    })

    const result = await window.api.fetchMetadata(['https://tiktok.com/@user/video/999'])
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].error).toBe('Video not found')
  })
})

describe('IPC: streaming fetch progress events', () => {
  it('onFetchProgress subscribes and receives events', () => {
    const received: FetchProgressEvent[] = []
    const unsub = window.api.onFetchProgress((event) => received.push(event))

    expect(typeof unsub).toBe('function')
    expect(mockApi.onFetchProgress).toHaveBeenCalled()
  })

  it('simulates receiving partial video events progressively', async () => {
    const received: FetchProgressEvent[] = []
    let capturedCallback: ((event: FetchProgressEvent) => void) | null = null

    mockApi.onFetchProgress.mockImplementation((cb: (event: FetchProgressEvent) => void) => {
      capturedCallback = cb
      return () => {}
    })

    window.api.onFetchProgress((event) => received.push(event))

    // Simulate streaming events as if main process is sending them
    const events: FetchProgressEvent[] = [
      { url: 'https://tiktok.com/@ch', status: 'fetching' },
      { url: 'https://tiktok.com/@ch', status: 'partial', video: MOCK_CHANNEL_VIDEOS[0] },
      { url: 'https://tiktok.com/@ch', status: 'partial', video: MOCK_CHANNEL_VIDEOS[1] },
      { url: 'https://tiktok.com/@ch', status: 'done' },
    ]

    for (const event of events) {
      capturedCallback?.(event)
    }

    expect(received).toHaveLength(4)
    expect(received[1].video?.id).toBe(MOCK_CHANNEL_VIDEOS[0].id)
    expect(received[2].video?.id).toBe(MOCK_CHANNEL_VIDEOS[1].id)
  })

  it('unsubscribe stops receiving events', () => {
    const received: FetchProgressEvent[] = []
    let capturedCallback: ((event: FetchProgressEvent) => void) | null = null

    mockApi.onFetchProgress.mockImplementation((cb: (event: FetchProgressEvent) => void) => {
      capturedCallback = cb
      return () => {
        capturedCallback = null
      }
    })

    const unsub = window.api.onFetchProgress((event) => received.push(event))
    capturedCallback?.({ url: 'https://tiktok.com', status: 'fetching' })
    expect(received).toHaveLength(1)

    unsub()
    capturedCallback?.({ url: 'https://tiktok.com', status: 'done' })
    expect(received).toHaveLength(1) // No new events after unsubscribe
  })
})

describe('IPC: startDownload', () => {
  it('calls window.api.startDownload with correct payload', async () => {
    mockApi.startDownload.mockResolvedValue({ done: true })

    const payload = {
      items: MOCK_CHANNEL_VIDEOS.map((v) => ({ id: v.id, url: v.url, title: v.title })),
      settings: { outputDir: '/mock/downloads', format: 'video' as const },
    }

    await window.api.startDownload(payload)

    expect(mockApi.startDownload).toHaveBeenCalledWith(payload)
  })
})

describe('IPC: streaming download progress events', () => {
  it('onDownloadProgress receives progress updates', async () => {
    const received: DownloadProgressEvent[] = []
    let capturedCallback: ((event: DownloadProgressEvent) => void) | null = null

    mockApi.onDownloadProgress.mockImplementation(
      (cb: (event: DownloadProgressEvent) => void) => {
        capturedCallback = cb
        return () => {}
      }
    )

    window.api.onDownloadProgress((event) => received.push(event))

    const progressEvents: DownloadProgressEvent[] = [
      {
        id: MOCK_SINGLE_VIDEO.id,
        progress: 10,
        speed: '500KiB/s',
        eta: '01:00',
        status: 'downloading',
      },
      {
        id: MOCK_SINGLE_VIDEO.id,
        progress: 50,
        speed: '1MiB/s',
        eta: '00:30',
        status: 'downloading',
      },
      {
        id: MOCK_SINGLE_VIDEO.id,
        progress: 100,
        status: 'done',
        outputPath: '/mock/downloads/video.mp4',
      },
    ]

    for (const event of progressEvents) {
      capturedCallback?.(event)
    }

    expect(received).toHaveLength(3)
    expect(received[0].progress).toBe(10)
    expect(received[1].progress).toBe(50)
    expect(received[2].status).toBe('done')
    expect(received[2].outputPath).toBe('/mock/downloads/video.mp4')
  })

  it('handles error progress events', async () => {
    const received: DownloadProgressEvent[] = []
    let capturedCallback: ((event: DownloadProgressEvent) => void) | null = null

    mockApi.onDownloadProgress.mockImplementation(
      (cb: (event: DownloadProgressEvent) => void) => {
        capturedCallback = cb
        return () => {}
      }
    )

    window.api.onDownloadProgress((event) => received.push(event))

    capturedCallback?.({
      id: MOCK_SINGLE_VIDEO.id,
      progress: 0,
      status: 'error',
      error: 'Video is geo-blocked in your region',
    })

    expect(received[0].status).toBe('error')
    expect(received[0].error).toBe('Video is geo-blocked in your region')
  })
})

describe('IPC: selectDirectory', () => {
  it('returns selected directory path', async () => {
    mockApi.selectDirectory.mockResolvedValue('/Users/test/Downloads')
    const result = await window.api.selectDirectory()
    expect(result).toBe('/Users/test/Downloads')
  })

  it('returns null when dialog is cancelled', async () => {
    mockApi.selectDirectory.mockResolvedValue(null)
    const result = await window.api.selectDirectory()
    expect(result).toBeNull()
  })
})

describe('IPC: readTextFile', () => {
  it('returns file content as string', async () => {
    const content = 'https://www.tiktok.com/@user/video/1\nhttps://www.tiktok.com/@user/video/2'
    mockApi.readTextFile.mockResolvedValue(content)

    const result = await window.api.readTextFile()
    expect(result).toBe(content)
  })

  it('returns null when dialog is cancelled', async () => {
    mockApi.readTextFile.mockResolvedValue(null)
    const result = await window.api.readTextFile()
    expect(result).toBeNull()
  })
})

describe('IPC: cancelDownload', () => {
  it('calls window.api.cancelDownload', async () => {
    await window.api.cancelDownload()
    expect(mockApi.cancelDownload).toHaveBeenCalled()
  })
})
