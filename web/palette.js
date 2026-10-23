// 配色の提案。選んだ色を OKLCH（人の見え方に近い色空間）に変換し、色相の関係（Adobe Color の配色ルール）で
// 2〜3色のセットを作る。明度・彩度をそろえ、sRGB に収まらない色は彩度を下げて収める。
const PALETTE_REFS = {
  adobe: "https://color.adobe.com/ja/create/color-wheel",
  oklch: "https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklch",
  wcag: "https://www.w3.org/TR/WCAG22/#contrast-minimum",
  m3: "https://m3.material.io/styles/color/system/how-the-system-works",
};
const DEFAULT_HEX = "#2f6fed";

// ---- 色の変換（Björn Ottosson の OKLab） ----
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return null;
  const full = m[1].length === 3 ? m[1].replace(/./g, "$&$&") : m[1];  // #abc → #aabbcc
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
}
function rgbToOklch([r, g, b]) {
  [r, g, b] = [r, g, b].map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360];
}
function oklchToRgb([L, C, H]) {
  const a = C * Math.cos((H * Math.PI) / 180), b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map(toGamma);
}
const inGamut = (rgb) => rgb.every((v) => v >= -0.0005 && v <= 1.0005);
// sRGB に収まるまで彩度だけを下げる（色相と明度は保つ）
function fit([L, C, H]) {
  let c = C;
  while (c > 0 && !inGamut(oklchToRgb([L, c, H]))) c -= 0.004;
  return [L, Math.max(c, 0), H];
}
function oklchToHex(lch) {
  return "#" + oklchToRgb(fit(lch)).map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0")).join("");
}
function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
const R = (ja, en) => (settings.lang === "en" ? en : ja);
const hue = (h) => ((h % 360) + 360) % 360;

// ---- 配色ルール。各セットは [役割, OKLCH] の並び ----
function harmonies([L, C, H]) {
  const c = Math.max(C, 0.06);  // 無彩色に近い色でも組み合わせが見えるよう最低限の彩度を持たせる
  const mid = Math.min(Math.max(L, 0.45), 0.72);
  return [
    { rule: "類似色（Analogous）", note: settings.lang === "en" ? "Three neighboring hues. Calm and cohesive; the safe default." : "色相が近い3色。まとまりがあり穏やか。迷ったらこれ",
      colors: [[R("メイン", "Primary"), [mid, c, H]], [R("サブ", "Secondary"), [mid + 0.06, c * 0.9, hue(H - 30)]], [R("アクセント", "Accent"), [mid - 0.04, c, hue(H + 30)]]] },
    { rule: "補色（Complementary）", note: settings.lang === "en" ? "The opposite hue as an accent, for one strong highlight." : "反対側の色をアクセントに。強い強調が1点だけ欲しいとき",
      colors: [[R("メイン", "Primary"), [mid, c, H]], [R("アクセント", "Accent"), [Math.min(mid + 0.08, 0.8), c, hue(H + 180)]], [R("背景", "Background"), [0.97, c * 0.12, H]]] },
    { rule: "分裂補色（Split complementary）", note: settings.lang === "en" ? "The two neighbors of the complement. Less harsh, more variety." : "補色の両隣を使う。補色より刺激が少なく変化がある",
      colors: [[R("メイン", "Primary"), [mid, c, H]], [R("サブ", "Secondary"), [mid + 0.05, c * 0.9, hue(H + 150)]], [R("アクセント", "Accent"), [mid + 0.05, c * 0.9, hue(H + 210)]]] },
    { rule: "トライアド（Triad）", note: settings.lang === "en" ? "Three hues evenly spaced. Lively and playful." : "色相環を3等分。にぎやかで遊びのある画面向け",
      colors: [[R("メイン", "Primary"), [mid, c, H]], [R("サブ", "Secondary"), [mid + 0.04, c * 0.85, hue(H + 120)]], [R("アクセント", "Accent"), [mid + 0.04, c * 0.85, hue(H + 240)]]] },
    { rule: "同系色＋無彩色（Monochromatic）", note: settings.lang === "en" ? "Shades of one hue plus gray. Quiet; good for tools and documents." : "1色の濃淡と灰色だけ。業務アプリ・資料で落ち着いて見せる",
      colors: [[R("メイン", "Primary"), [mid, c, H]], [R("濃い文字", "Dark text"), [0.28, c * 0.25, H]], [R("淡い背景", "Light surface"), [0.96, c * 0.15, H]]] },
  ].map((set) => ({ ...set, colors: set.colors.map(([role, lch]) => [role, oklchToHex(lch)]) }));
}
// Material 3 の色調パレットに近い、明度だけを変えた13段
const TONES = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100];
function tonal([, C, H]) {
  return TONES.map((t) => [t, oklchToHex([t / 100, t === 0 || t === 100 ? 0 : C * (1 - Math.abs(t - 50) / 70), H])]);
}

