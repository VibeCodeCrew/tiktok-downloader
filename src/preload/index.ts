import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC_CHANNELS } from '../main/ipc/channels'
import type {
  VideoMetadata,
  DownloadSettings,
  FetchProgressEvent,
  DownloadProgressEvent,
  StartDownloadPayload,
} from '../shared/types'

// ── Safe API exposed to renderer via contextBridge ──────────────────────────

const api = {
  /** Open native folder-picker dialog. Returns the selected path or null. */
  selectDirectory: (): Promise<string | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.SELECT_DIRECTORY),

  /** Open a native file-picker, read the chosen .txt file. Returns content or null. */
  readTextFile: (): Promise<string | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.READ_TEXT_FILE),

  /**
   * Fetch metadata for one or more URLs via yt-dlp.
   * Returns after all URLs are processed; progress arrives through onFetchProgress.
   */
  fetchMetadata: (urls: string[]): Promise<{ errors: Array<{ url: string; error: string }> }> =>
    ipcRenderer.invoke(IPC_CHANNELS.FETCH_METADATA, urls),

  /** Start downloading the selected videos. */
  startDownload: (payload: StartDownloadPayload): Promise<{ done: boolean }> =>
    ipcRenderer.invoke(IPC_CHANNELS.START_DOWNLOAD, payload),

  /** Cancel all active downloads. */
  cancelDownload: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.CANCEL_DOWNLOAD, 'all'),

  // ── Event subscriptions ──────────────────────────────────────────────────

  /** Subscribe to per-video fetch progress events. Returns an unsubscribe fn. */
  onFetchProgress: (cb: (event: FetchProgressEvent) => void): (() => void) => {
    const listener = (_e: Electron.IpcRendererEvent, data: FetchProgressEvent): void => cb(data)
    ipcRenderer.on(IPC_CHANNELS.FETCH_PROGRESS, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.FETCH_PROGRESS, listener)
  },

  /** Subscribe to per-download progress events. Returns an unsubscribe fn. */
  onDownloadProgress: (cb: (event: DownloadProgressEvent) => void): (() => void) => {
    const listener = (_e: Electron.IpcRendererEvent, data: DownloadProgressEvent): void => cb(data)
    ipcRenderer.on(IPC_CHANNELS.DOWNLOAD_PROGRESS, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.DOWNLOAD_PROGRESS, listener)
  },
}

// ── Context Bridge exposure ──────────────────────────────────────────────────

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore – fallback for non-isolated contexts (tests / old Electron)
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}

export type Api = typeof api
export type { VideoMetadata, DownloadSettings }
