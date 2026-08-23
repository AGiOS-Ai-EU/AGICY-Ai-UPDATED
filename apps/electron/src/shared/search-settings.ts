import type { InputMode } from "./dictation-prefs.js";

/** Dual runs two providers for divergence; single disables CONTESTED pairing. */
export type SearchProviderMode = "dual" | "single";

export function parseInputMode(value: string | undefined | null): InputMode {
  return value === "search" ? "search" : "dictation";
}

export function parseSearchProviderMode(
  value: string | undefined | null,
): SearchProviderMode {
  return value === "single" ? "single" : "dual";
}

/** True when a Brave key string is non-empty after trim. */
export function isBraveKeyPresent(apiKey: string | undefined | null): boolean {
  return Boolean(apiKey?.trim());
}