function setPrompt(set) {
  const list = set.colors.map(([role, hex]) => `${role} ${hex}`).join("、");
  return [
    `【出典】Adobe Color の配色ルール「${set.rule}」／${PALETTE_REFS.adobe}（OKLCH で明度と彩度をそろえて算出: ${PALETTE_REFS.oklch}）`,
    `【作るもの】${set.rule}の配色`,
    `【再現する見た目・動き】${list}`,
    `【指示】この色を CSS 変数（--color-primary / --color-secondary / --color-accent など役割の名前）で定義して全体に使って。本文の文字と背景のコントラストは WCAG 2.2 の AA（4.5:1 以上、${PALETTE_REFS.wcag}）を守り、満たさない組み合わせでは文字色を濃い色か白に替えて。`,
  ].join("\n");
}

// ---- 描画 ----
function swatch([role, hex]) {
  const onWhite = contrast(hex, "#ffffff"), onBlack = contrast(hex, "#000000");
  const ink = onWhite >= onBlack ? "#ffffff" : "#000000";
  const best = Math.max(onWhite, onBlack);
  const chip = el("button", { class: "pal-sw", style: `background:${hex};color:${ink}`, "aria-label": hex,
    onclick: () => copy(hex, t("copied", hex)) }, el("span", { class: "pal-role" }, role), el("span", { class: "pal-hex" }, hex));
  return el("div", { class: "pal-cell" }, chip,
    el("span", { class: "pal-ct" }, `${R(ink === "#ffffff" ? "文字白" : "文字黒", ink === "#ffffff" ? "white text" : "black text")} ${best.toFixed(1)}:1 ${best >= 4.5 ? "AA" : best >= 3 ? R("大きい文字のみ", "large text only") : R("不可", "fail")}`));
}
function mock(set) {
  const [[, a], [, b], [, c]] = set.colors;
  const light = luminance(c) > 0.6 ? c : "#ffffff";
  const btnInk = contrast(a, "#ffffff") >= 4.5 ? "#ffffff" : "#000000";
  return el("div", { class: "pal-mock", style: `background:${light}` },
    el("div", { class: "pal-mock-bar", style: `background:${a}` }),
    el("div", { class: "pal-mock-body" },
      el("div", { class: "pal-mock-title", style: `color:${a}` }, R("見出しの例", "Heading")),
      el("div", { class: "pal-mock-line" }), el("div", { class: "pal-mock-line short" }),
      el("div", { class: "row", style: "gap:8px;margin-top:8px" },
        el("span", { class: "pal-mock-btn", style: `background:${a};color:${btnInk}` }, R("保存", "Save")),
        el("span", { class: "pal-mock-tag", style: `background:${b};color:${contrast(b, "#fff") >= 3 ? "#fff" : "#000"}` }, R("タグ", "Tag")),
        el("span", { class: "pal-mock-dot", style: `background:${c === light ? b : c}` }))));
}

