export type Lang = 'en' | 'ru'

// ── Russian plural helpers ────────────────────────────────────────────────────

/** ссылка / ссылки / ссылок */
function ruLinks(n: number): string {
  const abs = Math.abs(n) % 100
  const mod = abs % 10
  if (abs > 10 && abs < 20) return `${n} ссылок`
  if (mod === 1) return `${n} ссылка`
  if (mod >= 2 && mod <= 4) return `${n} ссылки`
  return `${n} ссылок`
}

/** "видео" — несклоняемое, форма не меняется */
const ruVideos = (n: number): string => `${n} видео`

// ── Translation shape ─────────────────────────────────────────────────────────

export interface Translations {
  header: {
    poweredBy: string
    langLabel: string   // tooltip / aria on the toggle button
  }
  input: {
    title: string
    subtitle: string
    urlCount: (n: number) => string
    tabSingle: string
    tabMulti: string
    placeholderSingle: string
    placeholderMulti: string
    onePerLine: string
    loadTxt: string
    fetchBtn: string
    fetchingBtn: string
    noUrlsInFile: string
  }
  grid: {
    videosFound: (n: number) => string
    selected: (n: number) => string
    selectAll: string
    deselectAll: string
  }
  settings: {
    title: string
    subtitle: string
    saveTo: string
    outputFolder: string
    chooseFolder: string
    format: string
    videoFmt: string
    audioFmt: string
    videoQuality: string
    audioQuality: string
    videoQualityOptions: Record<string, string>
    audioQualityOptions: Record<string, string>
    downloadBtn: (n: number, fmt: string) => string
    cancelBtn: string
    selectFolderHint: string
  }
  progress: {
    title: string
    summary: (done: number, errors: number) => string
    active: (active: number, done: number, total: number) => string
    clear: string
    status: Record<string, string>
  }
  app: {
    emptyTitle: string
    emptySubtitle: (fetchLabel: string) => string
    feature1: string
    feature2: string
    feature3: string
    scanning: string
    videosFoundLive: (n: number) => string
    fetchErrors: (n: number) => string
  }
}

// ── English ───────────────────────────────────────────────────────────────────

export const en: Translations = {
  header: {
    poweredBy: 'Powered by yt-dlp',
    langLabel: 'Switch to Russian',
  },
  input: {
    title: 'Add Videos',
    subtitle: 'Paste TikTok URLs or load a .txt file',
    urlCount: (n) => `${n} URL${n !== 1 ? 's' : ''}`,
    tabSingle: 'Single URL',
    tabMulti: 'Multiple URLs',
    placeholderSingle: 'https://www.tiktok.com/@username/video/…',
    placeholderMulti: 'https://www.tiktok.com/@user/video/1\nhttps://www.tiktok.com/@channel',
    onePerLine: 'one URL per line',
    loadTxt: 'Load .txt File',
    fetchBtn: 'Fetch Videos',
    fetchingBtn: 'Fetching Metadata…',
    noUrlsInFile: 'No valid URLs found in the file.',
  },
  grid: {
    videosFound: (n) => `${n} video${n !== 1 ? 's' : ''} found`,
    selected: (n) => `${n} selected`,
    selectAll: 'Select All',
    deselectAll: 'Deselect All',
  },
  settings: {
    title: 'Download Settings',
    subtitle: 'Configure output before downloading',
    saveTo: 'Save to',
    outputFolder: 'Output folder',
    chooseFolder: 'Choose folder…',
    format: 'Format',
    videoFmt: 'MP4 Video',
    audioFmt: 'MP3 Audio',
    videoQuality: 'Video Quality',
    audioQuality: 'Audio Quality',
    videoQualityOptions: {
      best: 'Best available',
      '1080': '1080p Full HD',
      '720': '720p HD',
      '480': '480p SD',
      '360': '360p Low',
      '240': '240p Minimum',
    },
    audioQualityOptions: {
      best: 'Best (VBR)',
      '320': '320 kbps',
      '192': '192 kbps',
      '128': '128 kbps',
      '64': '64 kbps',
    },
    downloadBtn: (n, fmt) =>
      `Download ${n} ${n === 1 ? 'Video' : 'Videos'}${fmt === 'audio' ? ' as Audio' : ''}`,
    cancelBtn: 'Cancel Downloads',
    selectFolderHint: 'Please select an output folder first',
  },
  progress: {
    title: 'Downloads',
    summary: (done, errors) =>
      `${done} done${errors > 0 ? `, ${errors} failed` : ''}`,
    active: (active, done, total) => `${active} active · ${done}/${total} done`,
    clear: 'Clear',
    status: {
      pending: 'Queued',
      downloading: 'Downloading',
      processing: 'Processing',
      done: 'Done',
      error: 'Error',
      cancelled: 'Cancelled',
    },
  },
  app: {
    emptyTitle: 'Download TikTok Videos',
    emptySubtitle: (btn) =>
      `Paste a TikTok video URL, a channel URL, or upload a .txt file with multiple links. Click "${btn}" to get started.`,
    feature1: 'Single video or channel URLs',
    feature2: 'Batch download with progress tracking',
    feature3: 'Export as MP4 video or MP3 audio',
    scanning: 'Scanning',
    videosFoundLive: (n) => `${n} video${n !== 1 ? 's' : ''} found…`,
    fetchErrors: (n) => `Fetch Errors (${n})`,
  },
}

