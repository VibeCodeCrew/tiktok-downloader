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

    // WinAPI for native window drag from WebView2 content
    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    private static extern IntPtr SendMessage(IntPtr hWnd, int msg, IntPtr wp, IntPtr lp);

    private const int WM_NCLBUTTONDOWN = 0x00A1;
    private const int HTCAPTION        = 2;

    // Prefix for all embedded wwwroot resources
    private const string ResPrefix = "TikTokDownloader.wwwroot.";

    public MainWindow()
    {
        InitializeComponent();
        Loaded += OnLoaded;
    }

    private async void OnLoaded(object sender, RoutedEventArgs e)
    {
        await WebView.EnsureCoreWebView2Async();

        // Intercept every request to https://app.local/* and serve from embedded resources
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

    private void OnWebResourceRequested(object? sender, CoreWebView2WebResourceRequestedEventArgs e)
    {
        // https://app.local/assets/index-xxx.js  →  TikTokDownloader.wwwroot.assets.index-xxx.js
        var uri      = e.Request.Uri;
        var path     = uri.Replace("https://app.local/", "").TrimStart('/');
        if (string.IsNullOrEmpty(path)) path = "index.html";

        // Directory separators become dots in resource names
        var resourceName = ResPrefix + path.Replace('/', '.').Replace('\\', '.');

        var asm    = Assembly.GetExecutingAssembly();
        var stream = asm.GetManifestResourceStream(resourceName);
        if (stream is null)
        {
            e.Response = WebView.CoreWebView2.Environment.CreateWebResourceResponse(
                null, 404, "Not Found", "");
            return;
        }

        var mime = GetMimeType(path);
        e.Response = WebView.CoreWebView2.Environment.CreateWebResourceResponse(
            stream, 200, "OK", $"Content-Type: {mime}\r\nAccess-Control-Allow-Origin: *");
    }

    private static string GetMimeType(string path) =>
        Path.GetExtension(path).ToLowerInvariant() switch
        {
            ".html"          => "text/html; charset=utf-8",
            ".js"            => "application/javascript",
            ".css"           => "text/css",
            ".json"          => "application/json",
            ".png"           => "image/png",
            ".jpg" or ".jpeg"=> "image/jpeg",
            ".svg"           => "image/svg+xml",
            ".ico"           => "image/x-icon",
            ".woff"          => "font/woff",
            ".woff2"         => "font/woff2",
            _                => "application/octet-stream",
        };

    // Called by AppBridge to push a JSON message to the renderer
    public void PostToWebView(string json)
    {
        Dispatcher.Invoke(() => WebView.CoreWebView2.PostWebMessageAsString(json));
    }

    // Called by AppBridge for window controls
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

    // Called by AppBridge when user drags the header region
    public void StartWindowDrag()
    {
        Dispatcher.Invoke(() =>
        {
            var handle = new WindowInteropHelper(this).Handle;
            SendMessage(handle, WM_NCLBUTTONDOWN, new IntPtr(HTCAPTION), IntPtr.Zero);
        });
    }

    // ── JS bridge injected into every page before scripts run ────────────────

    private const string BridgeScript = """
        (function () {
          'use strict';

          var pendingResolves = {};
          var fetchProgressCallbacks  = new Set();
          var downloadProgressCallbacks = new Set();

          // ── C# → JS ────────────────────────────────────────────────────────
          window.chrome.webview.addEventListener('message', function (e) {
            var msg;
            try { msg = JSON.parse(e.data); } catch { return; }

            switch (msg.type) {
              case 'selectDirectoryResult':
                _resolve('selectDirectory', msg.path ?? null);
                break;
              case 'readTextFileResult':
                _resolve('readTextFile', msg.content ?? null);
                break;
              case 'fetchMetadataResult':
                _resolve('fetchMetadata', msg.result);
                break;
              case 'startDownloadResult':
                _resolve('startDownload', msg.result);
                break;
              case 'cancelDownloadResult':
                _resolve('cancelDownload', undefined);
                break;
              case 'fetchProgress':
                fetchProgressCallbacks.forEach(function (cb) { cb(msg.payload); });
                break;
              case 'downloadProgress':
                downloadProgressCallbacks.forEach(function (cb) { cb(msg.payload); });
                break;
            }
          });

          function _resolve(key, value) {
            var fn = pendingResolves[key];
            if (fn) { delete pendingResolves[key]; fn(value); }
          }

          function _send(obj) {
            window.chrome.webview.postMessage(JSON.stringify(obj));
          }

          function _promise(key, obj) {
            return new Promise(function (resolve) {
              pendingResolves[key] = resolve;
              _send(obj);
            });
          }

          // ── window.api ─────────────────────────────────────────────────────
          window.api = {
            selectDirectory: function () {
              return _promise('selectDirectory', { type: 'selectDirectory' });
            },
            readTextFile: function () {
              return _promise('readTextFile', { type: 'readTextFile' });
            },
            fetchMetadata: function (urls) {
              return _promise('fetchMetadata', { type: 'fetchMetadata', urls: urls });
            },
            startDownload: function (payload) {
              return _promise('startDownload', {
                type: 'startDownload',
                items: payload.items,
                settings: payload.settings
              });
            },
            cancelDownload: function () {
              return _promise('cancelDownload', { type: 'cancelDownload' });
            },
            onFetchProgress: function (cb) {
              fetchProgressCallbacks.add(cb);
              return function () { fetchProgressCallbacks.delete(cb); };
            },
            onDownloadProgress: function (cb) {
              downloadProgressCallbacks.add(cb);
              return function () { downloadProgressCallbacks.delete(cb); };
            }
          };

          // ── window.electron shim (window controls) ─────────────────────────
          window.electron = {
            ipcRenderer: {
              send: function (channel) {
                _send({ type: 'windowControl', action: channel });
              }
            }
          };

          // ── Drag-region support ─────────────────────────────────────────────
          // The React header has class="drag-region"; clicks on .no-drag children
          // (buttons etc.) must NOT trigger drag.
          document.addEventListener('mousedown', function (e) {
            var target = e.target;
            while (target && target !== document.body) {
              if (target.classList && target.classList.contains('no-drag')) return;
              if (target.classList && target.classList.contains('drag-region')) {
                _send({ type: 'windowDrag' });
                return;
              }
              target = target.parentElement;
            }
          });
        })();
        """;
}
