import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const modelsDir = join(
  tmpdir(),
  `updated-whisper-download-${process.pid}-${Date.now()}`,
);

/**
 * A 2 MB stand-in for a real ggml model: big enough to clear the
 * proxy-page heuristic (which only fires under 64 KB) and to be streamed in
 * many chunks, small enough to hash repeatedly in a unit test.
 */
const MODEL = {
  id: "test-resume",
  fileName: "ggml-test-resume.bin",
  displayName: "Test Resume",
  sizeBytes: 2_000_000,
  ramRequired: "~1 GB",
  speed: "Fastest",
  quality: "Good",
  quantized: true,
};

vi.mock("../src/lib/whisper/constants.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../src/lib/whisper/constants.js")>();
  return {
    ...actual,
    WHISPER_MODELS: [MODEL],
    LEGACY_WHISPER_MODELS: [],
    getWhisperModel: (id: string) => (id === MODEL.id ? MODEL : undefined),
    getModelsDir: () => modelsDir,
    getModelPath: (model: { fileName: string }) =>
      join(modelsDir, model.fileName),
  };
});

vi.mock("../src/lib/whisper/binary.js", () => ({
  isServerBinaryAvailable: () => true,
}));

const {
  assertModelIntegrityForLoad,
  downloadModel,
  getModelStatus,
  WHISPER_CHECKSUM_FAILED,
  WhisperChecksumError,
} = await import("../src/lib/whisper/models.js");

const payload = Buffer.alloc(MODEL.sizeBytes);
for (let i = 0; i < payload.length; i++) payload[i] = i % 251;
const payloadSha = createHash("sha256").update(payload).digest("hex");

const modelPath = join(modelsDir, MODEL.fileName);
const tempPath = `${modelPath}.downloading`;
const sidecarPath = `${modelPath}.sha256`;

interface ServeOptions {
  /** Kill the response stream once this many total bytes exist on disk. */
  interruptAtByte?: number;
  /** Advertised checksum; defaults to the real one. */
  advertisedSha?: string;
  chunkBytes?: number;
  delayMs?: number;
}

interface ServeLog {
  ranges: (string | undefined)[];
}

function serveModel(options: ServeOptions = {}): ServeLog {
  const {
    interruptAtByte,
    advertisedSha = payloadSha,
    chunkBytes = 32 * 1024,
    delayMs = 0,
  } = options;
  const seen: ServeLog = { ranges: [] };

  vi.stubGlobal("fetch", async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    const signal = init?.signal ?? undefined;

    if (url.includes("/api/models/")) {
      return new Response(
        JSON.stringify([{ path: MODEL.fileName, lfs: { oid: advertisedSha } }]),
        { headers: { "content-type": "application/json" } },
      );
    }

    const range = (init?.headers as Record<string, string> | undefined)?.Range;
    seen.ranges.push(range);
    const start = range ? Number(/bytes=(\d+)-/.exec(range)?.[1] ?? 0) : 0;
    const slice = payload.subarray(start);

    const headers = new Headers({
      "content-type": "application/octet-stream",
      "content-length": String(slice.length),
    });
    if (range) {
      headers.set(
        "content-range",
        `bytes ${start}-${payload.length - 1}/${payload.length}`,
      );
    }

    let sent = 0;
    const body = new ReadableStream<Uint8Array>({
      async pull(controller) {
        if (signal?.aborted) {
          controller.error(new DOMException("Aborted", "AbortError"));
          return;
        }
        if (interruptAtByte !== undefined && start + sent >= interruptAtByte) {
          controller.error(new Error("ECONNRESET simulated network interrupt"));
          return;
        }
        if (sent >= slice.length) {
          controller.close();
          return;
        }
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
        const end = Math.min(sent + chunkBytes, slice.length);
        controller.enqueue(new Uint8Array(slice.subarray(sent, end)));
        sent = end;
      },
    });

    return new Response(body, { status: range ? 206 : 200, headers });
  });

  return seen;
}

describe("whisper model download", () => {
  beforeEach(() => {
    // tests/setup.ts installs non-advancing fake timers; this suite throttles
    // the response stream with real setTimeout and polls progress on an interval.
    vi.useRealTimers();
    rmSync(modelsDir, { recursive: true, force: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    rmSync(modelsDir, { recursive: true, force: true });
  });

  it("reports monotonic progress while a throttled download runs", async () => {
    serveModel({ chunkBytes: 32 * 1024, delayMs: 6 });

    const samples: number[] = [];
    const poll = setInterval(() => {
      const status = getModelStatus(MODEL.id);
      if (status?.status === "downloading" && status.downloadProgress) {
        samples.push(status.downloadProgress.bytesDownloaded);
      }
    }, 15);

    try {
      await downloadModel(MODEL.id);
    } finally {
      clearInterval(poll);
    }

    // Progress must be observable mid-flight, not a single 0 → 100 jump.
    expect(samples.length).toBeGreaterThan(2);
    expect(samples.at(-1)).toBeGreaterThan(samples[0]);
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1]);
    }
    expect(samples.some((n) => n > 0 && n < MODEL.sizeBytes)).toBe(true);

    expect(getModelStatus(MODEL.id)?.status).toBe("ready");
    expect(statSync(modelPath).size).toBe(MODEL.sizeBytes);
  });

  it("resumes from the partial file after a 60% interrupt", async () => {
    const sixtyPercent = Math.floor(MODEL.sizeBytes * 0.6);
    serveModel({ interruptAtByte: sixtyPercent });

    await expect(downloadModel(MODEL.id)).rejects.toThrow();

    // A network interrupt keeps the partial so Range resume can continue.
    expect(existsSync(tempPath)).toBe(true);
    expect(existsSync(modelPath)).toBe(false);
    const partialSize = statSync(tempPath).size;
    expect(partialSize).toBeGreaterThan(0);
    expect(partialSize).toBeLessThan(MODEL.sizeBytes);

    const seen = serveModel();
    await downloadModel(MODEL.id);

    // Second attempt must ask for the remainder, not restart from zero.
    expect(seen.ranges.at(-1)).toBe(`bytes=${partialSize}-`);
    expect(existsSync(tempPath)).toBe(false);
    // Stitched file must be byte-identical to the source, not merely the right size.
    expect(readFileSync(modelPath).equals(payload)).toBe(true);
    expect(readFileSync(sidecarPath, "utf8").trim()).toBe(payloadSha);
    await expect(assertModelIntegrityForLoad(MODEL.id)).resolves.toBe(
      modelPath,
    );
  });

  it("wipes the partial and reports whisper_checksum_failed on mismatch", async () => {
    serveModel({ advertisedSha: "b".repeat(64) });

    await expect(downloadModel(MODEL.id)).rejects.toBeInstanceOf(
      WhisperChecksumError,
    );

    expect(existsSync(tempPath)).toBe(false);
    expect(existsSync(modelPath)).toBe(false);
    expect(existsSync(sidecarPath)).toBe(false);
    expect(getModelStatus(MODEL.id)?.error).toContain(WHISPER_CHECKSUM_FAILED);
  });
});
