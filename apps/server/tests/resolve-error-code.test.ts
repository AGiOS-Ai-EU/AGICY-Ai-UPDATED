import { describe, expect, it } from "vitest";
import { resolveErrorCode } from "../src/lib/error-telemetry.js";

describe("resolveErrorCode", () => {
  it("prefers an explicit error_code property", () => {
    expect(
      resolveErrorCode(new Error("boom"), {
        error_code: "whisper_checksum_failed",
      }),
    ).toBe("whisper_checksum_failed");
  });

  it("reads a structured code from the error object", () => {
    const err = Object.assign(new Error("corrupt"), {
      code: "whisper_model_corrupt",
    });
    expect(resolveErrorCode(err)).toBe("whisper_model_corrupt");
  });

  it("falls back to kind, then Error.name, then unknown — never the message", () => {
    expect(
      resolveErrorCode(new Error("secret path /Users/me"), {
        kind: "unhandledRejection",
      }),
    ).toBe("unhandledRejection");
    expect(resolveErrorCode(new TypeError("x"))).toBe("TypeError");
    expect(resolveErrorCode("raw")).toBe("unknown");
  });
});
