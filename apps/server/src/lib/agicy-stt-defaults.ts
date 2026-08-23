import {
  AGICY_HOSTED_PROVIDER_ID,
  AGICY_HOSTED_TRANSCRIBE_MODEL_ID,
} from "./agicy-platform.js";
import { getDb } from "./db.js";

export function applyAgicySttDefaults(): void {
  const db = getDb();
  db.prepare("UPDATE model_configs SET is_default = 0 WHERE type = ?").run(
    "voice",
  );
  db.prepare(
    `INSERT INTO model_configs (provider, model_id, model_name, type, is_default)
     VALUES (?, ?, ?, ?, 1)
     ON CONFLICT(provider, model_id, type) DO UPDATE SET is_default = 1`,
  ).run(
    AGICY_HOSTED_PROVIDER_ID,
    AGICY_HOSTED_TRANSCRIBE_MODEL_ID,
    "AGICY Hosted STT",
    "voice",
  );

  db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES ('llm_cleanup', 'false', datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = 'false', updated_at = datetime('now')`,
  ).run();
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
