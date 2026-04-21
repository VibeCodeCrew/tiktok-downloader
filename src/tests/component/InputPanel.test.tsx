import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import InputPanel from '@renderer/components/InputPanel'
import { mockApi } from '../setup'

describe('InputPanel', () => {
  const onFetch = vi.fn()

  beforeEach(() => {
    onFetch.mockClear()
  })

  it('renders the input panel with default state', () => {
    render(<InputPanel onFetch={onFetch} isLoading={false} />)

    expect(screen.getByTestId('single-url-input')).toBeInTheDocument()
    expect(screen.getByTestId('fetch-button')).toBeInTheDocument()
    expect(screen.getByText('Fetch Videos')).toBeInTheDocument()
  })

  it('fetch button is disabled when no URLs are entered', () => {
    render(<InputPanel onFetch={onFetch} isLoading={false} />)
    expect(screen.getByTestId('fetch-button')).toBeDisabled()
  })

  it('enables fetch button when a valid URL is entered', async () => {
    render(<InputPanel onFetch={onFetch} isLoading={false} />)
    const input = screen.getByTestId('single-url-input')

    await userEvent.type(input, 'https://www.tiktok.com/@user/video/123')

    expect(screen.getByTestId('fetch-button')).not.toBeDisabled()
  })

  it('calls onFetch with the entered URL when button is clicked', async () => {
    render(<InputPanel onFetch={onFetch} isLoading={false} />)
    const input = screen.getByTestId('single-url-input')

    await userEvent.type(input, 'https://www.tiktok.com/@user/video/123')
    await userEvent.click(screen.getByTestId('fetch-button'))

    expect(onFetch).toHaveBeenCalledWith(['https://www.tiktok.com/@user/video/123'])
  })

  it('does not call onFetch with an invalid URL', async () => {
    render(<InputPanel onFetch={onFetch} isLoading={false} />)
    const input = screen.getByTestId('single-url-input')

    await userEvent.type(input, 'not-a-valid-url')

    // Fetch button should remain disabled
    expect(screen.getByTestId('fetch-button')).toBeDisabled()
    expect(onFetch).not.toHaveBeenCalled()
  })

  it('switches to multi-URL tab and accepts multiple URLs', async () => {
    render(<InputPanel onFetch={onFetch} isLoading={false} />)

    await userEvent.click(screen.getByText('Multiple URLs'))

    const textarea = screen.getByTestId('multi-url-input')
    expect(textarea).toBeInTheDocument()

    await userEvent.type(
      textarea,
      'https://www.tiktok.com/@user/video/1{enter}https://www.tiktok.com/@user/video/2'
    )

    await userEvent.click(screen.getByTestId('fetch-button'))

    expect(onFetch).toHaveBeenCalledWith([
      'https://www.tiktok.com/@user/video/1',
      'https://www.tiktok.com/@user/video/2',
    ])
  })

  it('shows spinner and disables input while loading', () => {
    render(<InputPanel onFetch={onFetch} isLoading={true} />)

    expect(screen.getByText('Fetching Metadata…')).toBeInTheDocument()
    expect(screen.getByTestId('fetch-button')).toBeDisabled()
    expect(screen.getByTestId('single-url-input')).toBeDisabled()
  })

  it('submits on Enter key press in single URL input', async () => {
    render(<InputPanel onFetch={onFetch} isLoading={false} />)
    const input = screen.getByTestId('single-url-input')

    await userEvent.type(input, 'https://www.tiktok.com/@user/video/123{enter}')

    expect(onFetch).toHaveBeenCalledWith(['https://www.tiktok.com/@user/video/123'])
  })

  it('calls readTextFile when load txt button is clicked', async () => {
    mockApi.readTextFile.mockResolvedValue(
      'https://www.tiktok.com/@user/video/1\nhttps://www.tiktok.com/@user/video/2'
    )

    render(<InputPanel onFetch={onFetch} isLoading={false} />)

    const loadButton = screen.getByText('Load .txt File')
    await userEvent.click(loadButton)

    await waitFor(() => {
      expect(mockApi.readTextFile).toHaveBeenCalled()
    })
  })

  it('shows error when loaded txt file has no valid URLs', async () => {
    mockApi.readTextFile.mockResolvedValue('not-a-url\nanother-invalid-line')

    render(<InputPanel onFetch={onFetch} isLoading={false} />)

    await userEvent.click(screen.getByText('Load .txt File'))

    await waitFor(() => {
      expect(screen.getByText('No valid URLs found in the file.')).toBeInTheDocument()
    })
  })

  it('merges URLs from single input and multi textarea', async () => {
    render(<InputPanel onFetch={onFetch} isLoading={false} />)

    const singleInput = screen.getByTestId('single-url-input')
    await userEvent.type(singleInput, 'https://www.tiktok.com/@user/video/1')

    await userEvent.click(screen.getByText('Multiple URLs'))
    const textarea = screen.getByTestId('multi-url-input')
    await userEvent.type(textarea, 'https://www.tiktok.com/@user/video/2')

    await userEvent.click(screen.getByTestId('fetch-button'))

    expect(onFetch).toHaveBeenCalledWith([
      'https://www.tiktok.com/@user/video/1',
      'https://www.tiktok.com/@user/video/2',
    ])
  })

  it('deduplicates URLs from both inputs', async () => {
    render(<InputPanel onFetch={onFetch} isLoading={false} />)

    const singleInput = screen.getByTestId('single-url-input')
    await userEvent.type(singleInput, 'https://www.tiktok.com/@user/video/1')

    await userEvent.click(screen.getByText('Multiple URLs'))
    const textarea = screen.getByTestId('multi-url-input')
    // Same URL as above
    await userEvent.type(textarea, 'https://www.tiktok.com/@user/video/1')

    await userEvent.click(screen.getByTestId('fetch-button'))

    const [called] = onFetch.mock.calls[0] as [string[]]
    expect(called).toHaveLength(1)
  })
})
