// すべてのリクエスト（静的ファイルを含む）の前で、Google でログイン済みかを確かめる。
// 未ログインなら、ページはログイン画面へ、それ以外（データ・JS など）は 401 を返す。設定が足りないときは開かない（fail closed）
import { assertConfig, readSession, safeNext } from "./_lib/session.js";

// ログイン画面とその表示に要るものだけは通す。/auth/ 以下を丸ごと通すと、存在しないパスで本体の index.html が返ってしまうため1つずつ書く。
// 受け付けるメソッドも窓口ごとに決め、それ以外は 405（想定外のメソッドで静的ファイルへ流れないように）
const PUBLIC_PATHS = new Map([
  ["/auth/login", ["GET"]], ["/auth/google", ["GET"]], ["/auth/callback", ["GET"]], ["/auth/me", ["GET"]],
  ["/auth/logout", ["POST"]], ["/icon.svg", ["GET", "HEAD"]],
]);

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const allowed = PUBLIC_PATHS.get(url.pathname);
  if (allowed) {
    return allowed.includes(request.method) ? next() : new Response("Method Not Allowed", { status: 405, headers: { Allow: allowed.join(", ") } });
  }
  try { assertConfig(env); } catch {
    return new Response("DesignDex: sign-in is not configured on this server.", { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  if (await readSession(request, env)) {
    const res = await next();
    const out = new Response(res.body, res);
    out.headers.set("Cache-Control", "private, no-store");  // ログインした人の画面を共有キャッシュに残さない
    return out;
  }
  const wantsPage = request.method === "GET" && (request.headers.get("Accept") || "").includes("text/html");
  if (!wantsPage) return new Response("Unauthorized", { status: 401 });
  const back = safeNext(url.pathname + url.search);
  return Response.redirect(`${url.origin}/auth/login?next=${encodeURIComponent(back)}`, 302);
}
