import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  agicyPlatformUrl,
  canonicalDeviceVerificationUrl,
  DEFAULT_AGICY_PLATFORM_URL,
  isVercelProtectedHost,
  requestAgicyDeviceCode,
} from "../src/lib/agicy-platform.js";

describe("canonicalDeviceVerificationUrl", () => {
  const code = "AB12-CD34";
  const expected = `https://agicy.ai/updated/my_device?user_code=${code}`;

  it("always returns the production device page", () => {
    expect(canonicalDeviceVerificationUrl(code)).toBe(expected);
    expect(canonicalDeviceVerificationUrl("KAZY3Q53")).toBe(
      "https://agicy.ai/updated/my_device?user_code=KAZY3Q53",
    );
  });
});

describe("agicyPlatformUrl", () => {
  const prev = process.env.AGICY_PLATFORM_URL;

  afterEach(() => {
    if (prev === undefined) delete process.env.AGICY_PLATFORM_URL;
    else process.env.AGICY_PLATFORM_URL = prev;
  });

  it("defaults to https://agicy.ai", () => {
    delete process.env.AGICY_PLATFORM_URL;
    expect(agicyPlatformUrl()).toBe(DEFAULT_AGICY_PLATFORM_URL);
  });

  it("ignores Vercel preview AGICY_PLATFORM_URL values", () => {
    process.env.AGICY_PLATFORM_URL =
      "https://agicy-platform-pbn6chhbu-agios-ai.vercel.app";
    expect(agicyPlatformUrl()).toBe(DEFAULT_AGICY_PLATFORM_URL);
  });

  it("ignores third-party AGICY_PLATFORM_URL values", () => {
    process.env.AGICY_PLATFORM_URL = "https://example.com";
    expect(agicyPlatformUrl()).toBe(DEFAULT_AGICY_PLATFORM_URL);
  });

  it("allows localhost for local platform testing", () => {
    process.env.AGICY_PLATFORM_URL = "http://localhost:3000";
    expect(agicyPlatformUrl()).toBe("http://localhost:3000");
  });

  it("detects Vercel protected hosts", () => {
    expect(isVercelProtectedHost("vercel.com")).toBe(true);
    expect(
      isVercelProtectedHost("agicy-platform-pbn6chhbu-agios-ai.vercel.app"),
    ).toBe(true);
    expect(isVercelProtectedHost("agicy.ai")).toBe(false);
  });
});

describe("requestAgicyDeviceCode", () => {
  const prev = process.env.AGICY_PLATFORM_URL;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    delete process.env.AGICY_PLATFORM_URL;
    fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        device_code: "dev-1",
        user_code: "AB12-CD34",
        verification_url: "https://example.com/device?user_code=AB12-CD34",
        expires_in: 600,
        interval: 5,
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    if (prev === undefined) delete process.env.AGICY_PLATFORM_URL;
    else process.env.AGICY_PLATFORM_URL = prev;
  });

  it("posts to agicy.ai/api/updated/device/code and returns the agicy.ai page", async () => {
    const result = await requestAgicyDeviceCode();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://agicy.ai/api/updated/device/code",
    );
    expect(result.user_code).toBe("AB12-CD34");
    expect(result.verification_url).toBe(
      "https://agicy.ai/updated/my_device?user_code=AB12-CD34",
    );
  });
});
