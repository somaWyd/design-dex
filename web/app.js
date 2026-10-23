const DATA = window.CATALOG || { categories: [], sources: [], entries: [] };
const KINDS = [["all", "k_all"], ["motion", "k_motion"], ["ui", "k_ui"], ["type", "k_type"]];
// 説明はマウスを乗せても出さず、押したときに吹き出しで出す（data-tt）。読み上げ名は aria-label
const tip = (label) => ({ "data-tt": label, "aria-label": label });
const state = { kind: "all", cats: new Set(), sources: new Set(), q: "", fav: false };

// この端末に JSON で保存する。保存できない環境（プライベートブラウズ等）でも画面は動かす
const store = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 画面には反映済み */ } },
};
const uiFavs = new Set(store.get("ui-favs", []));

const starIcon = () => icon("star");
// お気に入りの星。押すたびに on/off を切り替え、見た目もその場で変える
function starButton(on, label, onToggle) {
  const b = el("button", { class: "star", "aria-pressed": String(on), "aria-label": label }, starIcon());
  b.addEventListener("click", (ev) => { ev.stopPropagation(); const next = b.getAttribute("aria-pressed") !== "true"; b.setAttribute("aria-pressed", String(next)); b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop"); onToggle(next); });
  return b;
}
const $ = (id) => document.getElementById(id);

// カタカナ→ひらがな・全角英数→半角・小文字化して、表記ゆれでも当たるようにする
const norm = (s) => String(s || "").normalize("NFKC").toLowerCase()
  .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

const catById = Object.fromEntries(DATA.categories.map((c) => [c.id, c]));
const srcById = Object.fromEntries(DATA.sources.map((s) => [s.id, s]));
DATA.entries.forEach((e) => {
  e._hay = norm([e.name_ja, e.name_en, e.slug, e.description_ja, e.source_ref, ...(e.aliases || []),
    catById[e.category]?.name_ja, srcById[e.source]?.name].join(" "));
});

function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  state.kind = p.get("kind") || "all";
  const list = (k, known) => new Set((p.get(k) || "").split(",").filter((id) => known[id]));
  state.cats = list("cat", catById);
  state.sources = list("src", srcById);
  state.fav = p.get("fav") === "1";
  state.q = p.get("q") || "";
  $("q").value = state.q;
  $("q-clear").hidden = !state.q;
}
function writeHash() {
  const p = new URLSearchParams();
  if (state.kind !== "all") p.set("kind", state.kind);
  if (state.cats.size) p.set("cat", [...state.cats].join(","));
  if (state.sources.size) p.set("src", [...state.sources].join(","));
  if (state.q) p.set("q", state.q);
  if (state.fav) p.set("fav", "1");
  history.replaceState(null, "", "#" + p.toString());
}

function matches(e, skip = {}) {
  if (state.fav && !uiFavs.has(e.id)) return false;
  if (!skip.kind && state.kind !== "all" && e.kind !== state.kind) return false;
  // 同じ区分の中は「どれか」、区分どうしは「すべて」を満たすものを出す
  if (!skip.cat && state.cats.size && !state.cats.has(e.category)) return false;
  if (!skip.source && state.sources.size && !state.sources.has(e.source)) return false;
  const terms = norm(state.q).split(/\s+/).filter(Boolean);
  return terms.every((t) => e._hay.includes(t));
}

function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else if (v != null) n.setAttribute(k, v);
  }
  n.append(...kids.filter((k) => k != null));
  return n;
}

const GROUPS = { motion: "k_motion", ui: "k_ui", type: "k_type" };
const SOURCE_GROUPS = [["skill", "g_skill"], ["mcp", "g_mcp"], ["doc", "g_doc"]];

const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
function filterItem(label, count, pressed, onclick, hint) {
  const mark = el("span", { class: "check" }); mark.innerHTML = CHECK;
  return el("li", { class: "sub" }, el("button", { "aria-pressed": String(pressed), "data-tt": hint, onclick },
    mark, el("span", { class: "label" }, label), el("span", { class: "n" }, String(count))));
}
// 一覧の区切りはアイコンだけ（名前はマウスを乗せると出る）
// 区切りの見出し（アイコン＋名前）。その下の項目は一段内側に下げて、階層が分かるようにする（style.css の .sub）
const groupHead = (iconName, label) => el("li", { class: "group", ...tip(label) }, face(iconName, label));
const toggle = (set, id) => { if (set.has(id)) set.delete(id); else set.add(id); update(); };

