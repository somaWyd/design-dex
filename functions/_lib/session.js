// ログイン状態を署名付き Cookie で持つ（データベースを使わない）。署名は HMAC-SHA256（Web Crypto）。
// Cookie の中身は {sub, email, name, exp}。改ざんされたもの・期限切れのものは読めない。
export const SESSION_COOKIE = "dd_session";
export const OAUTH_COOKIE = "dd_oauth";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;  // 30日
export const OAUTH_MAX_AGE = 60 * 10;               // ログインの往復は10分以内
const MIN_SECRET_LENGTH = 32;

const enc = new TextEncoder();
const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

export function assertConfig(env) {
  const missing = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "SESSION_SECRET"].filter((k) => !env?.[k]);
  if (missing.length) throw new Error(`not configured: ${missing.join(", ")}`);
  if (env.SESSION_SECRET.length < MIN_SECRET_LENGTH) throw new Error("SESSION_SECRET is too short");
}

// Cookie の種類ごとに別の鍵で署名する（ログイン途中の一時 Cookie を、ログイン済みの Cookie として使い回させないため）
export const TYP_SESSION = "session";
export const TYP_OAUTH = "oauth";
async function hmacKey(secret, typ) {
  return crypto.subtle.importKey("raw", enc.encode(`${secret}:${typ}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

// 値に署名を付けた文字列 "<payload>.<signature>" を作る。中身にも種類（typ）を入れる
export async function seal(payload, secret, typ) {
  if (!typ) throw new Error("seal: typ is required");
  const body = b64url(enc.encode(JSON.stringify({ ...payload, typ })));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret, typ), enc.encode(body));
  return `${body}.${b64url(sig)}`;
}

// 署名・種類・期限を確かめて中身を返す。だめなら null
export async function unseal(token, secret, typ, now = Date.now()) {
  if (!typ || typeof token !== "string" || token.split(".").length !== 2) return null;
  const [body, sig] = token.split(".");
  try {
    const ok = await crypto.subtle.verify("HMAC", await hmacKey(secret, typ), fromB64url(sig), enc.encode(body));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body)));
    if (payload.typ !== typ) return null;
    return typeof payload.exp === "number" && payload.exp * 1000 > now ? payload : null;
  } catch {
    return null;
  }
}

export function readCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

export function cookie(name, value, maxAge) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

// ログイン済みの Cookie だけを受け付ける（種類が session で、sub と email を持つもの）
export async function readSession(request, env) {
  const s = await unseal(readCookie(request, SESSION_COOKIE), env.SESSION_SECRET, TYP_SESSION);
  return s && typeof s.sub === "string" && s.sub && typeof s.email === "string" && s.email ? s : null;
}

// ログイン後に戻す先は、同じサイトの中のパスだけ（外部サイトへの誘導を防ぐ）
export function safeNext(value) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : "/";
}

export function randomToken(bytes = 32) {
  return b64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export function decodeJwtPayload(jwt) {
  const part = String(jwt).split(".")[1];
  return JSON.parse(new TextDecoder().decode(fromB64url(part)));
}
