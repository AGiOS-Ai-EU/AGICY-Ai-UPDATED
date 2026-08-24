export interface AvailableModel {
  provider_id: string;
  provider_name: string;
  model_id: string;
  model_name: string;
  family?: string;
  type: "voice" | "llm";
}

export const LOCAL_WHISPER_PROVIDER_ID = "local-whisper";
export const LOCAL_WHISPER_MODEL_ID = "local-whisper/base-q5_1";
export const DEEPGRAM_PROVIDER_ID = "deepgram";
export const DEEPGRAM_MODEL_ID = "deepgram/nova-3";
export const FREESTYLE_CLOUD_PROVIDER_ID = "freestyle-cloud";
export const FREESTYLE_CLOUD_MODEL_ID = "freestyle-cloud/stt";
export const AGICY_HOSTED_PROVIDER_ID = "agicy-hosted";

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  "local-whisper": "Local (on-device)",
  deepgram: "Deepgram EU (BYOK)",
  "agicy-hosted": "AGICY Hosted (deferred)",
  "freestyle-cloud": "Freestyle Transcribe (legacy)",
};

export function displayProviderName(
  providerId: string,
  fallback?: string,
): string {
  return PROVIDER_DISPLAY_NAMES[providerId] ?? fallback ?? providerId;
}

/** Voice STT choices shown in Settings → Dictation (combined Phase 1+2). */
export const VOICE_STT_OPTIONS = [
  {
    providerId: LOCAL_WHISPER_PROVIDER_ID,
    modelId: LOCAL_WHISPER_MODEL_ID,
    label: "Local (on-device)",
    detail: "Default — zero keys; audio stays on device",
  },
  {
    providerId: DEEPGRAM_PROVIDER_ID,
    modelId: DEEPGRAM_MODEL_ID,
    label: "Deepgram EU (BYOK)",
    detail: "Opt-in — paste your Deepgram API key",
  },
] as const;
