namespace TikTokDownloader.Services;

/// <summary>
/// Resolves the path to the yt-dlp binary.
/// Search order:
///   1. &lt;exe-dir&gt;\bin\yt-dlp.exe  — packaged production build
///   2. Walk up from exe-dir to find node_modules\youtube-dl-exec\bin\yt-dlp.exe  — dev
///   3. "yt-dlp" on PATH  — system-installed fallback
/// </summary>
public static class YtDlpBinary
{
    private static string? _resolved;

    public static string Get()
    {
        if (_resolved is not null) return _resolved;

        // 1. Bundled next to the executable (production)
        var bundled = Path.Combine(AppContext.BaseDirectory, "bin", "yt-dlp.exe");
        if (File.Exists(bundled))
            return _resolved = bundled;

        // 2. Development: walk up from BaseDirectory searching for node_modules
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        for (int i = 0; i < 8 && dir is not null; i++, dir = dir.Parent)
        {
            var candidate = Path.Combine(
                dir.FullName, "node_modules", "youtube-dl-exec", "bin", "yt-dlp.exe");
            if (File.Exists(candidate))
                return _resolved = candidate;
        }

        // 3. System PATH fallback
        return _resolved = "yt-dlp";
    }
}
