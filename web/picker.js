// 色の選び方。Excel の「色の設定」（テーマの色・標準の色／ユーザー設定のスペクトル）と同じ考え方で、
// パレット・グラデーション・ホイール・数値の4通りを1画面に並べる（どれで選んでも他が追従する）。
// ドラッグ中は onInput（表示だけ更新）、指を離したときに onCommit（履歴に残す）を呼ぶ。
const PICKER_BLOCKS = [["palette", "pick_palette", "grid"], ["gradient", "pick_gradient", "gradient"], ["wheel", "pick_wheel", "wheel"], ["numbers", "pick_numbers", "sliders"]];
// Excel の「標準の色」10色
const STANDARD_COLORS = ["#c00000", "#ff0000", "#ffc000", "#ffff00", "#92d050", "#00b050", "#00b0f0", "#0070c0", "#002060", "#7030a0"];
// テーマの色の列（無彩色＋9色相）。各列を OKLCH の明度で7段に振る
const THEME_HUES = [null, 25, 55, 95, 145, 190, 235, 265, 300, 350];
const THEME_TONES = [0.95, 0.87, 0.77, 0.66, 0.55, 0.43, 0.32];
const WHEEL_SIZE = 220;

const picker = { h: 0, s: 0, v: 0, onInput: null, onCommit: null };

// ---- HSV / HSL（0〜1、色相は度） ----
function rgbToHsv([r, g, b]) {
  const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
  const h = d === 0 ? 0 : max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, max === 0 ? 0 : d / max, max];
}
function hsvToRgb([h, s, v]) {
  const f = (n) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return [f(5), f(3), f(1)];
}
function rgbToHsl(rgb) {
  const [h, s, v] = rgbToHsv(rgb);
  const l = v * (1 - s / 2);
  return [h, l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l), l];
}
function hslToRgb([h, s, l]) {
  const v = l + s * Math.min(l, 1 - l);
  return hsvToRgb([h, v === 0 ? 0 : 2 * (1 - l / v), v]);
}
const rgbHex = (rgb) => "#" + rgb.map((x) => Math.round(Math.min(1, Math.max(0, x)) * 255).toString(16).padStart(2, "0")).join("");
const pickerHex = () => rgbHex(hsvToRgb([picker.h, picker.s, picker.v]));

// 外から色が変わったとき（履歴・色コード入力など）に合わせる。灰色では色相を保つ
function pickerSet(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb || rgbHex(rgb) === pickerHex()) return;
  const [h, s, v] = rgbToHsv(rgb);
  Object.assign(picker, { h: s > 0 ? h : picker.h, s, v });
  syncPicker();
}

let frame = 0;
function emit(commit) {
  if (commit) { cancelAnimationFrame(frame); picker.onCommit(pickerHex()); syncPicker(); return; }
  // ドラッグ中は描き直しを1フレーム1回にまとめる
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => { picker.onInput(pickerHex()); syncPicker(); });
}

// 2次元の面をドラッグして選ぶ（ホイール・グラデーション共通）。指を離したら確定
function dragArea(node, apply) {
  node.addEventListener("pointerdown", (ev) => {
    node.setPointerCapture(ev.pointerId);
    const move = (e) => { const r = node.getBoundingClientRect(); apply(e.clientX - r.left, e.clientY - r.top, r); emit(false); };
    const up = () => { node.removeEventListener("pointermove", move); node.removeEventListener("pointerup", up); emit(true); };
    node.addEventListener("pointermove", move); node.addEventListener("pointerup", up);
    move(ev);
  });
}
const clamp01 = (x) => Math.min(1, Math.max(0, x));

// ---- 各パネル ----
function paletteGrid() {
  const cell = (hex) => el("button", { class: "pk-cell", style: `background:${hex}`, "aria-label": hex, "data-hex": hex,
    onclick: () => { pickerSet(hex); picker.onCommit(hex); syncPicker(); } });
  const theme = THEME_TONES.flatMap((L) => THEME_HUES.map((h) => cell(oklchToHex(h === null ? [L, 0, 0] : [L, 0.2, h]))));
  return [el("div", { class: "pk-grid", "aria-label": t("pick_theme") }, ...theme),
    el("div", { class: "pk-grid pk-standard", "aria-label": t("pick_standard") }, ...STANDARD_COLORS.map(cell))];
}

