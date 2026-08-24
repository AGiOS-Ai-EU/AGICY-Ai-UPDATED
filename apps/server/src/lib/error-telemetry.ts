/** Property keys allowed on crash/error events sent to PostHog. */
export const SAFE_ERROR_PROP_KEYS = new Set([
  "error_code",
  "source",
  "kind",
  "origin",
  "provider",
  "model",
  "plugin",
  "hook",
  "status",
]);

/**
 * Resolve a stable enumerated error code. Prefer an explicit `error_code`, then
 * a structured `code` on the error object (e.g. whisper_checksum_failed), then
 * a short allowlisted fallback — never the free-text message.
 */
export function resolveErrorCode(
  error: unknown,
  additionalProperties?: Record<string, unknown>,
): string {
  const fromProps = additionalProperties?.error_code;
  if (typeof fromProps === "string" && fromProps.length > 0) {
    return fromProps.slice(0, 64);
  }
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && code.length > 0) return code.slice(0, 64);
  }
  const kind = additionalProperties?.kind;
  if (typeof kind === "string" && kind.length > 0) return kind.slice(0, 64);
  if (error instanceof Error && error.name && error.name !== "Error") {
    return error.name.slice(0, 64);
  }
  return "unknown";
}

export function safeErrorProperties(
  additionalProperties?: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!additionalProperties) return out;
  for (const [key, value] of Object.entries(additionalProperties)) {
    if (!SAFE_ERROR_PROP_KEYS.has(key)) continue;
    if (key === "error_code") continue;
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      out[key] = typeof value === "string" ? value.slice(0, 64) : value;
    }
  }
  return out;
}
