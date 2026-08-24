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
| **API key** | From env: `POSTHOG_API_KEY` or `POSTHOG_KEY`. Nothing is committed in git. Packaged installers receive the **project** key (`phc_…`) at electron-vite build time from GitHub Actions secret `POSTHOG_API_KEY`. Without a key, analytics is inert. **Never use a personal API key (`phx_…`).** |
| **Purpose** | Product analytics and structured crash visibility |
| **Default** | **Off.** Nothing is sent until the user turns it on. |
| **Lawful basis** | Consent (Art. 6(1)(a)), given by the post-dictation prompt or the Settings toggle, and withdrawn by the same toggle |

### EU cutover (2026-08-24 UTC)

On **2026-08-24** the project endpoint switched from PostHog US (`https://us.i.posthog.com`) to PostHog EU (`https://eu.i.posthog.com`).

- The **US project is archived / not migrated**. Historical events stay there on purpose.
- Those historical events contained task names, free-text trade, and account emails that this branch no longer sends. A **continuity gap is intentional** — do not attempt to migrate US PostHog data into the EU project.
- PostHog must also be named as a sub-processor in the published agicy.ai privacy notice and in the `PRIVACY.md` roles table.

### Human cutover steps (one-time)

Do this before the next beta that should actually emit EU analytics. The plumbing is in CI; the secret value is not.

1. In [PostHog EU](https://eu.posthog.com), create a **new project** (EU cloud, not US).
2. Open **Project settings** and copy the **project API key**. It starts with `phc_`.
   - **Never use a personal API key** (`phx_…`). Personal keys authenticate a human against the PostHog API and must not be shipped in the desktop app or stored as this secret.
3. In GitHub: repo **Settings → Secrets and variables → Actions → New repository secret**.
   - Name: `POSTHOG_API_KEY`
   - Value: the `phc_…` project key from step 2.
   - Optional: secret `POSTHOG_HOST` if you ever need to override the code default `https://eu.i.posthog.com`. Leave unset for EU.
4. In PostHog US, **archive the old project**. Do not migrate events.
5. Re-run **Publish desktop beta** (`.github/workflows/beta-release.yml`). Installers built before the secret existed stay inert even if the user opts in.

### How the key reaches the packaged server

The embedded server is **in-process** in Electron main (`startFreestyleServer` from `@freestyle-voice/server`). It is not a child process with its own env file.

| Path | How `POSTHOG_API_KEY` is set |
|---|---|
| **Dev** | Copy `apps/electron/.env.example` → `apps/electron/.env.local` (gitignored). Main loads it via `process.loadEnvFile('.env.local')` when `NODE_ENV !== 'production'`. The in-process server inherits `process.env`. |
| **Packaged release** | `.env.local` is **not** loaded (that block is dead-code-eliminated) and electron-builder **excludes** `.env*`. GitHub Actions secret `POSTHOG_API_KEY` is passed as env to `electron-vite build` (same pattern as `CSC_LINK` / Apple notarization env). Vite inlines it as `__UPDATED_POSTHOG_API_KEY__`; `applyPackagedTelemetryEnv()` copies it onto `process.env` before the server starts. |
| **Missing secret** | Analytics stays inert. The beta-release validate job warns; it only **fails** if the secret looks like a personal key (`phx_`). |

### Local development

```bash
cp apps/electron/.env.example apps/electron/.env.local
# Uncomment POSTHOG_API_KEY=phc_… (EU project key) and set FREESTYLE_ANALYTICS_DEV=1
```

`.env.local` is gitignored and is **not** packed into installers. A local `pnpm run build:win` (etc.) only bakes a key if `POSTHOG_API_KEY` is already in that shell.

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
- [ ] Human: create the EU PostHog project, add GitHub secret `POSTHOG_API_KEY` (`phc_…` project key only), archive the US project — see **Human cutover steps** above. Plumbing is in this branch; the secret value is not.
- [ ] Fold this doc into `PRIVACY.md` once the local-STT branch lands.
