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
// 「基本」（同梱）を先頭に、取り込んだスキル・MCP・公式ドキュメントを続ける
const SOURCE_GROUPS = [["basic", "g_basic"], ["skill", "g_skill"], ["mcp", "g_mcp"], ["doc", "g_doc"]];
const srcName = (s) => (settings.lang === "en" && s?.name_en) || s?.name || "";

const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
function filterItem(label, count, pressed, onclick, hint) {
  const mark = el("span", { class: "check" }); mark.innerHTML = CHECK;
  return el("li", { class: "sub" }, el("button", { "aria-pressed": String(pressed), "data-tt": hint, onclick },
    mark, el("span", { class: "label" }, label), el("span", { class: "n" }, String(count))));
}
// 一覧の区切りはアイコンだけ（名前はマウスを乗せると出る）
// 区切りの見出し（アイコン＋名前）。その下の項目は一段内側に下げて、階層が分かるようにする（style.css の .sub）
const groupHead = (iconName, label) => el("li", { class: "group", ...tip(label) }, face(iconName, label));
// 種類の見出し（モーション・UI・タイポ）はチェック欄つきで、押すとその種類のカテゴリをまとめて選ぶ／外す。
// 一部だけ選んでいるときは「－」の途中表示にする
function groupToggle(iconName, label, ids) {
  const picked = ids.filter((id) => state.cats.has(id)).length;
  const all = picked === ids.length && ids.length > 0;
  const mark = el("span", { class: "check" + (picked && !all ? " mixed" : "") }); mark.innerHTML = CHECK;
  return el("li", { class: "group group-toggle" }, el("button", {
    type: "button", role: "checkbox", "aria-checked": all ? "true" : picked ? "mixed" : "false", "aria-pressed": String(all), "aria-label": t("select_all_in", label),
    onclick: () => { ids.forEach((id) => (all ? state.cats.delete(id) : state.cats.add(id))); update(); },
  }, mark, face(iconName, label)));
}
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

  syncSeg($("kind"), "kind");
  const catCount = {}, srcCount = {};
  DATA.entries.forEach((e) => {
    if (matches(e, { cat: true })) catCount[e.category] = (catCount[e.category] || 0) + 1;
    if (matches(e, { source: true })) srcCount[e.source] = (srcCount[e.source] || 0) + 1;
  });
  // 0件の項目は出さない（選択中のものだけは解除できるよう残す）
  const visible = (count, pressed) => count > 0 || pressed;
  const catBlocks = Object.entries(GROUPS).filter(([k]) => state.kind === "all" || state.kind === k).map(([k, label]) => {
    const cats = DATA.categories.filter((c) => c.kind === k && visible(catCount[c.id] || 0, state.cats.has(c.id)));
    const items = cats.map((c) => filterItem(c.name_ja, catCount[c.id] || 0, state.cats.has(c.id), () => toggle(state.cats, c.id), c.hint));
    return items.length ? [groupToggle(k, t(label), cats.map((c) => c.id)), ...items] : [];
  });
  $("cats").replaceChildren(...catBlocks.flat());

  const srcBlocks = SOURCE_GROUPS.map(([type, label]) => {
    const items = DATA.sources.filter((s) => (s.type === type || (type === "skill" && s.type === "skill+mcp"))
      && visible(srcCount[s.id] || 0, state.sources.has(s.id)))
      .map((s) => filterItem(srcName(s), srcCount[s.id] || 0, state.sources.has(s.id), () => toggle(state.sources, s.id)));
    return items.length ? [groupHead(type, t(label)), ...items] : [];
  });
  // 出典の最後に「自分のスキルを取り込む」を置く（同梱は「基本」だけなので、足し方がここで分かるように）
  $("sources").replaceChildren(...srcBlocks.flat(), el("li", { class: "sub add-src" },
    el("button", { type: "button", onclick: () => openImport() }, icon("terminal"), el("span", { class: "label" }, t("s_import")))));
  renderFavList();
  $("cats-n").textContent = state.cats.size || "";
  $("sources-n").textContent = state.sources.size || "";
  $("cats-clear").hidden = !state.cats.size;
  $("sources-clear").hidden = !state.sources.size;
  renderChips();
}

