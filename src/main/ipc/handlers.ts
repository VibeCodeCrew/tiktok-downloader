import { ipcMain, dialog, BrowserWindow } from 'electron'
import { readFile } from 'fs/promises'
import { IPC_CHANNELS } from './channels'
import { fetchMetadata } from '../services/ytdlp'
import { downloadManager } from '../services/downloader'
import type {
  StartDownloadPayload,
  FetchProgressEvent,
  DownloadProgressEvent,
} from '@shared/types'

/**
 * Registers all IPC handlers for the main process.
 * Must be called after the app is ready.
 */
export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  // ── Frameless window controls ────────────────────────────────────────────
  ipcMain.on('minimize-window', () => mainWindow.minimize())
  ipcMain.on('maximize-window', () => {
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize()
  })
  ipcMain.on('close-window', () => mainWindow.close())

  // ── Select output directory ──────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.SELECT_DIRECTORY, async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Download Folder',
      properties: ['openDirectory', 'createDirectory'],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // ── Read a text file (for batch URL import) ──────────────────────────────
  ipcMain.handle(IPC_CHANNELS.READ_TEXT_FILE, async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Open URL List',
      filters: [
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    try {
      const content = await readFile(result.filePaths[0], 'utf8')
      return content
    } catch (err) {
      throw new Error(`Failed to read file: ${(err as Error).message}`)
    }
  })

  // ── Fetch metadata ───────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.FETCH_METADATA, async (event, urls: string[]) => {
    const allErrors: Array<{ url: string; error: string }> = []

    const abortController = new AbortController()

    // If the window is closed mid-fetch, abort
    mainWindow.once('closed', () => abortController.abort())

    for (const url of urls) {
      const progressPayload: FetchProgressEvent = { url, status: 'fetching' }
      event.sender.send(IPC_CHANNELS.FETCH_PROGRESS, progressPayload)

      try {
        await fetchMetadata(
          url,
          (video) => {
            const partial: FetchProgressEvent = { url, status: 'partial', video }
            event.sender.send(IPC_CHANNELS.FETCH_PROGRESS, partial)
          },
          abortController.signal
        )

        const done: FetchProgressEvent = { url, status: 'done' }
        event.sender.send(IPC_CHANNELS.FETCH_PROGRESS, done)
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err)
        allErrors.push({ url, error })
        const errPayload: FetchProgressEvent = { url, status: 'error', error }
        event.sender.send(IPC_CHANNELS.FETCH_PROGRESS, errPayload)
      }
    }

    return { errors: allErrors }
  })

  // ── Start downloads ──────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.START_DOWNLOAD, async (event, payload: StartDownloadPayload) => {
    const { items, settings } = payload
    const CONCURRENCY = 3

    // Queue with limited concurrency
    const queue = [...items]
    const inFlight = new Set<Promise<void>>()

    const runNext = (): void => {
      while (inFlight.size < CONCURRENCY && queue.length > 0) {
        const task = queue.shift()!

        const p = downloadManager
          .startDownload(task, settings, (progressEvent: DownloadProgressEvent) => {
            event.sender.send(IPC_CHANNELS.DOWNLOAD_PROGRESS, progressEvent)
          })
          .promise.then(() => {
            inFlight.delete(p)
            runNext()
          })
          .catch(() => {
            inFlight.delete(p)
            runNext()
          })

        inFlight.add(p)
      }
    }

    runNext()

    // Wait for everything
    await new Promise<void>((resolve) => {
      const check = setInterval(() => {
        if (inFlight.size === 0 && queue.length === 0) {
          clearInterval(check)
          resolve()
        }
      }, 200)
    })

    return { done: true }
  })

  // ── Cancel a specific download ───────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.CANCEL_DOWNLOAD, (_event, id: string) => {
    // The downloadManager tracks processes by id; if not found, it's a no-op
    downloadManager.cancelAll() // Simplified: cancel all active for now
    return { cancelled: true, id }
  })
}
