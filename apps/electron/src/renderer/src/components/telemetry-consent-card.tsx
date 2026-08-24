import type React from "react";

/**
 * One-beat, non-blocking telemetry consent card. Shown only after the first
 * successful dictation — never during mic/model/first-use onboarding.
 */
export function TelemetryConsentCard({
  onAccept,
  onDecline,
}: {
  onAccept: () => void;
  onDecline: () => void;
}): React.JSX.Element {
  return (
    <aside className="tavern-telemetry-consent" aria-label="Usage data">
      <p className="tavern-telemetry-consent-copy">
        Help improve UPDATED with anonymous usage data? Never recordings,
        transcripts, or what you type. Change anytime in Settings → Data.
      </p>
      <div className="tavern-telemetry-consent-actions">
        <button
          type="button"
          className="tavern-telemetry-consent-accept"
          onClick={onAccept}
        >
          Share anonymous usage data
        </button>
        <button
          type="button"
          className="tavern-telemetry-consent-decline"
          onClick={onDecline}
        >
          Not now
        </button>
      </div>
    </aside>
  );
}
