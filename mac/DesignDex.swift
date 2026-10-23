// DesignDex の Mac アプリ。同梱の web/ を WKWebView で表示する。
// 「辞典のフォルダを選ぶ…」でリポジトリのフォルダを選ぶと、そこの web/ を読む（自分で足した項目や自動更新を反映するため）。
import AppKit
import SwiftUI
import WebKit

private let dataFolderKey = "dataFolder"

/// 表示する web/ フォルダ。選んだフォルダが使えなければ同梱のものに戻す。
func webRoot() -> URL? {
    if let path = UserDefaults.standard.string(forKey: dataFolderKey) {
        let custom = URL(fileURLWithPath: path).appendingPathComponent("web")
        if FileManager.default.fileExists(atPath: custom.appendingPathComponent("index.html").path) { return custom }
    }
    return Bundle.main.resourceURL?.appendingPathComponent("web")
}

@main
struct DesignDexApp: App {
    var body: some Scene {
        WindowGroup("DesignDex") {
            DictionaryWebView()
                .frame(minWidth: 760, minHeight: 520)
        }
        .defaultSize(width: 1280, height: 860)
        .commands { AppCommands() }
    }
}

/// メニューから WebView を操作するための共有窓口（ウィンドウは1枚の前提）
@MainActor
final class WebController {
    static let shared = WebController()
    weak var webView: WKWebView?

    func run(_ js: String) { webView?.evaluateJavaScript(js) }

    func load() {
        guard let webView, let root = webRoot() else { return }
        webView.loadFileURL(root.appendingPathComponent("index.html"), allowingReadAccessTo: root)
    }

    func chooseFolder() {
        let panel = NSOpenPanel()
        panel.canChooseDirectories = true
        panel.canChooseFiles = false
        panel.message = String(localized: "DesignDex のリポジトリのフォルダ（web/index.html があるフォルダ）を選んでください")
        guard panel.runModal() == .OK, let url = panel.url else { return }
        guard FileManager.default.fileExists(atPath: url.appendingPathComponent("web/index.html").path) else {
            let alert = NSAlert()
            alert.messageText = String(localized: "このフォルダは使えません")
            alert.informativeText = String(localized: "web/index.html が見つかりません。リポジトリの一番上のフォルダを選んでください。")
            alert.runModal()
            return
        }
        UserDefaults.standard.set(url.path, forKey: dataFolderKey)
        load()
    }

    func useBundled() {
        UserDefaults.standard.removeObject(forKey: dataFolderKey)
        load()
    }
}

@MainActor
struct AppCommands: Commands {
    var body: some Commands {
        CommandGroup(replacing: .appSettings) {
            Button("設定…") { WebController.shared.run("openSettings()") }
                .keyboardShortcut(",", modifiers: .command)
        }
        CommandGroup(after: .newItem) {
            Button("辞典のフォルダを選ぶ…") { WebController.shared.chooseFolder() }
                .keyboardShortcut("o", modifiers: .command)
            Button("同梱のデータに戻す") { WebController.shared.useBundled() }
        }
        CommandGroup(after: .textEditing) {
            Button("検索") { WebController.shared.run("setView('dict');document.getElementById('q').focus();document.getElementById('q').select()") }
                .keyboardShortcut("f", modifiers: .command)
        }
        CommandMenu("表示") {
            Button("辞典を読み込み直す") { WebController.shared.load() }
                .keyboardShortcut("r", modifiers: .command)
            Divider()
            Button("辞典") { WebController.shared.run("setView('dict')") }
                .keyboardShortcut("1", modifiers: .command)
            Button("配色") { WebController.shared.run("setView('palette')") }
                .keyboardShortcut("2", modifiers: .command)
        }
    }
}

/// ウィンドウ上部のタイトル文字は出さない（信号機ボタンだけ残す）。画面の中身で何のアプリかは分かるため
final class TitlelessWebView: WKWebView {
    override func viewDidMoveToWindow() {
        super.viewDidMoveToWindow()
        window?.titleVisibility = .hidden
        window?.titlebarAppearsTransparent = true
    }
}

struct DictionaryWebView: NSViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeNSView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.userContentController.add(context.coordinator, name: "copy")
        config.userContentController.add(context.coordinator, name: "pickColor")
        let webView = TitlelessWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.setValue(false, forKey: "drawsBackground")
        WebController.shared.webView = webView
        if webRoot() == nil {
            webView.loadHTMLString("<p style='font:15px -apple-system;padding:24px'>web フォルダが見つかりません。アプリを入れ直してください。</p>", baseURL: nil)
        } else {
            WebController.shared.load()
        }
        return webView
    }

    func updateNSView(_ webView: WKWebView, context: Context) {}

    @MainActor
    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
        // https のリンク（公式ページ・見本）は既定のブラウザで開き、アプリ内では辞典だけを表示する。
        // SDK ごとに completion handler 版の型が違うため、どの Xcode でも一致する async 版を使う
        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction) async -> WKNavigationActionPolicy {
            guard let url = action.request.url, url.scheme == "https", action.targetFrame?.isMainFrame != false else {
                return .allow
            }
            NSWorkspace.shared.open(url)
            return .cancel
        }

        /// 取り込みファイル（designdex-import.json）を選ぶ画面。WKWebView は自分では開かないので AppKit で出す。
        /// 最初は「ダウンロード」フォルダを開く（Claude Code / Codex がそこに書き出すため）
        func webView(_ webView: WKWebView, runOpenPanelWith parameters: WKOpenPanelParameters,
                     initiatedByFrame frame: WKFrameInfo) async -> [URL]? {
            let panel = NSOpenPanel()
            panel.canChooseFiles = true
            panel.canChooseDirectories = false
            panel.allowsMultipleSelection = parameters.allowsMultipleSelection
            panel.directoryURL = FileManager.default.urls(for: .downloadsDirectory, in: .userDomainMask).first
            return panel.runModal() == .OK ? panel.urls : nil
        }

        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                     for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            if let url = action.request.url, url.scheme == "https" { NSWorkspace.shared.open(url) }
            return nil
        }

        func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
            if message.name == "pickColor" { pickColor(); return }
            guard let text = message.body as? String else { return }
            NSPasteboard.general.clearContents()
            NSPasteboard.general.setString(text, forType: .string)
        }

        /// 画面のどこからでも色を拾う（macOS 標準のスポイト）。拾った色を #rrggbb で web 側に返す
        private func pickColor() {
            NSColorSampler().show { color in
                guard let rgb = color?.usingColorSpace(.sRGB) else { return }
                let hex = String(format: "#%02x%02x%02x", Int(round(rgb.redComponent * 255)), Int(round(rgb.greenComponent * 255)), Int(round(rgb.blueComponent * 255)))
                Task { @MainActor in WebController.shared.run("window.__designdexPicked && window.__designdexPicked('\(hex)')") }
            }
        }
    }
}
