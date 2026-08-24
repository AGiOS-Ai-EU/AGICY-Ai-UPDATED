import { collapseAsrLineBreaks } from "@freestyle-voice/stt";
import { createAppLogger } from "@freestyle-voice/utils";
import { isServerBinaryAvailable } from "../../whisper/binary.js";
import { WHISPER_PROVIDER_ID } from "../../whisper/constants.js";
import {
  downloadModel,
  ensureBinariesDownloaded,
  getDownloadedModelPath,
  getModelStatus,
} from "../../whisper/models.js";
import {
  ensureServerRunning,
  getServerPort,
  withServerUse,
} from "../../whisper/server.js";
import type {
  TranscribeOptions,
  TranscribeResult,
  TranscriptionProvider,
} from "../types.js";
import { stripProviderPrefix } from "../types.js";

const log = createAppLogger("whisper");

/**
 * On-device whisper.cpp provider (combined Phase 1+2 default).
 * Ensures binaries + model, then POSTs WAV to local whisper-server `/inference`.
 */
export class WhisperLocalTranscriptionProvider
  implements TranscriptionProvider
{
  readonly providerId = WHISPER_PROVIDER_ID;

  supportsStreaming(_modelId: string): boolean {
    return false;
  }

  async transcribe(opts: TranscribeOptions): Promise<TranscribeResult> {
    const modelId = stripProviderPrefix(opts.model);

    if (!isServerBinaryAvailable()) {
      try {
        await ensureBinariesDownloaded();
      } catch (err) {
        throw new Error(
          `whisper-server binary not found and automatic setup failed: ${err instanceof Error ? err.message : String(err)}. Open Settings → Dictation to retry, or switch to Deepgram EU (BYOK).`,
        );
      }
    }

    if (!getDownloadedModelPath(modelId)) {
      const status = getModelStatus(modelId);
      if (!status) {
        throw new Error(`Unknown local whisper model: ${modelId}`);
      }
      if (status.status === "downloading") {
        throw new Error(
          `Local model "${modelId}" is still downloading (${status.downloadProgress?.percent ?? 0}%). Wait for the download to finish in Settings → Dictation, or switch to Deepgram EU (BYOK).`,
        );
      }
      try {
        await downloadModel(modelId);
      } catch (err) {
        throw new Error(
          `Failed to download local whisper model "${modelId}": ${err instanceof Error ? err.message : String(err)}. Retry in Settings → Dictation, or switch to Deepgram EU (BYOK).`,
        );
      }
    }

    return withServerUse(async () => {
      await ensureServerRunning(modelId);

      const t0 = Date.now();
      try {
        return await transcribeViaServer(opts);
      } catch (err) {
        log.warn(
          `inference failed, restarting server: ${err instanceof Error ? err.message : String(err)}`,
        );
        await ensureServerRunning(modelId);
        return await transcribeViaServer(opts);
      } finally {
        log.debug(`server inference took ${Date.now() - t0}ms`);
      }
    });
  }
}

async function transcribeViaServer(
  opts: TranscribeOptions,
): Promise<TranscribeResult> {
  const form = new FormData();
  const audio = opts.audio as Uint8Array<ArrayBuffer>;
  form.append("file", new Blob([audio], { type: "audio/wav" }), "a.wav");
  form.append("response_format", "json");
  form.append("no_timestamps", "true");
  // Greedy single pass: temperature_inc=0 disables the temperature-fallback
  // retry ladder (the server's --no-fallback flag is dead code in v1.8.5).
  form.append("temperature_inc", "0.0");
  form.append("language", opts.language ?? "auto");
  if (opts.bias?.kind === "prompt") {
    form.append("prompt", opts.bias.text);
  }

  const res = await fetch(`http://127.0.0.1:${getServerPort()}/inference`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `whisper-server inference failed: HTTP ${res.status} ${detail}`,
    );
  }

  const data = (await res.json()) as { text?: string };
  return { text: collapseAsrLineBreaks(data.text ?? "").trim() };
}
