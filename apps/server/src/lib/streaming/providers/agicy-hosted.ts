import {
  AGICY_HOSTED_PROVIDER_ID,
  AGICY_HOSTED_TRANSCRIBE_MODEL_ID,
  AgicyAuthError,
  transcribeWithAgicyHosted,
} from "../../agicy-platform.js";
import type {
  TranscribeOptions,
  TranscribeResult,
  TranscriptionProvider,
} from "../types.js";

export { AgicyAuthError as CloudAuthError };

/**
 * Hosted STT via agicy.ai (Deepgram EU + inference credits).
 * Phase 1 uses REST batch transcription on commit — no live streaming socket.
 */
export class AgicyHostedTranscriptionProvider implements TranscriptionProvider {
  readonly providerId = AGICY_HOSTED_PROVIDER_ID;

  async transcribe(opts: TranscribeOptions): Promise<TranscribeResult> {
    if (!opts.apiKey) throw new AgicyAuthError();

    const data = await transcribeWithAgicyHosted({
      token: opts.apiKey,
      audio: opts.audio,
      ...(opts.language ? { language: opts.language } : {}),
      filename: "audio.wav",
      mimetype: "audio/wav",
    });

    return {
      text: data.text,
      ...(data.durationSeconds != null
        ? { durationInSeconds: data.durationSeconds }
        : {}),
    };
  }

  supportsStreaming(modelId: string): boolean {
    return modelId === AGICY_HOSTED_TRANSCRIBE_MODEL_ID ? false : false;
  }
}