function renderFilters() {
  $("kind").replaceChildren(...KINDS.map(([id, label]) => el("button", {
    role: "radio", "aria-checked": String(state.kind === id),
    onclick: () => {
      state.kind = id;
      if (id !== "all") state.cats.forEach((c) => { if (catById[c]?.kind !== id) state.cats.delete(c); });
      update();
    },
    ...tip(t(label)),
  }, face(id, t(label)))));

  const catCount = {}, srcCount = {};
  DATA.entries.forEach((e) => {
    if (matches(e, { cat: true })) catCount[e.category] = (catCount[e.category] || 0) + 1;
    if (matches(e, { source: true })) srcCount[e.source] = (srcCount[e.source] || 0) + 1;
  });
  // 0件の項目は出さない（選択中のものだけは解除できるよう残す）
  const visible = (count, pressed) => count > 0 || pressed;
  const catBlocks = Object.entries(GROUPS).filter(([k]) => state.kind === "all" || state.kind === k).map(([k, label]) => {
    const items = DATA.categories.filter((c) => c.kind === k && visible(catCount[c.id] || 0, state.cats.has(c.id)))
      .map((c) => filterItem(c.name_ja, catCount[c.id] || 0, state.cats.has(c.id), () => toggle(state.cats, c.id), c.hint));
    return items.length ? [groupHead(k, t(label)), ...items] : [];
  });
  $("cats").replaceChildren(...catBlocks.flat());

  const srcBlocks = SOURCE_GROUPS.map(([type, label]) => {
    const items = DATA.sources.filter((s) => (s.type === type || (type === "skill" && s.type === "skill+mcp"))
      && visible(srcCount[s.id] || 0, state.sources.has(s.id)))
      .map((s) => filterItem(s.name, srcCount[s.id] || 0, state.sources.has(s.id), () => toggle(state.sources, s.id)));
    return items.length ? [groupHead(type, t(label)), ...items] : [];
  });
  $("sources").replaceChildren(...srcBlocks.flat());
  renderFavList();
  $("cats-n").textContent = state.cats.size || "";
  $("sources-n").textContent = state.sources.size || "";
  renderChips();
}

// サイドバーのお気に入り。先頭は「お気に入りだけ表示」の切替、その下に登録した項目を並べる
const nameOf = (e) => (settings.lang === "en" ? e.name_en : e.name_ja);
function renderFavList() {
  $("favs-n").textContent = uiFavs.size || "";
  const items = DATA.entries.filter((e) => uiFavs.has(e.id));
  $("fav-list").replaceChildren(...[
    filterItem(t("favs_only"), uiFavs.size, state.fav, () => { state.fav = !state.fav; update(); }),
    ...items.map((e) => el("li", { class: "sub" }, el("button", { class: "fav-entry", onclick: () => openEntry(e) },
      icon(e.kind), el("span", { class: "label" }, nameOf(e))))),
    items.length ? null : el("li", { class: "hist-empty" }, t("favs_empty")),
  ].filter(Boolean));
}
// お気に入りの項目を押したら、そのカードまで動かして一瞬光らせる（絞り込みで隠れていれば、お気に入りだけの表示に切り替える）
function openEntry(e) {
  if (!current.includes(e)) { Object.assign(state, { kind: "all", cats: new Set(), sources: new Set(), q: "", fav: true }); $("q").value = ""; update(); }
  while (!$("grid").querySelector(`[data-id="${CSS.escape(e.id)}"]`) && shown < current.length) renderGrid(false);
  const card = $("grid").querySelector(`[data-id="${CSS.escape(e.id)}"]`);
  if (!card) return;
  card.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
  card.classList.remove("flash"); void card.offsetWidth; card.classList.add("flash");
}

// 選択中の条件を検索欄の下にチップで並べ、どこからでも1つずつ外せるようにする
let lastChips = new Set();
function renderChips() {
  const chip = (label, onclick, iconName, name = label) => el("button", { class: "chip" + (lastChips.has(name) ? "" : " new"), "data-key": name, onclick, ...tip(t("remove_filter", name)) },
    iconName ? icon(iconName) : null, label, el("span", { class: "x", "aria-hidden": "true" }, "×"));
  const chips = [
    ...[...state.sources].map((id) => chip(srcById[id]?.name || id, () => toggle(state.sources, id), srcIcon(srcById[id]))),
    ...[...state.cats].map((id) => chip(catById[id]?.name_ja || id, () => toggle(state.cats, id), "category")),
    state.fav ? chip("", () => { state.fav = false; update(); }, "star", t("favs")) : null,
    state.q ? chip(`“${state.q}”`, () => { state.q = ""; $("q").value = ""; $("q-clear").hidden = true; update(); }, "search") : null,
  ].filter(Boolean);
  const active = chips.length > 0;
  $("chips").hidden = !active;
  if (active) $("chips").replaceChildren(...chips, el("button", { class: "icon-btn", id: "reset", ...tip(t("reset_filters")), onclick: resetFilters }, icon("reset")));
  lastChips = new Set(chips.map((c) => c.dataset.key));
}
function resetFilters() {
  Object.assign(state, { kind: "all", cats: new Set(), sources: new Set(), q: "", fav: false }); $("q").value = ""; update();
}

