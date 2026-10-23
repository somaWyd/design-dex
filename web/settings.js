// 設定（テーマカラー・外観・言語・文字の大きさ・プレビューの動き・カードの表示・起動時の画面）と画面の文言。
// 設定はこの端末のブラウザ（Mac アプリでは WebView）に保存する。保存できない環境でも既定値で動く。
// アイコンと文字の組。:root[data-labels] で「アイコンのみ／文字のみ／両方」を出し分ける（style.css）
function frag(...nodes) { const f = document.createDocumentFragment(); f.append(...nodes.filter(Boolean)); return f; }
function face(name, label) {
  const span = document.createElement("span"); span.className = "lbl"; span.textContent = label;
  return frag(icon(name, "ic opt"), span);
}
const I18N = {
  ja: {
    title: "DesignDex", tagline: "UI・モーション・配色・書体の名前と指示文",
    view_dict: "辞典", view_palette: "配色", kind: "種類", category: "カテゴリ", source: "出典",
    reset_filters: "絞り込みを解除", settings: "設定",
    search_ph: "検索", filters: "絞り込み", how_to_use: "使い方", invoke_claude: "Claude Code", invoke_codex: "Codex", invoke_mcp: "MCP", src_ref: "置き場所", src_open: "公式ページを開く", copy_path: "置き場所をコピー", open_source_only: "この出典だけを見る",
    k_all: "すべて", k_motion: "モーション", k_ui: "UI", k_type: "タイポ",
    g_skill: "スキル", g_mcp: "MCP", g_doc: "公式ドキュメント", t_doc: "公式",
    count: (n) => String(n), empty: "見つかりません。別の言い方（例：「出る」「消える」「弾む」）で試してください",
    meta: (n, s, d) => `${n} 項目・${s} 出典・更新 ${d}`,
    cite: "出典：", prompt_open: "指示文を見る（出典・再現する値つき）",
    copy_prompt: "指示文をコピー", copy_url: "URLをコピー", copy_name: "名前", open: "開く",
    copied_prompt: "指示文をコピーしました。Claude Code や Codex に貼り付けてください", copied_url: "URLをコピーしました", copied: (s) => `${s} をコピーしました`,
    pal_title: "配色の提案", pal_lead: "1色を選ぶと、相性のよい2〜3色のセットを配色ルールごとに出します。色をクリックするとコードをコピーします。",
    pal_tones: "同じ色の濃淡（Material 3 の色調パレットに近い13段）", pal_err: "#RRGGBB の形で入力してください（例: #2f6fed）",
    pal_copy_hex: "色コードをコピー", pal_copied_hex: "色コードをコピーしました", pal_prompt_open: "指示文を見る（出典・色コードつき）",
    pal_history: "最近見た配色", pal_history_clear: "すべて消す", pal_history_empty: "まだありません。色を決めると、ここに上から積み重なります（最大30件）",
    pal_history_del: (h) => `${h} を履歴から消す`,
    pal_favs: "お気に入り", pal_favs_empty: "配色カードや上の ☆ を押すと、ここに保存されます", favs: "お気に入り", favs_empty: "お気に入りはまだありません。カード右上の ☆ で追加できます",
    fav_toggle: (n) => `${n} をお気に入りに追加／解除`, fav_color: (h) => `${h} をお気に入りに追加／解除`, fav_set: (r) => `この${r}の配色をお気に入りに追加／解除`,
    fav_remove: "お気に入りから外す", fav_removed: "お気に入りから外しました", clear_search: "検索語を消す", pal_hex: "色コード",
    pick_system: "システムの色選択", pick_screen: "画面から色を拾う（スポイト）", favs_only: "お気に入りだけ表示", pick_palette: "パレット", pick_wheel: "ホイール", pick_gradient: "グラデーション", pick_numbers: "数値",
    pick_theme: "テーマの色", pick_standard: "標準の色", pick_brightness: "明るさ", pick_hue: "色相", pal_history_undo: "元に戻す", pal_history_removed: (h) => `${h} を消しました`, pal_history_cleared: (n) => `${n} 件を消しました`, remove_filter: (s) => `${s} の絞り込みを外す`,
    s_theme: "テーマカラー", s_theme_hint: "ボタンや選択中の項目の色", s_custom: "好きな色",
    s_appearance: "外観", s_auto: "自動", s_light: "ライト", s_dark: "ダーク",
    s_lang: "言語", s_lang_hint: "画面の文言を切り替えます。項目の説明文は日本語のままです",
    s_size: "文字の大きさ", s_small: "小", s_medium: "標準", s_large: "大",
    s_motion: "プレビューの動き", s_motion_always: "常に再生", s_motion_hover: "マウスを乗せたときだけ", s_motion_off: "止める",
    s_density: "カードの表示", s_detail: "詳しく", s_compact: "コンパクト",
    s_start: "起動時の画面", s_reset: "設定を初期値に戻す", s_close: "閉じる",
    s_labels: "ボタンの表示", s_lbl_icon: "アイコンのみ", s_lbl_text: "文字のみ", s_lbl_both: "アイコンと文字",
    guide: "使い方", g_skip: "スキップ", g_back: "戻る", g_next: "次へ", g_start: "はじめる", g_later: "あとで", g_close: "閉じる",
    g_import_start: "スキルを取り込む",
    g1_title: "DesignDex をインストールしていただき、ありがとうございます",
    g1_body: "UI・動き・配色・書体の「名前」を調べて、Claude Code や Codex にそのまま渡せる指示文をコピーできる辞典です。1分で使い方をご案内します。",
    g2_title: "思い浮かんだ言葉で探す",
    g2_body: "「ふわっと出る」「下から出るパネル」のように、見た目の言葉で検索できます。左のサイドバーでは、スキル（出典）やカテゴリで絞り込めます。",
    g2_sample: "ふわっと出る",
    g3_title: "動きを確かめて、AI に渡す",
    g3_body: "カードのプレビューで動きを確かめたら［指示文をコピー］。Claude Code や Codex に貼り付けると、出典と数値つきで正確に伝わります。スキル名のバッジを押すと、そのスキルの呼び出し方（Claude Code は /名前、Codex は $名前）が出ます。",
    g4_title: "1色から配色を作る",
    g4_body: "左上の［配色］では、1色を選ぶだけで相性のよい3色のセットが配色ルールごとに出ます。気に入った配色は ☆ で保存でき、最近見た色も左に残ります。",
    g5_title: "あなたのスキルも辞典に足せます",
    g5_body: "Claude Code や Codex に入れているデザイン系のスキルを、AI に読ませてこの辞典に取り込めます。3ステップ・数分で終わります。あとからでも、右上の設定からいつでも始められます。",
    imp_title: "自分のスキルを取り込む", imp_lead: "Claude Code か Codex が、入っているデザイン系スキルを読んでファイルを作り、それをここで読み込みます。ファイルは手元に作られるだけで、どこにも送られません。",
    imp_s1_title: "取り込み用の指示文をコピー", imp_s1_body: "AI に渡す手順（どのフォルダを読み、どんな形で書き出すか）が入った指示文です。",
    imp_copy: "指示文をコピー", imp_copied: "コピーしました。Claude Code か Codex に貼り付けてください",
    imp_s2_title: "Claude Code か Codex に貼り付けて実行", imp_s2_body: "ターミナルで claude（または codex）と入力して起動し、コピーした指示文を貼り付けて Enter。Claude のデスクトップアプリの Code タブや、VS Code の拡張機能でも同じです。終わると「ダウンロード」フォルダにファイルができます。",
    imp_s3_title: "できたファイルを選ぶ", imp_s3_body: (f) => `「ダウンロード」フォルダの ${f} を、下の枠に置くか、枠を押して選んでください。`,
    imp_drop: (f) => `${f} をここに置く（押して選ぶ）`,
    imp_done: (n, s, bad) => `${s} 個のスキルから ${n} 件を取り込みました${bad ? `（形式が合わない ${bad} 件は除外）` : ""}。辞典を読み込み直します…`,
    imp_none: (skipped) => skipped ? `新しい項目はありませんでした（${skipped} 個のスキルは DesignDex に最初から入っています）` : "取り込める項目がありませんでした。AI の出力したファイルか確かめてください",
    imp_bad_json: "ファイルを読めませんでした（JSON ではありません）", imp_bad_format: "DesignDex の取り込みファイルではありません（format が designdex-import@1 ではない）",
    imp_too_big: "ファイルが大きすぎます（5MB まで）", imp_no_space: "この端末に保存できませんでした（空き容量かプライベートブラウズを確認してください）",
    imp_now: (n, s) => `取り込み済み: ${s} 個のスキル・${n} 件`, imp_clear: "取り込んだ項目を消す", imp_clear_confirm: "もう一度押すと消えます",
    imp_prompt_intro: "次の手順で、私のデザイン系スキルを DesignDex 用の取り込みファイルにしてください。終わったらファイルの場所と件数を日本語で教えてください。",
    s_import: "自分のスキルを取り込む", s_guide: "使い方をもう一度見る", s_open: "開く",
  },
  en: {
    title: "DesignDex", tagline: "Names and prompts for UI, motion, color and type",
    view_dict: "Dictionary", view_palette: "Colors", kind: "Kind", category: "Category", source: "Source",
    reset_filters: "Clear filters", settings: "Settings",
    search_ph: "Search", filters: "Filters", how_to_use: "How to use", invoke_claude: "Claude Code", invoke_codex: "Codex", invoke_mcp: "MCP", src_ref: "Location", src_open: "Open official page", copy_path: "Copy location", open_source_only: "Show only this source",
    k_all: "All", k_motion: "Motion", k_ui: "UI", k_type: "Type",
    g_skill: "Skills", g_mcp: "MCP", g_doc: "Official docs", t_doc: "DOC",
    count: (n) => String(n), empty: "No results. Try other words (e.g. appear, disappear, bounce).",
    meta: (n, s, d) => `${n} items · ${s} sources · updated ${d}`,
    cite: "Source: ", prompt_open: "Show prompt (with source and exact values)",
    copy_prompt: "Copy prompt", copy_url: "Copy URL", copy_name: "Name", open: "Open",
    copied_prompt: "Prompt copied. Paste it into Claude Code or Codex", copied_url: "URL copied", copied: (s) => `Copied ${s}`,
    pal_title: "Color suggestions", pal_lead: "Pick one color to get 2-3 color sets that work well together, by harmony rule. Click a color to copy its code.",
    pal_tones: "Tones of the same hue (13 steps, close to the Material 3 tonal palette)", pal_err: "Enter a color as #RRGGBB (e.g. #2f6fed)",
    pal_copy_hex: "Copy codes", pal_copied_hex: "Color codes copied", pal_prompt_open: "Show prompt (with source and codes)",
    pal_history: "Recent colors", pal_history_clear: "Clear all", pal_history_empty: "Nothing yet. Colors you pick stack up here (up to 30).",
    pal_history_del: (h) => `Remove ${h} from history`,
    pal_favs: "Favorites", pal_favs_empty: "Star a color set or the color above to save it here.", favs: "Favorites", favs_empty: "No favorites yet. Use the star on a card to add one.",
    fav_toggle: (n) => `Add or remove ${n} from favorites`, fav_color: (h) => `Add or remove ${h} from favorites`, fav_set: (r) => `Add or remove this ${r} set from favorites`,
    fav_remove: "Remove from favorites", fav_removed: "Removed from favorites", clear_search: "Clear search", pal_hex: "Color code",
    pick_system: "System picker", pick_screen: "Pick a color from the screen", favs_only: "Show favorites only", pick_palette: "Palette", pick_wheel: "Wheel", pick_gradient: "Gradient", pick_numbers: "Numbers",
    pick_theme: "Theme colors", pick_standard: "Standard colors", pick_brightness: "Brightness", pick_hue: "Hue", pal_history_undo: "Undo", pal_history_removed: (h) => `Removed ${h}`, pal_history_cleared: (n) => `Removed ${n} colors`, remove_filter: (s) => `Remove filter ${s}`,
    s_theme: "Theme color", s_theme_hint: "Color of buttons and selected items", s_custom: "Custom",
    s_appearance: "Appearance", s_auto: "Auto", s_light: "Light", s_dark: "Dark",
    s_lang: "Language", s_lang_hint: "Switches the interface text. Entry descriptions stay in Japanese.",
    s_size: "Text size", s_small: "Small", s_medium: "Default", s_large: "Large",
    s_motion: "Preview motion", s_motion_always: "Always play", s_motion_hover: "Play on hover", s_motion_off: "Paused",
    s_density: "Card layout", s_detail: "Detailed", s_compact: "Compact",
    s_start: "Start screen", s_reset: "Reset settings", s_close: "Close",
    s_labels: "Button labels", s_lbl_icon: "Icons only", s_lbl_text: "Text only", s_lbl_both: "Icons and text",
    guide: "Guide", g_skip: "Skip", g_back: "Back", g_next: "Next", g_start: "Get started", g_later: "Later", g_close: "Close",
    g_import_start: "Import my skills",
    g1_title: "Thank you for installing DesignDex",
    g1_body: "Look up the names of UI patterns, motion, color and type, and copy prompts you can hand straight to Claude Code or Codex. Here is a one-minute tour.",
    g2_title: "Search with the words in your head",
    g2_body: "Type how it looks, like \"fade in\" or \"panel from the bottom\". The sidebar narrows results by skill (source) or category.",
    g2_sample: "fade in",
    g3_title: "Check the motion, then hand it to your AI",
    g3_body: "Watch the preview on a card, then press Copy prompt. Paste it into Claude Code or Codex and it arrives with its source and exact values. Press a skill badge to see how to call that skill (/name in Claude Code, $name in Codex).",
    g4_title: "Build a palette from one color",
    g4_body: "In Colors (top left), pick one color to get three-color sets for each harmony rule. Star the ones you like; recent colors stay in the sidebar.",
    g5_title: "Add your own skills to the dictionary",
    g5_body: "Let Claude Code or Codex read the design skills you have installed and import them here. It takes three steps and a few minutes. You can start any time from Settings (top right).",
    imp_title: "Import your skills", imp_lead: "Claude Code or Codex reads your installed design skills and writes a file, which you then open here. The file is only created on your computer; nothing is sent anywhere.",
    imp_s1_title: "Copy the import prompt", imp_s1_body: "It tells the AI which folders to read and what format to write.",
    imp_copy: "Copy prompt", imp_copied: "Copied. Paste it into Claude Code or Codex",
    imp_s2_title: "Paste it into Claude Code or Codex", imp_s2_body: "In a terminal, type claude (or codex) to start it, paste the prompt and press Enter. The Code tab of the Claude desktop app and the VS Code extensions work the same way. When it finishes, a file appears in your Downloads folder.",
    imp_s3_title: "Choose the file", imp_s3_body: (f) => `Drop ${f} from your Downloads folder on the box below, or click the box to choose it.`,
    imp_drop: (f) => `Drop ${f} here (or click to choose)`,
    imp_done: (n, s, bad) => `Imported ${n} items from ${s} skills${bad ? ` (${bad} malformed items skipped)` : ""}. Reloading…`,
    imp_none: (skipped) => skipped ? `Nothing new (${skipped} skills are already included in DesignDex)` : "No items could be imported. Check that this is the file your AI wrote",
    imp_bad_json: "Could not read the file (not JSON)", imp_bad_format: "This is not a DesignDex import file (format is not designdex-import@1)",
    imp_too_big: "The file is too large (5 MB max)", imp_no_space: "Could not save on this device (check free space or private browsing)",
    imp_now: (n, s) => `Imported: ${s} skills, ${n} items`, imp_clear: "Remove imported items", imp_clear_confirm: "Press again to remove",
    imp_prompt_intro: "Follow the steps below to turn my design skills into a DesignDex import file. When done, tell me the file path and how many entries you wrote.",
    s_import: "Import your skills", s_guide: "Show the guide again", s_open: "Open",
  },
};
const THEME_COLORS = ["#d92b4b", "#2f6fed", "#1f9d55", "#7c4dff", "#f08a24", "#0f9d9a", "#5f6368"];
const DEFAULTS = { theme: "#d92b4b", appearance: "auto", lang: "ja", size: "medium", motion: "always", density: "detail", start: "dict", labels: "icon" };
const ZOOM = { small: 0.9, medium: 1, large: 1.15 };
const HEX_OK = /^#[0-9a-f]{6}$/i;

