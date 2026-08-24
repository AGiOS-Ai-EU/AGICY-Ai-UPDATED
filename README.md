<p align="center">
  <img
    alt="UPDATED — voice and sourced evidence"
    src="docs/assets/updated-mark.png"
    width="112"
  />
</p>

<p align="center">
  <img
    alt="UPDATED in three steps: download and install, hold the platform hotkey and speak, then read sourced results"
    src="docs/assets/updated-launch-123.png"
    width="960"
  />
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-64748B?style=flat-square" alt="MIT License" /></a>
  <a href="https://github.com/AGiOS-Ai-EU/UPDATED/releases/tag/v0.9.0-beta.3"><img src="https://img.shields.io/badge/release-0.9.0--beta.3-C9894A?style=flat-square" alt="UPDATED 0.9.0 beta 3" /></a>
  <img src="https://img.shields.io/badge/supported-Windows%20beta-1A1A2E?style=flat-square" alt="Supported desktop: Windows beta" />
  <img src="https://img.shields.io/badge/shell-Electron-1A1A2E?style=flat-square" alt="Electron" />
</p>

# UPDATED

**Hold a hotkey. Speak a question. Read the sources.**

UPDATED is a voice-first desktop search instrument by AGICY.Ai. It turns a spoken or typed question into certificate-style result cards (one card per search citation plus a provider summary) with a primary-source rate and an explicit **CONTESTED** state when providers diverge. Cards format search snippets and titles — there is no LLM claim extraction in this beta.

**Supported desktop for this beta is Windows.** That is the machine we install and test. macOS and Linux files on the GitHub release are CI artifacts, not a supported install path.

## Product page (no public installer)

