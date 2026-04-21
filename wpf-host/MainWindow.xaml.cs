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
    private double     _dpi = 1.0;   // physical-pixels-per-WPF-unit (1.0 at 96 dpi)

    // Prefix for all embedded wwwroot resources
    private const string ResPrefix = "TikTokDownloader.wwwroot.";

    // ── Window messages / hit-test codes ─────────────────────────────────────
    private const int WM_NCCALCSIZE  = 0x0083;
    private const int WM_NCHITTEST   = 0x0084;
    private const int HTCLIENT       = 1;
    private const int HTCAPTION      = 2;
    private const int HTLEFT         = 10;
    private const int HTRIGHT        = 11;
    private const int HTTOP          = 12;
    private const int HTTOPLEFT      = 13;
    private const int HTTOPRIGHT     = 14;
    private const int HTBOTTOM       = 15;
    private const int HTBOTTOMLEFT   = 16;
    private const int HTBOTTOMRIGHT  = 17;

    // React header height (py-3 + 32px icon ≈ 56px at 100 % DPI)
    private const double HeaderHeightDip  = 56.0;
    // Right-side zone containing language + 3 window-control buttons (px-5 + buttons)
    private const double ButtonsZoneDip   = 130.0;
    // Resize border thickness in WPF DIPs
    private const double ResizeBorderDip  = 6.0;

    public MainWindow()
    {
        InitializeComponent();
        Loaded += OnLoaded;
    }

    // ── WndProc hook — registered as soon as HWND exists ─────────────────────

    protected override void OnSourceInitialized(EventArgs e)
    {
        base.OnSourceInitialized(e);

        // Capture initial DPI
        var src = PresentationSource.FromVisual(this);
        _dpi = src?.CompositionTarget?.TransformToDevice.M11 ?? 1.0;

        HwndSource.FromHwnd(new WindowInteropHelper(this).Handle)
                  ?.AddHook(WndProc);
    }

    protected override void OnDpiChanged(DpiScale oldDpi, DpiScale newDpi)
    {
        base.OnDpiChanged(oldDpi, newDpi);
        _dpi = newDpi.PixelsPerDip;
    }

    private IntPtr WndProc(IntPtr hwnd, int msg, IntPtr wParam, IntPtr lParam,
                           ref bool handled)
    {
        switch (msg)
        {
            // ── Remove DWM's coloured non-client border strip ─────────────────
            case WM_NCCALCSIZE when wParam != IntPtr.Zero
                                 && WindowState != WindowState.Maximized:
                handled = true;
                return IntPtr.Zero;   // client area == entire window rect

            // ── Hit-testing: resize edges + caption drag ──────────────────────
            case WM_NCHITTEST:
            {
                // Screen coordinates packed into lParam (two signed 16-bit values)
                int sx = unchecked((short)((long)lParam & 0xffff));
                int sy = unchecked((short)(((long)lParam >> 16) & 0xffff));

                GetWindowRect(hwnd, out RECT r);
                int relX = sx - r.left;
                int relY = sy - r.top;
                int w    = r.right  - r.left;
                int h    = r.bottom - r.top;

                int b  = (int)(ResizeBorderDip * _dpi);   // resize border (px)
                int hh = (int)(HeaderHeightDip * _dpi);   // header height (px)
                int bz = (int)(ButtonsZoneDip  * _dpi);   // buttons zone width (px)

                // Skip resize handling when maximized
                if (WindowState != WindowState.Maximized)
                {
                    bool onL = relX < b;
                    bool onR = relX > w - b;
                    bool onT = relY < b;
                    bool onB = relY > h - b;

                    if (onT && onL) { handled = true; return new IntPtr(HTTOPLEFT);     }
                    if (onT && onR) { handled = true; return new IntPtr(HTTOPRIGHT);    }
                    if (onB && onL) { handled = true; return new IntPtr(HTBOTTOMLEFT);  }
                    if (onB && onR) { handled = true; return new IntPtr(HTBOTTOMRIGHT); }
                    if (onT)        { handled = true; return new IntPtr(HTTOP);         }
                    if (onB)        { handled = true; return new IntPtr(HTBOTTOM);      }
                    if (onL)        { handled = true; return new IntPtr(HTLEFT);        }
                    if (onR)        { handled = true; return new IntPtr(HTRIGHT);       }
                }

                // Caption / drag area: header row, left of buttons zone
                if (relY >= 0 && relY < hh && relX < w - bz)
                {
                    handled = true;
                    return new IntPtr(HTCAPTION);
                }

                break;
            }
        }

        return IntPtr.Zero;
    }

    [DllImport("user32.dll")]
    private static extern bool GetWindowRect(IntPtr hwnd, out RECT rect);

    [StructLayout(LayoutKind.Sequential)]
    private struct RECT { public int left, top, right, bottom; }

    // ── WebView2 init ─────────────────────────────────────────────────────────

    private async void OnLoaded(object sender, RoutedEventArgs e)
    {
        await WebView.EnsureCoreWebView2Async();

        // Serve embedded React assets via virtual HTTPS host
        WebView.CoreWebView2.AddWebResourceRequestedFilter(
            "https://app.local/*", CoreWebView2WebResourceContext.All);
        WebView.CoreWebView2.WebResourceRequested += OnWebResourceRequested;

        // Inject bridge before any page script runs
        await WebView.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(BridgeScript);

        _bridge = new AppBridge(this);
        WebView.CoreWebView2.WebMessageReceived += (_, args) =>
            _bridge.HandleMessage(args.TryGetWebMessageAsString());

        WebView.Source = new Uri("https://app.local/index.html");
    }

    private void OnWebResourceRequested(object? sender,
                                        CoreWebView2WebResourceRequestedEventArgs e)
    {
        var uri  = e.Request.Uri;
        var path = uri.Replace("https://app.local/", "").TrimStart('/');
        if (string.IsNullOrEmpty(path)) path = "index.html";

        // Embedded resource name: dir separators → dots
        var resourceName = ResPrefix + path.Replace('/', '.').Replace('\\', '.');

        var stream = Assembly.GetExecutingAssembly()
                             .GetManifestResourceStream(resourceName);
        if (stream is null)
        {
            e.Response = WebView.CoreWebView2.Environment
                .CreateWebResourceResponse(null, 404, "Not Found", "");
            return;
        }

        e.Response = WebView.CoreWebView2.Environment
            .CreateWebResourceResponse(stream, 200, "OK",
                $"Content-Type: {GetMimeType(path)}\r\nAccess-Control-Allow-Origin: *");
    }

    private static string GetMimeType(string path) =>
        Path.GetExtension(path).ToLowerInvariant() switch
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

    // ── Called by AppBridge ───────────────────────────────────────────────────

    public void PostToWebView(string json)
        => Dispatcher.Invoke(() => WebView.CoreWebView2.PostWebMessageAsString(json));

    public void HandleWindowControl(string action)
    {
        Dispatcher.Invoke(() =>
        {
            switch (action)
            {
                case "minimize-window":
                    WindowState = WindowState.Minimized;
                    break;
                case "maximize-window":
                    WindowState = WindowState == WindowState.Maximized
                        ? WindowState.Normal
                        : WindowState.Maximized;
                    break;
                case "close-window":
                    Close();
                    break;
            }
        });
    }

    // ── JS bridge injected before every page load ─────────────────────────────

    private const string BridgeScript = """
        (function () {
          'use strict';

          var pendingResolves = {};
          var fetchProgressCallbacks    = new Set();
          var downloadProgressCallbacks = new Set();

          window.chrome.webview.addEventListener('message', function (e) {
            var msg;
            try { msg = JSON.parse(e.data); } catch { return; }

            switch (msg.type) {
              case 'selectDirectoryResult':
                _resolve('selectDirectory', msg.path ?? null);   break;
              case 'readTextFileResult':
                _resolve('readTextFile',   msg.content ?? null); break;
              case 'fetchMetadataResult':
                _resolve('fetchMetadata',  msg.result);          break;
              case 'startDownloadResult':
                _resolve('startDownload',  msg.result);          break;
              case 'cancelDownloadResult':
                _resolve('cancelDownload', undefined);           break;
              case 'fetchProgress':
                fetchProgressCallbacks.forEach(function (cb) { cb(msg.payload); });    break;
              case 'downloadProgress':
                downloadProgressCallbacks.forEach(function (cb) { cb(msg.payload); }); break;
            }
          });

          function _resolve(key, value) {
            var fn = pendingResolves[key];
            if (fn) { delete pendingResolves[key]; fn(value); }
          }
          function _send(obj) { window.chrome.webview.postMessage(JSON.stringify(obj)); }
          function _promise(key, obj) {
            return new Promise(function (resolve) {
              pendingResolves[key] = resolve;
              _send(obj);
            });
          }

          window.api = {
            selectDirectory:  function ()        { return _promise('selectDirectory',  { type: 'selectDirectory' }); },
            readTextFile:     function ()        { return _promise('readTextFile',     { type: 'readTextFile' }); },
            fetchMetadata:    function (urls)    { return _promise('fetchMetadata',    { type: 'fetchMetadata',  urls: urls }); },
            startDownload:    function (payload) { return _promise('startDownload',    { type: 'startDownload',  items: payload.items, settings: payload.settings }); },
            cancelDownload:   function ()        { return _promise('cancelDownload',   { type: 'cancelDownload' }); },
            onFetchProgress:    function (cb) { fetchProgressCallbacks.add(cb);    return function () { fetchProgressCallbacks.delete(cb); }; },
            onDownloadProgress: function (cb) { downloadProgressCallbacks.add(cb); return function () { downloadProgressCallbacks.delete(cb); }; }
          };

          window.electron = {
            ipcRenderer: {
              send: function (channel) { _send({ type: 'windowControl', action: channel }); }
            }
          };
        })();
        """;
}
