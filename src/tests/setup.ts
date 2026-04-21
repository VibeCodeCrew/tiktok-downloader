import '@testing-library/jest-dom'
import { vi } from 'vitest'

// ── Mock window.api (contextBridge exposed API) ──────────────────────────────

const mockApi = {
  selectDirectory: vi.fn().mockResolvedValue('/mock/downloads'),
  readTextFile: vi.fn().mockResolvedValue(null),
  fetchMetadata: vi.fn().mockResolvedValue({ errors: [] }),
  startDownload: vi.fn().mockResolvedValue({ done: true }),
  cancelDownload: vi.fn().mockResolvedValue(undefined),
  onFetchProgress: vi.fn().mockReturnValue(() => {}),   // returns unsubscribe fn
  onDownloadProgress: vi.fn().mockReturnValue(() => {}),
}

Object.defineProperty(window, 'api', {
  value: mockApi,
  writable: true,
})

// ── Mock window.electron ─────────────────────────────────────────────────────

const mockElectron = {
  ipcRenderer: {
    send: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
    invoke: vi.fn(),
  },
}

Object.defineProperty(window, 'electron', {
  value: mockElectron,
  writable: true,
})

// ── Global beforeEach reset ──────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  // Restore default return values after clearAllMocks
  mockApi.selectDirectory.mockResolvedValue('/mock/downloads')
  mockApi.readTextFile.mockResolvedValue(null)
  mockApi.fetchMetadata.mockResolvedValue({ errors: [] })
  mockApi.startDownload.mockResolvedValue({ done: true })
  mockApi.cancelDownload.mockResolvedValue(undefined)
  mockApi.onFetchProgress.mockReturnValue(() => {})
  mockApi.onDownloadProgress.mockReturnValue(() => {})
})

export { mockApi, mockElectron }
