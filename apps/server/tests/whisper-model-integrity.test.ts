import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const modelsDir = join(
  tmpdir(),
  `updated-whisper-integrity-${process.pid}-${Date.now()}`,
);

vi.mock("../src/lib/whisper/constants.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../src/lib/whisper/constants.js")>();
  return {
    ...actual,
    getModelsDir: () => modelsDir,
    getModelPath: (model: { fileName: string }) =>
      join(modelsDir, model.fileName),
  };
});

const {
  assertModelIntegrityForLoad,
  WHISPER_MODEL_CORRUPT,
  WhisperModelCorruptError,
} = await import("../src/lib/whisper/models.js");
const { getWhisperModel } = await import("../src/lib/whisper/constants.js");

describe("assertModelIntegrityForLoad", () => {
  afterEach(() => {
    try {
      rmSync(modelsDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it("rejects missing models with an explicit download message", async () => {
    mkdirSync(modelsDir, { recursive: true });
    await expect(assertModelIntegrityForLoad("base-q5_1")).rejects.toThrow(
      /not downloaded yet/i,
    );
  });

  it("writes a sidecar on first legacy verify and accepts matching files", async () => {
    mkdirSync(modelsDir, { recursive: true });
    const model = getWhisperModel("base-q5_1")!;
    const path = join(modelsDir, model.fileName);
    const payload = Buffer.alloc(Math.floor(model.sizeBytes * 0.96), 7);
    writeFileSync(path, payload);
    const expected = createHash("sha256").update(payload).digest("hex");

    const ready = await assertModelIntegrityForLoad("base-q5_1");
    expect(ready).toBe(path);
    expect(readFileSync(`${path}.sha256`, "utf8").trim()).toBe(expected);
  });

  it("deletes corrupt artifacts and throws whisper_model_corrupt", async () => {
    mkdirSync(modelsDir, { recursive: true });
    const model = getWhisperModel("base-q5_1")!;
    const path = join(modelsDir, model.fileName);
    const payload = Buffer.alloc(Math.floor(model.sizeBytes * 0.96), 9);
    writeFileSync(path, payload);
    writeFileSync(`${path}.sha256`, `${"a".repeat(64)}\n`);

    await expect(assertModelIntegrityForLoad("base-q5_1")).rejects.toSatisfy(
      (err: unknown) => {
        return (
          err instanceof WhisperModelCorruptError &&
          String(err.message).includes(WHISPER_MODEL_CORRUPT)
        );
      },
    );
    expect(existsSync(path)).toBe(false);
    expect(existsSync(`${path}.sha256`)).toBe(false);
  });
});
