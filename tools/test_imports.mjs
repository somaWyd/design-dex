// web/imports.js の検証（取り込みファイルは外から来るデータ）。実行: node tools/test_imports.mjs
import { readFileSync } from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const ctx = { TEMPLATES: { enter: "x", buttons: "x", text: "x" }, window: {}, localStorage: { getItem: () => null } };
vm.runInNewContext(readFileSync(new URL("../web/imports.js", import.meta.url), "utf8") + ";this.validateImport = validateImport;", ctx);
const catalog = { categories: [{ id: "entrance", kind: "motion" }, { id: "button", kind: "ui" }], sources: [{ id: "apple-design" }], entries: [] };
const ok = (n, extra = {}) => ({ id: `mine/item-${n}`, kind: "motion", category: "entrance", name_en: "A", name_ja: "あ", description_ja: "説明",
  prompt: "p", source_ref: "s", ref_url: "https://example.com/", preview: { demo: "enter" }, ...extra });
const run = (entries, source = { id: "mine" }) => ctx.validateImport({ format: "designdex-import@1", sources: [{ source, entries }] }, catalog);

assert.equal(run([ok(1)]).entries.length, 1);
assert.equal(ctx.validateImport({ format: "other", sources: [] }, catalog).errors[0], "format");      // 形式違い
assert.equal(run([ok(1, { ref_url: "javascript:alert(1)" })]).entries.length, 0);                      // https 以外のリンク
assert.equal(run([ok(1, { category: "button" })]).entries.length, 0);                                  // kind と category の食い違い
assert.equal(run([ok(1, { prompt: "" })]).entries.length, 0);                                          // 必須の文言が空
assert.deepEqual(run([ok(1, { preview: { image: "https://evil/x.png" } })]).entries[0].preview.image, undefined); // 画像プレビューは捨てる
assert.equal(run([ok(1, { preview: { demo: "nope" } })]).entries[0].preview.demo, "enter");            // 未知のデモは既定に
assert.equal(run([ok(1), ok(1)]).entries.length, 1);                                                   // id の重複
assert.equal(run([ok(1)], { id: "apple-design" }).skipped[0], "apple-design");                         // 最初から入っている導入元
console.log("test_imports: OK");
