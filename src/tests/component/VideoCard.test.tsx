import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import VideoCard from '@renderer/components/VideoCard'
import { MOCK_SINGLE_VIDEO, MOCK_CHANNEL_VIDEOS } from '../mocks/ytdlp'
import type { DownloadItem } from '@shared/types'

describe('VideoCard', () => {
  const onToggle = vi.fn()

  afterEach(() => {
    onToggle.mockClear()
  })

  it('renders video title and uploader', () => {
    render(
      <VideoCard
        video={MOCK_SINGLE_VIDEO}
        isSelected={false}
        onToggle={onToggle}
      />
    )

    expect(screen.getByText(MOCK_SINGLE_VIDEO.title)).toBeInTheDocument()
    expect(screen.getByText(`@${MOCK_SINGLE_VIDEO.uploader}`)).toBeInTheDocument()
  })

  it('renders thumbnail when available', () => {
    render(
      <VideoCard
        video={MOCK_SINGLE_VIDEO}
        isSelected={false}
        onToggle={onToggle}
      />
    )

    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', MOCK_SINGLE_VIDEO.thumbnail)
    expect(img).toHaveAttribute('alt', MOCK_SINGLE_VIDEO.title)
  })

  it('shows checked state when selected', () => {
    const { container } = render(
      <VideoCard
        video={MOCK_SINGLE_VIDEO}
        isSelected={true}
        onToggle={onToggle}
      />
    )

    // Check for pink checkmark styling
    const checkboxDiv = container.querySelector('[class*="bg-tt-pink"]')
    expect(checkboxDiv).toBeInTheDocument()
  })

  it('calls onToggle with video id when clicked', () => {
    render(
      <VideoCard
        video={MOCK_SINGLE_VIDEO}
        isSelected={false}
        onToggle={onToggle}
      />
    )

    const card = screen.getByTestId(`video-card-${MOCK_SINGLE_VIDEO.id}`)
    fireEvent.click(card)

    expect(onToggle).toHaveBeenCalledWith(MOCK_SINGLE_VIDEO.id)
  })

  it('does not call onToggle when in download mode', () => {
    const downloadItem: DownloadItem = {
      ...MOCK_SINGLE_VIDEO,
      status: 'downloading',
      progress: 45,
      speed: '1.2MiB/s',
    }

    render(
      <VideoCard
        video={MOCK_SINGLE_VIDEO}
        isSelected={true}
        downloadItem={downloadItem}
        onToggle={onToggle}
      />
    )

    const card = screen.getByTestId(`video-card-${MOCK_SINGLE_VIDEO.id}`)
    fireEvent.click(card)

    expect(onToggle).not.toHaveBeenCalled()
  })

  it('shows download progress when downloading', () => {
    const downloadItem: DownloadItem = {
      ...MOCK_SINGLE_VIDEO,
      status: 'downloading',
      progress: 45,
      speed: '1.2MiB/s',
    }

    render(
      <VideoCard
        video={MOCK_SINGLE_VIDEO}
        isSelected={true}
        downloadItem={downloadItem}
        onToggle={onToggle}
      />
    )

    expect(screen.getByText('45%')).toBeInTheDocument()
    expect(screen.getByText('1.2MiB/s')).toBeInTheDocument()
  })

  it('shows success state when download is done', () => {
    const downloadItem: DownloadItem = {
      ...MOCK_SINGLE_VIDEO,
      status: 'done',
      progress: 100,
      outputPath: '/mock/downloads/video.mp4',
    }

    const { container } = render(
      <VideoCard
        video={MOCK_SINGLE_VIDEO}
        isSelected={true}
        downloadItem={downloadItem}
        onToggle={onToggle}
      />
    )

    // Green checkmark icon should be visible
    const greenIcon = container.querySelector('[class*="bg-green-500"]')
    expect(greenIcon).toBeInTheDocument()
  })

  it('shows error state when download fails', () => {
    const downloadItem: DownloadItem = {
      ...MOCK_SINGLE_VIDEO,
      status: 'error',
      progress: 0,
      error: 'Video is private or removed',
    }

    const { container } = render(
      <VideoCard
        video={MOCK_SINGLE_VIDEO}
        isSelected={true}
        downloadItem={downloadItem}
        onToggle={onToggle}
      />
    )

    // Red icon should be visible
    const redIcon = container.querySelector('[class*="bg-red-500"]')
    expect(redIcon).toBeInTheDocument()
    expect(screen.getByText('Error')).toBeInTheDocument()
  })

  it('handles missing thumbnail gracefully', () => {
    const videoNoThumb = { ...MOCK_CHANNEL_VIDEOS[2], thumbnail: '' }

    render(
      <VideoCard
        video={videoNoThumb}
        isSelected={false}
        onToggle={onToggle}
      />
    )

    // Should render placeholder (SVG) instead of img
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('formats duration correctly', () => {
    render(
      <VideoCard
        video={MOCK_SINGLE_VIDEO}  // duration: 30
        isSelected={false}
        onToggle={onToggle}
      />
    )

    expect(screen.getByText('0:30')).toBeInTheDocument()
  })
})