// ── Russian ───────────────────────────────────────────────────────────────────

export const ru: Translations = {
  header: {
    poweredBy: 'На базе yt-dlp',
    langLabel: 'Переключить на английский',
  },
  input: {
    title: 'Добавить видео',
    subtitle: 'Вставьте ссылки TikTok или загрузите .txt файл',
    urlCount: (n) => ruLinks(n),
    tabSingle: 'Одна ссылка',
    tabMulti: 'Несколько ссылок',
    placeholderSingle: 'https://www.tiktok.com/@username/video/…',
    placeholderMulti:
      'https://www.tiktok.com/@user/video/1\nhttps://www.tiktok.com/@канал',
    onePerLine: 'по одной ссылке на строку',
    loadTxt: 'Загрузить .txt',
    fetchBtn: 'Найти видео',
    fetchingBtn: 'Получение данных…',
    noUrlsInFile: 'В файле не найдено корректных ссылок.',
  },
  grid: {
    videosFound: (n) => `Найдено ${ruVideos(n)}`,
    selected: (n) => `Выбрано: ${n}`,
    selectAll: 'Выбрать все',
    deselectAll: 'Снять выбор',
  },
  settings: {
    title: 'Настройки загрузки',
    subtitle: 'Настройте параметры перед скачиванием',
    saveTo: 'Сохранить в',
    outputFolder: 'Папка сохранения',
    chooseFolder: 'Выберите папку…',
    format: 'Формат',
    videoFmt: 'Видео MP4',
    audioFmt: 'Аудио MP3',
    videoQuality: 'Качество видео',
    audioQuality: 'Качество аудио',
    videoQualityOptions: {
      best: 'Максимальное',
      '1080': '1080p Full HD',
      '720': '720p HD',
      '480': '480p SD',
      '360': '360p Низкое',
      '240': '240p Минимальное',
    },
    audioQualityOptions: {
      best: 'Лучшее (VBR)',
      '320': '320 кбит/с',
      '192': '192 кбит/с',
      '128': '128 кбит/с',
      '64': '64 кбит/с',
    },
    downloadBtn: (n, fmt) =>
      `Скачать ${ruVideos(n)}${fmt === 'audio' ? ' как аудио' : ''}`,
    cancelBtn: 'Отменить загрузку',
    selectFolderHint: 'Сначала выберите папку для сохранения',
  },
  progress: {
    title: 'Загрузки',
    summary: (done, errors) =>
      `${ruVideos(done)} готово${errors > 0 ? `, ${errors} с ошибкой` : ''}`,
    active: (active, done, total) =>
      `${active} активных · ${done}/${total} готово`,
    clear: 'Очистить',
    status: {
      pending: 'В очереди',
      downloading: 'Загрузка',
      processing: 'Обработка',
      done: 'Готово',
      error: 'Ошибка',
      cancelled: 'Отменено',
    },
  },
  app: {
    emptyTitle: 'Скачивайте видео с TikTok',
    emptySubtitle: (btn) =>
      `Вставьте ссылку на видео или канал TikTok, либо загрузите .txt файл со списком ссылок. Нажмите «${btn}», чтобы начать.`,
    feature1: 'Одиночные видео или целые каналы',
    feature2: 'Пакетная загрузка с отслеживанием прогресса',
    feature3: 'Экспорт в видео MP4 или аудио MP3',
    scanning: 'Сканирование',
    videosFoundLive: (n) => `Найдено ${ruVideos(n)}…`,
    fetchErrors: (n) => `Ошибки получения (${n})`,
  },
}

export const dict: Record<Lang, Translations> = { en, ru }
