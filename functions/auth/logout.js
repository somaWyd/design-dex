// ログアウト。Cookie を消してログイン画面へ戻す（他サイトから勝手にログアウトさせられないよう POST だけ受ける）
import { cookie, SESSION_COOKIE } from "../_lib/session.js";

export async function onRequestPost({ request }) {
  const url = new URL(request.url);
  return new Response(null, { status: 303, headers: { Location: `${url.origin}/auth/login`, "Set-Cookie": cookie(SESSION_COOKIE, "", 0) } });
}
