// ログイン画面。ブラウザの言語で日本語か英語を出す。スクリプトは使わない（ボタンは Google へのリンクだけ）
import { safeNext } from "../_lib/session.js";

const TEXT = {
  ja: { title: "DesignDex にログイン", lead: "UI・動き・配色・書体の名前と、AI にそのまま渡せる指示文を引く辞典です。Google アカウントでログインして使います。", button: "Google でログイン",
    note: "ログインに使うのは名前・メールアドレス・アカウントの ID だけです。お気に入りや取り込んだ項目はこの端末の中だけに保存されます。", privacy: "プライバシーポリシー" },
  en: { title: "Sign in to DesignDex", lead: "A dictionary of names and ready-to-paste prompts for UI, motion, color and type. Sign in with your Google account to use it.", button: "Sign in with Google",
    note: "Only your name, email address and account ID are used to sign in. Favorites and imported items stay on this device.", privacy: "Privacy Policy" },
};
const GOOGLE_G = '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z"/><path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.6 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.1 1.4-4.9 2.3-8.2 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>';

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const lang = /^ja\b/i.test(request.headers.get("Accept-Language") || "") ? "ja" : "en";
  const t = TEXT[lang];
  const next = encodeURIComponent(safeNext(url.searchParams.get("next")));
  const html = `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t.title}</title><link rel="icon" href="/icon.svg" type="image/svg+xml">
<style>
:root{--bg:#f5f5f7;--card:#fff;--text:#1d1d1f;--text2:#6e6e73;--border:rgba(0,0,0,.08);color-scheme:light dark}
@media (prefers-color-scheme:dark){:root{--bg:#1c1c1e;--card:#2c2c2e;--text:#f5f5f7;--text2:#a1a1a6;--border:rgba(255,255,255,.1)}}
*{box-sizing:border-box}body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:24px;background:var(--bg);color:var(--text);font:15px/1.7 -apple-system,BlinkMacSystemFont,"Hiragino Sans","Noto Sans JP",sans-serif}
main{width:min(420px,100%);background:var(--card);border-radius:22px;padding:34px 30px 28px;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,.18),inset 0 0 0 1px var(--border);animation:in .5s cubic-bezier(.22,1,.36,1)}
img{filter:drop-shadow(0 12px 24px rgba(0,0,0,.25))}h1{font-size:22px;letter-spacing:-.01em;margin:16px 0 8px}p{margin:0;color:var(--text2)}
a.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;margin-top:22px;width:100%;min-height:48px;border-radius:12px;border:1px solid var(--border);background:var(--card);color:var(--text);font-weight:600;text-decoration:none;box-shadow:0 2px 8px rgba(0,0,0,.08);transition:transform .12s cubic-bezier(.22,1,.36,1)}
a.btn:active{transform:scale(.97)}a.btn:focus-visible{outline:2px solid #d92b4b;outline-offset:2px}small{display:block;margin-top:16px;font-size:12px;color:var(--text2);line-height:1.6}
@keyframes in{from{opacity:0;transform:translateY(12px) scale(.98)}}@media (prefers-reduced-motion:reduce){main{animation:none}}
</style></head>
<body><main>
<img src="/icon.svg" alt="" width="72" height="72">
<h1>${t.title}</h1><p>${t.lead}</p>
<a class="btn" href="/auth/google?next=${next}">${GOOGLE_G}<span>${t.button}</span></a>
<small>${t.note} <a href="/privacy" style="color:inherit">${t.privacy}</a></small>
</main></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Frame-Options": "DENY", "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'none'" } });
}
