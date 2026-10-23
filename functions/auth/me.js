// ログイン中の人（設定画面の「ログアウト」に名前を出すため）。未ログインなら 401
import { assertConfig, readSession } from "../_lib/session.js";

export async function onRequestGet({ request, env }) {
  assertConfig(env);
  const s = await readSession(request, env);
  if (!s) return new Response("Unauthorized", { status: 401 });
  return Response.json({ email: s.email, name: s.name }, { headers: { "Cache-Control": "private, no-store" } });
}
