import { describe, expect, test } from "vitest";
import { sparkBubbleText, spriteBubbleText } from "./dictation-bubble";

/**
 * STT-MIGRATION-PLAN §11 E2E item 6: the batch local-whisper path must show an
 * unambiguous transcribing indicator after hotkey release. That path streams no
 * partials, so an ellipsis placeholder would be indistinguishable from a hang.
 */
describe("dictation bubble labels", () => {
  test("names the transcribing phase instead of showing a bare ellipsis", () => {
    expect(sparkBubbleText({ phase: "transcribing", partial: "" })).toBe(
      "Transcribing…",
    );
    expect(spriteBubbleText({ phase: "transcribing", partial: "" }, 80)).toBe(
      "Transcribing…",
    );
  });

  test("keeps the listening state while capturing", () => {
    expect(sparkBubbleText({ phase: "recording", partial: "" })).toBe(
      "Listening",
    );
    expect(spriteBubbleText({ phase: "recording", partial: "" }, 80)).toBe(
      "I'm listening…",
    );
  });

  test("prefers streamed partials over the phase label", () => {
    expect(
      sparkBubbleText({ phase: "recording", partial: " hello there " }),
    ).toBe("hello there");
    expect(
      spriteBubbleText({ phase: "transcribing", partial: "hello there" }, 80),
    ).toBe("hello there");
  });

  test("tail-truncates long partials", () => {
    const long = "x".repeat(300);
    const spark = sparkBubbleText({ phase: "recording", partial: long });
    expect(spark).toHaveLength(221);
    expect(spark.startsWith("…")).toBe(true);
    expect(
      spriteBubbleText({ phase: "recording", partial: long }, 80),
    ).toHaveLength(81);
  });

  test("surfaces errors and the absent-bubble case", () => {
    expect(spriteBubbleText({ phase: "error", partial: "" }, 80)).toBe(
      "Something went wrong",
    );
    expect(spriteBubbleText(null, 80)).toBeNull();
  });
});
