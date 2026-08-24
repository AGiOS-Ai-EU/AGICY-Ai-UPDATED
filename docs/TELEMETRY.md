# UPDATED — Telemetry / product analytics

**Status:** current as of `v0.9.0-beta.3` + this change
**Scope:** product analytics and crash reporting only. Voice, STT, and account processing are covered in [PRIVACY.md](../PRIVACY.md) and [docs/VOICE-DATA-FLOW.md](VOICE-DATA-FLOW.md).

> This section belongs in `PRIVACY.md` as a numbered section. It lives here for now because `PRIVACY.md` is being rewritten in parallel on the local-STT branch and the two edits conflict. Fold it in as a `PRIVACY.md` section once that branch lands.

---

## 1. Sub-processor and transfer

| | |
|---|---|
| **Sub-processor** | PostHog |
| **Endpoint** | `https://eu.i.posthog.com` — **European Union** (default; override with `POSTHOG_HOST`) |
| **API key** | From env: `POSTHOG_API_KEY` or `POSTHOG_KEY`. No key is baked into source. Without a key, analytics is inert. |
| **Purpose** | Product analytics and structured crash visibility |
| **Default** | **Off.** Nothing is sent until the user turns it on. |
| **Lawful basis** | Consent (Art. 6(1)(a)), given by the post-dictation prompt or the Settings toggle, and withdrawn by the same toggle |

### EU cutover (2026-08-24 UTC)

On **2026-08-24** the project endpoint switched from PostHog US (`https://us.i.posthog.com`) to PostHog EU (`https://eu.i.posthog.com`).

- The **US project is archived / not migrated**. Historical events stay there on purpose.
- Those historical events contained task names, free-text trade, and account emails that this branch no longer sends. A **continuity gap is intentional** — do not attempt to migrate US PostHog data into the EU project.
- Create a **new EU PostHog project**, then set `POSTHOG_API_KEY` (or `POSTHOG_KEY`) in the environment that runs the embedded server (dev: `apps/electron/.env.local`; packaged builds: inject the same env var at runtime or build time). There is **no existing GitHub Actions secret** for PostHog in this repo — do not invent one until release packaging is wired; the env var name to use when that happens is `POSTHOG_API_KEY`.

PostHog must also be named as a sub-processor in the published agicy.ai privacy notice and in the `PRIVACY.md` roles table.

---

## 2. Opting in and out

### Post-dictation consent (primary)

Consent is **not** asked during first-launch onboarding (mic permission, model download, first dictation). After the **first successful dictation** — once text has appeared at the cursor, in the composer, or in search — UPDATED shows a one-beat, non-blocking card:

- **Share anonymous usage data** → sets `telemetry_enabled=true` and `telemetry_consent_asked=true` (takes effect immediately via `invalidateTelemetrySetting`).
- **Not now** / dismiss → leaves `telemetry_enabled` off (default) and sets `telemetry_consent_asked=true` so the prompt never returns.

Settings keys: `first_dictation_completed`, `telemetry_consent_asked`, `telemetry_enabled`.

### Settings toggle (anytime)

Settings → **Data** → **Share anonymous usage data**.

- The toggle is **off on a fresh install**; a build that has never been touched sends nothing.
- Turning it off takes effect **immediately, without a restart**: the setting write tears down the live PostHog client.
- `DO_NOT_TRACK=1` in the environment disables telemetry unconditionally, regardless of the toggle.
- Non-production builds send nothing unless `FREESTYLE_ANALYTICS_DEV=1` is set.
- If telemetry is already enabled via Settings before the first dictation, the post-dictation card is skipped.

Under the hood the toggle is the SQLite setting `telemetry_enabled`; only the literal string `"true"` enables telemetry.

---

## 3. What is collected when it is on

| Category | Examples |
|---|---|
| Feature events | app installed / updated / launched, panel opened, tab opened, onboarding beat reached / skipped / completed, capabilities opened, suggestion shown / accepted / dismissed, automation applied, connector connected / disconnected, permission prompted / resolved |
| Counts and shapes | message length in characters, number of todos, vocabulary terms imported or deleted, history entries purged, scheduled-task **name length** (never the name), transcription and post-processing duration in ms |
| Configuration ids | STT/LLM provider and model id, sprite id, connector slug (e.g. `gmail`), UI tab id, permission kind, onboarding trade **bucketed to a preset chip or `other`**, setting **key** (never its value) |
| Anonymous identity | a random device UUID generated on this machine; after sign-in, the AGICY **account id** |
| Super properties (attached to every event) | `app_version`, `environment` (`production` / `development`), `os` (platform string), `plan` (`free` / `pro`) |
| Crash / error visibility | structured `app_error` events with enumerated `error_code` (e.g. `whisper_checksum_failed`, `whisper_model_corrupt`) plus safe enums such as `source`, `kind`, `provider`, `model`, `plugin`, `hook`. **No free-text exception messages or stack traces** go to PostHog. `enableExceptionAutocapture` is **off**. |

Full error messages and stacks are always written to the **local log file** for diagnostics. Only the structured upload to PostHog is gated by the toggle.

---

## 4. What is never collected

This is a product commitment, and it is enforced in code: the telemetry relay runs every renderer-supplied property through a content guard (`apps/server/src/lib/telemetry-guard.ts`) that drops any property carrying free text, so a future call site cannot leak content by accident. Crash reporting deliberately does **not** bypass that spirit — `captureException` emits `app_error` with codes only.

- **No transcripts** — no dictated text, no cleaned text.
- **No audio** — no recordings, no buffers.
- **No search queries** and no divergence-log contents.
- **No LLM prompts or completions.**
- **No window titles, application content, or URLs.**
- **No clipboard contents.**
- **No brain files** — no memories, notes, todo text, or evidence-card text.
- **No email address or display name.** Sign-in identifies the person to PostHog by **account id only**; account details stay in AGICY's own systems.
- **No setting values** — only which key changed.
- **No user-written names** — scheduled tasks report a character count, not the task name.
- **No free-text exception messages or stacks** on the wire to PostHog.

---

## 5. Open items

- [ ] Name PostHog as a sub-processor on agicy.ai and in the `PRIVACY.md` roles table.
- [ ] Create the EU PostHog project and set `POSTHOG_API_KEY` for packaged releases (env var documented above; no GitHub secret exists yet).
- [ ] Fold this doc into `PRIVACY.md` once the local-STT branch lands.
