// 初めて開いたときの案内と、自分のスキルの取り込み。どちらも設定からいつでも開ける。
// 案内: お礼 → 探し方 → コピーして AI に渡す → 配色 → スキルの取り込みへ
// 取り込み: ①指示文をコピー → ②Claude Code か Codex に貼って実行（designdex-import.json ができる）→ ③そのファイルを選ぶ
const GUIDE_DONE_KEY = "guide-done";
const IMPORT_FILE = "designdex-import.json";
const IMPORT_MAX_BYTES = 5 * 1024 * 1024;
const RELOAD_DELAY_MS = 1400;

const GUIDE_STEPS = [
  { art: "welcome", title: "g1_title", body: "g1_body" },
  { art: "search", title: "g2_title", body: "g2_body" },
  { art: "copy", title: "g3_title", body: "g3_body" },
  { art: "palette", title: "g4_title", body: "g4_body" },
  { art: "import", title: "g5_title", body: "g5_body", last: true },
];
let guideStep = 0;

// ---- 案内の絵（アプリの部品を小さく描いた見本。文字はすべて固定の文言） ----
function guideArt(kind) {
  const tile = (name) => el("span", { class: "g-tile" }, icon(name));
  const arts = {
    welcome: () => el("div", { class: "g-art g-welcome" }, el("img", { src: "icon.svg", alt: "", width: 88, height: 88 })),
    search: () => el("div", { class: "g-art" },
      el("div", { class: "g-search" }, icon("search"), el("span", { class: "g-typing" }, t("g2_sample"))),
      el("div", { class: "g-row" }, ...["motion", "ui", "type"].map(tile))),
    copy: () => el("div", { class: "g-art" },
      el("div", { class: "g-card" }, el("div", { class: "g-prev" }, el("span", { class: "g-dot" })),
        el("div", { class: "g-row" }, el("span", { class: "g-btn" }, icon("copy"), el("span", {}, t("copy_prompt"))), tile("skill"))),
      el("div", { class: "g-arrow" }, icon("external")),
      el("div", { class: "g-term" }, el("code", {}, "claude"), el("code", {}, "codex"))),
    palette: () => el("div", { class: "g-art" },
      el("div", { class: "g-row" }, ...["#2f6fed", "#5a50ca", "#744ad5", "#b98706", "#1f9d55"].map((c) => el("span", { class: "g-sw", style: `background:${c}` })))),
    import: () => el("div", { class: "g-art" }, el("div", { class: "g-row" }, tile("copy"), el("span", { class: "g-sep" }), tile("terminal"), el("span", { class: "g-sep" }), tile("dict"))),
  };
  return arts[kind]();
}

function renderGuide() {
  const step = GUIDE_STEPS[guideStep];
  const dots = el("div", { class: "g-dots", "aria-hidden": "true" }, ...GUIDE_STEPS.map((_, i) => el("span", { class: i === guideStep ? "on" : "" })));
  const back = guideStep > 0 ? el("button", { class: "g-ghost", onclick: () => { guideStep -= 1; renderGuide(); } }, t("g_back")) : el("span");
  const next = step.last
    ? el("div", { class: "g-actions" },
        el("button", { class: "g-ghost", onclick: () => closeGuide(true) }, t("g_later")),
        el("button", { class: "g-primary", onclick: () => { store.set(GUIDE_DONE_KEY, true); renderImport(); } }, face("dict", t("g_import_start"))))
    : el("button", { class: "g-primary", onclick: () => { guideStep += 1; renderGuide(); } }, t(guideStep === 0 ? "g_start" : "g_next"));
  $("guide").replaceChildren(
    el("div", { class: "g-top" }, dots, el("button", { class: "g-ghost g-skip", onclick: () => closeGuide(true) }, t("g_skip"))),
    el("div", { class: "g-body" }, guideArt(step.art), el("h2", {}, t(step.title)), el("p", {}, t(step.body))),
    el("div", { class: "g-foot" }, back, next));
  $("guide").querySelector(".g-body").classList.add("g-enter");
}

// ---- 取り込み ----
function importPrompt() {
  const cats = (window.CATALOG?.categories || []).map((c) => `${c.id} (${c.kind})`).join(", ");
  const demos = Object.keys(TEMPLATES).join(", ");
  // 最初から入っている導入元は取り込んでも除外されるので、AI に読ませる前に飛ばしてもらう（手間と時間の節約）
  const builtIn = (window.CATALOG?.sources || []).filter((src) => !src.imported && src.type !== "doc").map((src) => src.id).join(", ");
  return [t("imp_prompt_intro"), "", window.CATALOG?.import_skill || "", "",
    `Already included in DesignDex (skip these skill ids): ${builtIn}`,
    `Allowed category ids: ${cats}`, `Allowed demo ids: ${demos}`].join("\n");
}

