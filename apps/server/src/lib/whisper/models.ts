import { Buffer } from "node:buffer";
import { execFile as execFileCallback } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";
import { createAppLogger } from "@freestyle-voice/utils";
import {
  assertEnoughDiskSpace,
  DOWNLOAD_FREE_BUFFER_BYTES,
  describeDownloadError,
  InsufficientDiskSpaceError,
} from "../disk.js";
import {
  assertNotProxyPage,
  downloadErrorSourceUrl,
} from "../download-guard.js";
import { progressFetch } from "../hf/progress.js";
import {
  getBinDir,
  getModelPath,
  getModelsDir,
  getWhisperModel,
  isSupportedWhisperArch,
  LEGACY_WHISPER_MODELS,
  unsupportedArchMessage,
  WHISPER_CPP_VERSION,
  WHISPER_MODELS,
  WHISPER_REPO,
  WHISPER_REPO_REVISION,
  type WhisperModelDef,
} from "./constants.js";

const log = createAppLogger("whisper");
const execFile = promisify(execFileCallback);

/** Explicit codes — never surface corrupt/partial models as a vague "not ready". */
export const WHISPER_CHECKSUM_FAILED = "whisper_checksum_failed";
export const WHISPER_MODEL_CORRUPT = "whisper_model_corrupt";
export const WHISPER_INSUFFICIENT_DISK = "whisper_insufficient_disk";

export class WhisperChecksumError extends Error {
  readonly code = WHISPER_CHECKSUM_FAILED;
  constructor(message = "Model download failed checksum verification.") {
    super(message);
    this.name = "WhisperChecksumError";
  }
}

export class WhisperModelCorruptError extends Error {
  readonly code = WHISPER_MODEL_CORRUPT;
  constructor(message = "Local whisper model file is corrupt.") {
    super(message);
    this.name = "WhisperModelCorruptError";
  }
}

export type DownloadStatus =
  | "not_downloaded"
  | "downloading"
  | "verifying"
  | "ready"
  | "error";

export type DownloadPhase = "building_binary" | "downloading_model";

export interface ModelDownloadState {
  model: string;
  fileName: string;
  sizeBytes: number;
  displayName: string;
  status: DownloadStatus;
  phase?: DownloadPhase;
  downloadProgress?: {
    bytesDownloaded: number;
    bytesTotal: number;
    percent: number;
    speedBps: number;
  };
  error?: string;
  /** URL to open in a browser to clear a proxy/coaching interception. */
  errorSourceUrl?: string;
}

interface ActiveDownload {
  controller: AbortController;
  phase: DownloadPhase;
  bytesDownloaded: number;
  bytesTotal: number;
  speedBps: number;
  startedAt: number;
  lastUpdate: number;
  lastBytes: number;
  error?: string;
  errorSourceUrl?: string;
}

const activeDownloads = new Map<string, ActiveDownload>();