// ---- 動き（Apple の流儀: 押した瞬間に反応・跳ねない減速・出てきた道を戻る。動かすのは transform / opacity / clip-path だけ） ----
const EASE = "cubic-bezier(.22, 1, .36, 1)";  // 跳ね返りのない減速（臨界減衰のばねに近い）
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const FOLD_MS = 320;

// サイドバーの折りたたみ。開くと中身が上から現れ、下の区分は押し下げられる。閉じるときは同じ道を戻る
function toggleFold(d) {
  const body = d.querySelector(":scope > ul");
  const below = [...d.parentElement.children].filter((n) => d.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING);
  [body, ...below].forEach((n) => n.getAnimations().forEach((a) => a.finish()));
  const opening = !d.open;
  store.set("fold-" + d.dataset.fold, opening ? "1" : "0");
  if (reduceMotion()) { d.open = opening; return; }
  const opts = { duration: FOLD_MS, easing: EASE };
  if (opening) {
    const before = below.map((n) => n.getBoundingClientRect().top);
    d.open = true;
    below.forEach((n, i) => n.animate([{ transform: `translateY(${before[i] - n.getBoundingClientRect().top}px)` }, { transform: "none" }], opts));
    body.animate([{ clipPath: "inset(0 0 100% 0)", opacity: 0, transform: "translateY(-6px)" }, { clipPath: "inset(0)", opacity: 1, transform: "none" }], opts);
  } else {
    const h = body.getBoundingClientRect().height;
    below.forEach((n) => n.animate([{ transform: "none" }, { transform: `translateY(${-h}px)` }], opts));
    body.animate([{ clipPath: "inset(0)", opacity: 1 }, { clipPath: "inset(0 0 100% 0)", opacity: 0 }], opts).finished
      .then(() => { d.open = false; }, () => {});
  }
}
document.querySelectorAll("details.fold").forEach((d) => {
  const saved = store.get("fold-" + d.dataset.fold, null);
  if (saved !== null) d.open = String(saved) === "1";  // 旧版は "1"/"0" の生文字列で保存していた
  d.querySelector(":scope > summary").addEventListener("click", (ev) => { ev.preventDefault(); toggleFold(d); });
});

// 一覧を作り直したとき、先頭のカードを少しずつ時間差で浮かび上がらせる（12枚まで。それ以降は即表示）
const STAGGER_MAX = 12;
function enterCards(cards) {
  if (reduceMotion()) return;
  cards.slice(0, STAGGER_MAX).forEach((c, i) => { c.style.setProperty("--i", i); c.classList.add("enter"); });
}

// 出典の呼び出し方。~/.claude/skills/<名前> のスキルは Claude Code で /<名前>、Codex で $<名前>
// （https://code.claude.com/docs/en/skills ・ https://learn.chatgpt.com/docs/build-skills ）。
// プラグインのスキルは「/プラグイン名:スキル名」、MCP はサーバー名、公式ドキュメントは公式ページを開くだけ
const PLUGIN_SKILLS = { figma: "/figma:figma-use", remotion: "/remotion:remotion-best-practices" };
const MCP_SERVERS = { beui: "beui", figma: "figma" };
function howToUse(src) {
  const local = /^~\/\.(?:claude|agents|codex)\/skills\/([^/]+)(?:\/SKILL\.md)?$/.exec(src.ref || "")?.[1];
  const skill = src.type.startsWith("skill") ? (local || (src.id in PLUGIN_SKILLS ? null : src.id)) : null;
  return {
    claude: skill ? `/${skill}` : PLUGIN_SKILLS[src.id] || null,
    codex: skill ? `$${skill}` : null,
    mcp: MCP_SERVERS[src.id] || null,
    url: /^https:/.test(src.ref || "") ? src.ref : null,
    path: local ? src.ref : null,
  };
}
const srcIcon = (src) => (src?.type === "doc" ? "doc" : src?.type === "mcp" ? "mcp" : "skill");

