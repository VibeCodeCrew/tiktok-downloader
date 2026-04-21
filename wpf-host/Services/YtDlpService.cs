using System.Diagnostics;
using System.Text;
using System.Text.Json.Nodes;

namespace TikTokDownloader.Services;

public record VideoMetadata(
    string   Id,
    string   Url,
    string   Title,
    string   Thumbnail,
    double?  Duration,
    string?  Uploader,
    string?  WebpageUrl,
    string?  Extractor
);

public class YtDlpService
{
    /// <summary>
    /// Fetches metadata for a list of URLs.
    /// Callbacks fire on a background thread — callers must marshal to UI if needed.
    /// </summary>
    public async Task<(List<VideoMetadata> Videos, List<(string Url, string Error)> Errors)>
        FetchMetadataAsync(
            IEnumerable<string> urls,
            Action<string, string>    onStatus,   // (url, "fetching"|"done"|"error")
            Action<VideoMetadata>     onVideo,    // called per video, may fire many times
            Action<string, string>    onError,    // (url, errorMessage)
            CancellationToken         ct = default)
    {
        var allVideos = new List<VideoMetadata>();
        var allErrors = new List<(string, string)>();

        foreach (var url in urls)
        {
            ct.ThrowIfCancellationRequested();
            onStatus(url, "fetching");

            try
            {
                var videos = await FetchUrlAsync(url, onVideo, ct);
                allVideos.AddRange(videos);
                onStatus(url, "done");
            }
            catch (OperationCanceledException) { throw; }
            catch (Exception ex)
            {
                allErrors.Add((url, ex.Message));
                onError(url, ex.Message);
                onStatus(url, "error");
            }
        }

        return (allVideos, allErrors);
    }

    // ── Private ──────────────────────────────────────────────────────────────

    private static async Task<List<VideoMetadata>> FetchUrlAsync(
        string url, Action<VideoMetadata> onVideo, CancellationToken ct)
    {
        var psi = new ProcessStartInfo(YtDlpBinary.Get())
        {
            UseShellExecute        = false,
            CreateNoWindow         = true,
            RedirectStandardOutput = true,
            RedirectStandardError  = true,
            StandardOutputEncoding = Encoding.UTF8,
        };
        psi.ArgumentList.Add("--dump-json");
        psi.ArgumentList.Add("--flat-playlist");
        psi.ArgumentList.Add("--no-warnings");
        psi.ArgumentList.Add("--no-check-certificate");
        psi.ArgumentList.Add(url);

        using var proc = new Process { StartInfo = psi };
        proc.Start();

        // Start reading stderr concurrently to avoid buffer deadlock
        var stderrTask = proc.StandardError.ReadToEndAsync(ct);

        var videos = new List<VideoMetadata>();
        string? line;
        while ((line = await proc.StandardOutput.ReadLineAsync(ct)) is not null)
        {
            ct.ThrowIfCancellationRequested();
            var trimmed = line.Trim();
            if (string.IsNullOrEmpty(trimmed)) continue;
            try
            {
                var node = JsonNode.Parse(trimmed);
                if (node is null) continue;
                var video = ParseVideo(node);
                if (!string.IsNullOrEmpty(video.Id))
                {
                    videos.Add(video);
                    onVideo(video);
                }
            }
            catch { /* non-JSON line — skip */ }
        }

        await proc.WaitForExitAsync(ct);
        var stderr = await stderrTask;

        if (proc.ExitCode != 0 && videos.Count == 0)
        {
            var msg = stderr.Trim();
            if (string.IsNullOrEmpty(msg))
                msg = $"yt-dlp exited with code {proc.ExitCode}. " +
                      "The URL may be private, geo-blocked, or invalid.";
            throw new Exception(msg);
        }

        return videos;
    }

    private static VideoMetadata ParseVideo(JsonNode node)
    {
        static string Str(JsonNode n, params string[] keys)
        {
            foreach (var k in keys)
                if (n[k]?.GetValue<string>() is { Length: > 0 } v) return v;
            return "";
        }

        double? Num(string key)
        {
            var v = node[key];
            if (v is null) return null;
            try { return v.GetValue<double>(); } catch { return null; }
        }

        var id        = Str(node, "id", "display_id");
        var url       = Str(node, "webpage_url", "url");
        var title     = Str(node, "title", "fulltitle");
        if (string.IsNullOrEmpty(title)) title = "Untitled";

        // Best thumbnail
        var thumbnail = Str(node, "thumbnail");
        if (string.IsNullOrEmpty(thumbnail))
        {
            var thumbs = node["thumbnails"]?.AsArray();
            if (thumbs is not null)
            {
                thumbnail = thumbs
                    .Where(t => t?["url"] is not null)
                    .OrderByDescending(t =>
                        (t!["width"]?.GetValue<int>() ?? 0) *
                        (t!["height"]?.GetValue<int>() ?? 0))
                    .Select(t => t!["url"]!.GetValue<string>())
                    .FirstOrDefault() ?? "";
            }
        }

        var uploader = Str(node, "uploader", "channel", "creator");

        return new VideoMetadata(
            Id:         id,
            Url:        url,
            Title:      title,
            Thumbnail:  thumbnail,
            Duration:   Num("duration"),
            Uploader:   uploader,
            WebpageUrl: url,
            Extractor:  Str(node, "extractor", "ie_key")
        );
    }
}
