import { describe, it, expect } from 'vitest'
import {
  isTikTokVideoUrl,
  isTikTokChannelUrl,
  isTikTokUrl,
  isValidUrl,
  parseUrlList,
  deduplicateUrls,
  mergeUrls,
  formatDuration,
} from '@renderer/utils/urlUtils'

describe('isValidUrl', () => {
  it('accepts https URLs', () => {
    expect(isValidUrl('https://www.tiktok.com/@user/video/123')).toBe(true)
  })

  it('accepts http URLs', () => {
    expect(isValidUrl('http://example.com')).toBe(true)
  })

  it('rejects non-URL strings', () => {
    expect(isValidUrl('not a url')).toBe(false)
    expect(isValidUrl('www.tiktok.com')).toBe(false)
    expect(isValidUrl('')).toBe(false)
    expect(isValidUrl('ftp://example.com')).toBe(false)
  })
})

describe('isTikTokVideoUrl', () => {
  it('detects TikTok video URLs', () => {
    expect(isTikTokVideoUrl('https://www.tiktok.com/@username/video/7123456789012345678')).toBe(true)
    expect(isTikTokVideoUrl('https://vm.tiktok.com/@user/video/123')).toBe(true) // vm.tiktok.com also matches
    expect(isTikTokVideoUrl('https://www.tiktok.com/@user/video/9876543210987654321')).toBe(true)
  })

  it('rejects channel URLs', () => {
    expect(isTikTokVideoUrl('https://www.tiktok.com/@username')).toBe(false)
    expect(isTikTokVideoUrl('https://www.tiktok.com/@username/')).toBe(false)
  })

  it('rejects non-TikTok URLs', () => {
    expect(isTikTokVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(false)
    expect(isTikTokVideoUrl('https://instagram.com/p/abc')).toBe(false)
  })
})

describe('isTikTokChannelUrl', () => {
  it('detects TikTok channel/user URLs', () => {
    expect(isTikTokChannelUrl('https://www.tiktok.com/@username')).toBe(true)
    expect(isTikTokChannelUrl('https://www.tiktok.com/@username/')).toBe(true)
  })

  it('rejects video URLs', () => {
    expect(isTikTokChannelUrl('https://www.tiktok.com/@username/video/7123456789012345678')).toBe(
      false
    )
  })
})

describe('isTikTokUrl', () => {
  it('detects any TikTok URL', () => {
    expect(isTikTokUrl('https://www.tiktok.com/@user/video/123')).toBe(true)
    expect(isTikTokUrl('https://www.tiktok.com/@user')).toBe(true)
    expect(isTikTokUrl('https://vm.tiktok.com/abc')).toBe(true)
  })

  it('rejects non-TikTok URLs', () => {
    expect(isTikTokUrl('https://www.youtube.com')).toBe(false)
  })
})

describe('parseUrlList', () => {
  it('parses newline-separated URLs', () => {
    const text = `https://www.tiktok.com/@user/video/1
https://www.tiktok.com/@user/video/2
https://www.tiktok.com/@user/video/3`

    const result = parseUrlList(text)
    expect(result).toHaveLength(3)
    expect(result[0]).toBe('https://www.tiktok.com/@user/video/1')
  })

  it('filters out empty lines and invalid URLs', () => {
    const text = `https://www.tiktok.com/@user/video/1

not-a-url

https://www.tiktok.com/@user/video/2`

    const result = parseUrlList(text)
    expect(result).toHaveLength(2)
  })

  it('trims whitespace from URLs', () => {
    const text = '  https://www.tiktok.com/@user/video/1  '
    const result = parseUrlList(text)
    expect(result[0]).toBe('https://www.tiktok.com/@user/video/1')
  })

  it('returns empty array for empty input', () => {
    expect(parseUrlList('')).toHaveLength(0)
    expect(parseUrlList('   ')).toHaveLength(0)
    expect(parseUrlList('\n\n\n')).toHaveLength(0)
  })
})

describe('deduplicateUrls', () => {
  it('removes duplicate URLs', () => {
    const urls = [
      'https://example.com/1',
      'https://example.com/2',
      'https://example.com/1',
      'https://example.com/3',
    ]
    expect(deduplicateUrls(urls)).toHaveLength(3)
  })

  it('preserves insertion order', () => {
    const urls = ['https://b.com', 'https://a.com', 'https://c.com']
    expect(deduplicateUrls(urls)).toEqual(urls)
  })
})

describe('mergeUrls', () => {
  it('merges and deduplicates multiple arrays', () => {
    const a = ['https://example.com/1', 'https://example.com/2']
    const b = ['https://example.com/2', 'https://example.com/3']
    const result = mergeUrls(a, b)
    expect(result).toHaveLength(3)
    expect(result).toContain('https://example.com/1')
    expect(result).toContain('https://example.com/3')
  })
})

describe('formatDuration', () => {
  it('formats seconds into mm:ss', () => {
    expect(formatDuration(65)).toBe('1:05')
    expect(formatDuration(30)).toBe('0:30')
    expect(formatDuration(0)).toBe('')
  })

  it('formats hours correctly', () => {
    expect(formatDuration(3661)).toBe('1:01:01')
    expect(formatDuration(7200)).toBe('2:00:00')
  })

  it('returns empty string for missing/zero duration', () => {
    expect(formatDuration(undefined)).toBe('')
    expect(formatDuration(0)).toBe('')
    expect(formatDuration(-1)).toBe('')
  })
})
