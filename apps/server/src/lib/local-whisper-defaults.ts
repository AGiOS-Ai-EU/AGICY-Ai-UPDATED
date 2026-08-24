import { getDb, writeSetting } from "./db.js";
import {
  LOCAL_WHISPER_DEFAULT_MODEL_ID,
  LOCAL_WHISPER_DEFAULT_MODEL_NAME,
  LOCAL_WHISPER_PROVIDER_ID,
} from "./local-whisper.js";

/**
 * Seed local whisper as the default voice provider without clearing
 * Freestyle / AGICY sessions (no silent logout).
 */
export function applyLocalWhisperDefaults(): void {
  const db = getDb();
  db.prepare("UPDATE model_configs SET is_default = 0 WHERE type = ?").run(
    "voice",
  );
  db.prepare(
    `INSERT INTO model_configs (provider, model_id, model_name, type, is_default)
     VALUES (?, ?, ?, 'voice', 1)
     ON CONFLICT(provider, model_id, type) DO UPDATE SET
       is_default = 1,
       model_name = excluded.model_name`,
  ).run(
    LOCAL_WHISPER_PROVIDER_ID,
    LOCAL_WHISPER_DEFAULT_MODEL_ID,
    LOCAL_WHISPER_DEFAULT_MODEL_NAME,
  );

  // Decision 2: cleanup on for dictation; search routing forces off.
  const existing = db
    .prepare("SELECT value FROM settings WHERE key = 'llm_cleanup' LIMIT 1")
    .get() as { value: string } | undefined;
  if (existing == null) {
    writeSetting("llm_cleanup", "true");
  }
}
