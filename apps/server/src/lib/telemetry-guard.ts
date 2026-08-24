/**
 * Content guard for the renderer telemetry relay.
 *
 * `POST /api/telemetry` and `POST /api/telemetry/person` forward whatever the
 * renderer hands them to PostHog, so a single careless call site could ship a
 * transcript, a search query, a prompt, a window title, or something the user
 * typed about themselves to a US processor, and nothing would notice.
 *
 * The events this product collects only ever carry short values — slugs, ids,
 * enum-ish strings, counts, booleans — so the rule is an explicit deny rather
 * than an allowlist: a property containing a string longer than
 * `MAX_TELEMETRY_STRING_LENGTH`, or nested deeper than analytics has any reason
 * to be, is dropped whole. That fails closed for content nobody reviewed while
 * leaving every existing event untouched.
 *
 * This is a backstop, not the control. Call sites are still expected not to
 * collect user content in the first place.
 */

/** Long enough for any slug, id, model name, or enum; far short of free text. */
export const MAX_TELEMETRY_STRING_LENGTH = 64;

/**
 * How many arrays/objects a property may nest before it is treated as suspect.
 * Real events are flat or carry a single list of ids; anything deeper is more
 * likely a leaked object graph than something a call site meant to collect.
 */
const MAX_TELEMETRY_NESTING = 2;

function isFreeText(value: unknown, depth: number): boolean {
  if (typeof value === "string") {
    return value.length > MAX_TELEMETRY_STRING_LENGTH;
  }
  if (value === null || typeof value !== "object") return false;
  if (depth >= MAX_TELEMETRY_NESTING) return true;
  const entries = Array.isArray(value) ? value : Object.values(value);
  return entries.some((entry) => isFreeText(entry, depth + 1));
}

export interface GuardedTelemetryProperties {
  /** The properties safe to relay, or `undefined` when there are none. */
  properties: Record<string, unknown> | undefined;
  /** Names of the properties that were withheld, for the dev warning. */
  dropped: string[];
}

export function guardTelemetryProperties(
  properties: Record<string, unknown> | undefined,
): GuardedTelemetryProperties {
  if (!properties) return { properties: undefined, dropped: [] };

  const safe: Record<string, unknown> = {};
  const dropped: string[] = [];
  for (const [key, value] of Object.entries(properties)) {
    if (isFreeText(value, 0)) dropped.push(key);
    else safe[key] = value;
  }

  return {
    properties: Object.keys(safe).length > 0 ? safe : undefined,
    dropped,
  };
}
