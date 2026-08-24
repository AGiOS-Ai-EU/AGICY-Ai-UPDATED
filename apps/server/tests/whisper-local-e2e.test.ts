/**
 * Opt-in end-to-end smoke for the zero-key local dictation path
 * (STT-MIGRATION-PLAN §11 acceptance items 1, 2, 3, 5, 10).
 *
 * Skipped unless `WHISPER_E2E=1`: it downloads the real ~57 MB model from
 * Hugging Face, spawns whisper-server, and takes several minutes.
 *
 *   WHISPER_E2E=1 pnpm --filter @freestyle-voice/server test whisper-local-e2e
 *
 * Requires the whisper binaries to be present (Settings → Dictation installs
 * them, or `ensureBinariesDownloaded()`).
 */
import { Buffer } from "node:buffer";
import { existsSync, readFileSync, rmSync, statSync } from "node:fs";
import { beforeAll, describe, expect, it, vi } from "vitest";

const ENABLED = process.env.WHISPER_E2E === "1";

const { getModelsDir, getModelPath, getWhisperModel } = await import(
  "../src/lib/whisper/constants.js"
);
const {
  assertModelIntegrityForLoad,
  cancelDownload,
  downloadModel,
  getModelStatus,
} = await import("../src/lib/whisper/models.js");
const { WhisperLocalTranscriptionProvider } = await import(
  "../src/lib/streaming/providers/whisper-local.js"
);
const { stopServer } = await import("../src/lib/whisper/server.js");

const MODEL_ID = "base-q5_1";
const JFK_URL =
  "https://raw.githubusercontent.com/ggerganov/whisper.cpp/master/samples/jfk.wav";
/** Cold hotkey→text above this needs an explicit warming state in the UI (§8 Decision 2b). */
const WARMING_STATE_THRESHOLD_MS = 10_000;

const realFetch = globalThis.fetch;

function report(message: string): void {
  process.stdout.write(`SMOKE | ${message}\n`);
}

describe.skipIf(!ENABLED)("local whisper dictation (E2E)", () => {
  const model = getWhisperModel(MODEL_ID)!;
  const modelPath = getModelPath(model);
  const tempPath = `${modelPath}.downloading`;
  const sidecarPath = `${modelPath}.sha256`;
  let jfk: Buffer;

  const audio = () =>
    ({
      audio: new Uint8Array(jfk),
      model: MODEL_ID,
      language: "en",
    }) as never;

  beforeAll(async () => {
    // tests/setup.ts installs non-advancing fake timers; this suite needs real
    // network, real child processes, and real polling intervals.
    vi.useRealTimers();
    for (const path of [modelPath, tempPath, sidecarPath]) {
      rmSync(path, { force: true });
    }
    jfk = Buffer.from(await (await realFetch(JFK_URL)).arrayBuffer());
  }, 120_000);

  it("shows progress, keeps the partial through a 60% interrupt, and resumes", async () => {
    report(`models dir ${getModelsDir()}`);

    const percents: number[] = [];
    let interruptedAt = 0;
    const interrupted = downloadModel(MODEL_ID);
    const poll = setInterval(() => {
      const status = getModelStatus(MODEL_ID);
      const progress = status?.downloadProgress;
      if (status?.status !== "downloading" || !progress) return;
      if (progress.bytesTotal <= 0) return;
      percents.push(progress.percent);
      if (progress.percent >= 60 && interruptedAt === 0) {
        interruptedAt = progress.bytesDownloaded;
        report(
          `interrupting at ${progress.percent}% (${progress.bytesDownloaded}/${progress.bytesTotal})`,
        );
        cancelDownload(MODEL_ID);
      }
    }, 100);

    await interrupted.catch(() => {});
    clearInterval(poll);

    expect(percents.some((p) => p > 0 && p < 100)).toBe(true);
    expect(interruptedAt).toBeGreaterThan(0);
    expect(existsSync(modelPath)).toBe(false);
    expect(existsSync(tempPath)).toBe(true);

    const partialSize = statSync(tempPath).size;
    report(`partial retained: ${partialSize} bytes`);

    await downloadModel(MODEL_ID);

    expect(existsSync(tempPath)).toBe(false);
    expect(statSync(modelPath).size).toBeGreaterThan(partialSize);
    expect(readFileSync(sidecarPath, "utf8").trim()).toMatch(/^[a-f0-9]{64}$/);
    expect(getModelStatus(MODEL_ID)?.status).toBe("ready");
    await expect(assertModelIntegrityForLoad(MODEL_ID)).resolves.toBe(
      modelPath,
    );
    report(`model ready: ${statSync(modelPath).size} bytes`);
  }, 900_000);

  it("transcribes on device with no non-loopback egress", async () => {
    const provider = new WhisperLocalTranscriptionProvider();

    const coldStart = Date.now();
    const cold = await provider.transcribe(audio());
    const coldMs = Date.now() - coldStart;
    report(`cold hotkey→text ${coldMs}ms: "${cold.text}"`);
    expect(cold.text.toLowerCase()).toContain("country");
    // Not a hard failure — the plan only requires a warming state past this point.
    if (coldMs >= WARMING_STATE_THRESHOLD_MS) {
      report(
        `cold start >= ${WARMING_STATE_THRESHOLD_MS}ms: UI must show a warming state`,
      );
    }

    const warmStart = Date.now();
    const warm = await provider.transcribe(audio());
    report(`warm hotkey→text ${Date.now() - warmStart}ms`);
    expect(warm.text.toLowerCase()).toContain("country");

    // Offline claim: fail every request that isn't the local whisper-server.
    let egressAttempt: string | null = null;
    vi.stubGlobal("fetch", async (input: unknown, init?: RequestInit) => {
      const url = String(input);
      if (!url.startsWith("http://127.0.0.1:")) {
        egressAttempt = url;
        throw new Error(`ENOTFOUND simulated offline: ${url}`);
      }
      return realFetch(input as RequestInfo, init);
    });

    try {
      const offline = await provider.transcribe(audio());
      report(`offline hotkey→text ok: "${offline.text.slice(0, 48)}…"`);
      expect(offline.text.toLowerCase()).toContain("country");
    } finally {
      vi.unstubAllGlobals();
    }
    expect(egressAttempt).toBeNull();

    await stopServer();
  }, 900_000);
});