function renderPalette(hex, record = true) {
  const rgb = hexToRgb(hex);
  if (!rgb) { $("pal-error").textContent = t("pal_err"); return; }
  $("pal-error").textContent = "";
  hex = "#" + rgb.map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
  if (document.activeElement !== $("pal-hex")) $("pal-hex").value = hex;
  $("pal-now").style.background = hex;
  $("pal-name").textContent = colorName(hex);
  store.set("pal-last", hex);
  currentHex = hex;
  if (record) remember(hex);
  pickerSet(hex);
  $("pal-star-slot").replaceChildren(favStar(hex, -1, true));
  const lch = rgbToOklch(rgb);
  $("pal-sets").replaceChildren(...harmonies(lch).map((set, i) => el("article", { class: "card pal-card", "data-rule": i },
    el("header", {}, el("div", { class: "pal-card-head" }, el("h3", {}, set.rule), favStar(hex, i)), el("p", { class: "desc" }, set.note)),
    el("div", { class: "pal-row" }, ...set.colors.map(swatch)),
    mock(set),
    el("div", { class: "actions" },
      el("button", { class: "btn", ...tip(t("copy_prompt")), onclick: () => copy(setPrompt(set), t("copied_prompt")) }, face("copy", t("copy_prompt"))),
      iconBtn("theme", t("pal_copy_hex"), () => copy(set.colors.map(([, h]) => h).join(" "), t("pal_copied_hex"))),
      iconBtn("link", t("copy_url"), () => copy(PALETTE_REFS.adobe, t("copied_url")))))));
  $("pal-tones").replaceChildren(...tonal(lch).map(([n, h]) => el("button", {
    class: "pal-tone", style: `background:${h};color:${n < 55 ? "#fff" : "#000"}`, "aria-label": `${R("トーン", "Tone ")}${n} ${h}`,
    onclick: () => copy(h, t("copied", h)) }, String(n))));
  if (record) { renderHistory(); } else markCurrent();
  if (record) swapSets();
}

// 配色カードの入れ替え。ドラッグ中は毎フレーム描き直すので動かさず、色が決まったときだけ時間差で浮かせる
function swapSets() {
  if (reduceMotion()) return;
  [...$("pal-sets").children].forEach((c, i) => { c.style.setProperty("--i", i); c.classList.remove("enter"); void c.offsetWidth; c.classList.add("enter"); });
}
let currentHex = null;
function refreshPalette() { if (currentHex) { refreshPicker(); renderPalette(currentHex, false); renderSide(); } }

// ---- 色の名前（OKLCH の色相から大まかに付ける。境界は代表色の実測値から決めた） ----
const HUE_NAMES = [[10, "ピンク", "Pink"], [45, "赤", "Red"], [75, "オレンジ", "Orange"], [100, "黄", "Yellow"], [135, "黄緑", "Lime"],
  [170, "緑", "Green"], [205, "青緑", "Teal"], [240, "水色", "Sky"], [275, "青", "Blue"], [310, "紫", "Purple"], [345, "赤紫", "Magenta"], [361, "ピンク", "Pink"]];
function colorName(hex) {
  const [L, C, H] = rgbToOklch(hexToRgb(hex));
  if (C < 0.04) return L > 0.9 ? R("白", "White") : L < 0.25 ? R("黒", "Black") : R("グレー", "Gray");
  if (H >= 45 && H < 75 && L < 0.55) return R("茶", "Brown");
  const [, ja, en] = HUE_NAMES.find(([max]) => H < max);
  const tone = L > 0.85 ? R("淡い", "Pale ") : L < 0.42 ? R("暗い", "Dark ") : "";
  return tone + R(ja, en);
}
// 配色ルールの短い名前（「類似色（Analogous）」→ 類似色 / Analogous）
const ruleShort = (rule) => (settings.lang === "en" ? (/（(.+)）/.exec(rule)?.[1] || rule) : rule.split("（")[0]);

// ---- 最近見た配色（新しいものを上に積む。HISTORY_MAX 件を超えた古いものは自動で消える）と、お気に入り ----
const HISTORY_KEY = "pal-history";
const FAVS_KEY = "pal-favs";
const HISTORY_MAX = 30;
const validList = (key) => store.get(key, []).filter((h) => h && hexToRgb(h.hex));
const loadHistory = () => validList(HISTORY_KEY);
const loadFavs = () => validList(FAVS_KEY);  // { hex, rule: 配色ルールの番号（-1 は色そのもの）, at }