function wheelPanel() {
  const canvas = el("canvas", { class: "pk-wheel", width: WHEEL_SIZE * 2, height: WHEEL_SIZE * 2, "aria-label": t("pick_wheel") });
  const marker = el("span", { class: "pk-marker" });
  const wrap = el("div", { class: "pk-wheel-wrap" }, canvas, marker);
  dragArea(wrap, (x, y, r) => {
    const dx = x - r.width / 2, dy = y - r.height / 2;
    picker.h = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
    picker.s = clamp01(Math.hypot(dx, dy) / (r.width / 2));
  });
  return [wrap, slider("v", icon("light"), 0, 100, () => picker.v * 100, (x) => { picker.v = x / 100; }, t("pick_brightness"))];
}

function gradientPanel() {
  const canvas = el("canvas", { class: "pk-sv", width: 520, height: 300, "aria-label": t("pick_gradient") });
  const marker = el("span", { class: "pk-marker" });
  const wrap = el("div", { class: "pk-sv-wrap" }, canvas, marker);
  dragArea(wrap, (x, y, r) => { picker.s = clamp01(x / r.width); picker.v = 1 - clamp01(y / r.height); });
  return [wrap, slider("h", icon("palette"), 0, 359, () => picker.h, (x) => { picker.h = x; }, t("pick_hue"))];
}

// 数値（RGB と HSL）。つまみの帯には「そこへ動かしたらこの色」のグラデーションを敷く
function numbersPanel() {
  const rgbOf = () => hsvToRgb([picker.h, picker.s, picker.v]);
  const setRgb = (i) => (x) => { const rgb = rgbOf(); rgb[i] = x / 255; const [h, s, v] = rgbToHsv(rgb); Object.assign(picker, { h: s > 0 ? h : picker.h, s, v }); };
  const hslOf = () => rgbToHsl(rgbOf());
  const setHsl = (i, scale) => (x) => { const hsl = hslOf(); hsl[0] = picker.h; hsl[i] = x / scale; const [, s, v] = rgbToHsv(hslToRgb(hsl)); Object.assign(picker, { h: hsl[0], s, v }); };
  return [el("div", { class: "pk-cols" },
    el("div", {}, el("div", { class: "pk-label" }, "RGB"),
      slider("r", "R", 0, 255, () => rgbOf()[0] * 255, setRgb(0)),
      slider("g", "G", 0, 255, () => rgbOf()[1] * 255, setRgb(1)),
      slider("b", "B", 0, 255, () => rgbOf()[2] * 255, setRgb(2))),
    el("div", {}, el("div", { class: "pk-label" }, "HSL"),
      slider("hh", "H", 0, 359, () => picker.h, setHsl(0, 1)),
      slider("hs", "S", 0, 100, () => hslOf()[1] * 100, setHsl(1, 100)),
      slider("hl", "L", 0, 100, () => hslOf()[2] * 100, setHsl(2, 100))))];
}

const sliders = {};
// label は文字（R・G・B など）かアイコン。アイコンのときは name を説明と読み上げ名に使う
function slider(key, label, min, max, get, set, name = label) {
  const range = el("input", { type: "range", min, max, step: 1, "aria-label": name });
  const num = el("input", { type: "number", min, max, step: 1, class: "pk-num", "aria-label": name });
  range.addEventListener("input", () => { set(+range.value); emit(false); });
  range.addEventListener("change", () => emit(true));
  num.addEventListener("change", () => { set(Math.min(max, Math.max(min, +num.value || 0))); emit(true); });
  sliders[key] = { range, num, get };
  return el("label", { class: "pk-slider" }, el("span", { class: "pk-sl-label" }, label), range, num);
}

// 帯の色（そのつまみだけを端から端まで動かしたときの色）
function trackGradient(key) {
  const steps = 7, stops = [];
  for (let i = 0; i < steps; i++) {
    const x = i / (steps - 1);
    const rgb = hsvToRgb([picker.h, picker.s, picker.v]);
    const hsl = rgbToHsl(rgb); hsl[0] = picker.h;
    const col = {
      v: () => hsvToRgb([picker.h, picker.s, x]), h: () => hsvToRgb([x * 359, 1, 1]),
      r: () => [x, rgb[1], rgb[2]], g: () => [rgb[0], x, rgb[2]], b: () => [rgb[0], rgb[1], x],
      hh: () => hslToRgb([x * 359, Math.max(hsl[1], 0.5), 0.5]), hs: () => hslToRgb([hsl[0], x, hsl[2]]), hl: () => hslToRgb([hsl[0], hsl[1], x]),
    }[key]();
    stops.push(rgbHex(col));
  }
  return `linear-gradient(90deg, ${stops.join(", ")})`;
}

