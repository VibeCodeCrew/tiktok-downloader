# TikTok Downloader

<div align="center">

![TikTok Downloader](https://img.shields.io/badge/TikTok-Downloader-fe2c55?style=for-the-badge&logo=tiktok&logoColor=white)
![Electron](https://img.shields.io/badge/Electron-31-47848f?style=for-the-badge&logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=for-the-badge&logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**[English](#english) · [Русский](#русский)**

</div>

---

## English

A modern desktop application for downloading TikTok videos and audio. Built with a glassmorphism UI, powered by [yt-dlp](https://github.com/yt-dlp/yt-dlp) under the hood.

### Features

- **Flexible input** — paste a single video URL, a channel URL, multiple links at once, or load a `.txt` file
- **Metadata preview** — fetches video thumbnails, titles and duration before downloading; videos stream in progressively for large channels
- **Format choice** — download as **MP4 video** or extract **MP3 audio**
- **Quality control** — select video resolution (240p → 1080p) or audio bitrate (64 → 320 kbps)
- **Batch downloads** — select / deselect individual videos or use Select All; up to 3 concurrent downloads
- **Progress tracking** — per-file progress bars with speed and ETA, plus an overall progress indicator
- **Error handling** — deleted, private or geo-blocked videos are reported per item without stopping the rest
- **Persistent settings** — output folder, format and quality are remembered between sessions
- **Bilingual UI** — switch between English and Russian at any time

### Requirements

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 |
| npm | ≥ 9 |
| yt-dlp | auto-downloaded on first launch |

> **yt-dlp binary**: the app downloads `yt-dlp` automatically via `youtube-dl-exec` on first launch.
> If auto-download fails, grab the binary from [github.com/yt-dlp/yt-dlp/releases](https://github.com/yt-dlp/yt-dlp/releases)
> and place it in `node_modules/youtube-dl-exec/bin/`.

### Getting started

```bash
# 1. Clone
git clone https://github.com/VibeCodeCrew/tiktok-downloader.git
cd tiktok-downloader

# 2. Install dependencies
#    (skips the Python pre-check in youtube-dl-exec's postinstall)
YOUTUBE_DL_SKIP_PYTHON_CHECK=1 npm install

# Windows PowerShell:
$env:YOUTUBE_DL_SKIP_PYTHON_CHECK=1; npm install

# 3. Start in development mode
npm run dev
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with hot-reload |
| `npm run build` | Production build |
| `npm run package` | Build + create platform installer |
| `npm test` | Run test suite (71 tests) |
| `npm run test:coverage` | Tests with coverage report |

### Building an installer

```bash
npm run package
```

Outputs to `dist/`:
- **Windows** — NSIS installer (`.exe`)
- **macOS** — DMG (`.dmg`)
- **Linux** — AppImage (`.AppImage`)

### Tech stack

- **Electron 31** — desktop shell
- **React 18 + TypeScript** — UI
- **Tailwind CSS 3** — styling (glassmorphism theme)
- **electron-vite** — build tooling
- **yt-dlp** via `youtube-dl-exec` — video extraction
- **Vitest + React Testing Library** — testing

---

## Русский

Современное десктопное приложение для скачивания видео и аудио из TikTok. Стеклянный UI (glassmorphism), внутри работает [yt-dlp](https://github.com/yt-dlp/yt-dlp).

### Возможности

- **Гибкий ввод** — одна ссылка на видео, ссылка на канал, несколько ссылок сразу или загрузка `.txt` файла
- **Предпросмотр** — получает миниатюры, названия и длительность до скачивания; при больших каналах видео появляются по мере обнаружения
- **Выбор формата** — скачать как **видео MP4** или извлечь **аудио MP3**
- **Управление качеством** — разрешение видео (240p → 1080p) или битрейт аудио (64 → 320 кбит/с)
- **Пакетная загрузка** — выбор отдельных видео или «Выбрать все»; до 3 параллельных загрузок
- **Прогресс** — прогресс-бары по каждому файлу со скоростью и ETA, плюс общий прогресс
- **Обработка ошибок** — удалённые, приватные или заблокированные видео отображаются с ошибкой, не останавливая остальные
- **Сохранение настроек** — папка, формат и качество запоминаются между сеансами
- **Двуязычный интерфейс** — переключение EN / РУС в любой момент

### Требования

| Инструмент | Версия |
|-----------|--------|
| Node.js | ≥ 18 |
| npm | ≥ 9 |
| yt-dlp | скачивается автоматически |

> **Бинарник yt-dlp**: приложение скачивает его само при первом запуске через `youtube-dl-exec`.
> Если автозагрузка не сработала — скачайте вручную с [github.com/yt-dlp/yt-dlp/releases](https://github.com/yt-dlp/yt-dlp/releases)
> и положите в `node_modules/youtube-dl-exec/bin/`.

### Запуск

```bash
# 1. Клонировать
git clone https://github.com/VibeCodeCrew/tiktok-downloader.git
cd tiktok-downloader

# 2. Установить зависимости
YOUTUBE_DL_SKIP_PYTHON_CHECK=1 npm install

# Windows PowerShell:
$env:YOUTUBE_DL_SKIP_PYTHON_CHECK=1; npm install

# 3. Запустить в режиме разработки
npm run dev
```

### Команды

| Команда | Описание |
|---------|----------|
| `npm run dev` | Запуск с горячей перезагрузкой |
| `npm run build` | Сборка для продакшена |
| `npm run package` | Сборка + создание установщика |
| `npm test` | Запуск тестов (71 тест) |
| `npm run test:coverage` | Тесты с отчётом покрытия |

### Сборка установщика

```bash
npm run package
```

Результат в папке `dist/`:
- **Windows** — установщик NSIS (`.exe`)
- **macOS** — DMG (`.dmg`)
- **Linux** — AppImage (`.AppImage`)

---

## License / Лицензия

[MIT](LICENSE)