function remember(hex) {
  store.set(HISTORY_KEY, [{ hex, at: Date.now() }, ...loadHistory().filter((h) => h.hex !== hex)].slice(0, HISTORY_MAX));
}
const isFav = (hex, rule) => loadFavs().some((f) => f.hex === hex && f.rule === rule);
function setFav(hex, rule, on) {
  const rest = loadFavs().filter((f) => !(f.hex === hex && f.rule === rule));
  store.set(FAVS_KEY, on ? [{ hex, rule, at: Date.now() }, ...rest] : rest);
  renderSide();
}
function favStar(hex, rule, labeled = false) {
  const label = rule < 0 ? t("fav_color", hex) : t("fav_set", ruleShort(harmonies(rgbToOklch(hexToRgb(hex)))[rule].rule));
  const b = starButton(isFav(hex, rule), label, (on) => {
    setFav(hex, rule, on);
    // 同じお気に入りを指す星（カードと上の入力欄）をそろえる
    document.querySelectorAll(`#palette .star[data-fav="${hex}:${rule}"]`).forEach((s) => s.setAttribute("aria-pressed", String(on)));
  });
  b.dataset.fav = `${hex}:${rule}`;
  if (labeled) b.classList.add("star-big");
  return b;
}

// 消したあと数秒だけ「元に戻す」を出す（WKWebView は confirm() が使えないため確認ダイアログにしない）
let undo = null;
function removeWithUndo(key, next, message) {
  clearTimeout(undo?.timer);
  undo = { key, list: store.get(key, []), message, timer: setTimeout(() => { undo = null; renderSide(); }, 6000) };
  store.set(key, next);
  renderSide();
}
function undoBar(key) {
  if (undo?.key !== key) return null;
  return el("li", { class: "hist-undo" }, el("span", {}, undo.message), el("button", { class: "icon-btn", "data-tt": t("pal_history_undo"), "aria-label": t("pal_history_undo"), onclick: () => {
    clearTimeout(undo.timer); store.set(undo.key, undo.list); undo = null; renderSide();
  } }, icon("undo")));
}

// 今日・昨日・この1週間・それ以前
const DAY = 86400000;
function dayGroup(at) {
  const today = new Date().setHours(0, 0, 0, 0);
  if (at >= today) return R("今日", "Today");
  if (at >= today - DAY) return R("昨日", "Yesterday");
  if (at >= today - 6 * DAY) return R("この1週間", "Past 7 days");
  return R("それ以前", "Earlier");
}
function shortTime(at) {
  const opts = at >= new Date().setHours(0, 0, 0, 0) ? { hour: "2-digit", minute: "2-digit" } : { month: "numeric", day: "numeric" };
  return new Intl.DateTimeFormat(settings.lang === "en" ? "en-US" : "ja-JP", opts).format(at);
}

// サイドバーの1行。左に色（お気に入りの配色はセットの色を並べる）、右に時刻と操作
function sideRow({ hex, rule = -1, at }, { title, onOpen, actions }) {
  const colors = rule < 0 ? [hex] : harmonies(rgbToOklch(hexToRgb(hex)))[rule].colors.map(([, h]) => h);
  return el("li", { class: "hist-item" },
    el("button", { class: "hist-open", "data-hex": hex, "data-rule": rule, "aria-label": `${title} ${hex}`, onclick: onOpen },
      el("span", { class: "hist-sw" }, ...colors.map((c) => el("i", { style: `background:${c}` }))),
      el("span", { class: "hist-text" }, el("span", { class: "hist-name" }, title), el("span", { class: "hist-hex" }, hex)),
      el("span", { class: "hist-at" }, shortTime(at))),
    el("span", { class: "hist-actions" }, ...actions));
}

function renderFavs() {
  const list = loadFavs();
  $("pal-favs-count").textContent = list.length || "";
  const rows = list.map((f) => sideRow(f, {
    title: f.rule < 0 ? colorName(f.hex) : `${ruleShort(harmonies(rgbToOklch(hexToRgb(f.hex)))[f.rule].rule)}・${colorName(f.hex)}`,
    onOpen: () => openFav(f),
    actions: [starButton(true, t("fav_remove"), () => removeWithUndo(FAVS_KEY, loadFavs().filter((x) => !(x.hex === f.hex && x.rule === f.rule)), t("fav_removed")))],
  }));
  $("pal-favs").replaceChildren(...[undoBar(FAVS_KEY), ...rows, rows.length ? null : el("li", { class: "hist-empty" }, t("pal_favs_empty"))].filter(Boolean));
}
function openFav({ hex, rule }) {
  renderPalette(hex, false);
  swapSets();
  if (rule < 0) return;
  // 保存した配色ルールのカードまで動かして、一瞬強調する
  const card = $("pal-sets").querySelector(`[data-rule="${rule}"]`);
  card.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
  card.classList.remove("flash"); void card.offsetWidth; card.classList.add("flash");
}