// 出典を1つだけ選んでいるとき、一覧の上に「使い方」を出す
function renderSourcePanel() {
  const src = state.sources.size === 1 ? srcById[[...state.sources][0]] : null;
  $("src-panel").hidden = !src;
  if (!src) return;
  const how = howToUse(src);
  // 製品名（Claude Code・Codex・MCP）だけは文字で出す。アイコンでは見分けられないため
  const line = (iconName, label, value, onclick, showLabel = true) => el("button", { class: "src-cmd", ...tip(label), onclick },
    icon(iconName), showLabel ? el("span", { class: "src-cmd-label" }, label) : null, el("code", {}, value), icon("copy", "ic dim"));
  $("src-panel").replaceChildren(
    el("div", { class: "src-head" }, el("span", { class: "src-ic" }, icon(srcIcon(src))), el("h2", {}, src.name),
      how.url ? el("a", { class: "icon-btn", href: how.url, target: "_blank", rel: "noopener", ...tip(t("src_open")) }, icon("external")) : null),
    el("div", { class: "src-cmds" },
      how.claude ? line("terminal", t("invoke_claude"), how.claude, () => copy(how.claude, t("copied", how.claude))) : null,
      how.codex ? line("code", t("invoke_codex"), how.codex, () => copy(how.codex, t("copied", how.codex))) : null,
      how.mcp ? line("mcp", t("invoke_mcp"), how.mcp, () => copy(how.mcp, t("copied", how.mcp))) : null,
      how.path ? line("dict", t("src_ref"), how.path, () => copy(how.path, t("copied", how.path)), false) : null));
}

const iconBtn = (name, label, onclick, cls = "icon-btn act") => el("button", { class: cls, ...tip(label), onclick }, face(name, label));
function card(e) {
  const cat = catById[e.category];
  const src = srcById[e.source];
  const preview = renderPreview(e);
  observePreview(preview);
  const link = e.ref_url || e.url;
  const star = starButton(uiFavs.has(e.id), t("fav_toggle", e.name_ja), (on) => {
    if (on) uiFavs.add(e.id); else uiFavs.delete(e.id);
    store.set("ui-favs", [...uiFavs]);
    // 一覧は作り直さない（お気に入りだけ表示中に外しても、カードがその場で消えて位置がずれないように）
    renderFavList();
  });
  const [main, sub] = settings.lang === "en" ? [e.name_en, e.name_ja] : [e.name_ja, e.name_en];
  return el("article", { class: "card", "data-id": e.id },
    el("div", { class: "card-top" }, preview, star),
    el("header", {}, el("div", {}, el("h3", {}, main), el("div", { class: "en" }, sub)),
      el("div", { class: "badges" },
        el("span", { class: "badge " + e.kind, ...tip(t("k_" + e.kind)), "data-info": "" }, icon(e.kind)),
        el("span", { class: "badge", "data-tt": cat?.hint || cat?.name_ja, "data-info": "" }, cat?.name_ja))),
    el("p", { class: "desc" }, e.description_ja),
    e.aliases?.length ? el("div", { class: "aliases" }, ...e.aliases.map((a) => el("span", {}, a))) : null,
    // 出典はスキル名のバッジ。押すとその出典だけに絞り、使い方が上に出る
    src ? el("button", { class: "src-badge", "aria-label": t("open_source_only"),
      onclick: () => { state.sources = new Set([src.id]); update(); scrollTo({ top: 0 }); } }, icon(srcIcon(src)), el("span", {}, src.name)) : null,
    el("div", { class: "actions" },
      el("button", { class: "btn", ...tip(t("copy_prompt")), onclick: () => copy(e.prompt, t("copied_prompt")) }, face("copy", t("copy_prompt"))),
      iconBtn("textsize", t("copy_name"), () => copy(e.name_en, t("copied", e.name_en))),
      link ? iconBtn("link", t("copy_url"), () => copy(link, t("copied_url"))) : null,
      link ? el("a", { class: "icon-btn act", href: link, target: "_blank", rel: "noopener", ...tip(t("open")) }, face("external", t("open"))) : null));
}

let shown = 0;
const PAGE = 60;
let current = [];
function renderGrid(reset = true) {
  if (reset) { current = DATA.entries.filter((e) => matches(e)); shown = 0; $("grid").replaceChildren(); }
  const next = current.slice(shown, shown + PAGE);
  const cards = next.map(card);
  $("grid").append(...cards);
  if (reset) enterCards(cards);
  shown += next.length;
  $("count").textContent = t("count", current.length);
  if (!current.length) $("grid").replaceChildren(el("p", { class: "empty" }, t(state.fav && !uiFavs.size ? "favs_empty" : "empty")));
}

function update() {
  writeHash(); renderFilters(); renderSourcePanel(); renderGrid();
}

