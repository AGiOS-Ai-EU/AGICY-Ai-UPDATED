/**
 * Speech-bubble copy for the dictation phases.
 *
 * The shipping default is batch local whisper, which sends no partials — so
 * the transcribing phase has to name itself. A bare ellipsis there is
 * indistinguishable from a hang (STT-MIGRATION-PLAN §11 E2E item 6).
 */

export interface BubbleState {
  phase: "recording" | "transcribing" | "error";
  partial: string;
}

const SPARK_MAX_PARTIAL_CHARS = 220;

function tail(partial: string, maxChars: number): string {
  return partial.length > maxChars ? `…${partial.slice(-maxChars)}` : partial;
}

/** Label for the Spark companion bubble. */
export function sparkBubbleText(bubble: BubbleState): string {
  const partial = bubble.partial.trim();
  if (partial) return tail(partial, SPARK_MAX_PARTIAL_CHARS);
  if (bubble.phase === "recording") return "Listening";
  if (bubble.phase === "transcribing") return "Transcribing…";
  return "…";
}

/** Label for a sheet-sprite speech bubble. */
export function spriteBubbleText(
  bubble: BubbleState | null,
  maxChars: number,
): string | null {
  if (!bubble) return null;
  const partial = bubble.partial.trim();
  if (partial) return tail(partial, maxChars);
  if (bubble.phase === "error") return "Something went wrong";
  if (bubble.phase === "transcribing") return "Transcribing…";
  return "I'm listening…";
}