function ensureModelsDir(): void {
  const dir = getModelsDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function checksumSidecarPath(modelPath: string): string {
  return `${modelPath}.sha256`;
}

function downloadTempPath(modelPath: string): string {
  return `${modelPath}.downloading`;
}

function readSidecarChecksum(modelPath: string): string | null {
  const side = checksumSidecarPath(modelPath);
  if (!existsSync(side)) return null;
  try {
    const raw = readFileSync(side, "utf8").trim().split(/\s+/)[0];
    return /^[a-f0-9]{64}$/i.test(raw) ? raw.toLowerCase() : null;
  } catch {
    return null;
  }
}

function writeSidecarChecksum(modelPath: string, sha256: string): void {
  writeFileSync(checksumSidecarPath(modelPath), `${sha256}\n`, "utf8");
}

function removeModelArtifacts(modelPath: string): void {
  for (const p of [
    modelPath,
    downloadTempPath(modelPath),
    checksumSidecarPath(modelPath),
  ]) {
    try {
      if (existsSync(p)) unlinkSync(p);
    } catch {}
  }
}

async function sha256File(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  await pipeline(createReadStream(filePath), hash);
  return hash.digest("hex");
}

function isDiskFailure(err: unknown): boolean {
  if (err instanceof InsufficientDiskSpaceError) return true;
  if (!err || typeof err !== "object") return false;
  const e = err as NodeJS.ErrnoException;
  if (e.code === "ENOSPC") return true;
  const msg = e.message ?? "";
  return /ENOSPC/i.test(msg) || /no space left on device/i.test(msg);
}

function isModelDownloaded(model: WhisperModelDef): boolean {
  const path = getModelPath(model);
  if (!existsSync(path)) return false;
  // A sibling `.downloading` means a prior attempt left a partial — do not
  // treat the final name as ready if we somehow have both (should not happen).
  if (existsSync(downloadTempPath(path))) return false;
  try {
    const stat = statSync(path);
    if (stat.size < model.sizeBytes * 0.95) return false;
  } catch {
    return false;
  }
  return true;
}

/**
 * Verify on-disk model before first whisper-server load.
 * Prefer the `.sha256` sidecar written after a successful download; when absent
 * (legacy cache), hash once and write the sidecar. On mismatch, delete artifacts
 * and throw {@link WhisperModelCorruptError} (`whisper_model_corrupt`).
 */
export async function assertModelIntegrityForLoad(
  modelId: string,
): Promise<string> {
  const model = getWhisperModel(modelId);
  if (!model) {
    throw new Error(`Unknown whisper model: ${modelId}`);
  }
  const path = getModelPath(model);
  if (!isModelDownloaded(model)) {
    throw new Error(
      `Local whisper model "${modelId}" is not downloaded yet. Open Settings → Dictation to download it.`,
    );
  }

  const stored = readSidecarChecksum(path);
  const actual = await sha256File(path);
  if (stored) {
    if (stored !== actual) {
      removeModelArtifacts(path);
      throw new WhisperModelCorruptError(
        `Local whisper model failed integrity check (${WHISPER_MODEL_CORRUPT}). Re-download from Settings → Dictation.`,
      );
    }
    return path;
  }

  // Legacy install without sidecar — record hash for future launches.
  writeSidecarChecksum(path, actual);
  return path;
}

function baseModelState(
  modelId: string,
  model: WhisperModelDef,
): Pick<
  ModelDownloadState,
  "model" | "fileName" | "sizeBytes" | "displayName"
> {
  return {
    model: modelId,
    fileName: model.fileName,
    sizeBytes: model.sizeBytes,
    displayName: model.displayName,
  };
}

export function getModelStatus(modelId: string): ModelDownloadState | null {
  const model = getWhisperModel(modelId);
  if (!model) return null;

  const active = activeDownloads.get(modelId);

  if (active?.error) {
    return {
      ...baseModelState(modelId, model),
      status: "error",
      error: active.error,
      errorSourceUrl: active.errorSourceUrl,
    };
  }

  if (active) {
    return {
      ...baseModelState(modelId, model),
      status: "downloading",
      phase: active.phase,
      downloadProgress: {
        bytesDownloaded: active.bytesDownloaded,
        bytesTotal: active.bytesTotal,
        percent:
          active.bytesTotal > 0
            ? Math.round((active.bytesDownloaded / active.bytesTotal) * 100)
            : 0,
        speedBps: active.speedBps,
      },
    };
  }

  if (isModelDownloaded(model)) {
    return { ...baseModelState(modelId, model), status: "ready" };
  }

  return { ...baseModelState(modelId, model), status: "not_downloaded" };
}

/**
 * Catalog shown in pickers: the curated models, plus legacy models that
 * this install still has downloaded.
 */
export function getCatalogModels(): WhisperModelDef[] {
  const legacy = LEGACY_WHISPER_MODELS.filter((m) => isModelDownloaded(m));
  return [...WHISPER_MODELS, ...legacy];
}

export function getAllModelStatuses(): ModelDownloadState[] {
  return getCatalogModels().map((m) => getModelStatus(m.id)!);
}

export async function downloadModel(modelId: string): Promise<void> {
  const model = getWhisperModel(modelId);
  if (!model) throw new Error(`Unknown whisper model: ${modelId}`);

  const existing = activeDownloads.get(modelId);
  if (existing && !existing.error) {
    throw new Error(`Model ${modelId} is already downloading`);
  }
  if (existing?.error) {
    activeDownloads.delete(modelId);
  }

  if (isModelDownloaded(model)) return;

  const { isServerBinaryAvailable } = await import("./binary.js");
  const needsBinary = !isServerBinaryAvailable();

  const controller = new AbortController();
  const active: ActiveDownload = {
    controller,
    phase: needsBinary ? "building_binary" : "downloading_model",
    bytesDownloaded: 0,
    bytesTotal: needsBinary ? 0 : model.sizeBytes,
    speedBps: 0,
    startedAt: Date.now(),
    lastUpdate: Date.now(),
    lastBytes: 0,
  };
  activeDownloads.set(modelId, active);

  if (needsBinary) {
    try {
      await ensureBinariesDownloaded();
    } catch (err) {
      active.error = describeDownloadError(err);
      throw err;
    }

    active.phase = "downloading_model";
    active.bytesTotal = model.sizeBytes;
    active.bytesDownloaded = 0;
    active.speedBps = 0;
    active.lastUpdate = Date.now();
    active.lastBytes = 0;
  }

  ensureModelsDir();

  const destPath = getModelPath(model);
  const tempPath = downloadTempPath(destPath);
  // Hoisted so the catch can point the user at the model source when a proxy
  // or captive portal blocks the download.
  const url = `https://huggingface.co/${WHISPER_REPO}/resolve/${WHISPER_REPO_REVISION}/${model.fileName}`;

  try {
    // Fail fast if the volume can't hold the model file (plus a little
    // head-room) before spending bandwidth.
    await assertEnoughDiskSpace(
      getModelsDir(),
      model.sizeBytes + DOWNLOAD_FREE_BUFFER_BYTES,
    );

    // Stream straight to the models dir — going through the HF cache would
    // store every model twice on disk. Resume via HTTP Range when a partial
    // `.downloading` file already exists.
    const expectedSha = await fetchExpectedSha256(
      model.fileName,
      controller.signal,
    );
    let resumeFrom = 0;
    if (existsSync(tempPath)) {
      try {
        resumeFrom = statSync(tempPath).size;
      } catch {
        resumeFrom = 0;
      }
    }
    if (resumeFrom > 0) {
      active.bytesDownloaded = resumeFrom;
      active.lastBytes = resumeFrom;
    }

    const headers: Record<string, string> = {};
    if (resumeFrom > 0) headers.Range = `bytes=${resumeFrom}-`;

    const res = await progressFetch(active, controller.signal)(url, {
      headers,
    });
    if (resumeFrom > 0 && res.status === 200) {
      // Server ignored Range — restart from zero.
      resumeFrom = 0;
      active.bytesDownloaded = 0;
      active.lastBytes = 0;
      try {
        unlinkSync(tempPath);
      } catch {}
    }
    if (!res.ok || !res.body) {
      throw modelDownloadHttpError(res.status);
    }
    // A corporate proxy may answer with a coaching/click-through HTML page
    // instead of the binary; catch it before we write garbage to disk.
    assertNotProxyPage(res, url, model.sizeBytes);
    const contentRange = res.headers.get("content-range");
    const totalFromRange = contentRange?.match(/\/(\d+)$/)?.[1];
    const total =
      Number(totalFromRange) ||
      (resumeFrom > 0 && res.status === 206
        ? resumeFrom + Number(res.headers.get("content-length") || 0)
        : Number(res.headers.get("content-length")));
    if (total > 0) active.bytesTotal = total;

    // Stream bytes; full-file checksum runs after the write (including resume)
    // so a resumed download is never promoted without integrity verification.
    await pipeline(
      webBodyToReadable(res.body),
      createWriteStream(tempPath, { flags: resumeFrom > 0 ? "a" : "w" }),
    );

    active.phase = "downloading_model";
    const actualSha = await sha256File(tempPath);
    if (expectedSha && actualSha !== expectedSha) {
      try {
        unlinkSync(tempPath);
      } catch {}
      throw new WhisperChecksumError(
        `Model download failed checksum verification (${WHISPER_CHECKSUM_FAILED}). The partial file was removed — please try again.`,
      );
    }
    writeSidecarChecksum(destPath, actualSha);
    renameSync(tempPath, destPath);
    activeDownloads.delete(modelId);
  } catch (err) {
    const aborted = controller.signal.aborted;
    const wipePartial =
      isDiskFailure(err) || err instanceof WhisperChecksumError;

    // Disk / checksum failures must not leave a corrupt or half-written model
    // for the next launch. Network interrupts and user cancel keep `.downloading`
    // so Range resume can continue.
    if (wipePartial) {
      try {
        if (existsSync(tempPath)) unlinkSync(tempPath);
      } catch {}
      try {
        if (existsSync(checksumSidecarPath(destPath))) {
          unlinkSync(checksumSidecarPath(destPath));
        }
      } catch {}
    }

    if (aborted) {
      activeDownloads.delete(modelId);
      return;
    }

    active.error =
      err instanceof WhisperChecksumError
        ? err.message
        : describeDownloadError(err);
    if (
      isDiskFailure(err) &&
      !active.error.includes(WHISPER_INSUFFICIENT_DISK)
    ) {
      active.error = `${active.error} (${WHISPER_INSUFFICIENT_DISK})`;
    }
    active.errorSourceUrl = downloadErrorSourceUrl(err, url);
    throw err;
  }
}

export function cancelDownload(modelId: string): boolean {
  const active = activeDownloads.get(modelId);
  if (!active) return false;
  active.controller.abort();
  activeDownloads.delete(modelId);
  return true;
}

export async function deleteModel(modelId: string): Promise<boolean> {
  const model = getWhisperModel(modelId);
  if (!model) return false;

  cancelDownload(modelId);

  // Stop the whisper server before deleting — on Windows the server
  // process holds the model file open, so unlinkSync would fail with
  // EPERM/EBUSY while it's running.
  const { stopServer } = await import("./server.js");
  await stopServer();

  const path = getModelPath(model);
  try {
    if (existsSync(path)) {
      unlinkSync(path);
    }
    const side = checksumSidecarPath(path);
    if (existsSync(side)) unlinkSync(side);
    const temp = downloadTempPath(path);
    if (existsSync(temp)) unlinkSync(temp);
    return true;
  } catch {}
  return false;
}

export function clearDownloadError(modelId: string): void {
  const active = activeDownloads.get(modelId);
  if (active?.error) {
    activeDownloads.delete(modelId);
  }
}

export function getDownloadedModelPath(modelId: string): string | null {
  const model = getWhisperModel(modelId);
  if (!model) return null;
  if (!isModelDownloaded(model)) return null;
  return getModelPath(model);
}

async function fetchExpectedSha256(
  fileName: string,
  signal: AbortSignal,
): Promise<string | null> {
  try {
    const url = `https://huggingface.co/api/models/${WHISPER_REPO}/tree/${WHISPER_REPO_REVISION}`;
    const res = await fetch(url, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]),
    });
    if (!res.ok) return null;
    const entries = (await res.json()) as {
      path?: string;
      lfs?: { oid?: string };
    }[];
    return entries.find((e) => e.path === fileName)?.lfs?.oid ?? null;
  } catch {
    return null;
  }
}

