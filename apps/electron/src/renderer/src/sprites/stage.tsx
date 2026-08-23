import type { BubbleState } from "@renderer/components/companion";
import type { CompanionState } from "@shared/companion";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { SheetEngine } from "./engine";
import { Performer } from "./performer";
import type { SheetSpriteDefinition } from "./types";

function bubbleText(
  bubble: BubbleState | null,
  maxChars: number,
): string | null {
  if (!bubble) return null;
  const partial = bubble.partial.trim();
  if (partial) {
    return partial.length > maxChars ? `…${partial.slice(-maxChars)}` : partial;
  }
  if (bubble.phase === "error") return "Something went wrong";
  return bubble.phase === "recording" ? "I'm listening…" : "…";
}

/**
 * The stage for any sheet sprite: one canvas driven by SheetEngine, a
 * Performer arbitrating the event stream, the body hitbox for hover, and
 * the speech bubble for dictation. Sprite-specific facts all come from the
 * definition — this component never mentions a character by name.
 */
export function SpriteStage({
  def,
  state,
  bubble,
}: {
  def: SheetSpriteDefinition;
  state: CompanionState;
  bubble: BubbleState | null;
}): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const performerRef = useRef<Performer | null>(null);
  const [say, setSay] = useState<string | null>(null);
  const [shout, setShout] = useState<string | null>(null);
  const shoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new SheetEngine(canvas, def);
    const performer = new Performer(
      engine,
      def,
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      {
        onShout: (text) => {
          setShout(text);
          if (shoutTimer.current) clearTimeout(shoutTimer.current);
          shoutTimer.current = setTimeout(() => setShout(null), 1_500);
        },
      },
    );
    performerRef.current = performer;
    (window as unknown as Record<string, unknown>).__spriteTest = {
      handle: (ev: unknown) =>
        performer.handle(ev as Parameters<Performer["handle"]>[0]),
      snapshot: () => performer.snapshot(),
    };

    window.api.companionSetHotRect(def.hotRect);
    const offEvents = window.api.onSpriteEvent((ev) => performer.handle(ev));
    const offHot = window.api.onCompanionHotEnter(() => performer.wake());
    const hitbox = document.getElementById("sprite-hitbox");
    const onEnter = (): void => performer.wake();
    hitbox?.addEventListener("mouseenter", onEnter);

    return () => {
      performerRef.current = null;
      performer.destroy();
      engine.destroy();
      offEvents();
      offHot();
      hitbox?.removeEventListener("mouseenter", onEnter);
      if (shoutTimer.current) clearTimeout(shoutTimer.current);
    };
  }, [def]);

  useEffect(() => {
    performerRef.current?.handle({ kind: "thinking", on: state === "working" });
    if (state === "suggestion") {
      performerRef.current?.handle({ kind: "emote", emotion: "proud" });
    }
  }, [state]);

  useEffect(() => {
    performerRef.current?.handle({
      kind: "listening",
      on: bubble !== null && bubble.phase !== "error",
    });
    setSay(bubbleText(bubble, def.bubble.maxChars));
  }, [bubble, def]);

  return (
    <div className="sprite-stage">
      <style>{`
        html, body, #root { margin: 0; height: 100%; background: transparent; overflow: hidden; }
        .sprite-stage { position: relative; width: ${def.windowSize}px; height: ${def.windowSize}px; -webkit-user-select: none; user-select: none; }
        canvas { image-rendering: pixelated; }
        /* Manga speech balloon (listening): tail pinned to the mouth. */
        .sprite-bubble {
          position: absolute;
          left: ${def.bubble.x}px;
          bottom: ${def.bubble.y}px;
          max-width: ${def.windowSize - def.bubble.x - 14}px;
          padding: 8px 14px;
          background: rgba(10, 12, 18, 0.52);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 999px;
          color: rgba(232, 230, 223, 0.72);
          font: 500 11px/1.45 "Schibsted Grotesk", ui-sans-serif, system-ui, sans-serif;
          text-align: left;
          pointer-events: none;
          white-space: pre-wrap;
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(18px) saturate(1.35);
          -webkit-backdrop-filter: blur(18px) saturate(1.35);
        }
        .sprite-bubble::before,
        .sprite-bubble::after {
          display: none;
        }
        /* Shout burst (paste lands): jagged flash. */
        .sprite-shout {
          position: absolute;
          left: ${def.bubble.x}px;
          bottom: ${def.bubble.y + 16}px;
          background: rgba(10, 12, 18, 0.62);
          border: 1px solid rgba(217, 142, 43, 0.45);
          border-radius: 14px;
          padding: 10px 18px;
          font-family: "Pixelify Sans", monospace;
          font-size: 16px;
          color: #e8e6df;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.32), 0 0 0 1px rgba(217, 142, 43, 0.2);
          pointer-events: none;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          clip-path: none;
        }
      `}</style>
      <canvas ref={canvasRef} width={def.windowSize} height={def.windowSize} />
      <div
        id="sprite-hitbox"
        style={{
          position: "absolute",
          left: def.hotRect.x,
          top: def.hotRect.y,
          width: def.hotRect.width,
          height: def.hotRect.height,
        }}
      />
      {shout ? (
        <div className="sprite-shout">{shout}</div>
      ) : say ? (
        <div className="sprite-bubble">{say}</div>
      ) : null}
    </div>
  );
}
