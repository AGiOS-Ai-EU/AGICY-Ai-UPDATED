/**
 * UPDATED LLM / STT model catalog — mirrors playground composer picker shape
 * (apiId, name, provider, domain, logo marks) for Settings + panel button.
 */

export type UpdatedModelKind = "llm" | "stt" | "routing";

export interface UpdatedModel {
  apiId: string;
  name: string;
  provider: string;
  /** Favicon domain key → assets/providers/*.svg */
  domain: string;
  logoText: string;
  logoBg: string;
  kind: UpdatedModelKind;
  tier: "auto" | "flagship" | "fast" | "open";
  note?: string;
}

/** Provider domain → local SVG filename under assets/providers/ */
export const PROVIDER_SVG_FILES: Record<string, string> = {
  openai: "openai.svg",
  anthropic: "claude-color.svg",
  google: "gemini-color.svg",
  gemini: "gemini-color.svg",
  xai: "grok.svg",
  grok: "grok.svg",
  mistral: "mistral-color.svg",
  deepseek: "deepseek-color.svg",
  qwen: "qwen-color.svg",
  meta: "meta-color.svg",
  moonshot: "kimi-color.svg",
  kimi: "kimi-color.svg",
  zhipu: "zhipu-color.svg",
  groq: "groq.svg",
  cerebras: "cerebras-color.svg",
  gemma: "gemma-color.svg",
  agicy: "openai.svg", // placeholder until AGICY mark asset ships in renderer
};

export const UPDATED_LLM_MODELS: UpdatedModel[] = [
  {
    apiId: "agicy-auto",
    name: "AGICY Auto",
    provider: "AGICY",
    domain: "agicy",
    logoText: "A",
    logoBg: "#c9894a",
    kind: "routing",
    tier: "auto",
    note: "Routing label — pick a specific model until Auto is wired",
  },
  {
    apiId: "openai/gpt-4o-mini",
    name: "GPT-4o mini",
    provider: "OpenAI",
    domain: "openai",
    logoText: "O",
    logoBg: "#10a37f",
    kind: "llm",
    tier: "fast",
  },
  {
    apiId: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    domain: "openai",
    logoText: "O",
    logoBg: "#10a37f",
    kind: "llm",
    tier: "flagship",
  },
  {
    apiId: "anthropic/claude-sonnet-4",
    name: "Claude Sonnet",
    provider: "Anthropic",
    domain: "anthropic",
    logoText: "C",
    logoBg: "#d97757",
    kind: "llm",
    tier: "flagship",
  },
  {
    apiId: "google/gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    provider: "Google",
    domain: "google",
    logoText: "G",
    logoBg: "#4285f4",
    kind: "llm",
    tier: "fast",
  },
  {
    apiId: "xai/grok-2",
    name: "Grok 2",
    provider: "xAI",
    domain: "xai",
    logoText: "X",
    logoBg: "#1a1a1a",
    kind: "llm",
    tier: "flagship",
  },
  {
    apiId: "mistral/mistral-large",
    name: "Mistral Large",
    provider: "Mistral",
    domain: "mistral",
    logoText: "M",
    logoBg: "#ff7000",
    kind: "llm",
    tier: "flagship",
  },
  {
    apiId: "deepseek/deepseek-chat",
    name: "DeepSeek Chat",
    provider: "DeepSeek",
    domain: "deepseek",
    logoText: "D",
    logoBg: "#4d6bfe",
    kind: "llm",
    tier: "open",
  },
  {
    apiId: "meta/llama-3.3-70b",
    name: "Llama 3.3 70B",
    provider: "Meta",
    domain: "meta",
    logoText: "Λ",
    logoBg: "#0668e1",
    kind: "llm",
    tier: "open",
  },
  {
    apiId: "qwen/qwen-2.5",
    name: "Qwen 2.5",
    provider: "Alibaba",
    domain: "qwen",
    logoText: "Q",
    logoBg: "#6a5acd",
    kind: "llm",
    tier: "open",
  },
];

export const DEFAULT_LLM_MODEL_ID = "agicy-auto";

export function getUpdatedLlmModel(id: string): UpdatedModel {
  return (
    UPDATED_LLM_MODELS.find((m) => m.apiId === id) ?? UPDATED_LLM_MODELS[0]!
  );
}

/** UI locale options aligned with agicy.ai/updated hub languages. */
export const UI_LOCALES = [
  { id: "en", label: "English", nativeLabel: "English" },
  { id: "zh", label: "Chinese", nativeLabel: "简体中文" },
  { id: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { id: "de", label: "German", nativeLabel: "Deutsch" },
  { id: "es", label: "Spanish", nativeLabel: "Español" },
  { id: "el", label: "Greek", nativeLabel: "Ελληνικά" },
  { id: "it", label: "Italian", nativeLabel: "Italiano" },
  { id: "fr", label: "French", nativeLabel: "Français" },
] as const;

export type UiLocaleId = (typeof UI_LOCALES)[number]["id"];

/** Appearance presets — Vasilikos light default; playground dark family as opt-in. */
export const APPEARANCE_PRESETS = [
  {
    id: "vasilikos-light",
    label: "Vasilikos Light",
    note: "Default — warm paper, best for all ages in daylight",
  },
  {
    id: "copper-glow",
    label: "Copper Glow",
    note: "Playground copper accent on soft paper",
  },
  {
    id: "high-contrast",
    label: "High contrast",
    note: "Stronger ink and borders for older eyes / bright rooms",
  },
  {
    id: "aegean-depth",
    label: "Aegean Depth",
    note: "Cooler slate paper (playground-inspired)",
  },
] as const;

export type AppearancePresetId = (typeof APPEARANCE_PRESETS)[number]["id"];

export const TEXT_SCALE_OPTIONS = [
  { id: "comfortable", label: "Comfortable", note: "Default size" },
  { id: "large", label: "Large", note: "Easier for older readers" },
  { id: "xlarge", label: "Extra large", note: "Maximum readability" },
] as const;

export type TextScaleId = (typeof TEXT_SCALE_OPTIONS)[number]["id"];

export const ACCENT_OPTIONS = [
  { id: "copper", label: "Copper", color: "#c9894a" },
  { id: "cyan", label: "Cyan", color: "#3db8d4" },
] as const;

export type AccentId = (typeof ACCENT_OPTIONS)[number]["id"];