function modelDownloadHttpError(status: number): Error {
  if (status === 404) {
    return new Error(
      "Model download failed because the file is no longer published on Hugging Face (HTTP 404). Try updating UPDATED to a newer version.",
    );
  }
  if (status === 401 || status === 403) {
    return new Error(
      `Model download was rejected by Hugging Face (HTTP ${status}). Please try again in a few minutes.`,
    );
  }
  return new Error(`Model download failed: HTTP ${status}`);
}

// ---------------------------------------------------------------------------
// Binary acquisition
// ---------------------------------------------------------------------------

let binaryDownloadPromise: Promise<void> | null = null;

export function isBinaryDownloading(): boolean {
  return binaryDownloadPromise !== null;
}

export async function ensureBinariesDownloaded(): Promise<void> {
  if (!isSupportedWhisperArch()) {
    throw new Error(unsupportedArchMessage());
  }
  const { isServerBinaryAvailable, resetBinaryCache } = await import(
    "./binary.js"
  );
  if (isServerBinaryAvailable()) return;

  if (binaryDownloadPromise) return binaryDownloadPromise;
  const task =
    process.platform === "win32"
      ? downloadWindowsBinaries()
      : buildFromSource();
  binaryDownloadPromise = task.finally(() => {
    binaryDownloadPromise = null;
    resetBinaryCache();
  });
  return binaryDownloadPromise;
}