function importStep(n, title, body, ...actions) {
  return el("li", { class: "imp-step" }, el("span", { class: "imp-n" }, String(n)),
    el("div", { class: "imp-main" }, el("h3", {}, title), el("p", {}, body), actions.length ? el("div", { class: "imp-actions" }, ...actions) : null));
}
const codeChip = (text) => el("button", { class: "imp-code", "data-tt": t("copied", text), "aria-label": t("copied", text), onclick: () => copy(text, t("copied", text)) },
  icon("terminal"), el("code", {}, text), icon("copy", "ic dim"));

function renderImport(result) {
  const file = el("input", { type: "file", accept: ".json,application/json", hidden: "" });
  file.addEventListener("change", () => file.files[0] && readImport(file.files[0]));
  const drop = el("div", { class: "imp-drop", onclick: () => file.click() }, icon("dict"), el("span", {}, t("imp_drop", IMPORT_FILE)), file);
  drop.addEventListener("dragover", (ev) => { ev.preventDefault(); drop.classList.add("over"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", (ev) => { ev.preventDefault(); drop.classList.remove("over"); const f = ev.dataTransfer.files[0]; if (f) readImport(f); });
  const now = window.CATALOG?.imported;
  $("guide").replaceChildren(...[
    el("div", { class: "g-top" }, el("h2", { class: "imp-title" }, t("imp_title")), el("button", { class: "g-ghost g-skip", onclick: () => closeGuide(true) }, t("g_close"))),
    el("p", { class: "imp-lead" }, t("imp_lead")),
    el("ol", { class: "imp-steps" },
      importStep(1, t("imp_s1_title"), t("imp_s1_body"),
        el("button", { class: "g-primary", onclick: () => copy(importPrompt(), t("imp_copied")) }, face("copy", t("imp_copy")))),
      importStep(2, t("imp_s2_title"), t("imp_s2_body"), codeChip("claude"), codeChip("codex")),
      importStep(3, t("imp_s3_title"), t("imp_s3_body", IMPORT_FILE), drop)),
    result ? el("p", { class: "imp-result " + (result.ok ? "ok" : "ng"), role: "status" }, result.text) : null,
    now ? el("div", { class: "imp-now" }, el("span", {}, t("imp_now", now.entries, now.sources)),
      el("button", { class: "g-ghost danger", onclick: clearImport }, t("imp_clear"))) : null,
  ].filter(Boolean));
  if (!$("guide").open) $("guide").showModal();
}

async function readImport(file) {
  if (file.size > IMPORT_MAX_BYTES) { renderImport({ ok: false, text: t("imp_too_big") }); return; }
  let doc;
  try { doc = JSON.parse(await file.text()); } catch { renderImport({ ok: false, text: t("imp_bad_json") }); return; }
  // 検証は「今の辞典（前回の取り込み分を除く）」に対して行う。同じファイルを入れ直しても重複扱いにしないため
  const base = { ...window.CATALOG, sources: window.CATALOG.sources.filter((s) => !s.imported), entries: window.CATALOG.entries.filter((e) => !e.imported) };
  const { sources, entries, errors, skipped } = validateImport(doc, base);
  if (!entries.length) {
    renderImport({ ok: false, text: errors[0] === "format" ? t("imp_bad_format") : t("imp_none", skipped.length) });
    return;
  }
  try { localStorage.setItem(IMPORT_KEY, JSON.stringify({ doc, at: Date.now() })); }
  catch { renderImport({ ok: false, text: t("imp_no_space") }); return; }
  renderImport({ ok: true, text: t("imp_done", entries.length, sources.length, errors.length) });
  setTimeout(() => location.reload(), RELOAD_DELAY_MS);
}

// 2回押して消す（1回目は確認の文言に変わる）。confirm() は Mac アプリの WebView で使えないため
function clearImport(ev) {
  const b = ev.currentTarget;
  if (!b.dataset.armed) { b.dataset.armed = "1"; b.textContent = t("imp_clear_confirm"); return; }
  try { localStorage.removeItem(IMPORT_KEY); } catch { /* 消せなくても再読み込みで状態を見せる */ }
  location.reload();
}

// ---- 開く・閉じる ----
function openGuide() { guideStep = 0; renderGuide(); $("guide").showModal(); }
function openImport() { renderImport(); }
function closeGuide(done) {
  if (done) store.set(GUIDE_DONE_KEY, true);
  const d = $("guide");
  if (!d.open) return;
  if (reduceMotion()) { d.close(); return; }
  d.classList.add("closing");
  const finish = () => { clearTimeout(timer); d.classList.remove("closing"); d.close(); };
  const timer = setTimeout(finish, 320);
  d.addEventListener("animationend", (e) => { if (e.target === d) finish(); }, { once: true });
}
$("guide").addEventListener("cancel", (ev) => { ev.preventDefault(); closeGuide(true); });
$("guide").addEventListener("click", (ev) => {
  if (ev.target !== ev.currentTarget) return;
  const r = ev.currentTarget.getBoundingClientRect();
  if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) closeGuide(true);
});

// 初めて開いたときだけ自動で案内を出す
if (!store.get(GUIDE_DONE_KEY, false)) openGuide();
