/** Default login credentials (password stored only as SHA-256 hex). */
export const DEFAULT_AUTH_USERNAME = 'admin';

/** Default plaintext password (single capital letter). */
export const DEFAULT_AUTH_PASSWORD = 'A';

/** Previous default was the string `password` — migrate installs still on it. */
export const LEGACY_DEFAULT_AUTH_PASSWORD_HASH =
  '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8';

/** SHA-256 hex of `A`. */
export const DEFAULT_AUTH_PASSWORD_HASH =
  '559aead08264d5795d3909718cdd05abd49572e84fe55590eef31a88a08fdffd';

export const MIN_PASSWORD_LENGTH = 1;

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyLogin(
  username: string,
  password: string,
  stored: { auth_username: string; auth_password_hash: string },
): Promise<boolean> {
  const u = username.trim();
  if (!u || u !== stored.auth_username) return false;
  const hash = await hashPassword(password);
  return hash === stored.auth_password_hash;
}