function loadSettings() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem("designdex-settings") || "{}") }; }
  catch { return { ...DEFAULTS }; }
}
const settings = loadSettings();
const t = (key, ...args) => {
  const v = (I18N[settings.lang] || I18N.ja)[key] ?? I18N.ja[key] ?? key;
  return typeof v === "function" ? v(...args) : v;
};

function saveSettings() {
  try { localStorage.setItem("designdex-settings", JSON.stringify(settings)); } catch { /* 保存できなくても今の画面には反映する */ }
}

function applySettings() {
  const root = document.documentElement;
  root.style.setProperty("--accent-user", HEX_OK.test(settings.theme) ? settings.theme : DEFAULTS.theme);
  if (settings.appearance === "auto") root.removeAttribute("data-theme"); else root.dataset.theme = settings.appearance;
  root.lang = settings.lang;
  // WebKit は html への zoom で入力欄の描画が崩れるため、標準では付けず、変えるときも .app にだけかける
  const app = document.querySelector(".app");
  if (app) app.style.zoom = settings.size === "medium" ? "" : String(ZOOM[settings.size] || 1);
  // サイドバーは画面の高さぴったりで止める。.app を拡大・縮小しても見切れないよう、倍率で割り戻す（style.css の .side）
  root.style.setProperty("--zoom", String(ZOOM[settings.size] || 1));
  root.dataset.motion = settings.motion;
  root.dataset.density = settings.density;
  root.dataset.labels = settings.labels;
  document.querySelectorAll("[data-i18n]").forEach((n) => { n.textContent = t(n.dataset.i18n); });
  document.querySelectorAll("[data-i18n-ph]").forEach((n) => { n.placeholder = t(n.dataset.i18nPh); });
  document.querySelectorAll("[data-i18n-label]").forEach((n) => { n.setAttribute("aria-label", t(n.dataset.i18nLabel)); });
  // data-icon はアイコン（＋文字）を差し込む。data-plain が付いたものはアイコンだけ。data-tip は説明と読み上げ名
  document.querySelectorAll("[data-icon]").forEach((n) => {
    if (n.hasAttribute("data-plain")) { if (!n.querySelector("svg")) n.prepend(icon(n.dataset.icon)); return; }
    n.querySelectorAll(":scope > .ic.opt, :scope > .lbl").forEach((c) => c.remove());
    n.prepend(face(n.dataset.icon, t(n.dataset.tip || n.closest("[data-tip]")?.dataset.tip)));
  });
  document.querySelectorAll("[data-tip]").forEach((n) => { n.dataset.tt = t(n.dataset.tip); n.setAttribute("aria-label", t(n.dataset.tip)); });
}

