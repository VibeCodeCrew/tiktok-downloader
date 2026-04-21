/**
 * Vitest module mock for 'electron'.
 * Aliased in vitest.config.ts: electron → this file.
 */
import { vi } from 'vitest'

export const app = {
  isPackaged: false,
  getPath: vi.fn((name: string) => `/mock/electron/${name}`),
  whenReady: vi.fn().mockResolvedValue(undefined),
  quit: vi.fn(),
  on: vi.fn(),
}

export const BrowserWindow = vi.fn().mockImplementation(() => ({
  loadURL: vi.fn(),
  loadFile: vi.fn(),
  on: vi.fn(),
  once: vi.fn(),
  show: vi.fn(),
  webContents: {
    setWindowOpenHandler: vi.fn(),
    send: vi.fn(),
  },
}))

export const ipcMain = {
  handle: vi.fn(),
  on: vi.fn(),
  removeHandler: vi.fn(),
}

export const ipcRenderer = {
  invoke: vi.fn(),
  on: vi.fn(),
  send: vi.fn(),
  removeListener: vi.fn(),
}

export const contextBridge = {
  exposeInMainWorld: vi.fn(),
}

export const dialog = {
  showOpenDialog: vi.fn().mockResolvedValue({ canceled: false, filePaths: ['/mock/path'] }),
}

export const shell = {
  openExternal: vi.fn(),
}
