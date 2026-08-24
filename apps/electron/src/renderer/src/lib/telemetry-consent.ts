import { apiFetch } from "@renderer/lib/api";
import { SETTINGS_KEYS } from "@shared/settings-keys";

/**
 * Pure decision for the post-dictation telemetry consent beat.
 *
 * Ask only after the user has seen dictation land, and only once. Never before
 * mic permission / model download / first dictation. Already-enabled (Settings)
 * skips the prompt; decline leaves telemetry off.
 */
export function shouldAskTelemetryConsent(settings: {
  telemetryEnabled?: string | null;
  telemetryConsentAsked?: string | null;
}): boolean {
  if (settings.telemetryConsentAsked === "true") return false;
  if (settings.telemetryEnabled === "true") return false;
  return true;
}

async function putSetting(key: string, value: string): Promise<void> {
  const response = await apiFetch(`/api/settings/${key}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  if (!response.ok) throw new Error("Could not save settings.");
}

async function readSettingsMap(): Promise<Record<string, string>> {
  const response = await apiFetch("/api/settings");
  if (!response.ok) return {};
  return (await response.json()) as Record<string, string>;
}

/**
 * After a successful dictation delivery: mark first dictation, and return
 * whether the one-beat consent card should be shown.
 *
 * Only the transition to first-dictation-completed can open the prompt — later
 * dictations never re-ask.
 */
export async function onFirstSuccessfulDictation(): Promise<boolean> {
  try {
    const settings = await readSettingsMap();
    if (settings[SETTINGS_KEYS.firstDictationCompleted] === "true") {
      return false;
    }
    await putSetting(SETTINGS_KEYS.firstDictationCompleted, "true");
    return shouldAskTelemetryConsent({
      telemetryEnabled: settings[SETTINGS_KEYS.telemetryEnabled],
      telemetryConsentAsked: settings[SETTINGS_KEYS.telemetryConsentAsked],
    });
  } catch {
    return false;
  }
}

/** Accept → enable telemetry and mark the consent beat done. */
export async function acceptTelemetryConsent(): Promise<void> {
  await putSetting(SETTINGS_KEYS.telemetryConsentAsked, "true");
  await putSetting(SETTINGS_KEYS.telemetryEnabled, "true");
}

/** Decline / dismiss → leave telemetry off, never re-prompt. */
export async function declineTelemetryConsent(): Promise<void> {
  await putSetting(SETTINGS_KEYS.telemetryConsentAsked, "true");
}
