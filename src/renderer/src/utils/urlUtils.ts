/**
 * URL validation and classification utilities for TikTok (and generic) links.
 */

const TIKTOK_VIDEO_RE = /tiktok\.com\/@[^/]+\/video\/\d+/i
const TIKTOK_CHANNEL_RE = /tiktok\.com\/@[^/?#]+\/?(?:\?|$|#)/i
const TIKTOK_RE = /tiktok\.com/i

/** Check if a URL looks like a TikTok video link. */
export function isTikTokVideoUrl(url: string): boolean {
  return TIKTOK_VIDEO_RE.test(url)
}

/** Check if a URL looks like a TikTok channel/user page. */
export function isTikTokChannelUrl(url: string): boolean {
  return TIKTOK_CHANNEL_RE.test(url) && !TIKTOK_VIDEO_RE.test(url)
}

/** Check if a URL belongs to TikTok at all. */
export function isTikTokUrl(url: string): boolean {
  return TIKTOK_RE.test(url)
}

/** Basic URL validation (must start with http/https). */
export function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Parse a block of text (newline-separated) into individual valid URLs.
 * Strips empty lines and trims whitespace.
 */
export function parseUrlList(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && isValidUrl(line))
}

/**
 * Deduplicate a list of URLs while preserving insertion order.
 */
export function deduplicateUrls(urls: string[]): string[] {
  return [...new Set(urls)]
}

/**
 * Merge and deduplicate multiple URL lists.
 */
export function mergeUrls(...lists: string[][]): string[] {
  return deduplicateUrls(lists.flat())
}

/** Format seconds into a human-readable duration string. */
export function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}
