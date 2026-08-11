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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new SheetEngine(canvas, def);
    const performer = new Performer(
      engine,
      def,
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
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
    };
  }, [def]);

  useEffect(() => {
    performerRef.current?.handle({ kind: "thinking", on: state === "working" });
  }, [state]);

  useEffect(() => {
    performerRef.current?.handle({ kind: "listening", on: bubble !== null });
    setSay(bubbleText(bubble, def.bubble.maxChars));
  }, [bubble, def]);

  return (
    <div className="sprite-stage">
      <style>{`
        html, body, #root { margin: 0; height: 100%; background: transparent; overflow: hidden; }
        .sprite-stage { position: relative; width: ${def.windowSize}px; height: ${def.windowSize}px; -webkit-user-select: none; user-select: none; }
        canvas { image-rendering: pixelated; }
        /* Manga bubble: ink on white, hard shadow, notched corners. */
        .sprite-bubble {
          position: absolute;
          left: ${def.bubble.x}px;
          bottom: ${def.bubble.y}px;
          max-width: ${def.windowSize - def.bubble.x - 12}px;
          padding: 6px 9px;
          background: #ffffff;
          border: 2.5px solid #141210;
          color: #141210;
          font: 700 11px/1.4 "Schibsted Grotesk", ui-sans-serif, system-ui, sans-serif;
          letter-spacing: 0.04em;
          text-align: center;
          pointer-events: none;
          white-space: pre-wrap;
          box-shadow: 3px 3px 0 rgba(20, 18, 16, 0.3);
          clip-path: polygon(
            0 6px, 6px 6px, 6px 0,
            calc(100% - 6px) 0, calc(100% - 6px) 6px, 100% 6px,
            100% calc(100% - 6px), calc(100% - 6px) calc(100% - 6px),
            calc(100% - 6px) 100%, 6px 100%, 6px calc(100% - 6px), 0 calc(100% - 6px)
          );
        }
        .sprite-bubble::after {
          content: "";
          position: absolute;
          left: 12px;
          bottom: -5px;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 5px solid #141210;
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
      {say ? <div className="sprite-bubble">{say}</div> : null}
    </div>
  );
}
