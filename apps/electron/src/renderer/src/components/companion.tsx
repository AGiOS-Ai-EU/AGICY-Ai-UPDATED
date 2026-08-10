import "../overlay.css";

import { JebRoot } from "@renderer/components/jeb";
import { Spark, sparkScaleFor } from "@renderer/components/spark";
import { initApiBase } from "@renderer/lib/api";
import {
  DictationController,
  type DictationDestination,
} from "@renderer/lib/dictation";
import { installGlobalErrorHandlers } from "@renderer/lib/report-error";
import {
  COMPANION_WINDOW_SIZE,
  type CompanionForm,
  type CompanionState,
  DEFAULT_COMPANION_FORM,
} from "@shared/companion";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

const SPARK_HOT_RECT = { x: 18, y: 190, width: 52, height: 52 };

function useDictation(
  setState: (s: CompanionState) => void,
  setListening: (v: boolean) => void,
  levelRef: React.RefObject<HTMLSpanElement | null>,
): void {
  useEffect(() => {
    let destination: DictationDestination = "cursor";
    let outputMode: "paste" | "clipboard" = "paste";
    let soundEnabled = true;
    let audioPlaybackMode: "off" | "duck" | "pause" = "off";

    const controller = new DictationController(
      {
        onPhase: (phase) => {
          setState(phase === "idle" ? "idle" : "working");
          setListening(phase === "recording");
        },
        onLevel: (level) => {
          levelRef.current?.style.setProperty(
            "--spark-scale",
            sparkScaleFor(level).toFixed(3),
          );
        },
        onPartial: (text) => {
          if (destination === "composer")
            window.api.panelDictationPartial(text);
        },
        onComposerText: (text) => {
          window.api.panelOpenForDictation();
          window.api.panelDictationFinal(text);
        },
        onError: (message) => window.api.panelDictationError(message),
      },
      {
        destination: () => destination,
        outputMode: () => outputMode,
        soundEnabled: () => soundEnabled,
        audioPlaybackMode: () => audioPlaybackMode,
      },
    );

    void window.api
      .dictationPrefs()
      .then((prefs) => {
        destination = prefs.destination;
        outputMode = prefs.outputMode;
        soundEnabled = prefs.soundEnabled;
        audioPlaybackMode = prefs.audioPlaybackMode;
      })
      .catch(() => {});

    const offPrefs = window.api.onDictationPrefs((prefs) => {
      destination = prefs.destination;
      outputMode = prefs.outputMode;
      soundEnabled = prefs.soundEnabled;
      audioPlaybackMode = prefs.audioPlaybackMode;
    });
    const offDown = window.api.onHotkeyDown(() => void controller.start());
    const offUp = window.api.onHotkeyUp(() => controller.stop());
    return () => {
      offPrefs?.();
      offDown?.();
      offUp?.();
      controller.destroy();
    };
  }, [setState, setListening, levelRef]);
}

function SparkStage({
  state,
  listening,
  levelRef,
}: {
  state: CompanionState;
  listening: boolean;
  levelRef: React.RefObject<HTMLSpanElement | null>;
}): React.JSX.Element {
  useEffect(() => {
    window.api.companionSetHotRect(SPARK_HOT_RECT);
  }, []);

  return (
    <div
      style={{
        width: COMPANION_WINDOW_SIZE,
        height: COMPANION_WINDOW_SIZE,
        position: "relative",
        background: "transparent",
      }}
    >
      <style>{`
        .spark-core,
        .spark-satellite {
          display: block;
          transform: rotate(45deg);
          transition: transform 260ms cubic-bezier(.2,.9,.25,1),
                      border-radius 260ms ease,
                      opacity 200ms ease;
        }
        .spark-core.is-working {
          transform: rotate(90deg);
          animation: spark-breathe 1.6s ease-in-out infinite;
        }
        .spark-core.is-listening {
          animation: none;
        }
        .spark-level {
          display: block;
          transform: scale(var(--spark-scale, 1));
          transition: transform 70ms linear;
        }
        @keyframes spark-breathe {
          0%, 100% { transform: rotate(90deg) scale(1); }
          50% { transform: rotate(90deg) scale(1.16); }
        }
        @media (prefers-reduced-motion: reduce) {
          .spark-core, .spark-satellite {
            transition: none !important;
            animation: none !important;
          }
          .spark-level {
            transform: none !important;
            transition: none !important;
          }
        }
      `}</style>
      <div
        style={{
          position: "absolute",
          left: SPARK_HOT_RECT.x,
          top: SPARK_HOT_RECT.y,
          width: SPARK_HOT_RECT.width,
          height: SPARK_HOT_RECT.height,
          display: "grid",
          placeItems: "center",
        }}
      >
        <Spark state={state} listening={listening} levelRef={levelRef} />
      </div>
    </div>
  );
}

function CompanionRoot(): React.JSX.Element | null {
  const [form, setForm] = useState<CompanionForm | null>(null);
  const [state, setState] = useState<CompanionState>("idle");
  const [listening, setListening] = useState(false);
  const levelRef = useRef<HTMLSpanElement>(null);

  useDictation(setState, setListening, levelRef);

  useEffect(() => {
    window.api
      .companionForm()
      .then(setForm)
      .catch(() => setForm(DEFAULT_COMPANION_FORM));
    const offForm = window.api.onCompanionForm((next) => setForm(next));
    const offState = window.api.onCompanionState((next) => setState(next));
    const offHot = window.api.onCompanionHotEnter(() => {
      window.api.companionHover();
    });
    return () => {
      offForm?.();
      offState?.();
      offHot?.();
    };
  }, []);

  if (!form) return null;
  return form === "jeb" ? (
    <JebRoot />
  ) : (
    <SparkStage state={state} listening={listening} levelRef={levelRef} />
  );
}

initApiBase();
installGlobalErrorHandlers();

const container = document.getElementById("root");
if (container) createRoot(container).render(<CompanionRoot />);
