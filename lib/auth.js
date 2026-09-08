/**
 * Lightweight single-user password gate - no database, no third-party
 * auth service. A signed, expiring cookie proves you logged in with
 * DASHBOARD_PASSWORD; the signature uses SESSION_SECRET so it can't be
 * forged without knowing that secret.
 */

import crypto from "crypto";

const COOKIE_NAME = "nas100_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function sign(value) {
  const secret = process.env.SESSION_SECRET;
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

export function createSessionCookie() {
  const expiry = (Date.now() + SESSION_TTL_MS).toString();
  const signature = sign(expiry);
  const value = `${expiry}.${signature}`;
  return `${COOKIE_NAME}=${value}; HttpOnly; Path=/; Max-Age=${SESSION_TTL_MS / 1000}; SameSite=Lax; Secure`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0`;
}

export function isValidSession(cookieHeader) {
  if (!cookieHeader) return false;
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match) return false;
  const parts = match[1].split(".");
  if (parts.length !== 2) return false;
  const [expiry, signature] = parts;
  if (!expiry || !signature) return false;
  if (Date.now() > parseInt(expiry, 10)) return false;
  const expected = sign(expiry);
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}