// ---- 描画 ----
function drawWheel(canvas) {
  const size = canvas.width, ctx = canvas.getContext("2d"), img = ctx.createImageData(size, size), r = size / 2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = x - r, dy = y - r, d = Math.hypot(dx, dy);
    if (d > r) continue;
    const [R, G, B] = hsvToRgb([(Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360, d / r, picker.v]);
    const i = (y * size + x) * 4;
    img.data[i] = R * 255; img.data[i + 1] = G * 255; img.data[i + 2] = B * 255; img.data[i + 3] = d > r - 1 ? (r - d) * 255 : 255;
  }
  ctx.putImageData(img, 0, 0);
}
function drawSv(canvas) {
  const ctx = canvas.getContext("2d"), w = canvas.width, h = canvas.height;
  ctx.fillStyle = rgbHex(hsvToRgb([picker.h, 1, 1])); ctx.fillRect(0, 0, w, h);
  const white = ctx.createLinearGradient(0, 0, w, 0); white.addColorStop(0, "#fff"); white.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = white; ctx.fillRect(0, 0, w, h);
  const black = ctx.createLinearGradient(0, 0, 0, h); black.addColorStop(0, "rgba(0,0,0,0)"); black.addColorStop(1, "#000");
  ctx.fillStyle = black; ctx.fillRect(0, 0, w, h);
}

let drawn = { v: null, h: null };
function syncPicker() {
  const body = $("picker-body"), hex = pickerHex();
  const wheel = body.querySelector(".pk-wheel");
  if (wheel) {
    if (drawn.v !== picker.v) { drawWheel(wheel); drawn.v = picker.v; }
    const rad = picker.h * Math.PI / 180, R = 50 * picker.s;
    Object.assign(body.querySelector(".pk-wheel-wrap .pk-marker").style, { left: `${50 + R * Math.cos(rad)}%`, top: `${50 + R * Math.sin(rad)}%`, background: hex });
  }
  const sv = body.querySelector(".pk-sv");
  if (sv) {
    if (drawn.h !== picker.h) { drawSv(sv); drawn.h = picker.h; }
    Object.assign(body.querySelector(".pk-sv-wrap .pk-marker").style, { left: `${picker.s * 100}%`, top: `${(1 - picker.v) * 100}%`, background: hex });
  }
  for (const [key, { range, num, get }] of Object.entries(sliders)) {
    if (!range.isConnected) continue;
    const v = Math.round(get());
    if (document.activeElement !== range) range.value = v;
    if (document.activeElement !== num) num.value = v;
    range.style.setProperty("--track", trackGradient(key));
  }
  body.querySelectorAll(".pk-cell").forEach((c) => c.setAttribute("aria-current", String(c.dataset.hex === hex)));
}

// 4つの選び方を同じ大きさの枠に並べる（枠の高さは一番高いものにそろう＝style.css の .pk-block）
function renderPicker() {
  for (const k of Object.keys(sliders)) delete sliders[k];
  drawn = { v: null, h: null };
  const panels = { palette: paletteGrid, wheel: wheelPanel, gradient: gradientPanel, numbers: numbersPanel };
  $("picker-body").replaceChildren(...PICKER_BLOCKS.map(([id, label, ic]) => el("section", { class: "pk-block", "aria-label": t(label) },
    el("h3", { class: "pk-head", "data-tt": t(label), "data-info": "" }, face(ic, t(label))), el("div", { class: "pk-content" }, ...panels[id]()))));
  syncPicker();
}

function initPicker(hex, { onInput, onCommit }) {
  Object.assign(picker, { onInput, onCommit });
  const [h, s, v] = rgbToHsv(hexToRgb(hex));
  Object.assign(picker, { h, s, v });
  renderPicker();
}
// 言語を変えたときに文言を描き直す
function refreshPicker() { if ($("picker-body").children.length) renderPicker(); }
