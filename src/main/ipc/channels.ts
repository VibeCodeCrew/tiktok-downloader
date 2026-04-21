/**
 * Centralised IPC channel name constants.
 *
 * Renderer → Main (invoke):  FETCH_METADATA, START_DOWNLOAD, CANCEL_DOWNLOAD,
 *                            SELECT_DIRECTORY, READ_TEXT_FILE
 * Main → Renderer (send):    FETCH_PROGRESS, DOWNLOAD_PROGRESS
 */
export const IPC_CHANNELS = {
  // ── Renderer → Main (ipcMain.handle / ipcRenderer.invoke) ──────────────
  FETCH_METADATA: 'fetch-metadata',
  START_DOWNLOAD: 'start-download',
  CANCEL_DOWNLOAD: 'cancel-download',
  SELECT_DIRECTORY: 'select-directory',
  READ_TEXT_FILE: 'read-text-file',

  // ── Main → Renderer (ipcMain.send / ipcRenderer.on) ────────────────────
  FETCH_PROGRESS: 'fetch-progress',
  DOWNLOAD_PROGRESS: 'download-progress',
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
