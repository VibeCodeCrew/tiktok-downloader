using System.Text.Json;
using System.Text.Json.Nodes;
using System.Windows;
using Microsoft.Win32;
using TikTokDownloader.Services;

namespace TikTokDownloader.Bridge;

/// <summary>
/// Processes JSON messages arriving from the WebView2 renderer
/// and dispatches them to the appropriate services.
/// </summary>
public class AppBridge
{
    private readonly MainWindow     _window;
    private readonly YtDlpService   _ytdlp      = new();
    private readonly DownloadService _downloader = new();

    private CancellationTokenSource? _fetchCts;
    private CancellationTokenSource? _downloadCts;

    private static readonly JsonSerializerOptions SerOpts =
        new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public AppBridge(MainWindow window) => _window = window;

    // ── Entry point ───────────────────────────────────────────────────────────

    public void HandleMessage(string json)
    {
        JsonNode? msg;
        try { msg = JsonNode.Parse(json); }
        catch { return; }

        var type = msg?["type"]?.GetValue<string>() ?? "";

        switch (type)
        {
            case "windowControl":
                _window.HandleWindowControl(msg!["action"]?.GetValue<string>() ?? "");
                break;

            case "windowDrag":
                // drag is now handled natively via WM_NCHITTEST — no-op
                break;

            case "selectDirectory":
                HandleSelectDirectory();
                break;

            case "readTextFile":
                HandleReadTextFile();
                break;

            case "fetchMetadata":
                var urls = msg!["urls"]?.AsArray()
                    .Select(u => u?.GetValue<string>() ?? "")
                    .Where(u => u.Length > 0)
                    .ToArray() ?? [];
                _ = HandleFetchMetadataAsync(urls);
                break;

            case "startDownload":
                _ = HandleStartDownloadAsync(msg!);
                break;

            case "cancelDownload":
                _downloadCts?.Cancel();
                _downloader.CancelAll();
                Send(new { type = "cancelDownloadResult" });
                break;
        }
    }

    // ── Handlers ──────────────────────────────────────────────────────────────

    private void HandleSelectDirectory()
    {
        _window.Dispatcher.Invoke(() =>
        {
            var dialog = new OpenFolderDialog { Title = "Select Download Folder" };
            string? path = dialog.ShowDialog() == true ? dialog.FolderName : null;
            Send(new { type = "selectDirectoryResult", path });
        });
    }

    private void HandleReadTextFile()
    {
        _window.Dispatcher.Invoke(() =>
        {
            var dialog = new OpenFileDialog
            {
                Title  = "Open URL List",
                Filter = "Text Files (*.txt)|*.txt|All Files (*.*)|*.*",
            };
            string? content = null;
            if (dialog.ShowDialog() == true)
            {
                try { content = File.ReadAllText(dialog.FileName, System.Text.Encoding.UTF8); }
                catch { /* leave null on read error */ }
            }
            Send(new { type = "readTextFileResult", content });
        });
    }

    private async Task HandleFetchMetadataAsync(string[] urls)
    {
        _fetchCts?.Cancel();
        _fetchCts = new CancellationTokenSource();
        var ct = _fetchCts.Token;

        try
        {
            var (_, errors) = await _ytdlp.FetchMetadataAsync(
                urls,
                onStatus: (url, status) =>
                {
                    if (status is "fetching" or "done" or "error")
                        Send(new { type = "fetchProgress", payload = new { url, status } });
                },
                onVideo: (video) => Send(new
                {
                    type = "fetchProgress",
                    payload = new
                    {
                        url    = video.Url,
                        status = "partial",
                        video  = new
                        {
                            id          = video.Id,
                            url         = video.Url,
                            title       = video.Title,
                            thumbnail   = video.Thumbnail,
                            duration    = video.Duration,
                            uploader    = video.Uploader,
                            webpage_url = video.WebpageUrl,
                            extractor   = video.Extractor,
                        }
                    }
                }),
                onError: (url, error) =>
                    Send(new { type = "fetchProgress", payload = new { url, status = "error", error } }),
                ct: ct
            );

            var errPayload = errors
                .Select(e => new { url = e.Url, error = e.Error })
                .ToArray();
            Send(new { type = "fetchMetadataResult", result = new { errors = errPayload } });
        }
        catch (OperationCanceledException) { }
        catch (Exception ex)
        {
            Send(new
            {
                type   = "fetchMetadataResult",
                result = new { errors = new[] { new { url = "", error = ex.Message } } }
            });
        }
    }

    private async Task HandleStartDownloadAsync(JsonNode msg)
    {
        _downloadCts?.Cancel();
        _downloadCts = new CancellationTokenSource();
        var ct = _downloadCts.Token;

        try
        {
            var items = msg["items"]?.AsArray()
                .Select(i => new DownloadTask(
                    i!["id"]!.GetValue<string>(),
                    i!["url"]!.GetValue<string>(),
                    i!["title"]?.GetValue<string>() ?? ""))
                .ToArray() ?? [];

            var s = msg["settings"]!;
            var settings = new DownloadSettings(
                OutputDir:    s["outputDir"]!.GetValue<string>(),
                Format:       s["format"]!.GetValue<string>(),
                VideoQuality: s["videoQuality"]!.GetValue<string>(),
                AudioQuality: s["audioQuality"]!.GetValue<string>()
            );

            await _downloader.StartDownloadAsync(
                items, settings,
                onProgress: ev => Send(new
                {
                    type    = "downloadProgress",
                    payload = new
                    {
                        id         = ev.Id,
                        progress   = ev.Progress,
                        status     = ev.Status,
                        speed      = ev.Speed,
                        eta        = ev.Eta,
                        error      = ev.Error,
                        outputPath = ev.OutputPath,
                    }
                }),
                ct: ct);

            Send(new { type = "startDownloadResult", result = new { done = true } });
        }
        catch (OperationCanceledException) { }
        catch (Exception ex)
        {
            Send(new { type = "startDownloadResult", result = new { done = false, error = ex.Message } });
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void Send(object payload)
    {
        try { _window.PostToWebView(JsonSerializer.Serialize(payload, SerOpts)); }
        catch { }
    }
}