[English](https://agicy.ai/updated?lang=en) ·
[简体中文](https://agicy.ai/updated?lang=zh) ·
[हिन्दी](https://agicy.ai/updated?lang=hi) ·
[Deutsch](https://agicy.ai/updated?lang=de) ·
[Español](https://agicy.ai/updated?lang=es) ·
[Ελληνικά](https://agicy.ai/updated?lang=el) ·
[Italiano](https://agicy.ai/updated?lang=it) ·
[Français](https://agicy.ai/updated?lang=fr)

[agicy.ai/updated](https://agicy.ai/updated) is the product / language page. **It does not offer public installer downloads** (those buttons were removed). Invited testers pair a device at [agicy.ai/updated/my_device](https://agicy.ai/updated/my_device).

## Install the Windows beta

Current public pre-release: **[UPDATED 0.9.0-beta.3](https://github.com/AGiOS-Ai-EU/UPDATED/releases/tag/v0.9.0-beta.3)**.

Download the Windows installer from GitHub only:

**[UPDATED-0.9.0-beta.3-setup.exe](https://github.com/AGiOS-Ai-EU/UPDATED/releases/download/v0.9.0-beta.3/UPDATED-0.9.0-beta.3-setup.exe)**

An `.msi` (`UPDATED-0.9.0-beta.3.msi`) is attached to the same release. Default Windows hotkey: **Right Alt**.

> [!WARNING]
> This beta installer is **unsigned** unless CI signing secrets were set for that run (see [docs/CODE_SIGNING.md](docs/CODE_SIGNING.md)). **Windows SmartScreen** may warn on first open: **More info → Run anyway**. Verify the file comes from `AGiOS-Ai-EU/UPDATED` on GitHub.

### Windows

1. Download `UPDATED-0.9.0-beta.3-setup.exe` from the release asset URL above.
2. If SmartScreen appears, choose **More info**, then **Run anyway**.
3. Launch UPDATED and allow microphone access after AGICY sign-in.

### Other OS files on the same tag (not supported)

The GitHub pre-release also attaches macOS `.dmg` / `.zip` and Linux `.AppImage` / `.deb`. Those are **untested CI artifacts**. Do not treat them as a supported or smoke-tested product for this beta.

## First run (Windows beta)

1. **SmartScreen** — unsigned setup.exe; **More info → Run anyway** if Windows warns.
2. **AGICY sign-in** — the app shows a device code and should open `https://agicy.ai/updated/my_device?user_code=…` (not vercel.com). Sign in with your AGICY email, confirm the code, approve the device.
3. **Microphone** — allow mic access. Hold **Right Alt** and speak.

**Cost (say this before you install):** Voice uses **metered inference credits** on your AGICY account. New accounts receive a free allotment (see [agicy.ai/dashboard/usage](https://agicy.ai/dashboard/usage) after sign-in). Search itself is free; optional Brave Search uses **your** Brave key. The app is not “unlimited free cloud STT.”

Until sign-in completes, the floating companion stays hidden. After sign-in the companion stays **off by default** (Settings → Widget). Prefer the instrument panel over the sprite for beta.

## How voice works in 0.9.0-beta.3 (canonical)

Full diagram: [docs/VOICE-DATA-FLOW.md](docs/VOICE-DATA-FLOW.md). Privacy notice draft: [PRIVACY.md](PRIVACY.md).

```
Mic → UPDATED app → https://agicy.ai/api/stt/transcribe → Deepgram EU → transcript back to app
```

| Mode | Behavior in this installer |
| --- | --- |
| Dictation | Hotkey → mic → **AGICY hosted STT (Deepgram EU)** → paste or clipboard |
| Search | Hotkey → mic → **AGICY hosted STT (Deepgram EU)** → multi-provider search → citation cards |
| Primary-source rate | Shown as `primary / total`, including `0 / N` |
| CONTESTED | Jaccard similarity below `0.35`; providers remain separated |
| Search history | Last 30 queries stored **locally** |
| Divergence log | Append-only JSONL **locally** — Settings → Search → Reveal / Copy path |
| Brave key | Optional; encrypted with Electron `safeStorage` |

Without a Brave Search API key, mock providers demonstrate the CONTESTED interface locally.

**Not in this installer:** on-device (whisper.cpp) STT. That path is an open PR, not the default in 0.9.0-beta.3. Upstream Freestyle had local STT; this fork removed it in schema migration v23.

**Freestyle Cloud is not the default voice path in beta.3.** Do not treat `freestylevoice.com` or Freestyle STT as where your mic goes. Sign-in is AGICY, not Freestyle.

## Shipping now vs next

| In the **0.9.0-beta.3** Windows installer | Not in this installer (open work) |
| --- | --- |
| AGICY device sign-in + hosted Deepgram EU STT + inference credits | Local whisper default / runtime — [UPDATED PR #11](https://github.com/AGiOS-Ai-EU/UPDATED/pull/11) |
| Unsigned Windows `setup.exe` (SmartScreen may warn) | Telemetry **opt-in**, EU PostHog host, consent UX — [UPDATED PR #12](https://github.com/AGiOS-Ai-EU/UPDATED/pull/12) |
| Client opens whatever `verification_url` the API returns | Extra client harden so Vercel preview URLs never open — [UPDATED PR #13](https://github.com/AGiOS-Ai-EU/UPDATED/pull/13) |

The device page host is minted by **agicy.ai** (platform fix already merged). Old desktop clients still get `https://agicy.ai/updated/my_device?user_code=…` from the live API.

## Third-party services and privacy

This beta is **not** local-first for voice. Audio leaves the device.

| Service | Required for | Data sent |
| --- | --- | --- |
| **AGICY** (`agicy.ai`) | Sign-in + hosted STT + credit metering | Account session, **microphone audio**, usage events |
| **Deepgram EU** (via AGICY) | Speech-to-text | Audio for the transcription request (sub-processor) |
| **Brave Search** (optional) | Live web search | Search query text + your API key (key stored encrypted locally) |
| **PostHog US** (`us.i.posthog.com`) | Anonymous product analytics in this build | Usage events unless you turn telemetry off in settings (`telemetry_enabled`) |

In **0.9.0-beta.3**, analytics default **on** for the packaged app (opt-out via settings), and the bundled host is **US** PostHog. EU hosting, default-off, and consent after first dictation are **not** in this installer.

Controller: AGICY.Ai (EU). Draft product privacy: [PRIVACY.md](PRIVACY.md). Canonical web notice (when published): [agicy.ai/legal/privacy](https://agicy.ai/legal/privacy). Data-subject requests: privacy@agicy.ai.

Search history and divergence logs stay on your machine. Voice audio does not — until local STT ships in a later build.

## Build from source

Requires Node.js 22+, pnpm 10.32.1, and the native compiler toolchain for your operating system.

```powershell
git clone https://github.com/AGiOS-Ai-EU/UPDATED.git
cd UPDATED
pnpm install
pnpm --filter @freestyle-voice/electron run compile:native
pnpm --filter @freestyle-voice/electron run dev
```

Windows installer locally: `pnpm --filter @freestyle-voice/electron run build:win`.

## Architecture and status

- [`docs/ARCHITECTURE-MAP.md`](docs/ARCHITECTURE-MAP.md)
- [`docs/SEARCH-ARCHITECTURE.md`](docs/SEARCH-ARCHITECTURE.md)
- [`docs/VOICE-DATA-FLOW.md`](docs/VOICE-DATA-FLOW.md) — **canonical STT / privacy path**
- [`docs/STT-MIGRATION-PLAN.md`](docs/STT-MIGRATION-PLAN.md) — hosted today; local whisper is planned, not shipped
- [`PRIVACY.md`](PRIVACY.md) — GDPR-oriented product disclosure (draft)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)
- [`docs/CHANGES.md`](docs/CHANGES.md)
- [`docs/CODE_SIGNING.md`](docs/CODE_SIGNING.md)

**Not in this Windows beta:** on-device STT, signed installers by default, telemetry opt-in / EU PostHog, modifier-plus-hotkey mode switching (Settings / Search tab only today), a third live search provider, in-app divergence-log viewer, LLM claim extraction, single-window merge, search-result CSV export.

## License and credits

[MIT](LICENSE) — same license as upstream [freestyle-voice/freestyle](https://github.com/freestyle-voice/freestyle) (MIT since upstream PR #103, May 2026). See [NOTICE](NOTICE) for attribution and third-party service disclosure.

UPDATED is a derivative fork of Freestyle. Upstream `@freestyle-voice/*` package names remain where required for compatibility; the distributed desktop product is **UPDATED**.
