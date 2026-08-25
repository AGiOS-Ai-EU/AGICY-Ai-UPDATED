import { useCloudAuth } from "@renderer/lib/auth-context";

function AuthConfetti(): React.JSX.Element {
  const bits = Array.from({ length: 18 }, (_, i) => i);
  return (
    <div className="tavern-auth-confetti" aria-hidden>
      {bits.map((i) => (
        <span
          key={i}
          className="tavern-auth-confetti-bit"
          style={{
            left: `${6 + ((i * 17) % 88)}%`,
            animationDelay: `${(i % 7) * 0.05}s`,
            background:
              i % 3 === 0
                ? "var(--updated-accent-strong, #b87333)"
                : i % 3 === 1
                  ? "var(--tavern-lantern, #d4a017)"
                  : "var(--tavern-ink, #3a2f24)",
          }}
        />
      ))}
    </div>
  );
}

/**
 * Single sign-in UI for soft-auth strip and Settings AccountCard.
 * Renders controls for idle → starting → waiting → approved (not signed-in profile).
 */
export function AuthSignInControls({
  variant = "card",
}: {
  variant?: "card" | "strip";
}): React.JSX.Element {
  const auth = useCloudAuth();
  const rootClass =
    variant === "strip"
      ? "tavern-soft-auth"
      : "tavern-set-card tavern-auth-card";

  if (auth.phase === "approved") {
    return (
      <div className={`${rootClass} is-approved`}>
        <AuthConfetti />
        <div className="tavern-set-card-title">You're signed in</div>
        <div className="tavern-set-card-sub">
          Welcome — loading your account…
        </div>
        <div className="tavern-auth-success-mark" aria-hidden>
          ✓
        </div>
      </div>
    );
  }

  if (auth.phase === "starting") {
    return (
      <div className={rootClass}>
        {variant === "strip" ? (
          <p className="tavern-soft-auth-text">Starting sign-in…</p>
        ) : (
          <>
            <div className="tavern-set-card-title">Sign in to UPDATED</div>
            <div className="tavern-set-card-sub">Starting sign-in…</div>
          </>
        )}
        <button type="button" className="tavern-gate-btn is-pending" disabled>
          <span className="tavern-auth-spinner" aria-hidden />
          Starting…
        </button>
      </div>
    );
  }

  if (auth.phase === "waiting") {
    return (
      <div className={rootClass}>
        {variant === "strip" ? (
          <p className="tavern-soft-auth-text">
            Waiting for approval in the sign-in window…
          </p>
        ) : (
          <>
            <div className="tavern-set-card-title">Waiting for approval</div>
            <div className="tavern-set-card-sub">
              Confirm this code in the browser window in front of UPDATED.
            </div>
          </>
        )}
        <p className="tavern-soft-auth-code tavern-auth-code-lg">
          <strong>{auth.userCode}</strong>
        </p>
        <div className="tavern-approve-actions">
          <button
            type="button"
            className="tavern-approve-btn tavern-approve-allow"
            onClick={() => void auth.continueInBrowser()}
          >
            Continue in browser
          </button>
          <button
            type="button"
            className="tavern-approve-btn"
            onClick={() => auth.cancelSignIn()}
          >
            Cancel
          </button>
        </div>
        <p className="tavern-set-hint tavern-auth-waiting-hint">
          <span className="tavern-auth-spinner" aria-hidden />
          Waiting for approval…
        </p>
      </div>
    );
  }

  // idle
  return (
    <div className={rootClass}>
      {variant === "strip" ? (
        <p className="tavern-soft-auth-text">
          Search and local dictation work without an account. Sign in for hosted
          voice credits and cloud features.
        </p>
      ) : (
        <>
          <div className="tavern-set-card-title">Sign in to UPDATED</div>
          <div className="tavern-set-card-sub">
            Optional for search and local dictation. Required for hosted voice
            credits and cloud features.
          </div>
        </>
      )}
      <button
        type="button"
        className="tavern-gate-btn"
        disabled={auth.signingIn}
        onClick={() => void auth.signIn()}
      >
        Sign in with AGICY
      </button>
      {auth.error ? <p className="tavern-notice">{auth.error}</p> : null}
    </div>
  );
}
