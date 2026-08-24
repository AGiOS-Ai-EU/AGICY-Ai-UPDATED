/** Deepgram EU BYOK — opt-in cloud STT upgrade (never first-use gate). */
export const DEEPGRAM_PROVIDER_ID = "deepgram";

/** Sensible default model; user can change once catalog UI lands. */
export const DEEPGRAM_DEFAULT_MODEL_ID = "deepgram/nova-3";

export const DEEPGRAM_DEFAULT_MODEL_NAME = "Deepgram EU (BYOK)";

/** EU endpoint — do not use api.deepgram.com for UPDATED BYOK. */
export const DEEPGRAM_EU_LISTEN_URL = "https://api.eu.deepgram.com/v1/listen";

let deepgramByokKey: string | null =
  process.env.UPDATED_DEEPGRAM_API_KEY?.trim() || null;

/** Called from Electron main after safeStorage load/set/clear. */
export function setDeepgramByokKey(key: string | null): void {
  deepgramByokKey = key?.trim() || null;
}

export function getDeepgramByokKey(): string | null {
  return deepgramByokKey;
}
