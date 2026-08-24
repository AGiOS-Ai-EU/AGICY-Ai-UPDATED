import { describe, expect, it } from "vitest";
import { applyBakedTelemetryEnv } from "./release-telemetry";

describe("applyBakedTelemetryEnv", () => {
  it("copies the baked project key and host when env is empty", () => {
    const env: NodeJS.ProcessEnv = {};
    applyBakedTelemetryEnv("  phc_test  ", "  https://eu.i.posthog.com  ", env);
    expect(env.POSTHOG_API_KEY).toBe("phc_test");
    expect(env.POSTHOG_HOST).toBe("https://eu.i.posthog.com");
  });

  it("does not overwrite a runtime or dotenv value", () => {
    const env: NodeJS.ProcessEnv = {
      POSTHOG_API_KEY: "phc_from_dotenv",
      POSTHOG_HOST: "https://localhost",
    };
    applyBakedTelemetryEnv("phc_baked", "https://eu.i.posthog.com", env);
    expect(env.POSTHOG_API_KEY).toBe("phc_from_dotenv");
    expect(env.POSTHOG_HOST).toBe("https://localhost");
  });

  it("ignores empty baked values so the server default host still applies", () => {
    const env: NodeJS.ProcessEnv = {};
    applyBakedTelemetryEnv("   ", "", env);
    expect(env.POSTHOG_API_KEY).toBeUndefined();
    expect(env.POSTHOG_HOST).toBeUndefined();
  });
});
