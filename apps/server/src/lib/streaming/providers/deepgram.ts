import { Buffer } from "node:buffer";
import {
  DEEPGRAM_EU_LISTEN_URL,
  DEEPGRAM_PROVIDER_ID,
} from "../../deepgram-byok.js";
import type { AsrVocabularyBias } from "../../vocabulary-bias.js";
import type {
  TranscribeOptions,
  TranscribeResult,
  TranscriptionProvider,
} from "../types.js";
import { CLOUD_TRANSCRIBE_TIMEOUT_MS, stripProviderPrefix } from "../types.js";

/**
 * Deepgram EU BYOK — opt-in cloud STT. Uses api.eu.deepgram.com only.
 * Streaming socket restore can follow; batch listen is enough for hotkey commit.
 */
export class DeepgramTranscriptionProvider implements TranscriptionProvider {
  readonly providerId = DEEPGRAM_PROVIDER_ID;

  async transcribe(opts: TranscribeOptions): Promise<TranscribeResult> {
    if (!opts.apiKey?.trim()) {
      throw new Error(
        "Deepgram EU API key required. Add it in Settings → Dictation, or switch to Local (on-device).",
      );
    }
    return transcribeDeepgramEu(opts);
  }

  supportsStreaming(modelId: string): boolean {
    void modelId;
    return false;
  }
}

async function transcribeDeepgramEu(
  opts: TranscribeOptions,
): Promise<TranscribeResult> {
  const short = stripProviderPrefix(opts.model);
  const params = new URLSearchParams({
    model: short,
    punctuate: "true",
    smart_format: "true",
  });
  params.set("language", opts.language ?? "multi");

  appendDeepgramBias(params, opts.bias);

  const res = await fetch(`${DEEPGRAM_EU_LISTEN_URL}?${params}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${opts.apiKey}`,
      "Content-Type": "audio/wav",
    },
    body: Buffer.from(opts.audio),
    signal: AbortSignal.timeout(CLOUD_TRANSCRIBE_TIMEOUT_MS),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      detail || `Deepgram EU transcription failed (${res.status})`,
    );
  }

  const data = (await res.json()) as {
    results?: {
      channels?: Array<{
        alternatives?: Array<{ transcript?: string }>;
      }>;
    };
    metadata?: { duration?: number };
  };

  const text =
    data.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ?? "";

  return {
    text,
    durationInSeconds: data.metadata?.duration,
  };
}

function appendDeepgramBias(
  params: URLSearchParams,
  bias: AsrVocabularyBias | null | undefined,
): void {
  if (!bias) return;
  if (bias.kind === "deepgram-keyterms") {
    for (const term of bias.terms) params.append("keyterm", term);
  } else if (bias.kind === "deepgram-keywords") {
    for (const word of bias.terms) params.append("keywords", `${word}:1.5`);
  }
}
