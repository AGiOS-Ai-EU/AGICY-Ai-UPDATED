import { afterEach, describe, expect, it } from "vitest";
import {
  agicyPlatformUrl,
  canonicalDeviceVerificationUrl,
  DEFAULT_AGICY_PLATFORM_URL,
  isVercelProtectedHost,
} from "../src/lib/agicy-platform.js";

describe("canonicalDeviceVerificationUrl", () => {
  const code = "AB12-CD34";
  const expected = `https://agicy.ai/updated/my_device?user_code=${code}`;

  it("defaults to the production device page", () => {
    expect(canonicalDeviceVerificationUrl(undefined, code)).toBe(expected);
  });

  it("rewrites unique Vercel deployment URLs to agicy.ai", () => {
    expect(
      canonicalDeviceVerificationUrl(
        "https://agicy-platform-pbn6chhbu-agios-ai.vercel.app/updated/my_device?user_code=AB12-CD34",
        code,
      ),
    ).toBe(expected);
  });

  it("rewrites Vercel SSO login URLs to agicy.ai", () => {
    expect(
      canonicalDeviceVerificationUrl(
        "https://vercel.com/login?next=https://agicy-platform-pbn6chhbu-agios-ai.vercel.app/updated/my_device",
        code,
      ),
    ).toBe(expected);
  });

  it("keeps a production agicy.ai device URL", () => {
    expect(canonicalDeviceVerificationUrl(expected, code)).toBe(expected);
  });

  it("keeps localhost only when the platform URL is loopback", () => {
    expect(
      canonicalDeviceVerificationUrl(
        "http://localhost:3000/updated/my_device?user_code=AB12-CD34",
        code,
        "http://localhost:3000",
      ),
    ).toBe("http://localhost:3000/updated/my_device?user_code=AB12-CD34");
    expect(
      canonicalDeviceVerificationUrl(
        "http://localhost:3000/updated/my_device?user_code=AB12-CD34",
        code,
      ),
    ).toBe(expected);
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