async function copy(text, msg) {
  const native = window.webkit?.messageHandlers?.copy;  // Mac アプリ内ではネイティブのクリップボードを使う
  try { if (native) native.postMessage(text); else await navigator.clipboard.writeText(text); }
  catch {
    const t = el("textarea", { style: "position:absolute;left:-9999px" }); t.value = text;
    document.body.append(t); t.select(); document.execCommand("copy"); t.remove();
  }
  // 押したボタンのすぐそばに結果を出す。押した場所が分からないとき（メニューからの実行など）だけ画面下に出す
  if (lastPress?.isConnected) { showCallout(lastPress, msg, true); return; }
  const toast = $("toast");
  toast.textContent = msg; toast.classList.add("show");
  clearTimeout(copy.timer); copy.timer = setTimeout(() => toast.classList.remove("show"), 1400);
}

let qTimer;
// WebKit の検索欄は × で消したとき input ではなく search だけを出すことがあるため両方を受ける
const onQuery = (ev) => {
  clearTimeout(qTimer);
  $("q-clear").hidden = !ev.target.value;
  qTimer = setTimeout(() => { state.q = ev.target.value.trim(); update(); }, ev.type === "search" ? 0 : 120);
};
$("q").addEventListener("input", onQuery);
$("q").addEventListener("search", onQuery);
$("q-clear").addEventListener("click", () => { clearTimeout(qTimer); $("q").value = ""; $("q-clear").hidden = true; state.q = ""; update(); $("q").focus(); });
document.addEventListener("keydown", (ev) => {
  const typing = Boolean(ev.target.matches?.("input, textarea, [contenteditable]"));
  if ((ev.key === "/" && !typing) || (ev.key === "k" && (ev.metaKey || ev.ctrlKey))) { ev.preventDefault(); setView("dict"); $("q").focus(); $("q").select(); }
  if (ev.key === "Escape" && ev.target.id === "q") { ev.target.value = ""; $("q-clear").hidden = true; state.q = ""; update(); ev.target.blur(); }
});
new IntersectionObserver(([en]) => { if (en.isIntersecting && shown < current.length) renderGrid(false); }, { rootMargin: "600px" })
  .observe(document.body.appendChild(el("div", { id: "sentinel" })));

$("open-settings").addEventListener("click", openSettings);

// 押したときの吹き出し。コピーなどの結果は「何が起きたか」、アイコンだけのボタンは「何のボタンか」を、押した要素のすぐ下に出す
const CALLOUT_MS = 1800, CALLOUT_RESULT_MS = 2400;
const callout = document.body.appendChild(el("div", { class: "callout", role: "status", "aria-live": "polite" }));
let lastPress = null, calloutTimer = 0;
function showCallout(node, text, isResult = false) {
  // 設定などのダイアログが開いているときは、その中（最前面の層）に出す
  const host = document.querySelector("dialog[open]") || document.body;
  if (callout.parentNode !== host) host.append(callout);
  callout.textContent = text;
  callout.classList.toggle("result", isResult);
  callout.classList.remove("show"); void callout.offsetWidth;
  const r = node.getBoundingClientRect(), w = callout.offsetWidth, h = callout.offsetHeight, GAP = 8;
  const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8);
  const below = r.bottom + GAP + h < innerHeight;
  callout.style.translate = `${left}px ${below ? r.bottom + GAP : r.top - GAP - h}px`;
  callout.style.setProperty("--arrow-x", `${Math.min(Math.max(12, r.left + r.width / 2 - left), w - 12)}px`);
  callout.dataset.side = below ? "below" : "above";
  callout.classList.add("show");
  clearTimeout(calloutTimer);
  calloutTimer = setTimeout(hideCallout, isResult ? CALLOUT_RESULT_MS : CALLOUT_MS);
}
function hideCallout() { callout.classList.remove("show"); }
document.addEventListener("pointerdown", (ev) => {
  lastPress = ev.target.closest("button, a, [data-tt], [data-info]");
  if (!callout.contains(ev.target)) hideCallout();
}, true);
// アイコンだけで名前が見えていないボタンと、説明用のアイコン（data-info）は、押したら名前・説明を出す
document.addEventListener("click", (ev) => {
  const node = ev.target.closest("[data-tt]");
  if (!node || node.closest("dialog#guide")) return;
  const labelHidden = settings.labels === "icon" && !node.closest(".side");
  if (node.hasAttribute("data-info") || (labelHidden && node.matches(".seg button, .icon-btn, .pk-head"))) showCallout(node, node.dataset.tt);
});
addEventListener("scroll", hideCallout, { passive: true, capture: true });
readHash();
update();