// 設定は文字を使わずアイコンで見分ける。各ボタンにはマウスを乗せたときの説明（title）と読み上げ名（aria-label）を付ける
function tipAttrs(label) { return { "data-tt": label, "aria-label": label }; }
function choice(key, options) {
  return el("div", { class: "seg set-seg", role: "radiogroup" }, ...options.map(([value, label, look]) => el("button", {
    role: "radio", "aria-checked": String(settings[key] === value), ...tipAttrs(t(label)),
    onclick: () => { settings[key] = value; saveSettings(); refreshAll(); },
  }, look(t(label)))));
}
// 選択肢の見た目。アイコン（または「あ」「A」のような字形）と文字を両方持ち、ボタンの表示設定で出し分ける
const glyph = (text, size) => (label) => frag(el("span", { class: "glyph opt", style: size ? `font-size:${size}px` : null }, text), el("span", { class: "lbl" }, label));
const ico = (name) => (label) => face(name, label);
function row(iconName, label, control) {
  return el("div", { class: "set-row" }, el("span", { class: "set-ic" }, face(iconName, t(label))), control);
}

function renderSettings() {
  const themes = el("div", { class: "set-themes" }, ...THEME_COLORS.map((c) => el("button", {
    class: "set-theme", style: `background:${c}`, ...tipAttrs(c), "aria-pressed": String(settings.theme === c),
    onclick: () => { settings.theme = c; saveSettings(); refreshAll(); },
  })));
  $("settings-body").replaceChildren(
    row("theme", "s_theme", themes),
    row("auto", "s_appearance", choice("appearance", [["auto", "s_auto", ico("auto")], ["light", "s_light", ico("light")], ["dark", "s_dark", ico("dark")]])),
    row("language", "s_lang", choice("lang", [["ja", "日本語", glyph("あ")], ["en", "English", glyph("A")]])),
    row("textsize", "s_size", choice("size", [["small", "s_small", glyph("A", 11)], ["medium", "s_medium", glyph("A", 14)], ["large", "s_large", glyph("A", 18)]])),
    row("motion", "s_motion", choice("motion", [["always", "s_motion_always", ico("play")], ["hover", "s_motion_hover", ico("hover")], ["off", "s_motion_off", ico("pause")]])),
    row("detail", "s_density", choice("density", [["detail", "s_detail", ico("detail")], ["compact", "s_compact", ico("compact")]])),
    row("type", "s_labels", choice("labels", [["icon", "s_lbl_icon", ico("star")], ["text", "s_lbl_text", glyph("Aa")], ["both", "s_lbl_both", (l) => frag(icon("star", "ic opt"), el("span", { class: "glyph opt" }, "Aa"), el("span", { class: "lbl" }, l))]])),
    row("home", "s_start", choice("start", [["dict", "view_dict", ico("dict")], ["palette", "view_palette", ico("palette")]])),
    row("terminal", "s_import", el("button", { class: "set-open", onclick: () => { closeSettings(); openImport(); } }, face("dict", t("s_open")))),
    row("dict", "s_guide", el("button", { class: "set-open", onclick: () => { closeSettings(); openGuide(); } }, face("external", t("s_open")))),
    el("div", { class: "set-foot" }, el("button", { class: "set-open",
      onclick: () => { Object.assign(settings, DEFAULTS); saveSettings(); refreshAll(); } }, face("reset", t("s_reset")))));
}