// ---- 共通の小さな動き ----
// 数が変わったときに少し弾ませる
function pop(node) {
  if (reduceMotion() || !node?.isConnected) return;
  node.animate([{ transform: "scale(1)" }, { transform: "scale(1.25)" }, { transform: "scale(1)" }], { duration: 320, easing: "cubic-bezier(.34,1.56,.64,1)" });
}
// 星を押したら、星が弧を描いてサイドバーの「お気に入り」へ飛ぶ（ダイアログ表示中は見えないので飛ばさない）
function flyStar(fromEl) {
  const target = document.querySelector('details[data-fold="favs"] > summary .fold-ic');
  if (reduceMotion() || !fromEl || !target || document.querySelector("dialog[open]")) return;
  const a = fromEl.getBoundingClientRect(), b = target.getBoundingClientRect();
  const s = el("span", { class: "fly-star", "aria-hidden": "true" }, icon("star"));
  Object.assign(s.style, { left: `${a.left + a.width / 2 - 10}px`, top: `${a.top + a.height / 2 - 10}px` });
  document.body.append(s);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
  s.animate([
    { transform: "translate(0, 0) scale(1.5)", opacity: 1 },
    { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 70}px) scale(1.15)`, opacity: 1, offset: 0.5 },
    { transform: `translate(${dx}px, ${dy}px) scale(.55)`, opacity: 0.3 },
  ], { duration: 640, easing: "cubic-bezier(.45,0,.2,1)" }).finished.then(() => { s.remove(); pop(target); }, () => s.remove());
}
// 選択のピル: 区切りボタンで選んでいる項目の背景が、前の位置から新しい位置へ滑って移る（transform だけで動かす）
const segPos = new Map();
function syncSeg(seg, key) {
  const btn = seg?.querySelector(':scope > button[aria-checked="true"]');
  if (!btn || !seg.isConnected || !seg.offsetWidth) return;
  seg.classList.add("has-ind");
  let ind = seg.querySelector(":scope > .seg-ind");
  if (!ind) { ind = el("span", { class: "seg-ind", "aria-hidden": "true" }); seg.prepend(ind); }
  const box = { x: btn.offsetLeft, y: btn.offsetTop, w: btn.offsetWidth, h: btn.offsetHeight };
  Object.assign(ind.style, { width: `${box.w}px`, height: `${box.h}px`, transform: `translate(${box.x}px, ${box.y}px)` });
  const prev = segPos.get(key);
  if (prev && (prev.x !== box.x || prev.y !== box.y) && !reduceMotion()) {
    ind.animate([{ transform: `translate(${prev.x}px, ${prev.y}px) scale(${prev.w / box.w}, ${prev.h / box.h})` }, { transform: `translate(${box.x}px, ${box.y}px)` }],
      { duration: 340, easing: "cubic-bezier(.3,1.3,.5,1)" });
  }
  segPos.set(key, box);
}
// 押したものを縮めて消してから、本当の処理をする（チップの × など）
function exitThen(node, action) {
  if (reduceMotion()) { action(); return; }
  node.animate([{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(.8)" }], { duration: 160, easing: EASE, fill: "forwards" }).finished.then(action, action);
}

// 区分の見出しの「解除」: その区分の絞り込みだけを外す（見出しの開閉はしない）
for (const [id, key] of [["cats-clear", "cats"], ["sources-clear", "sources"]]) {
  $(id).append(icon("close"));
  $(id).setAttribute("aria-label", t("reset_filters"));
  $(id).addEventListener("click", (ev) => { ev.preventDefault(); ev.stopPropagation(); state[key] = new Set(); update(); });
}

// サイドバーのお気に入り。先頭は「お気に入りだけ表示」の切替、その下に登録した項目を並べる
const nameOf = (e) => (settings.lang === "en" ? e.name_en : e.name_ja);
let favShown = new Set(uiFavs);
function renderFavList() {
  const added = new Set([...uiFavs].filter((id) => !favShown.has(id)));
  const leaving = [...favShown].filter((id) => !uiFavs.has(id))
    .map((id) => $("fav-list").querySelector(`[data-fav-id="${CSS.escape(id)}"]`)).filter(Boolean);
  favShown = new Set(uiFavs);
  const draw = () => {
    const n = $("favs-n");
    if (n.textContent !== String(uiFavs.size || "")) { n.textContent = uiFavs.size || ""; pop(n); }
    const items = DATA.entries.filter((e) => uiFavs.has(e.id));
    $("fav-list").replaceChildren(...[
      filterItem(t("favs_only"), uiFavs.size, state.fav, () => { state.fav = !state.fav; update(); }),
      ...items.map((e) => el("li", { class: "sub" + (added.has(e.id) && !reduceMotion() ? " row-in" : ""), "data-fav-id": e.id },
        el("button", { class: "fav-entry", onclick: () => openEntry(e) }, icon(e.kind), el("span", { class: "label" }, nameOf(e))))),
      items.length ? null : el("li", { class: "hist-empty" }, t("favs_empty")),
    ].filter(Boolean));
  };
  if (!leaving.length || reduceMotion()) { draw(); return; }
  Promise.all(leaving.map((li) => li.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateX(-16px)" }],
    { duration: 200, easing: EASE, fill: "forwards" }).finished)).then(draw, draw);
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
  const chip = (label, action, iconName, name = label) => el("button", { class: "chip" + (lastChips.has(name) ? "" : " new"), "data-key": name, onclick: (ev) => exitThen(ev.currentTarget, action), ...tip(t("remove_filter", name)) },
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
  // 「開いているか」は動きの途中では d.open と食い違うので、押した結果として目指す状態（want）で判断する
  const want = !(d.dataset.want ? d.dataset.want === "1" : d.open);
  d.dataset.want = want ? "1" : "0";
  store.set("fold-" + d.dataset.fold, want ? "1" : "0");
  const id = "fold-" + d.dataset.fold;
  // 動きの途中で押されたら、打ち切らずにその位置から逆向きに戻す（連打しても跳ねない）
  const running = [body, ...below].flatMap((n) => n.getAnimations().filter((a) => a.id === id));
  if (running.length) { running.forEach((a) => a.reverse()); return; }
  if (reduceMotion()) { d.open = want; return; }
  const opts = { duration: FOLD_MS, easing: EASE, id };
  let anims;
  if (want) {
    const before = below.map((n) => n.getBoundingClientRect().top);
    d.open = true;
    anims = [...below.map((n, i) => n.animate([{ transform: `translateY(${before[i] - n.getBoundingClientRect().top}px)` }, { transform: "none" }], opts)),
      body.animate([{ clipPath: "inset(0 0 100% 0)", opacity: 0, transform: "translateY(-6px)" }, { clipPath: "inset(0)", opacity: 1, transform: "none" }], opts)];
  } else {
    // 閉じるときは、開くときの動き（同じキーフレーム・同じ曲線）をそのまま逆に再生する
    const h = body.getBoundingClientRect().height;
    const back = { ...opts, direction: "reverse" };
    anims = [...below.map((n) => n.animate([{ transform: `translateY(${-h}px)` }, { transform: "none" }], back)),
      body.animate([{ clipPath: "inset(0 0 100% 0)", opacity: 0, transform: "translateY(-6px)" }, { clipPath: "inset(0)", opacity: 1, transform: "none" }], back)];
  }
  // 全部の動きが止まったところで、最後に目指していた状態に合わせる（逆向きに戻ったときも同じ）
  Promise.all(anims.map((a) => a.finished)).then(() => { d.open = d.dataset.want === "1"; }, () => {});
}
document.querySelectorAll("details.fold").forEach((d) => {
  const saved = store.get("fold-" + d.dataset.fold, null);
  if (saved !== null) d.open = String(saved) === "1";  // 旧版は "1"/"0" の生文字列で保存していた
  d.querySelector(":scope > summary").addEventListener("click", (ev) => { ev.preventDefault(); toggleFold(d); });
});

// 一覧を作り直したとき・続きを足したとき、表示するカードすべてを時間差で浮かび上がらせる。
// 枚数が多くても待たされないよう、最後のカードの遅れは STAGGER_TOTAL_MS までに収める
const STAGGER_TOTAL_MS = 400;
function enterCards(cards) {
  if (reduceMotion() || !cards.length) return;
  const step = Math.min(28, STAGGER_TOTAL_MS / cards.length);
  cards.forEach((c, i) => { c.style.setProperty("--d", `${Math.round(i * step)}ms`); c.classList.add("enter"); });
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
const srcIcon = (src) => ({ basic: "dict", doc: "doc", mcp: "mcp" }[src?.type] || "skill");

// 出典を1つだけ選んでいるとき、一覧の上に「使い方」を出す
// 出典の呼び出し方の行（押すとコピー）。製品名（Claude Code・Codex・MCP）だけは文字で出す。アイコンでは見分けられないため
function howToLines(src) {
  const how = howToUse(src);
  const line = (iconName, label, value, showLabel = true) => el("button", { class: "src-cmd", ...tip(label), onclick: () => copy(value, t("copied", value)) },
    icon(iconName), showLabel ? el("span", { class: "src-cmd-label" }, label) : null, el("code", {}, value), icon("copy", "ic dim"));
  return el("div", { class: "src-cmds" },
    how.claude ? line("terminal", t("invoke_claude"), how.claude) : null,
    how.codex ? line("code", t("invoke_codex"), how.codex) : null,
    how.mcp ? line("mcp", t("invoke_mcp"), how.mcp) : null,
    how.path ? line("dict", t("src_ref"), how.path, false) : null);
}
function renderSourcePanel() {
  const src = state.sources.size === 1 ? srcById[[...state.sources][0]] : null;
  $("src-panel").hidden = !src;
  if (!src) return;
  const how = howToUse(src);
  $("src-panel").replaceChildren(
    el("div", { class: "src-head" }, el("span", { class: "src-ic" }, icon(srcIcon(src))), el("h2", {}, src.name),
      how.url ? el("a", { class: "icon-btn", href: how.url, target: "_blank", rel: "noopener", ...tip(t("src_open")) }, icon("external")) : null),
    howToLines(src));
}

const iconBtn = (name, label, onclick, cls = "icon-btn act") => el("button", { class: cls, ...tip(label), onclick }, face(name, label));
function card(e) {
  const cat = catById[e.category];
  const preview = renderPreview(e);
  observePreview(preview);
  const link = e.ref_url || e.url;
  const star = starButton(uiFavs.has(e.id), t("fav_toggle", e.name_ja), (on) => {
    if (on) uiFavs.add(e.id); else uiFavs.delete(e.id);
    store.set("ui-favs", [...uiFavs]);
    if (on) flyStar(star);
    // 一覧は作り直さない（お気に入りだけ表示中に外しても、カードがその場で消えて位置がずれないように）
    renderFavList();
  });
  const [main, sub] = settings.lang === "en" ? [e.name_en, e.name_ja] : [e.name_ja, e.name_en];
  const node = el("article", { class: "card", "data-id": e.id, tabindex: "0", "aria-label": t("detail_open", main) },
    el("div", { class: "card-top" }, preview, star),
    el("header", {}, el("div", {}, el("h3", {}, main), el("div", { class: "en" }, sub)),
      el("div", { class: "badges" },
        el("span", { class: "badge " + e.kind, ...tip(t("k_" + e.kind)), "data-info": "" }, icon(e.kind)),
        el("span", { class: "badge", "data-tt": cat?.hint || cat?.name_ja, "data-info": "" }, cat?.name_ja))),
    // カードは「見本・名前・説明・操作」の4段だけ。言い換え・出典は詳細で見せる（一覧の情報を絞って見比べやすくする）
    el("p", { class: "desc" }, e.description_ja),
    el("div", { class: "actions" },
      el("button", { class: "btn", ...tip(t("copy_prompt")), onclick: () => copy(e.prompt, t("copied_prompt")) }, face("copy", t("copy_prompt"))),
      iconBtn("textsize", t("copy_name"), () => copy(e.name_en, t("copied", e.name_en))),
      link ? iconBtn("link", t("copy_url"), () => copy(link, t("copied_url"))) : null,
      link ? el("a", { class: "icon-btn act", href: link, target: "_blank", rel: "noopener", ...tip(t("open")) }, face("external", t("open"))) : null));
  // カードの空いている所（ボタン・リンク・説明用のバッジ以外）を押すか Enter で、詳細を開く
  node.addEventListener("click", (ev) => { if (!ev.target.closest("button, a, [data-info]")) openDetail(e, node); });
  node.addEventListener("keydown", (ev) => { if (ev.key === "Enter" && ev.target === node) openDetail(e, node); });
  return node;
}

// ---- 詳細（カードを押すと開く） ----
// 大きなプレビュー・名前・説明・言い換え・出典と呼び出し方・プロンプトの全文・コピー操作をまとめて見せる
function openDetail(e, from) {
  const d = $("detail");
  const cat = catById[e.category], src = srcById[e.source];
  const link = e.ref_url || e.url;
  const [main, sub] = settings.lang === "en" ? [e.name_en, e.name_ja] : [e.name_ja, e.name_en];
  const preview = renderPreview(e);
  preview.classList.add("d-preview");
  const star = starButton(uiFavs.has(e.id), t("fav_toggle", e.name_ja), (on) => {
    if (on) uiFavs.add(e.id); else uiFavs.delete(e.id);
    store.set("ui-favs", [...uiFavs]);
    renderFavList();
    from?.querySelector(".card-top .star")?.setAttribute("aria-pressed", String(on));  // 一覧のカードの星もそろえる
  });
  d.replaceChildren(
    el("div", { class: "d-top" }, el("div", { class: "badges" },
      el("span", { class: "badge " + e.kind }, icon(e.kind), t("k_" + e.kind)), el("span", { class: "badge" }, cat?.name_ja)),
      el("div", { class: "d-top-actions" }, star)),
    closeX(closeDetail),
    preview,
    el("h2", { class: "d-title" }, main), el("div", { class: "en d-sub" }, sub),
    el("p", { class: "d-desc" }, e.description_ja),
    e.aliases?.length ? el("div", { class: "aliases" }, ...e.aliases.map((a) => el("span", {}, a))) : null,
    src ? el("section", { class: "d-src" }, el("div", { class: "d-label" }, icon(srcIcon(src)), el("span", {}, src.name)),
      e.source_ref ? el("p", { class: "d-ref" }, e.source_ref) : null, howToLines(src)) : null,
    // プロンプト欄は全体が「押すとコピー」のボタン（見出しの「プロンプトをコピー」を押してもコピーされる）
    el("button", { class: "d-prompt", type: "button", "aria-label": t("copy_prompt"), onclick: () => copy(e.prompt, t("copied_prompt")) },
      el("span", { class: "d-label" }, icon("copy"), el("span", {}, t("copy_prompt"))), el("pre", {}, e.prompt)),
    el("div", { class: "actions d-actions" },
      el("button", { class: "btn", onclick: () => copy(e.prompt, t("copied_prompt")) }, face("copy", t("copy_prompt"))),
      iconBtn("textsize", t("copy_name"), () => copy(e.name_en, t("copied", e.name_en))),
      link ? iconBtn("link", t("copy_url"), () => copy(link, t("copied_url"))) : null,
      link ? el("a", { class: "icon-btn act", href: link, target: "_blank", rel: "noopener", ...tip(t("open")) }, face("external", t("open"))) : null));
  d.scrollTop = 0;
  // 押したカードの位置から広がるように見せる（出てきた場所へ戻る）
  if (from) { const r = from.getBoundingClientRect(); d.style.setProperty("--from-x", `${r.left + r.width / 2 - innerWidth / 2}px`); d.style.setProperty("--from-y", `${r.top + r.height / 2 - innerHeight / 2}px`); }
  d.showModal();
  observePreview(preview);
}
function closeDetail() {
  const d = $("detail");
  if (!d.open || d.classList.contains("closing")) return;
  if (reduceMotion()) { d.close(); return; }
  d.classList.add("closing");
  const finish = () => { clearTimeout(timer); d.classList.remove("closing"); d.close(); };
  const timer = setTimeout(finish, 320);
  d.addEventListener("animationend", (ev) => { if (ev.target === d) finish(); }, { once: true });
}
$("detail").addEventListener("cancel", (ev) => { ev.preventDefault(); closeDetail(); });
$("detail").addEventListener("click", (ev) => {
  if (ev.target !== ev.currentTarget) return;
  const r = ev.currentTarget.getBoundingClientRect();
  if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) closeDetail();
});

let shown = 0;
const PAGE = 60;
let current = [];
function renderGrid(reset = true) {
  if (reset) { current = DATA.entries.filter((e) => matches(e)); shown = 0; $("grid").replaceChildren(); }
  const next = current.slice(shown, shown + PAGE);
  const cards = next.map(card);
  $("grid").append(...cards);
  enterCards(cards);  // 作り直したときも、スクロールで続きを足したときも
  shown += next.length;
  if ($("count").textContent !== t("count", current.length)) { $("count").textContent = t("count", current.length); pop($("count")); }
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
// 画面切替のピルは最初の描画のあとに置く。幅が変わったら（文字の大きさ・ウィンドウ）位置を合わせ直す
requestAnimationFrame(() => syncSeg($("view"), "view"));
let resizeTimer = 0;
addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { segPos.clear(); syncSeg($("view"), "view"); syncSeg($("kind"), "kind"); }, 120);
});