function renderHistory() {
  const list = loadHistory();
  $("pal-history-count").textContent = list.length ? `${list.length}/${HISTORY_MAX}` : "";
  let group = null;
  const rows = [];
  list.forEach((h) => {
    const g = dayGroup(h.at);
    if (g !== group) { group = g; rows.push(el("li", { class: "group" }, g)); }
    rows.push(sideRow(h, {
      title: colorName(h.hex), onOpen: () => { renderPalette(h.hex, false); swapSets(); },
      actions: [el("button", { class: "hist-del", "data-tt": t("pal_history_del", h.hex), "aria-label": t("pal_history_del", h.hex),
        onclick: () => removeWithUndo(HISTORY_KEY, loadHistory().filter((x) => x.hex !== h.hex), t("pal_history_removed", h.hex)) },
      icon("close"))],
    }));
  });
  const clear = rows.length ? el("li", { class: "hist-foot" }, el("button", { class: "icon-btn", "data-tt": t("pal_history_clear"), "aria-label": t("pal_history_clear"),
    onclick: () => removeWithUndo(HISTORY_KEY, [], t("pal_history_cleared", list.length)) }, icon("trash"))) : null;
  $("pal-history").replaceChildren(...[undoBar(HISTORY_KEY), ...rows, clear, rows.length ? null : el("li", { class: "hist-empty" }, t("pal_history_empty"))].filter(Boolean));
  markCurrent();
}
function renderSide() { renderFavs(); renderHistory(); }
// 表示中の色の行に印を付ける（一覧は作り直さない＝並びが動かない）
function markCurrent() {
  document.querySelectorAll("#pal-side .hist-open").forEach((b) => b.setAttribute("aria-current", String(b.dataset.hex === currentHex)));
}

// 画面のどこからでも色を拾うスポイト。Mac アプリだけの機能で、ネイティブの NSColorSampler
// （DesignDex.swift の pickColor）を使う。Web 版ではボタンを出さない
function initEyedropper() {
  const native = window.webkit?.messageHandlers?.pickColor;
  if (!native) return;
  $("pal-eyedrop").hidden = false;
  window.__designdexPicked = (hex) => { if (hexToRgb(hex)) renderPalette(hex); };
  $("pal-eyedrop").addEventListener("click", () => native.postMessage(""));
}

function initPalette() {
  // 旧版は JSON でなく生の文字列で保存していたので、両方を読む
  let last = DEFAULT_HEX;
  try { last = localStorage.getItem("pal-last")?.replace(/"/g, "") || last; } catch { /* 既定色で始める */ }
  if (!hexToRgb(last)) last = DEFAULT_HEX;
  initPicker(last, { onInput: (hex) => renderPalette(hex, false), onCommit: (hex) => renderPalette(hex) });
  initEyedropper();
  $("pal-hex").addEventListener("change", (e) => { const v = e.target.value.trim(); renderPalette(v.startsWith("#") ? v : "#" + v); });
  renderPalette(last, false);
  renderSide();
}

// 辞典と配色の切替。対応ブラウザでは View Transitions で中身を滑らかに入れ替え、無ければ入ってくる側を浮かび上がらせる
function setView(view) {
  if (document.startViewTransition && !reduceMotion() && !setView.inTransition && $("dict").hidden !== (view !== "palette")) {
    setView.inTransition = true;
    document.documentElement.dataset.dir = view === "palette" ? "fwd" : "back";
    document.startViewTransition(() => applyView(view)).finished.finally(() => { setView.inTransition = false; });
    return;
  }
  applyView(view);
}
function applyView(view) {
  const isPalette = view === "palette";
  document.querySelectorAll("#view button").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.view === view)));
  $("dict-filters").hidden = isPalette;
  $("pal-side").hidden = !isPalette;
  $("dict").hidden = isPalette;
  $("palette").hidden = !isPalette;
  if (isPalette && !$("pal-sets").children.length) initPalette();
  if (!document.startViewTransition && !reduceMotion()) {
    const shown = $(isPalette ? "palette" : "dict");
    shown.classList.remove("view-in"); void shown.offsetWidth; shown.classList.add("view-in");
  }
}
document.querySelectorAll("#view button").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));

if (settings.start === "palette") setView("palette");
