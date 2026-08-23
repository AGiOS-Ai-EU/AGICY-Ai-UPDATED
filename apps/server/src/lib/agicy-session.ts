import {
  agicyPlatformUrl,
  DEFAULT_AGICY_PLATFORM_URL,
} from "./agicy-platform.js";
import { getDb } from "./db.js";
import type { CloudUser, Session } from "./sessions.js";

interface SessionRow {
  token: string;
  refresh_token: string | null;
  expires_at: number | null;
  issued_at: number | null;
  user_id: string;
  email: string;
  name: string | null;
  image: string | null;
  host: string;
}

function rowToSession(row: SessionRow): Session {
  return {
    token: row.token,
    ...(row.refresh_token ? { refreshToken: row.refresh_token } : {}),
    ...(row.expires_at ? { expiresAt: row.expires_at } : {}),
    ...(row.issued_at ? { issuedAt: row.issued_at } : {}),
    user: {
      id: row.user_id,
      email: row.email,
      name: row.name,
      image: row.image,
    },
    host: row.host,
  };
}

export function getAgicySession(): Session | null {
  const row = getDb()
    .prepare(
      `SELECT token, refresh_token, expires_at, issued_at, user_id, email, name, image, host
       FROM sessions WHERE host = ?`,
    )
    .get(agicyPlatformUrl()) as SessionRow | undefined;
  if (!row) return null;
  if (row.expires_at && Date.now() > row.expires_at) {
    invalidateAgicySession();
    return null;
  }
  return rowToSession(row);
}

export function getAgicySessionToken(): string | null {
  return getAgicySession()?.token ?? null;
}

export function setAgicySession(input: {
  token: string;
  refreshToken?: string | null;
  expiresAt?: number | null;
  issuedAt?: number | null;
  user: CloudUser;
}): void {
  const host = agicyPlatformUrl();
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO sessions
        (host, token, refresh_token, expires_at, issued_at, user_id, email, name, image, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(host) DO UPDATE SET
        token = excluded.token,
        refresh_token = excluded.refresh_token,
        expires_at = excluded.expires_at,
        issued_at = excluded.issued_at,
        user_id = excluded.user_id,
        email = excluded.email,
        name = excluded.name,
        image = excluded.image,
        updated_at = excluded.updated_at`,
    )
    .run(
      host,
      input.token,
      input.refreshToken ?? null,
      input.expiresAt ?? null,
      input.issuedAt ?? null,
      input.user.id,
      input.user.email,
      input.user.name ?? null,
      input.user.image ?? null,
      now,
    );
}

export function invalidateAgicySession(): void {
  getDb()
    .prepare("DELETE FROM sessions WHERE host = ?")
    .run(agicyPlatformUrl());
}

export { DEFAULT_AGICY_PLATFORM_URL };
