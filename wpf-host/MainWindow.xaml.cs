using System.Reflection;
using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Interop;
using Microsoft.Web.WebView2.Core;
using TikTokDownloader.Bridge;

namespace TikTokDownloader;

public partial class MainWindow : Window
{
    private AppBridge? _bridge;
    private double     _dpi = 1.0;

    private const string ResPrefix = "TikTokDownloader.wwwroot.";

    // ── WinAPI ────────────────────────────────────────────────────────────────
    [DllImport("user32.dll")] private static extern bool ReleaseCapture();
    [DllImport("user32.dll")] private static extern bool PostMessage(IntPtr h, int msg, IntPtr w, IntPtr l);
    [DllImport("user32.dll")] private static extern bool GetWindowRect(IntPtr h, out RECT r);

    [StructLayout(LayoutKind.Sequential)]
    private struct RECT { public int left, top, right, bottom; }

    // Window messages / HT codes
    private const int WM_NCCALCSIZE = 0x0083;
    private const int WM_NCHITTEST  = 0x0084;
    private const int WM_NCLBUTTONDOWN = 0x00A1;
    private const int HTCAPTION  = 2;
    private const int HTLEFT     = 10, HTRIGHT   = 11;
    private const int HTTOP      = 12, HTTOPLEFT = 13, HTTOPRIGHT   = 14;
    private const int HTBOTTOM   = 15, HTBOTTOMLEFT = 16, HTBOTTOMRIGHT = 17;

    // Border thickness exposed around WebView2 for resize hit-testing (WPF DIPs)
    private const double BorderDip = 6.0;

    public MainWindow()
    {
        InitializeComponent();
        Loaded      += OnLoaded;
        StateChanged += OnStateChanged;
    }

    // ── WndProc — resize only (drag handled via JS + ReleaseCapture) ──────────

    protected override void OnSourceInitialized(EventArgs e)
    {
        base.OnSourceInitialized(e);
        var src = PresentationSource.FromVisual(this);
        _dpi = src?.CompositionTarget?.TransformToDevice.M11 ?? 1.0;
        HwndSource.FromHwnd(new WindowInteropHelper(this).Handle)?.AddHook(WndProc);
    }

    protected override void OnDpiChanged(DpiScale old, DpiScale @new)
    {
        base.OnDpiChanged(old, @new);
        _dpi = @new.PixelsPerDip;
    }

    private IntPtr WndProc(IntPtr hwnd, int msg, IntPtr wParam, IntPtr lParam, ref bool handled)
    {
        switch (msg)
        {
            // Remove DWM coloured border strip
            case WM_NCCALCSIZE when wParam != IntPtr.Zero
                                 && WindowState != WindowState.Maximized:
                handled = true;
                return IntPtr.Zero;

            // Resize edges — only the 6 px margin around WebView2 reaches here;
            // everything inside WebView2 is handled by its own HWND first.
            case WM_NCHITTEST when WindowState != WindowState.Maximized:
            {
                int sx = unchecked((short)((long)lParam & 0xffff));
                int sy = unchecked((short)(((long)lParam >> 16) & 0xffff));
                GetWindowRect(hwnd, out RECT r);
                int rx = sx - r.left, ry = sy - r.top;
                int w  = r.right - r.left, h = r.bottom - r.top;
                int b  = (int)(BorderDip * _dpi);

                bool L = rx < b, R = rx > w - b, T = ry < b, B = ry > h - b;
                if (T && L) { handled = true; return new IntPtr(HTTOPLEFT);     }
                if (T && R) { handled = true; return new IntPtr(HTTOPRIGHT);    }
                if (B && L) { handled = true; return new IntPtr(HTBOTTOMLEFT);  }
                if (B && R) { handled = true; return new IntPtr(HTBOTTOMRIGHT); }
                if (T)      { handled = true; return new IntPtr(HTTOP);         }
                if (B)      { handled = true; return new IntPtr(HTBOTTOM);      }
                if (L)      { handled = true; return new IntPtr(HTLEFT);        }
                if (R)      { handled = true; return new IntPtr(HTRIGHT);       }
                break;
            }
        }
        return IntPtr.Zero;
    }

    // ── WebView2 margin — exposes the 6 px border to WPF/Win32 ───────────────

    private void OnStateChanged(object? sender, EventArgs e)
        => WebView.Margin = WindowState == WindowState.Maximized
            ? new Thickness(0)
            : new Thickness(BorderDip);

    // ── Called from AppBridge when JS fires mousedown on .drag-region ─────────

    public void StartWindowDrag()
    {
        Dispatcher.Invoke(() =>
        {
            // Release WebView2's mouse capture first, then post NCLBUTTONDOWN so
            // Windows initiates a native drag while the button is still held down.
            ReleaseCapture();
            var hwnd = new WindowInteropHelper(this).Handle;
            PostMessage(hwnd, WM_NCLBUTTONDOWN, new IntPtr(HTCAPTION), IntPtr.Zero);
        });
    }

    // ── Window controls (called from AppBridge) ───────────────────────────────

    public void HandleWindowControl(string action)
    {
        Dispatcher.Invoke(() =>
        {
            switch (action)
            {
                case "minimize-window":
                    WindowState = WindowState.Minimized; break;
                case "maximize-window":
                    WindowState = WindowState == WindowState.Maximized
                        ? WindowState.Normal : WindowState.Maximized;
                    break;
                case "close-window":
                    Close(); break;
            }
        });
    }