// 言語を変えたら、文言を含む画面をすべて描き直す
function refreshAll() {
  // 明暗の切替などで画面が急に変わらないよう、対応ブラウザでは全体をクロスフェードさせる（View Transitions）
  if (document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches && !refreshAll.inTransition) {
    refreshAll.inTransition = true;
    document.startViewTransition(() => { refreshAll(); }).finished.finally(() => { refreshAll.inTransition = false; });
    return;
  }
  applySettings();
  if ($("settings").open) renderSettings();
  if (typeof update === "function") update();
  if (typeof refreshPalette === "function") refreshPalette();
}
function openSettings() { renderSettings(); $("settings").showModal(); }
// 閉じるときは、開いたときと同じ道（右上の歯車へ縮む）で戻ってから閉じる
function closeSettings() {
  const d = document.getElementById("settings");
  if (!d.open || d.classList.contains("closing")) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { d.close(); return; }
  d.classList.add("closing");
  // アニメーションが止まる環境（背面のタブ等）でも閉じ切るよう、時間切れでも閉じる
  const CLOSE_MS = 320;
  const done = () => { clearTimeout(timer); d.removeEventListener("animationend", onEnd); d.classList.remove("closing"); d.close(); };
  const onEnd = (ev) => { if (ev.target === d && !ev.pseudoElement) done(); };
  const timer = setTimeout(done, CLOSE_MS);
  d.addEventListener("animationend", onEnd);
}
// 枠の外（背景）を押すか Esc で閉じる
document.getElementById("settings").addEventListener("click", (ev) => {
  // 背景を押すと target が dialog 自身になる。中のボタン（キーボード操作を含む）では閉じない
  if (ev.target !== ev.currentTarget) return;
  const r = ev.currentTarget.getBoundingClientRect();
  const inside = ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
  if (!inside) closeSettings();
});
document.getElementById("settings").addEventListener("cancel", (ev) => { ev.preventDefault(); closeSettings(); });
applySettings();
