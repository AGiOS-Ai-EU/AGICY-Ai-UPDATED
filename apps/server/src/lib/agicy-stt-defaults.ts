import {
  AGICY_HOSTED_PROVIDER_ID,
  AGICY_HOSTED_TRANSCRIBE_MODEL_ID,
} from "./agicy-platform.js";
import { getDb } from "./db.js";

/**
 * Ensure AGICY hosted STT is registered as an available (non-default) option.
 * Does **not** steal the voice default from local whisper (Decision 1).
 * Does **not** clear sessions (no silent logout).
 */
export function applyAgicySttDefaults(): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO model_configs (provider, model_id, model_name, type, is_default)
     VALUES (?, ?, ?, 'voice', 0)
     ON CONFLICT(provider, model_id, type) DO UPDATE SET
       model_name = excluded.model_name`,
  ).run(
    AGICY_HOSTED_PROVIDER_ID,
    AGICY_HOSTED_TRANSCRIBE_MODEL_ID,
    "AGICY Hosted STT (deferred gateway)",
  );
}

export function revertAgicySttDefaults(): void {
  const db = getDb();
  const voice = db
    .prepare(
      "SELECT provider FROM model_configs WHERE type = 'voice' AND is_default = 1 LIMIT 1",
    )
    .get() as { provider: string } | undefined;
  if (voice?.provider === AGICY_HOSTED_PROVIDER_ID) {
    db.prepare(
      "UPDATE model_configs SET is_default = 0 WHERE type = 'voice'",
    ).run();
  }
}
