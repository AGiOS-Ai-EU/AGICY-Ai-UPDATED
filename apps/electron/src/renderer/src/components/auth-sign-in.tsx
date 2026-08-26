import type { AgicySignInVia } from "@renderer/lib/agicy-device-url";
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

function GoogleGlyph(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
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

  const start = (via: AgicySignInVia): void => {
    void auth.signIn(via);
  };

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
          voice credits, then connect networks later so UPDATED can draft posts
          and replies for you.
        </p>
      ) : (
        <>
          <div className="tavern-set-card-title">Sign in to UPDATED</div>
          <div className="tavern-set-card-sub">
            Optional for search and local dictation. Required for hosted voice
            credits. Social networks (WhatsApp, Facebook, Instagram) come next —
            so AI can instruct posts and responses across your channels.
          </div>
        </>
      )}

      <div className="tavern-auth-btn-stack">
        <button
          type="button"
          className="tavern-gate-btn"
          disabled={auth.signingIn}
          onClick={() => start("agicy")}
        >
          Login AGICY Members
        </button>
        <button
          type="button"
          className="tavern-gate-btn tavern-gate-btn-secondary"
          disabled={auth.signingIn}
          onClick={() => start("crgpt")}
        >
          Login CRYPTO GPT (CRGPT) Members
        </button>
        <button
          type="button"
          className="tavern-gate-btn tavern-gate-btn-google"
          disabled={auth.signingIn}
          onClick={() => start("google")}
        >
          <GoogleGlyph />
          Continue with Google (Gmail)
        </button>
      </div>

      <div className="tavern-auth-soon">
        <p className="tavern-auth-soon-label">Networks — coming soon</p>
        <div className="tavern-auth-soon-row">
          <button type="button" className="tavern-auth-soon-btn" disabled>
            WhatsApp
          </button>
          <button type="button" className="tavern-auth-soon-btn" disabled>
            Facebook
          </button>
          <button type="button" className="tavern-auth-soon-btn" disabled>
            Instagram
          </button>
        </div>
        <p className="tavern-auth-soon-hint">
          Link channels so UPDATED can draft and instruct posts or replies.
        </p>
      </div>

      {auth.error ? <p className="tavern-notice">{auth.error}</p> : null}
    </div>
  );
}
