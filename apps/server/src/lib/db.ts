import { copyFileSync, existsSync, renameSync, unlinkSync } from "node:fs";
import { DatabaseSync, type StatementSync } from "node:sqlite";
import { createAppLogger } from "@freestyle-voice/utils";
import { initSchema } from "./schema.js";

const log = createAppLogger("db");

let db: DatabaseSync | null = null;

// Cache prepared statements keyed by their SQL text. `node:sqlite` recompiles
// SQL on every `.prepare()` call, and the transcription hot path issues dozens
// of tiny point-queries per dictation (settings reads, default-model lookups,
// history writes). Reusing a compiled statement removes that repeated parse.
// The cache is scoped to the single long-lived connection and cleared when the
// connection is closed.
const statementCache = new Map<string, StatementSync>();

function tryClose(instance: DatabaseSync | null): void {
  if (!instance) return;
  try {
    instance.close();
  } catch {
    // Best-effort — recovery may already have invalidated the handle.
  }
}

function tryUnlink(path: string): void {
  try {
    if (existsSync(path)) unlinkSync(path);
  } catch {
    // Locked or missing — continue with the next recovery step.
  }
}

/** Drop stale WAL/SHM sidecars left by a killed upgrade/install process. */
function clearWalSidecars(dbPath: string): void {
  tryUnlink(`${dbPath}-wal`);
  tryUnlink(`${dbPath}-shm`);
}

/**
 * Move a broken DB (and sidecars) aside so a fresh file can be created.
 * Keeps a single `.corrupt` backup for forensics; overwrites any prior backup.
 */
function quarantineDbFiles(dbPath: string): void {
  const stamp = Date.now();
  for (const suffix of ["", "-wal", "-shm"] as const) {
    const src = `${dbPath}${suffix}`;
    if (!existsSync(src)) continue;
    const dest = `${dbPath}.corrupt-${stamp}${suffix}`;
    try {
      renameSync(src, dest);
    } catch {
      try {
        copyFileSync(src, dest);
        tryUnlink(src);
      } catch {
        tryUnlink(src);
      }
    }
  }
}

function openAndInit(dbPath: string): DatabaseSync {
  const instance = new DatabaseSync(dbPath);
  try {
    // Performance and safety pragmas
    instance.exec("PRAGMA journal_mode = WAL");
    instance.exec("PRAGMA busy_timeout = 5000");
    instance.exec("PRAGMA foreign_keys = ON");
    instance.exec("PRAGMA synchronous = NORMAL");

    initSchema(instance);
    return instance;
  } catch (err) {
    // Release the handle so quarantine can rename/delete the broken file.
    tryClose(instance);
    throw err;
  }
}

/**
 * Open the app DB, recovering from the disk I/O / stale-WAL failures that
 * otherwise leave the embedded HTTP server dead and Sign in as "Failed to fetch".
 */
function openDatabase(dbPath: string): DatabaseSync {
  try {
    return openAndInit(dbPath);
  } catch (firstErr) {
    const firstMsg =
      firstErr instanceof Error ? firstErr.message : String(firstErr);
    log.warn(
      `DB open failed (${firstMsg}); clearing WAL sidecars and retrying`,
    );
    clearWalSidecars(dbPath);
    try {
      return openAndInit(dbPath);
    } catch (secondErr) {
      const secondMsg =
        secondErr instanceof Error ? secondErr.message : String(secondErr);
      log.warn(
        `DB open still failing (${secondMsg}); quarantining and recreating`,
      );
      quarantineDbFiles(dbPath);
      return openAndInit(dbPath);
    }
  }
}

export function getDb(): DatabaseSync {
  if (db) return db;

  const dbPath = process.env.FREESTYLE_DB_PATH;
  if (!dbPath) {
    throw new Error(
      "FREESTYLE_DB_PATH environment variable is required. Set it to the desired SQLite database file path.",
    );
  }

  const instance = openDatabase(dbPath);

  // Cache only after schema init succeeds — if openDatabase() throws, the next
  // getDb() call will retry from scratch instead of returning a broken handle.
  db = instance;

  return db;
}

/**
 * Prepare (or reuse a cached) statement for the given SQL against the shared
 * connection. Prefer this over `getDb().prepare(...)` on hot paths so the SQL
 * is compiled once per process rather than on every call.
 */
export function prepareCached(sql: string): StatementSync {
  const cached = statementCache.get(sql);
  if (cached) return cached;
  const stmt = getDb().prepare(sql);
  statementCache.set(sql, stmt);
  return stmt;
}

export function closeDb(): void {
  if (db) {
    statementCache.clear();
    tryClose(db);
    db = null;
  }
}

/**
 * Read a single value from the key/value `settings` table. Returns `undefined`
 * when the key is unset or the database/table is not yet available.
 */
export function readSetting(key: string): string | undefined {
  try {
    const row = prepareCached("SELECT value FROM settings WHERE key = ?").get(
      key,
    ) as { value: string } | undefined;
    return row?.value;
  } catch {
    return undefined;
  }
}

/**
 * Read many settings values in a single query and return them as a `Map`.
 * Prefer this over N individual {@link readSetting} calls on hot paths (e.g.
 * resolving all cleanup tones for a dictation). Missing keys are simply absent
 * from the map. Returns an empty map if the DB is unavailable.
 */
export function readSettings(keys: readonly string[]): Map<string, string> {
  const result = new Map<string, string>();
  if (keys.length === 0) return result;
  try {
    const placeholders = keys.map(() => "?").join(", ");
    const rows = prepareCached(
      `SELECT key, value FROM settings WHERE key IN (${placeholders})`,
    ).all(...keys) as { key: string; value: string }[];
    for (const row of rows) result.set(row.key, row.value);
  } catch {
    // DB may not be available yet — return whatever we have (possibly empty).
  }
  return result;
}

/** Upsert a settings row. */
export function writeSetting(key: string, value: string): void {
  prepareCached(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
  ).run(key, value);
}

/** Delete a settings row by key. No-op if the key doesn't exist. */
export function deleteSetting(key: string): void {
  try {
    prepareCached("DELETE FROM settings WHERE key = ?").run(key);
  } catch {
    // DB may not be available yet — swallow.
  }
}
