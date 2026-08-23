import { AGICY_HOSTED_PROVIDER_ID } from "./agicy-platform.js";
import { getAgicySessionToken } from "./agicy-session.js";
import { FREESTYLE_CLOUD_PROVIDER_ID } from "./freestyle-cloud.js";
import { getSessionToken } from "./sessions.js";
import { getProvider, supportsSessionTransport } from "./streaming/registry.js";
import type {
  StreamCallbacks,
  StreamCleanupPreferences,
  StreamSession,
} from "./streaming/types.js";
import type { AsrVocabularyBias } from "./vocabulary-bias.js";

export {
  supportsSessionTransport,
  supportsStreaming,
} from "./streaming/registry.js";
export type { StreamCallbacks, StreamSession } from "./streaming/types.js";

export type VoiceProviderCategory = "agicy_hosted" | "freestyle_cloud";

export function voiceProviderCategory(
  providerId: string,
): VoiceProviderCategory {
  if (providerId === AGICY_HOSTED_PROVIDER_ID) return "agicy_hosted";
  return "freestyle_cloud";
}

export function openStreamingSession(opts: {
  providerId: string;
  apiKey: string;
  model: string;
  languages?: string[];
  translate?: boolean;
  bias?: AsrVocabularyBias | null;
  appContext?: string | null;
  cleanup?: StreamCleanupPreferences;
  callbacks: StreamCallbacks;
}): StreamSession {
  const {
    providerId,
    apiKey,
    model,
    languages,
    translate,
    bias,
    appContext,
    cleanup,
    callbacks,
  } = opts;

  const provider = getProvider(providerId);
  if (!provider) {
    throw new Error(`No transcription provider for: ${providerId}`);
  }
  if (!provider.openStreamingSession) {
    throw new Error(`Provider ${providerId} does not support streaming`);
  }
  if (!supportsSessionTransport(providerId, model)) {
    throw new Error(
      `Model ${model} on provider ${providerId} does not support session audio transport`,
    );
  }

  return provider.openStreamingSession({
    apiKey,
    model,
    languages,
    translate,
    bias,
    appContext,
    cleanup,
    callbacks,
  });
}

export function getApiKeyForProvider(providerId: string): string | null {
  if (providerId === AGICY_HOSTED_PROVIDER_ID) {
    return getAgicySessionToken();
  }
  if (providerId === FREESTYLE_CLOUD_PROVIDER_ID) {
    return getSessionToken();
  }
  return null;
}