    public void PostToWebView(string json)
        => Dispatcher.Invoke(() => WebView.CoreWebView2.PostWebMessageAsString(json));

    // ── WebView2 init ─────────────────────────────────────────────────────────

    private async void OnLoaded(object sender, RoutedEventArgs e)
    {
        // Initial margin (window starts non-maximized)
        WebView.Margin = new Thickness(BorderDip);

        await WebView.EnsureCoreWebView2Async();

        WebView.CoreWebView2.AddWebResourceRequestedFilter(
            "https://app.local/*", CoreWebView2WebResourceContext.All);
        WebView.CoreWebView2.WebResourceRequested += OnWebResourceRequested;

        await WebView.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(BridgeScript);

        _bridge = new AppBridge(this);
        WebView.CoreWebView2.WebMessageReceived += (_, args) =>
            _bridge.HandleMessage(args.TryGetWebMessageAsString());

        WebView.Source = new Uri("https://app.local/index.html");
    }

    private void OnWebResourceRequested(object? sender,
                                        CoreWebView2WebResourceRequestedEventArgs e)
    {
        var path = e.Request.Uri.Replace("https://app.local/", "").TrimStart('/');
        if (string.IsNullOrEmpty(path)) path = "index.html";

        var name   = ResPrefix + path.Replace('/', '.').Replace('\\', '.');
        var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream(name);

        e.Response = stream is null
            ? WebView.CoreWebView2.Environment.CreateWebResourceResponse(null, 404, "Not Found", "")
            : WebView.CoreWebView2.Environment.CreateWebResourceResponse(
                stream, 200, "OK",
                $"Content-Type: {GetMimeType(path)}\r\nAccess-Control-Allow-Origin: *");
    }

    private static string GetMimeType(string p) =>
        Path.GetExtension(p).ToLowerInvariant() switch
        {
            ".html"           => "text/html; charset=utf-8",
            ".js"             => "application/javascript",
            ".css"            => "text/css",
            ".json"           => "application/json",
            ".png"            => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".svg"            => "image/svg+xml",
            ".ico"            => "image/x-icon",
            ".woff"           => "font/woff",
            ".woff2"          => "font/woff2",
            _                 => "application/octet-stream",
        };

    // ── JS bridge ─────────────────────────────────────────────────────────────

    private const string BridgeScript = """
        (function () {
          'use strict';

          var pendingResolves = {};
          var fetchProgressCallbacks    = new Set();
          var downloadProgressCallbacks = new Set();

          window.chrome.webview.addEventListener('message', function (e) {
            var msg; try { msg = JSON.parse(e.data); } catch { return; }
            switch (msg.type) {
              case 'selectDirectoryResult':  _resolve('selectDirectory',  msg.path ?? null);   break;
              case 'readTextFileResult':     _resolve('readTextFile',     msg.content ?? null); break;
              case 'fetchMetadataResult':    _resolve('fetchMetadata',    msg.result);          break;
              case 'startDownloadResult':    _resolve('startDownload',    msg.result);          break;
              case 'cancelDownloadResult':   _resolve('cancelDownload',   undefined);           break;
              case 'fetchProgress':
                fetchProgressCallbacks.forEach(function (cb) { cb(msg.payload); });    break;
              case 'downloadProgress':
                downloadProgressCallbacks.forEach(function (cb) { cb(msg.payload); }); break;
            }
          });

          function _resolve(key, val) { var f = pendingResolves[key]; if (f) { delete pendingResolves[key]; f(val); } }
          function _send(o) { window.chrome.webview.postMessage(JSON.stringify(o)); }
          function _promise(key, o) { return new Promise(function (res) { pendingResolves[key] = res; _send(o); }); }

          window.api = {
            selectDirectory:    function ()        { return _promise('selectDirectory',  { type: 'selectDirectory' }); },
            readTextFile:       function ()        { return _promise('readTextFile',     { type: 'readTextFile' }); },
            fetchMetadata:      function (urls)    { return _promise('fetchMetadata',    { type: 'fetchMetadata', urls: urls }); },
            startDownload:      function (payload) { return _promise('startDownload',    { type: 'startDownload', items: payload.items, settings: payload.settings }); },
            cancelDownload:     function ()        { return _promise('cancelDownload',   { type: 'cancelDownload' }); },
            onFetchProgress:    function (cb) { fetchProgressCallbacks.add(cb);    return function () { fetchProgressCallbacks.delete(cb); }; },
            onDownloadProgress: function (cb) { downloadProgressCallbacks.add(cb); return function () { downloadProgressCallbacks.delete(cb); }; }
          };

          window.electron = { ipcRenderer: { send: function (ch) { _send({ type: 'windowControl', action: ch }); } } };

          // Drag + double-click maximise — both operate on .drag-region.
          // Capture phase fires before WebView2's internal input handling.
          function _dragTarget(e) {
            var t = e.target;
            while (t && t !== document.body) {
              if (t.classList && t.classList.contains('no-drag'))    return null;
              if (t.classList && t.classList.contains('drag-region')) return t;
              t = t.parentElement;
            }
            return null;
          }

          document.addEventListener('mousedown', function (e) {
            if (_dragTarget(e)) _send({ type: 'windowDrag' });
          }, true);

          document.addEventListener('dblclick', function (e) {
            if (_dragTarget(e)) _send({ type: 'windowControl', action: 'maximize-window' });
          }, true);
        })();
        """;
}
