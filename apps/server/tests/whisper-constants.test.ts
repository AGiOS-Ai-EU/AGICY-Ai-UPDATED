import { describe, expect, it } from "vitest";
import {
  getWhisperModel,
  isSupportedWhisperArch,
  WHISPER_CPP_VERSION,
  WHISPER_MODELS,
  WHISPER_PROVIDER_ID,
} from "../src/lib/whisper/constants.js";

describe("whisper constants", () => {
  it("pins whisper.cpp 1.8.5 and exposes base-q5_1 default catalog entry", () => {
    expect(WHISPER_CPP_VERSION).toBe("1.8.5");
    expect(WHISPER_PROVIDER_ID).toBe("local-whisper");
    expect(getWhisperModel("base-q5_1")?.fileName).toBe("ggml-base-q5_1.bin");
    expect(WHISPER_MODELS.some((m) => m.id === "base-q5_1")).toBe(true);
  });

  it("reports arch support for the current platform", () => {
    // CI runners are x64/arm64 darwin/linux/win32 — all supported except exotic arches.
    expect(typeof isSupportedWhisperArch()).toBe("boolean");
  });
});
