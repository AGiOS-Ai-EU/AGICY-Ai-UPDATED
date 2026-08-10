import { JEB_WINDOW_SIZE } from "./jeb.js";

export const COMPANION_WINDOW_SIZE = JEB_WINDOW_SIZE;

export const COMPANION_FORMS = ["spark", "jeb"] as const;
export type CompanionForm = (typeof COMPANION_FORMS)[number];
export const DEFAULT_COMPANION_FORM: CompanionForm = "spark";

export function parseCompanionForm(
  value: string | null | undefined,
): CompanionForm {
  return COMPANION_FORMS.includes(value as CompanionForm)
    ? (value as CompanionForm)
    : DEFAULT_COMPANION_FORM;
}

export type CompanionState = "idle" | "working" | "suggestion";

export const COMPANION_HOVER_DWELL_MS = 300;

export const DICTATION_DESTINATIONS = ["cursor", "composer"] as const;
export type DictationDestinationSetting =
  (typeof DICTATION_DESTINATIONS)[number];
export const DEFAULT_DICTATION_DESTINATION: DictationDestinationSetting =
  "cursor";

export function parseDictationDestination(
  value: string | null | undefined,
): DictationDestinationSetting {
  return DICTATION_DESTINATIONS.includes(value as DictationDestinationSetting)
    ? (value as DictationDestinationSetting)
    : DEFAULT_DICTATION_DESTINATION;
}
