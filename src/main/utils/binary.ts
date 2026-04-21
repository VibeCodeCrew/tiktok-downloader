import { app } from 'electron'
import { join, resolve } from 'path'
import { existsSync } from 'fs'

/**
 * Resolves the yt-dlp binary path.
 *
 * Priority:
 * 1. Bundled binary in app resources (production)
 * 2. Binary installed by youtube-dl-exec in node_modules (development)
 * 3. yt-dlp on PATH (fallback)
 */
export function getYtDlpBinary(): string {
  const ext = process.platform === 'win32' ? '.exe' : ''
  const binaryName = `yt-dlp${ext}`

  // 1. Packaged app – binary is copied by electron-builder extraResources
  if (app.isPackaged) {
    const bundledPath = join(process.resourcesPath, 'bin', binaryName)
    if (existsSync(bundledPath)) {
      return bundledPath
    }
  }

  // 2. Development – binary downloaded by youtube-dl-exec postinstall
  const candidatePaths = [
    // electron-vite dev: file lives at src/main/utils/ → root is 3 levels up
    resolve(__dirname, '../../../node_modules/youtube-dl-exec/bin', binaryName),
    // electron-vite built output: out/main/ → root is 2 levels up
    resolve(__dirname, '../../node_modules/youtube-dl-exec/bin', binaryName),
    // cwd-based (works when running `npm run dev` from project root)
    resolve(process.cwd(), 'node_modules/youtube-dl-exec/bin', binaryName),
  ]

  for (const candidate of candidatePaths) {
    if (existsSync(candidate)) {
      return candidate
    }
  }

  // 3. Fallback – rely on PATH
  return binaryName
}
