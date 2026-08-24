import {
  LOCAL_WHISPER_PROVIDER_ID,
  LocalWhisperNotReadyError,
} from "../../local-whisper.js";
import type {
  TranscribeOptions,
  TranscribeResult,
  TranscriptionProvider,
} from "../types.js";

/**
 * On-device whisper.cpp provider (combined Phase 1+2 default).
 *
 * Binary ensure + model download + whisper-server inference are still being
 * restored from pre-v23 upstream. Registry + settings treat this as default;
 * `transcribe` fails closed with a clear code until the runtime lands.
 */
export class WhisperLocalTranscriptionProvider
  implements TranscriptionProvider
{
  readonly providerId = LOCAL_WHISPER_PROVIDER_ID;

  async transcribe(_opts: TranscribeOptions): Promise<TranscribeResult> {
    throw new LocalWhisperNotReadyError();
  }

  supportsStreaming(modelId: string): boolean {
    void modelId;
    return false;
  }
}
