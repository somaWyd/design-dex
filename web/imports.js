// 利用者が取り込んだ項目（Claude Code / Codex が書き出した designdex-import.json）。
// この端末に保存し、起動時に辞典へ足す。ファイルは外から来たデータなので、ここで厳しく検証する:
// 文字列は画面に textContent でしか入れない（app.js の el）、リンクは https だけ、プレビューは同梱のデモだけ（画像は不可）。
const IMPORT_KEY = "designdex-imported";
const IMPORT_FORMAT = "designdex-import@1";
const IMPORT_LIMITS = { entries: 3000, text: 4000 };
const ID_RE = /^[a-z0-9][a-z0-9._-]*$/;
const ENTRY_ID_RE = /^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9-]*$/;
const KINDS_OK = new Set(["motion", "ui", "type"]);
const SOURCE_TYPES = new Set(["skill", "mcp", "skill+mcp"]);
const FALLBACK_DEMO = { motion: "enter", ui: "buttons", type: "text" };
const REQUIRED_TEXT = ["name_en", "name_ja", "description_ja", "prompt", "source_ref"];

const str = (v) => (typeof v === "string" ? v.trim().slice(0, IMPORT_LIMITS.text) : "");

// 取り込みファイルを検証し、使える導入元と項目だけを返す。errors は人が読める理由（最初の数件）
function validateImport(doc, catalog) {
  const errors = [], sources = [], entries = [];
  if (!doc || doc.format !== IMPORT_FORMAT || !Array.isArray(doc.sources)) {
    return { sources, entries, errors: ["format"], skipped: [] };
  }
  const catKind = Object.fromEntries((catalog.categories || []).map((c) => [c.id, c.kind]));
  const builtIn = new Set((catalog.sources || []).map((s) => s.id));
  const usedIds = new Set((catalog.entries || []).map((e) => e.id));
  const skipped = [];
  for (const block of doc.sources) {
    const src = block?.source || {};
    const id = str(src.id).toLowerCase();
    if (!ID_RE.test(id)) { errors.push(`source id: ${id || "(empty)"}`); continue; }
    // DesignDex に最初から入っている導入元は二重にしない
    if (builtIn.has(id)) { skipped.push(id); continue; }
    const kept = [];
    for (const e of Array.isArray(block.entries) ? block.entries : []) {
      if (entries.length + kept.length >= IMPORT_LIMITS.entries) break;
      const eid = str(e?.id).toLowerCase();
      const kind = str(e?.kind);
      const category = str(e?.category);
      const url = str(e?.ref_url);
      if (!ENTRY_ID_RE.test(eid) || usedIds.has(eid)) { errors.push(`id: ${eid || "(empty)"}`); continue; }
      if (!KINDS_OK.has(kind) || catKind[category] !== kind) { errors.push(`${eid}: kind/category`); continue; }
      if (REQUIRED_TEXT.some((k) => !str(e[k]))) { errors.push(`${eid}: missing text`); continue; }
      if (!/^https:\/\/[^\s"'<>]+$/.test(url)) { errors.push(`${eid}: ref_url`); continue; }
      const demo = str(e.preview?.demo);
      usedIds.add(eid);
      kept.push({
        id: eid, kind, category, source: id, ref_url: url,
        name_en: str(e.name_en), name_ja: str(e.name_ja), description_ja: str(e.description_ja),
        prompt: str(e.prompt), source_ref: str(e.source_ref),
        aliases: (Array.isArray(e.aliases) ? e.aliases : []).map(str).filter(Boolean).slice(0, 8),
        preview: { demo: TEMPLATES[demo] ? demo : FALLBACK_DEMO[kind], variant: str(e.preview?.variant) || undefined },
        imported: true,
      });
    }
    if (!kept.length) continue;
    const type = SOURCE_TYPES.has(src.type) ? src.type : "skill";
    sources.push({ id, type, name: str(src.name) || id, ref: str(src.ref), imported: true });
    entries.push(...kept);
  }
  return { sources, entries, errors: errors.slice(0, 5), skipped };
}

// 保存してある取り込み分を辞典に足す（app.js が索引を作る前に呼ばれる）
function mergeImported() {
  const catalog = window.CATALOG;
  if (!catalog) return;
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(IMPORT_KEY) || "null"); } catch { saved = null; }
  if (!saved) return;
  const { sources, entries } = validateImport(saved.doc, catalog);
  catalog.sources.push(...sources);
  catalog.entries.push(...entries);
  catalog.imported = { sources: sources.length, entries: entries.length, at: saved.at };
}
mergeImported();
