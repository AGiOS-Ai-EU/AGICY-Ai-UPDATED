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

1. **Windows SmartScreen** (or macOS Gatekeeper) — the beta is unsigned. Use **More info → Run anyway** (Windows) or **Open** from the context menu (macOS). See the install steps above.
2. **AGICY sign-in panel** — the app opens a sign-in window with a device code. Click **Continue in browser** if the browser does not open automatically.
3. **Browser device sign-in** — your browser opens [agicy.ai/updated/my_device](https://agicy.ai/updated/my_device). Sign in with your AGICY email first, confirm the code matches the app, then approve the device. Voice transcription uses hosted Deepgram EU through agicy.ai (inference credits apply).
4. **Microphone** — allow mic access when prompted. Hold the platform hotkey and speak once signed in.

Until sign-in completes, the floating companion sprite stays hidden during the auth gate.

## How it works

1. **Download and install** the desktop beta.
2. **Hold and speak** using the platform hotkey. Select **Search** as the input mode in Settings.
3. **Read sourced results** in the Search panel: claim cards, primary-source rate, freshness, and CONTESTED provider sections.

The app also retains dictation mode: the same speech pipeline can paste transcription into the focused application instead of running a search.

## Search behavior

| Surface | Behavior |
| --- | --- |
| Dictation mode | Hotkey → microphone → Freestyle Cloud STT → paste or clipboard |
| Search mode | Hotkey → microphone → Freestyle Cloud STT → multi-provider search → citation cards |
| Primary-source rate | Shown as `primary / total`, including `0 / N` |
| CONTESTED | Jaccard similarity below `0.35`; providers remain separated |
| Search history | Last 30 queries stored locally and available to re-run |
| Brave key | Optional; encrypted with Electron `safeStorage` |

Without a Brave Search API key, mock providers demonstrate the CONTESTED interface locally.

## Third-party services and privacy

This beta is **not** fully local-first for voice:

| Service | Required for | Data sent |
| --- | --- | --- |
| **Freestyle Cloud** (`freestyle.sh`) | Voice transcription and optional text cleanup | Microphone audio, transcript text, account session |
| **Brave Search** (optional) | Live web search | Search query text and your API key (stored encrypted locally) |

Voice transcription requires a **Freestyle Cloud sign-in** and an internet connection. On-device STT providers present in upstream Freestyle are removed in this fork (database migration v23). Search history and divergence logs stay on your machine; voice data does not.

**Business note:** UPDATED depends on Freestyle Cloud remaining available under its current terms. A service change, outage, or pricing shift would affect dictation and search-voice flows until an alternative STT path is wired.

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
- [`docs/ROADMAP.md`](docs/ROADMAP.md)
- [`docs/CHANGES.md`](docs/CHANGES.md)

Not yet wired: modifier-plus-hotkey mode switching, a third live search provider, in-app divergence-log viewer, LLM claim extraction, single-window merge, and search-result export.

## License and credits

[MIT](LICENSE) — same license as upstream [freestyle-voice/freestyle](https://github.com/freestyle-voice/freestyle) (MIT since upstream PR #103, May 2026). See [NOTICE](NOTICE) for attribution and third-party service disclosure.

UPDATED is a derivative fork of Freestyle. Upstream `@freestyle-voice/*` package names and Freestyle Cloud references remain where required for compatibility; the distributed desktop product is **UPDATED**.
