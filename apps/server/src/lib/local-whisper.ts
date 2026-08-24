/** Local whisper.cpp STT — zero-key default for combined Phase 1+2 release. */
export const LOCAL_WHISPER_PROVIDER_ID = "local-whisper";

/** Default model id until catalog UX lands (specs: base-q5_1 ~145 MB). */
export const LOCAL_WHISPER_DEFAULT_MODEL_ID = "local-whisper/base-q5_1";

export const LOCAL_WHISPER_DEFAULT_MODEL_NAME = "Local Whisper (on-device)";

/**
 * Thrown when local STT is selected but whisper.cpp binary/model runtime
 * has not been restored yet. Settings still offer the provider as default.
 */
export class LocalWhisperNotReadyError extends Error {
  readonly code = "local_whisper_not_ready";

  constructor(
    message = "On-device whisper.cpp is selected but the runtime is still being restored. Use Deepgram EU (BYOK) in Settings → Dictation for cloud STT until the next build, or keep Local selected for zero-key first dictation once models land.",
  ) {
    super(message);
    this.name = "LocalWhisperNotReadyError";
  }
}
