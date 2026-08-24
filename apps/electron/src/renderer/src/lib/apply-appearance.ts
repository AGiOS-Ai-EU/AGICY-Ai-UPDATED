/**
 * Apply playground-equivalent appearance settings to <html> for the panel.
 */
import type {
  AccentId,
  AppearancePresetId,
  TextScaleId,
  UiLocaleId,
} from "@renderer/lib/updated-models";

export function applyAppearanceToDocument(opts: {
  preset?: string;
  accent?: string;
  textScale?: string;
  uiLocale?: string;
  reduceMotion?: boolean;
}): void {
  const root = document.documentElement;
  const preset = (opts.preset || "vasilikos-light") as AppearancePresetId;
  const accent = (opts.accent || "copper") as AccentId;
  const textScale = (opts.textScale || "comfortable") as TextScaleId;
  const locale = (opts.uiLocale || "en") as UiLocaleId;

  root.dataset.updatedPreset = preset;
  root.dataset.updatedAccent = accent;
  root.dataset.updatedText = textScale;
  root.lang = locale;

  if (opts.reduceMotion) {
    root.dataset.updatedMotion = "reduce";
  } else {
    delete root.dataset.updatedMotion;
  }
}
