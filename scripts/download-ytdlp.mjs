/**
 * Post-install script: download the yt-dlp binary via youtube-dl-exec.
 *
 * youtube-dl-exec ships a `postinstall` that requires Python for some checks.
 * We bypass that by directly invoking its internal download script.
 */

import { createRequire } from 'module'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

// Find the youtube-dl-exec package root
let packageRoot
try {
  packageRoot = dirname(require.resolve('youtube-dl-exec/package.json'))
} catch {
  console.log('[download-ytdlp] youtube-dl-exec not found, skipping binary download.')
  process.exit(0)
}

const ext = process.platform === 'win32' ? '.exe' : ''
const binaryPath = join(packageRoot, 'bin', `yt-dlp${ext}`)

if (existsSync(binaryPath)) {
  console.log(`[download-ytdlp] yt-dlp already exists at: ${binaryPath}`)
  process.exit(0)
}

// Trigger the download by importing youtube-dl-exec with the skip flag set
process.env.YOUTUBE_DL_SKIP_PYTHON_CHECK = '1'
try {
  const { execSync } = await import('child_process')
  execSync(`node "${join(packageRoot, 'scripts', 'download.mjs')}"`, {
    stdio: 'inherit',
    env: { ...process.env, YOUTUBE_DL_SKIP_PYTHON_CHECK: '1' },
  })
  console.log('[download-ytdlp] yt-dlp downloaded successfully.')
} catch (err) {
  console.warn(
    '[download-ytdlp] Could not auto-download yt-dlp. Download it manually from https://github.com/yt-dlp/yt-dlp/releases and place it in:',
    binaryPath
  )
}
