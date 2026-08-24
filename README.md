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
  <a href="https://github.com/AGiOS-Ai-EU/UPDATED/releases"><img src="https://img.shields.io/badge/release-0.9.0--beta.3-C9894A?style=flat-square" alt="UPDATED 0.9.0 beta 3" /></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-1A1A2E?style=flat-square" alt="Windows, macOS, Linux" />
  <img src="https://img.shields.io/badge/shell-Electron-1A1A2E?style=flat-square" alt="Electron" />
</p>

# UPDATED

**Hold a hotkey. Speak a question. Read the sources.**

UPDATED is a voice-first desktop search instrument by AGICY.Ai. It turns a spoken or typed question into certificate-style result cards (one card per search citation plus a provider summary) with a primary-source rate and an explicit **CONTESTED** state when providers diverge. Cards format search snippets and titles — there is no LLM claim extraction in this beta.

## Choose your language

[English](https://agicy.ai/updated?lang=en) ·
[简体中文](https://agicy.ai/updated?lang=zh) ·
[हिन्दी](https://agicy.ai/updated?lang=hi) ·
[Deutsch](https://agicy.ai/updated?lang=de) ·
[Español](https://agicy.ai/updated?lang=es) ·
[Ελληνικά](https://agicy.ai/updated?lang=el) ·
[Italiano](https://agicy.ai/updated?lang=it) ·
[Français](https://agicy.ai/updated?lang=fr)

The live page presents the same three-step guide, installer instructions, and security notice in each language.

## Install the beta

Download only from the official [UPDATED Releases](https://github.com/AGiOS-Ai-EU/UPDATED/releases) page or [agicy.ai/updated](https://agicy.ai/updated).

| System | Installer | Default hotkey |
| --- | --- | --- |
| Windows | `UPDATED-0.9.0-beta.3-setup.exe` | Right Alt |
| macOS | `UPDATED-0.9.0-beta.3.dmg` | Fn |
| Linux | `UPDATED-0.9.0-beta.3.AppImage` or `.deb` | Ctrl + Alt + Space |

> [!WARNING]
> Beta builds are unsigned unless published from a signed CI run (see [docs/CODE_SIGNING.md](docs/CODE_SIGNING.md)). Windows SmartScreen and macOS Gatekeeper may warn before opening unsigned installers. Verify that the download comes from `AGiOS-Ai-EU/UPDATED` or agicy.ai.

### Windows

1. Open the downloaded setup file.
2. If SmartScreen appears, choose **More info**, then **Run anyway**.
3. Launch UPDATED and allow microphone access.

### macOS

1. Open the DMG and move UPDATED to Applications.
2. Control-click UPDATED, choose **Open**, then confirm **Open**.
3. Allow Microphone and Accessibility permissions.

### Linux

1. Download the AppImage and mark it executable: `chmod +x UPDATED-*.AppImage`.
2. Open UPDATED. If hold-to-talk requests input access, add your user to the `input` group and sign in again.
3. Allow microphone access.

## First run (beta)

After install, expect this sequence on first launch:

1. **Windows SmartScreen** (or macOS Gatekeeper) — beta builds are unsigned unless CI signing secrets are configured (see [docs/CODE_SIGNING.md](docs/CODE_SIGNING.md)). Use **More info → Run anyway** (Windows) or **Open** from the context menu (macOS).
2. **AGICY sign-in** — the app shows a device code and opens the browser. Complete sign-in at [agicy.ai/updated/my_device](https://agicy.ai/updated/my_device) with your AGICY email, then approve the device.
3. **Microphone** — allow mic access. Hold the platform hotkey and speak.

**Cost (say this before you install):** Voice uses **metered inference credits** on your AGICY account. New accounts receive a free allotment (see [agicy.ai/dashboard/usage](https://agicy.ai/dashboard/usage) after sign-in). Search itself is free; optional Brave Search uses **your** Brave key. The app is not “unlimited free cloud STT.”

Until sign-in completes, the floating companion stays hidden. After sign-in the companion stays **off by default** (Settings → Widget). Prefer the instrument panel over the sprite for beta.

## How voice works (canonical — do not contradict)

Full diagram: [docs/VOICE-DATA-FLOW.md](docs/VOICE-DATA-FLOW.md). Privacy notice draft: [PRIVACY.md](PRIVACY.md).

```
Default:  Mic → UPDATED (on-device whisper.cpp) → transcript  (audio stays on device)
Opt-in:   Mic → UPDATED → Deepgram EU (your API key) → transcript
```

| Mode | Behavior |
| --- | --- |
| Dictation | Hotkey → mic → **local STT (default)** → paste or clipboard (LLM cleanup **only if a cleanup provider is configured**; otherwise raw) |
| Search | Hotkey → mic → **local STT (default)** → multi-provider search → citation cards (LLM cleanup **always off**) |
| Cloud STT | Optional **Deepgram EU BYOK** in Settings → Dictation |
| Local latency | **Batch** after hotkey release — UI shows **Transcribing…** (no live partials in v1) |
| Primary-source rate | Shown as `primary / total`, including `0 / N` |
| CONTESTED | Jaccard similarity below `0.35`; providers remain separated |
| Search history | Last 30 queries stored **locally** |
| Divergence log | Append-only JSONL **locally** — Settings → Search → Reveal / Copy path |
| Brave key | Optional; encrypted with Electron `safeStorage` |

Without a Brave Search API key, mock providers demonstrate the CONTESTED interface locally.

**Product default (combined Phase 1+2):** on-device whisper.cpp — **zero keys / no account** for first successful dictation. Shipping model is **`base-q5_1`** (`ggml-base-q5_1.bin`, **~57 MB** / 59,707,625 bytes) with **sub-2 s cold start**. Optional `small-q5_1` (~181 MiB) is not the default. Deepgram EU BYOK is an accuracy upgrade, not a gate. Spec: [docs/STT-MIGRATION-PLAN.md](docs/STT-MIGRATION-PLAN.md). First dictation: Settings → Dictation → Download model (or auto-download on first hold), then hold hotkey — no account required.

## Third-party services and privacy

**Default voice path is local-first.** Audio leaves the device only if you opt into Deepgram EU BYOK.

| Service | Required for | Data sent |
| --- | --- | --- |
| **On-device whisper.cpp** | Default speech-to-text | None off-device |
| **Deepgram EU** (optional BYOK) | Cloud STT upgrade | Audio + your Deepgram API key (key in `safeStorage`) |
| **AGICY** (`agicy.ai`) | Optional account / billing (not required for first dictation) | Account session when signed in |
| **Brave Search** (optional) | Live web search | Search query text + your API key |

**Freestyle Cloud is not the default voice path.** Existing beta sessions are not silently logged out on upgrade.

Controller: AGICY.Ai (EU) for product/account processing; BYOK Deepgram may place the user as controller for that audio — confirm with counsel ([STT plan §6](docs/STT-MIGRATION-PLAN.md)). Draft product privacy: [PRIVACY.md](PRIVACY.md). Data-subject requests: privacy@agicy.ai.

Search history and divergence logs stay on your machine. Default voice audio stays on your machine.

## Build from source

Requires Node.js 22+, pnpm 10.32.1, and the native compiler toolchain for your operating system.

```powershell
git clone https://github.com/AGiOS-Ai-EU/UPDATED.git
cd UPDATED
pnpm install
pnpm --filter @freestyle-voice/electron run compile:native
pnpm --filter @freestyle-voice/electron run dev
```

Build installers with one of:

```powershell
pnpm --filter @freestyle-voice/electron run build:win
pnpm --filter @freestyle-voice/electron run build:mac
pnpm --filter @freestyle-voice/electron run build:linux
```

## Architecture and status

- [`docs/ARCHITECTURE-MAP.md`](docs/ARCHITECTURE-MAP.md)
- [`docs/SEARCH-ARCHITECTURE.md`](docs/SEARCH-ARCHITECTURE.md)
- [`docs/VOICE-DATA-FLOW.md`](docs/VOICE-DATA-FLOW.md) — **canonical STT / privacy path**
- [`docs/STT-MIGRATION-PLAN.md`](docs/STT-MIGRATION-PLAN.md) — local default + Deepgram BYOK opt-in; Phase 3 deferred
- [`PRIVACY.md`](PRIVACY.md) — GDPR-oriented product disclosure (draft)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)
- [`docs/CHANGES.md`](docs/CHANGES.md)
- [`docs/CODE_SIGNING.md`](docs/CODE_SIGNING.md)

**Not yet wired:** modifier-plus-hotkey mode switching (Settings / Search tab only today), divergence-log Save As export (Reveal + copy exist — ROADMAP P1 day-of-work), a third live search provider, LLM claim extraction, single-window merge, signed installers by default. **On-device STT:** registry/settings scaffold in progress; binary/model restore still open.

## License and credits

[MIT](LICENSE) — same license as upstream [freestyle-voice/freestyle](https://github.com/freestyle-voice/freestyle) (MIT since upstream PR #103, May 2026). See [NOTICE](NOTICE) for attribution and third-party service disclosure.

UPDATED is a derivative fork of Freestyle. Upstream `@freestyle-voice/*` package names and Freestyle Cloud references remain where required for compatibility; the distributed desktop product is **UPDATED**.
