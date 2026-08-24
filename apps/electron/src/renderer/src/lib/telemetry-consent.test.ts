import { describe, expect, it } from "vitest";
import { shouldAskTelemetryConsent } from "./telemetry-consent";

describe("shouldAskTelemetryConsent", () => {
  it("asks on a fresh install after first dictation", () => {
    expect(shouldAskTelemetryConsent({})).toBe(true);
  });

  it("does not re-prompt once asked", () => {
    expect(shouldAskTelemetryConsent({ telemetryConsentAsked: "true" })).toBe(
      false,
    );
  });

  it("skips when the user already opted in via Settings", () => {
    expect(shouldAskTelemetryConsent({ telemetryEnabled: "true" })).toBe(false);
  });

  it("still asks when telemetry is explicitly off but never prompted", () => {
    expect(
      shouldAskTelemetryConsent({
        telemetryEnabled: "false",
        telemetryConsentAsked: "false",
      }),
    ).toBe(true);
  });
});
