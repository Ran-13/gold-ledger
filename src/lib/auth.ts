/** Default login credentials (password stored only as SHA-256 hex). */
export const DEFAULT_AUTH_USERNAME = 'admin';

/** SHA-256 hex of the string `password`. */
export const DEFAULT_AUTH_PASSWORD_HASH =
  '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8';

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
