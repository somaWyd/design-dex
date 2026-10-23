// Google から戻ってきたところ。state を照合し、認可コードをサーバー側で ID トークンに交換して、ログイン Cookie を発行する。
// ID トークンは Google のトークン窓口から HTTPS で直接受け取るので署名検証は省略できる（Google の OpenID Connect の説明どおり）。
// そのうえで iss・aud・exp・nonce・email_verified を確かめる
import { assertConfig, cookie, decodeJwtPayload, OAUTH_COOKIE, readCookie, seal, SESSION_COOKIE, SESSION_MAX_AGE, TYP_OAUTH, TYP_SESSION, unseal } from "../_lib/session.js";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

function fail(message, status = 400) {
  return new Response(`DesignDex: sign-in failed (${message}). Please try again from /auth/login.`, {
    status, headers: { "Content-Type": "text/plain; charset=utf-8", "Set-Cookie": cookie(OAUTH_COOKIE, "", 0) } });
}

export async function onRequestGet({ request, env }) {
  assertConfig(env);
  const url = new URL(request.url);
  if (url.searchParams.get("error")) return fail("cancelled");
  const pending = await unseal(readCookie(request, OAUTH_COOKIE), env.SESSION_SECRET, TYP_OAUTH);
  const code = url.searchParams.get("code");
  if (!pending || !code || url.searchParams.get("state") !== pending.state) return fail("state mismatch");

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${url.origin}/auth/callback`, grant_type: "authorization_code" }),
  });
  if (!res.ok) return fail("token exchange", 502);
  const { id_token: idToken } = await res.json();
  let claims;
  try { claims = decodeJwtPayload(idToken); } catch { return fail("bad id token", 502); }
  const now = Math.floor(Date.now() / 1000);
  if (!ISSUERS.includes(claims.iss) || claims.aud !== env.GOOGLE_CLIENT_ID || !(claims.exp > now)) return fail("invalid id token", 502);
  if (claims.nonce !== pending.nonce) return fail("nonce mismatch");
  if (claims.email_verified !== true) return fail("email not verified", 403);
  if (typeof claims.sub !== "string" || !claims.sub || typeof claims.email !== "string" || !claims.email) return fail("missing identity", 502);

  const session = await seal({ sub: claims.sub, email: claims.email, name: claims.name || "", exp: now + SESSION_MAX_AGE }, env.SESSION_SECRET, TYP_SESSION);
  const headers = new Headers({ Location: `${url.origin}${pending.next}` });
  headers.append("Set-Cookie", cookie(SESSION_COOKIE, session, SESSION_MAX_AGE));
  headers.append("Set-Cookie", cookie(OAUTH_COOKIE, "", 0));
  return new Response(null, { status: 302, headers });
}
