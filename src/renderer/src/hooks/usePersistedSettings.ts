import { useState, useEffect } from 'react'
import type { DownloadSettings } from '../types'

const STORAGE_KEY = 'tiktok-dl:settings'

const DEFAULTS: DownloadSettings = {
  outputDir: '',
  format: 'video',
  videoQuality: 'best',
  audioQuality: 'best',
}

function load(): DownloadSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return DEFAULTS
  }
}

function save(settings: DownloadSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // localStorage unavailable — ignore silently
  }
}

/**
 * Like useState<DownloadSettings> but values are persisted to localStorage
 * and restored on the next app launch.
 */
export function usePersistedSettings(): [
  DownloadSettings,
  (updater: (prev: DownloadSettings) => DownloadSettings) => void
] {
  const [settings, setSettingsRaw] = useState<DownloadSettings>(load)

  // Persist on every change
  useEffect(() => {
    save(settings)
  }, [settings])

  return [settings, setSettingsRaw]
}