async function buildFromSource(): Promise<void> {
  const binDir = getBinDir();
  if (!existsSync(binDir)) mkdirSync(binDir, { recursive: true });

  const srcDir = join(binDir, "whisper.cpp-src");
  const buildDir = join(srcDir, "build");

  const tarballUrl = `https://github.com/ggml-org/whisper.cpp/archive/refs/tags/v${WHISPER_CPP_VERSION}.tar.gz`;
  const tarPath = join(binDir, `whisper-${WHISPER_CPP_VERSION}.tar.gz`);

  log.info("Downloading whisper.cpp source...");

  const res = await fetch(tarballUrl, {
    redirect: "follow",
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok || !res.body) {
    if (res.status === 404) {
      throw new Error(
        `whisper.cpp v${WHISPER_CPP_VERSION} source is no longer published on GitHub (HTTP 404). Try updating UPDATED to a newer version.`,
      );
    }
    throw new Error(
      `Failed to download whisper.cpp source: HTTP ${res.status}`,
    );
  }

  const fileStream = createWriteStream(tarPath);
  await pipeline(webBodyToReadable(res.body), fileStream);

  log.info("Extracting source...");

  if (existsSync(srcDir)) {
    rmSync(srcDir, { recursive: true, force: true });
  }
  mkdirSync(srcDir, { recursive: true });

  try {
    await execFile(
      "tar",
      ["xzf", tarPath, "-C", srcDir, "--strip-components=1"],
      {
        timeout: 120_000,
      },
    );
  } catch {
    throw new Error(
      "Failed to extract whisper.cpp source. Ensure 'tar' is installed.",
    );
  }

  try {
    unlinkSync(tarPath);
  } catch {}

  log.info("Building whisper.cpp (this may take a minute)...");

  try {
    mkdirSync(buildDir, { recursive: true });
    await execFile(
      "cmake",
      ["..", "-DCMAKE_BUILD_TYPE=Release", "-DBUILD_SHARED_LIBS=OFF"],
      { cwd: buildDir, timeout: 180_000 },
    );
    await execFile("cmake", ["--build", ".", "--config", "Release", "-j"], {
      cwd: buildDir,
      timeout: 900_000,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to build whisper.cpp. Ensure cmake and a C/C++ compiler are installed.\n${msg}`,
    );
  }

  const binaryName = "whisper-cli";
  const serverName = "whisper-server";

  for (const name of [binaryName, serverName]) {
    const builtPath = join(buildDir, "bin", name);
    if (existsSync(builtPath)) {
      copyFileSync(builtPath, join(binDir, name));
      chmodSync(join(binDir, name), 0o755);
    }
  }

  const libDirs = [join(buildDir, "src"), join(buildDir, "ggml", "src")];
  for (const libDir of libDirs) {
    if (!existsSync(libDir)) continue;
    for (const file of readdirSync(libDir)) {
      if (file.endsWith(".dylib") || /\.so(\.\d+)*$/.test(file)) {
        copyFileSync(join(libDir, file), join(binDir, file));
      }
    }
  }

  if (process.platform === "darwin") {
    for (const name of [binaryName, serverName]) {
      const binPath = join(binDir, name);
      if (!existsSync(binPath)) continue;
      try {
        await execFile("install_name_tool", ["-add_rpath", binDir, binPath], {
          timeout: 10_000,
        });
      } catch {}
    }
  }

  try {
    rmSync(srcDir, { recursive: true, force: true });
  } catch {}

  const { isServerBinaryAvailable, resetBinaryCache } = await import(
    "./binary.js"
  );
  resetBinaryCache();
  if (!isServerBinaryAvailable()) {
    throw new Error(
      "whisper.cpp build completed but whisper-server not found. Check build output.",
    );
  }

  log.info("Build complete");
}

async function downloadWindowsBinaries(): Promise<void> {
  const binDir = getBinDir();
  if (!existsSync(binDir)) mkdirSync(binDir, { recursive: true });

  const archiveUrl = `https://github.com/ggml-org/whisper.cpp/releases/download/v${WHISPER_CPP_VERSION}/whisper-bin-x64.zip`;
  const tmpZip = join(binDir, "whisper-bin.zip");

  log.info("Downloading pre-built Windows binaries...");

  const res = await fetch(archiveUrl, {
    redirect: "follow",
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok || !res.body) {
    if (res.status === 404) {
      throw new Error(
        `The whisper.cpp v${WHISPER_CPP_VERSION} Windows binaries are no longer published on GitHub (HTTP 404). Try updating UPDATED to a newer version.`,
      );
    }
    throw new Error(`Failed to download whisper binaries: HTTP ${res.status}`);
  }

  const fileStream = createWriteStream(tmpZip);
  await pipeline(webBodyToReadable(res.body), fileStream);

  const psQuote = (p: string): string => `'${p.replace(/'/g, "''")}'`;
  try {
    await execFile(
      "powershell",
      [
        "-Command",
        `Expand-Archive -Force -Path ${psQuote(tmpZip)} -DestinationPath ${psQuote(binDir)}`,
      ],
      { timeout: 120_000 },
    );
  } catch {
    try {
      unlinkSync(tmpZip);
    } catch {}
    throw new Error("Failed to extract whisper binaries.");
  }

  try {
    unlinkSync(tmpZip);
  } catch {}

  // The upstream zip nests executables inside a Release/ subdirectory.
  // Move them up so they sit directly inside binDir where findExecutable looks.
  const releaseDir = join(binDir, "Release");
  if (existsSync(releaseDir)) {
    for (const name of readdirSync(releaseDir)) {
      renameSync(join(releaseDir, name), join(binDir, name));
    }
    rmSync(releaseDir, { recursive: true, force: true });
  }

  log.info("Windows binaries downloaded");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function webBodyToReadable(body: ReadableStream<Uint8Array>): Readable {
  const reader = body.getReader();
  return new Readable({
    async read() {
      try {
        const { done, value } = await reader.read();
        if (done) {
          this.push(null);
          return;
        }
        this.push(Buffer.from(value));
      } catch (err) {
        this.destroy(err instanceof Error ? err : new Error(String(err)));
      }
    },
  });
}
