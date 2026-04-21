/**
 * Mock yt-dlp responses for testing.
 */
import type { VideoMetadata } from '@shared/types'

export const MOCK_SINGLE_VIDEO: VideoMetadata = {
  id: '7123456789012345678',
  url: 'https://www.tiktok.com/@testuser/video/7123456789012345678',
  title: 'Amazing TikTok Dance #viral',
  thumbnail: 'https://p16-sign.tiktokcdn.com/mock-thumbnail.jpg',
  duration: 30,
  uploader: 'testuser',
  webpage_url: 'https://www.tiktok.com/@testuser/video/7123456789012345678',
  extractor: 'TikTok',
}

export const MOCK_CHANNEL_VIDEOS: VideoMetadata[] = [
  {
    id: '7111111111111111111',
    url: 'https://www.tiktok.com/@testchannel/video/7111111111111111111',
    title: 'First TikTok video',
    thumbnail: 'https://p16-sign.tiktokcdn.com/thumbnail1.jpg',
    duration: 15,
    uploader: 'testchannel',
    webpage_url: 'https://www.tiktok.com/@testchannel/video/7111111111111111111',
    extractor: 'TikTok',
  },
  {
    id: '7222222222222222222',
    url: 'https://www.tiktok.com/@testchannel/video/7222222222222222222',
    title: 'Second TikTok video',
    thumbnail: 'https://p16-sign.tiktokcdn.com/thumbnail2.jpg',
    duration: 60,
    uploader: 'testchannel',
    webpage_url: 'https://www.tiktok.com/@testchannel/video/7222222222222222222',
    extractor: 'TikTok',
  },
  {
    id: '7333333333333333333',
    url: 'https://www.tiktok.com/@testchannel/video/7333333333333333333',
    title: 'Third video with a really long title that should be truncated in the UI component',
    thumbnail: '',
    duration: 45,
    uploader: 'testchannel',
    webpage_url: 'https://www.tiktok.com/@testchannel/video/7333333333333333333',
    extractor: 'TikTok',
  },
]

// Raw yt-dlp JSON output examples
export const RAW_SINGLE_VIDEO_JSON = JSON.stringify({
  id: '7123456789012345678',
  webpage_url: 'https://www.tiktok.com/@testuser/video/7123456789012345678',
  title: 'Amazing TikTok Dance #viral',
  thumbnail: 'https://p16-sign.tiktokcdn.com/mock-thumbnail.jpg',
  duration: 30,
  uploader: 'testuser',
  extractor: 'TikTok',
})

export const RAW_CHANNEL_NDJSON = MOCK_CHANNEL_VIDEOS.map((v) =>
  JSON.stringify({
    id: v.id,
    webpage_url: v.url,
    title: v.title,
    thumbnail: v.thumbnail,
    duration: v.duration,
    uploader: v.uploader,
    extractor: v.extractor,
    ie_key: 'TikTok',
  })
).join('\n')

// yt-dlp progress line examples
export const MOCK_PROGRESS_LINES = {
  progress45: '[download]  45.6% of 12.34MiB at   1.23MiB/s ETA 00:05',
  progress100: '[download] 100% of 12.34MiB in 00:10',
  destination: '[download] Destination: /mock/downloads/testuser - Amazing TikTok Dance.mp4',
  merging: '[ffmpeg] Merging formats into "/mock/downloads/testuser - Amazing TikTok Dance.mp4"',
  error: 'ERROR: [TikTok] 7123456789012345678: Video is private or removed',
}
