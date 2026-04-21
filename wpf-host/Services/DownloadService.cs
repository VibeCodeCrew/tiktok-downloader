using System.Diagnostics;
using System.Text;
using System.Text.RegularExpressions;

namespace TikTokDownloader.Services;

public record DownloadTask(string Id, string Url, string Title);

public record DownloadSettings(
    string OutputDir,
    string Format,
    string VideoQuality,
    string AudioQuality
);

public record DownloadProgressEvent(
    string   Id,
    double   Progress,
    string   Status,
    string?  Speed      = null,
    string?  Eta        = null,
    string?  Error      = null,
    string?  OutputPath = null
);

public class DownloadService
{
    private readonly Dictionary<string, Process> _active = new();
    private readonly object _lock = new();

    private static readonly Regex ProgressRe = new(
        @"\[download\]\s+([\d.]+)%\s+of\s+~?\s*\S+\s+at\s+(\S+)\s+ETA\s+(\S+)",
        RegexOptions.Compiled);
    private static readonly Regex DestRe = new(
        @"\[download\]\s+Destination:\s+(.+)",
        RegexOptions.Compiled);
    private static readonly Regex MergeRe = new(
        @"\[(?:ffmpeg|Merger)\]\s+Merging formats into\s+""(.+)""",
        RegexOptions.Compiled);
    private static readonly Regex AlreadyRe = new(
        @"\[download\]\s+(.+)\s+has already been downloaded",
        RegexOptions.Compiled);

    // ── Public API ────────────────────────────────────────────────────────────

    public async Task StartDownloadAsync(
        IEnumerable<DownloadTask>     tasks,
        DownloadSettings              settings,
        Action<DownloadProgressEvent> onProgress,
        CancellationToken             ct = default)
    {
        const int Concurrency = 3;
        var queue   = new Queue<DownloadTask>(tasks);
        var semaphore = new SemaphoreSlim(Concurrency, Concurrency);
        var running = new List<Task>();

        while (queue.Count > 0)
        {
            ct.ThrowIfCancellationRequested();
            await semaphore.WaitAsync(ct);
            var task = queue.Dequeue();
            running.Add(Task.Run(async () =>
            {
                try   { await DownloadOneAsync(task, settings, onProgress, ct); }
                finally { semaphore.Release(); }
            }, ct));
        }

        await Task.WhenAll(running);
    }

    public void CancelAll()
    {
        lock (_lock)
        {
            foreach (var p in _active.Values)
                try { p.Kill(); } catch { }
            _active.Clear();
        }
    }

    // ── Private ───────────────────────────────────────────────────────────────

    private async Task DownloadOneAsync(
        DownloadTask                  task,
        DownloadSettings              settings,
        Action<DownloadProgressEvent> onProgress,
        CancellationToken             ct)
    {
        var psi = new ProcessStartInfo(YtDlpBinary.Get())
        {
            UseShellExecute        = false,
            CreateNoWindow         = true,
            RedirectStandardOutput = true,
            RedirectStandardError  = true,
            StandardOutputEncoding = Encoding.UTF8,
        };

        // Build arguments
        var output = Path.Combine(settings.OutputDir, "%(uploader)s - %(title)s.%(ext)s");
        psi.ArgumentList.Add("--no-warnings");
        psi.ArgumentList.Add("--newline");
        psi.ArgumentList.Add("-o");
        psi.ArgumentList.Add(output);
        psi.ArgumentList.Add("--no-check-certificate");

        if (settings.Format == "audio")
        {
            psi.ArgumentList.Add("-x");
            psi.ArgumentList.Add("--audio-format"); psi.ArgumentList.Add("mp3");
            psi.ArgumentList.Add("--audio-quality");
            psi.ArgumentList.Add(settings.AudioQuality == "best" ? "0" : $"{settings.AudioQuality}K");
        }
        else
        {
            psi.ArgumentList.Add("-f");
            psi.ArgumentList.Add(BuildVideoFormat(settings.VideoQuality));
            psi.ArgumentList.Add("--merge-output-format"); psi.ArgumentList.Add("mp4");
        }

        psi.ArgumentList.Add(task.Url);

        using var proc = new Process { StartInfo = psi };
        proc.Start();

        lock (_lock) _active[task.Id] = proc;

        ct.Register(() => { try { proc.Kill(); } catch { } });

        // Start reading stderr concurrently to prevent buffer deadlock
        var stderrTask = proc.StandardError.ReadToEndAsync(ct);

        string?  outputPath   = null;
        double   lastProgress = 0;
        bool     earlyDone    = false;

        string? line;
        while ((line = await proc.StandardOutput.ReadLineAsync(ct)) is not null)
        {
            var p = ParseLine(line);

            if (p.AlreadyDownloaded)
            {
                outputPath = p.OutputPath ?? outputPath;
                onProgress(new DownloadProgressEvent(task.Id, 100, "done", OutputPath: outputPath));
                earlyDone = true;
                break;
            }

            if (p.OutputPath is not null) outputPath = p.OutputPath;

            if (p.Progress.HasValue)
            {
                lastProgress = p.Progress.Value;
                onProgress(new DownloadProgressEvent(
                    task.Id, lastProgress,
                    lastProgress >= 100 ? "processing" : "downloading",
                    Speed: p.Speed, Eta: p.Eta));
            }
        }

        await proc.WaitForExitAsync(ct);
        var stderr = await stderrTask;

        lock (_lock) _active.Remove(task.Id);

        if (earlyDone) return;

        if (proc.ExitCode == 0)
        {
            onProgress(new DownloadProgressEvent(task.Id, 100, "done", OutputPath: outputPath));
        }
        else
        {
            // Check if killed by cancellation token
            if (ct.IsCancellationRequested)
            {
                onProgress(new DownloadProgressEvent(task.Id, lastProgress, "cancelled"));
                return;
            }

            var errLines = stderr
                .Split('\n')
                .Where(l => l.Contains("ERROR:") || l.Contains("error:"))
                .ToArray();
            var errMsg = errLines.Length > 0
                ? string.Join(" | ", errLines)
                : $"yt-dlp exited with code {proc.ExitCode} for: {task.Title}";
            onProgress(new DownloadProgressEvent(task.Id, lastProgress, "error", Error: errMsg));
        }
    }

    private static string BuildVideoFormat(string quality) =>
        quality == "best"
            ? "bestvideo*+bestaudio*/best"
            : $"bestvideo*[height<={quality}]+bestaudio*/" +
              $"bestvideo*[height<={quality}]+bestaudio/" +
              $"best[height<={quality}]/best";

    private record ParsedLine(
        double? Progress         = null,
        string? Speed            = null,
        string? Eta              = null,
        string? OutputPath       = null,
        bool    AlreadyDownloaded = false);

    private ParsedLine ParseLine(string line)
    {
        var pm = ProgressRe.Match(line);
        if (pm.Success)
            return new ParsedLine(double.Parse(pm.Groups[1].Value), pm.Groups[2].Value, pm.Groups[3].Value);

        var dm = DestRe.Match(line);
        if (dm.Success) return new ParsedLine(OutputPath: dm.Groups[1].Value.Trim());

        var mm = MergeRe.Match(line);
        if (mm.Success) return new ParsedLine(OutputPath: mm.Groups[1].Value.Trim());

        var am = AlreadyRe.Match(line);
        if (am.Success) return new ParsedLine(AlreadyDownloaded: true, OutputPath: am.Groups[1].Value.Trim());

        return new ParsedLine();
    }
}
