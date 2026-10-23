// functions/（Cloudflare Pages Functions の Google ログイン）の検証。実行: node tools/test_auth.mjs
import assert from "node:assert/strict";
import { seal, unseal, safeNext, SESSION_COOKIE, OAUTH_COOKIE, TYP_SESSION, TYP_OAUTH } from "../functions/_lib/session.js";
import { onRequest as gate } from "../functions/_middleware.js";
import { onRequestGet as callback } from "../functions/auth/callback.js";
import { onRequestGet as google } from "../functions/auth/google.js";

const env = { GOOGLE_CLIENT_ID: "cid.apps.googleusercontent.com", GOOGLE_CLIENT_SECRET: "test-secret", SESSION_SECRET: "x".repeat(40) };
const ORIGIN = "https://designdex.example";
const now = () => Math.floor(Date.now() / 1000);
const req = (path, { cookie, accept = "text/html" } = {}) => new Request(ORIGIN + path, { headers: { Accept: accept, ...(cookie ? { Cookie: cookie } : {}) } });
const next = async () => new Response("page", { headers: { "Content-Type": "text/html" } });
const jwt = (claims) => `h.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.s`;

let r;
// 署名付き Cookie: 改ざん・期限切れ・別の鍵・別の種類は読めない
const tok = await seal({ sub: "1", exp: now() + 60 }, env.SESSION_SECRET, TYP_SESSION);
assert.equal((await unseal(tok, env.SESSION_SECRET, TYP_SESSION)).sub, "1");
// 署名の最後の1文字は余りのビットしか持たないことがあるので、署名の先頭と中身を書き換えて確かめる
const [tb, ts] = tok.split(".");
const flip = (c) => (c === "A" ? "B" : "A");
assert.equal(await unseal(`${tb}.${flip(ts[0])}${ts.slice(1)}`, env.SESSION_SECRET, TYP_SESSION), null);
assert.equal(await unseal(`${flip(tb[0])}${tb.slice(1)}.${ts}`, env.SESSION_SECRET, TYP_SESSION), null);
assert.equal(await unseal(tok, "y".repeat(40), TYP_SESSION), null);
assert.equal(await unseal(await seal({ sub: "1", exp: now() - 1 }, env.SESSION_SECRET, TYP_SESSION), env.SESSION_SECRET, TYP_SESSION), null);
assert.equal(await unseal(tok, env.SESSION_SECRET, TYP_OAUTH), null);            // 種類違いは読めない

// ログイン途中の一時 Cookie を、ログイン済みの Cookie として使えない（自分で /auth/google を開けば手に入る値）
const oauthAsSession = await seal({ state: "s", nonce: "n", next: "/", exp: now() + 600 }, env.SESSION_SECRET, TYP_OAUTH);
r = await gate({ request: req("/", { cookie: `${SESSION_COOKIE}=${oauthAsSession}` }), env, next });
assert.equal(r.status, 302);

// 戻り先は同じサイトのパスだけ
assert.equal(safeNext("/x?y=1"), "/x?y=1");
for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", null]) assert.equal(safeNext(bad), "/");

// 入口: 未ログインのページはログイン画面へ、データは 401、設定不足は 500、ログイン済みは通す
r = await gate({ request: req("/"), env, next });
assert.equal(r.status, 302); assert.match(r.headers.get("Location"), /\/auth\/login\?next=%2F$/);
r = await gate({ request: req("/dist/catalog.js", { accept: "*/*" }), env, next });
assert.equal(r.status, 401);
r = await gate({ request: req("/"), env: {}, next });
assert.equal(r.status, 500);
r = await gate({ request: req("/auth/login"), env, next });
assert.equal(await r.text(), "page");
r = await gate({ request: req("/privacy"), env: {}, next });                     // プライバシーポリシーは設定前・未ログインでも開ける（Google の同意画面の要件）
assert.equal(await r.text(), "page");
r = await gate({ request: req("/auth/other"), env, next });                       // /auth/ の下でも窓口以外は守る
assert.equal(r.status, 302);
r = await gate({ request: req("/auth/logout"), env, next });                     // GET のログアウトは本体へ流さない
assert.equal(r.status, 405);
r = await gate({ request: new Request(ORIGIN + "/auth/login", { method: "POST" }), env, next });  // 窓口ごとのメソッド以外は 405
assert.equal(r.status, 405);
const session = await seal({ sub: "1", email: "a@example.com", exp: now() + 60 }, env.SESSION_SECRET, TYP_SESSION);
r = await gate({ request: req("/", { cookie: `${SESSION_COOKIE}=${session}` }), env, next });
assert.equal(r.status, 200); assert.equal(r.headers.get("Cache-Control"), "private, no-store");

// Google へ送る: state・nonce を作って Cookie に入れる
r = await google({ request: req("/auth/google?next=/x"), env });
const loc = new URL(r.headers.get("Location"));
assert.equal(loc.origin + loc.pathname, "https://accounts.google.com/o/oauth2/v2/auth");
assert.equal(loc.searchParams.get("redirect_uri"), ORIGIN + "/auth/callback");
const pending = await unseal(r.headers.get("Set-Cookie").split(";")[0].split("=")[1], env.SESSION_SECRET, TYP_OAUTH);
assert.equal(pending.state, loc.searchParams.get("state")); assert.equal(pending.nonce, loc.searchParams.get("nonce")); assert.equal(pending.next, "/x");

// 戻ってきたところ（Google のトークン窓口は偽物に差し替える）
const oauthCookie = `${OAUTH_COOKIE}=${await seal({ ...pending }, env.SESSION_SECRET, TYP_OAUTH)}`;
const good = { iss: "https://accounts.google.com", aud: env.GOOGLE_CLIENT_ID, exp: now() + 300, nonce: pending.nonce, email_verified: true, sub: "42", email: "u@example.com", name: "U" };
const run = async (claims, state = pending.state) => {
  globalThis.fetch = async () => Response.json({ id_token: jwt(claims) });
  return callback({ request: req(`/auth/callback?code=c&state=${state}`, { cookie: oauthCookie }), env });
};
r = await run(good);
assert.equal(r.status, 302); assert.equal(r.headers.get("Location"), ORIGIN + "/x");
const issued = r.headers.getSetCookie().find((c) => c.startsWith(SESSION_COOKIE + "="));
assert.match(issued, /HttpOnly; Secure; SameSite=Lax/);
assert.equal((await unseal(issued.split(";")[0].split("=")[1], env.SESSION_SECRET, TYP_SESSION)).sub, "42");
assert.equal((await run(good, "other")).status, 400);                              // state の食い違い
assert.equal((await run({ ...good, nonce: "x" })).status, 400);                     // nonce の食い違い
assert.equal((await run({ ...good, aud: "someone-else" })).status, 502);            // 別アプリ宛てのトークン
assert.equal((await run({ ...good, iss: "https://evil.example" })).status, 502);    // 発行元が Google でない
assert.equal((await run({ ...good, exp: now() - 1 })).status, 502);                 // 期限切れ
assert.equal((await run({ ...good, email_verified: false })).status, 403);          // 未確認のメール
assert.equal((await callback({ request: req("/auth/callback?code=c&state=s"), env })).status, 400);  // Cookie なし
console.log("test_auth: OK");
