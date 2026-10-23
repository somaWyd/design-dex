// Google のログイン画面へ送る。偽のログイン完了（CSRF）と使い回しを防ぐため state と nonce を作り、署名付き Cookie に入れておく
import { assertConfig, cookie, OAUTH_COOKIE, OAUTH_MAX_AGE, randomToken, safeNext, seal, TYP_OAUTH } from "../_lib/session.js";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";

export async function onRequestGet({ request, env }) {
  assertConfig(env);
  const url = new URL(request.url);
  const state = randomToken(), nonce = randomToken();
  const exp = Math.floor(Date.now() / 1000) + OAUTH_MAX_AGE;
  const sealed = await seal({ state, nonce, next: safeNext(url.searchParams.get("next")), exp }, env.SESSION_SECRET, TYP_OAUTH);
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID, response_type: "code", scope: "openid email profile",
    redirect_uri: `${url.origin}/auth/callback`, state, nonce, prompt: "select_account",
  });
  return new Response(null, { status: 302, headers: { Location: `${AUTH_ENDPOINT}?${params}`, "Set-Cookie": cookie(OAUTH_COOKIE, sealed, OAUTH_MAX_AGE) } });
}
