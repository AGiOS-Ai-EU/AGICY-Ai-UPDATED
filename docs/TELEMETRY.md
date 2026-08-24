# UPDATED — Telemetry / product analytics

**Status:** current as of `v0.9.0-beta.3` + this change
**Scope:** product analytics and crash reporting only. Voice, STT, and account processing are covered in [PRIVACY.md](../PRIVACY.md) and [docs/VOICE-DATA-FLOW.md](VOICE-DATA-FLOW.md).

> This section belongs in `PRIVACY.md` as a numbered section. It lives here for now because `PRIVACY.md` is being rewritten in parallel on the local-STT branch and the two edits conflict. Fold it in as a `PRIVACY.md` section once that branch lands.

---

## 1. Sub-processor and transfer

| | |
|---|---|
| **Sub-processor** | PostHog |
| **Endpoint** | `https://us.i.posthog.com` — **United States** |
| **Purpose** | Product analytics and crash reporting |
| **Default** | **Off.** Nothing is sent until the user turns it on. |
| **Lawful basis** | Consent (Art. 6(1)(a)), given by the toggle and withdrawn by the same toggle |

Because the project is addressed on PostHog's **US** endpoint, enabling this setting transfers the data below **outside the EEA**. That transfer needs SCCs or another appropriate safeguard listed on agicy.ai before 1.0. Switching the host to PostHog's EU region (`https://eu.i.posthog.com`) is a one-line change in `apps/server/src/lib/posthog.ts` and removes the transfer question entirely — recommended.

PostHog must also be named as a sub-processor in the published agicy.ai privacy notice and in the `PRIVACY.md` roles table.

---

## 2. Opting in and out

Settings → **Data** → **Share anonymous usage data**.

- The toggle is **off on a fresh install**; a build that has never been touched sends nothing.
- Turning it off takes effect **immediately, without a restart**: the setting write tears down the live PostHog client, which also silences exception autocapture.
- `DO_NOT_TRACK=1` in the environment disables telemetry unconditionally, regardless of the toggle.
- Non-production builds send nothing unless `FREESTYLE_ANALYTICS_DEV=1` is set.

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
| Crash reports | error **message and stack trace**, plus a source label. `enableExceptionAutocapture: true` is set, so unhandled exceptions in the server process are reported automatically in addition to those reported explicitly. Stack traces name file paths and function names from the app bundle, and an error message can quote whatever the throwing code put in it. |

Crash reports are always written to the local log file for diagnostics. Only the upload to PostHog is gated by the toggle.

---

## 4. What is never collected

This is a product commitment, and it is enforced in code: the telemetry relay runs every renderer-supplied property through a content guard (`apps/server/src/lib/telemetry-guard.ts`) that drops any property carrying free text, so a future call site cannot leak content by accident.

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

---

## 5. Open items

- [ ] Name PostHog as a sub-processor on agicy.ai and in the `PRIVACY.md` roles table.
- [ ] Move analytics to PostHog's EU endpoint, or document the US transfer safeguard.
- [ ] Consider a first-run consent prompt so the opt-in is offered rather than buried in Settings.
- [ ] Review whether `enableExceptionAutocapture` should stay on, given error messages are free text that the guard does not police (crash reporting deliberately bypasses it — a stack trace is the point).
