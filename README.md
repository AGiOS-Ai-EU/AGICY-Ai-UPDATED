<p align="center">
  <img
    alt="UPDATED by AGICY.Ai — voice-driven search, certificate-grade sources, EU-hosted"
    src="docs/assets/updated-github-hero.png"
    width="960"
  />
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-5C6663?style=flat-square" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-16211F?style=flat-square" alt="Platform" />
  <img src="https://img.shields.io/badge/shell-Electron-16211F?style=flat-square" alt="Electron" />
  <a href="docs/ARCHITECTURE-MAP.md"><img src="https://img.shields.io/badge/docs-architecture-5C6663?style=flat-square" alt="Architecture" /></a>
</p>

# UPDATED

**Hold a hotkey. Speak a question. Read the sources.**

UPDATED is a desktop search instrument: voice in, certificate-style claim cards out — with a plain primary-source rate and an honest CONTESTED state when providers diverge.

Fork of [Freestyle](https://github.com/freestyle-voice/freestyle). Product name and design system are UPDATED; the dictation paste path remains intact.

---

## What it is

| Surface | Behavior |
|---------|----------|
| **Dictation mode** | Hold hotkey → mic → STT → paste/clipboard (unchanged Freestyle path) |
| **Search mode** | Hold hotkey → mic → STT → multi-provider search → claim cards in the panel |
| **Claim cards** | Newsreader claim text, Martian Mono state chips, hairline source strip |
| **Primary-source rate** | Stated as `primary / total` — including `0 / N` and “No primary sources found.” |
| **CONTESTED** | Jaccard similarity across providers below 0.35 — results never merged or voted |
| **Settings** | Live hotkey rebind, input mode, Brave API key (encrypted), dual/single providers, divergence log reveal |

Design tokens live in `packages/updated-design` — paper, ink, graphite, 2px radius, 0.5px hairlines. No glassmorphism.

---

## Usage

Hold the dictation hotkey (default **Right Alt**), speak your question, then read claim cards in the panel **Search** tab. In **Search** input mode the same hotkey routes STT output to search instead of paste.

<p align="center">
  <img
    alt="Two professionals at a desk — hold Right Alt, speak, read certificate claim cards (UPDATED by AGICY.Ai)"
    src="docs/assets/updated-usage-hold-speak.png"
    width="960"
  />
  <br />
  <sub>Hold hotkey → speak → claim cards. EU-hosted · GDPR-aligned; Brave key in safeStorage.</sub>
</p>

<p align="center">
  <img
    alt="Close-up: Right Alt hotkey, waveform, PRIMARY and CONTESTED cards with provider marks"
    src="docs/assets/updated-usage-search-flow.png"
    width="960"
  />
  <br />
  <sub>Certificate cards with PRIMARY / CONTESTED chips; mock ↔ mock-alt divergence when no Brave key.</sub>
</p>

Typed queries in the Search tab work the same way — voice is the primary path shown here.

### Mobile

Same flow on phone: hold the hotkey, speak, read claim cards. **Hybrid panel mockups (SVG)** below match the Electron Search tab — glass rail + certificate content, not photo compositing.

<p align="center">
  <img alt="Search results — Cyprus annual return, PRIMARY 2/5, claim card" src="docs/assets/updated-mobile-search.svg" width="960" />
  <br />
  <sub>Hybrid panel mockup (SVG) — Search tab; EU-hosted · GDPR-aligned.</sub>
</p>

<p align="center">
  <img alt="Hold hotkey voice path — waveform, recent history, primary 1/5" src="docs/assets/updated-mobile-voice.svg" width="960" />
  <br />
  <sub>Voice / hotkey — query history row (feature #7); single focal state.</sub>
</p>

<p align="center">
  <img alt="CONTESTED — mock vs mock-alt, two provider sections" src="docs/assets/updated-mobile-contested.svg" width="960" />
  <br />
  <sub>CONTESTED divergence — provider SVG marks, one claim card per section.</sub>
</p>

---

## Quick start

```powershell
git clone https://github.com/AGiOS-Ai-EU/UPDATED.git
cd UPDATED
pnpm install
pnpm --filter @freestyle-voice/electron run compile:native
pnpm --filter @freestyle-voice/electron run dev
```

**Windows notes**

- Default dictation hotkey is **Right Alt** (see Settings → Dictation to rebind live).
- Native helpers need a working C++ toolchain for `compile:native` on first run.
- Without a Brave Search API key, dual **mock** providers demonstrate CONTESTED results in the Search tab.

Optional: Settings → Search → paste a Brave Search key → Save (stored via Electron `safeStorage`, never in SQLite).

---

## Features (Gates 1–7)

- Certificate design system (Newsreader / Instrument Sans / Martian Mono)
- Bottom-centre widget positioning with per-display persistence
- Search contracts + Brave HTTP provider + mock / mock-alt pair
- Panel **Search** tab with claim cards, age strip, primary-source rate
- Divergence detection + JSONL log at `{userData}/logs/search-divergence.jsonl`
- Settings: hotkey rebind, mode switch, Brave key, provider dual/single, log reveal
- **Search query history** — last 30 queries in the Search tab (CONTESTED flag + primary rate); click to re-run; stored locally in `{userData}/search-query-history.json`

Architecture: [`docs/ARCHITECTURE-MAP.md`](docs/ARCHITECTURE-MAP.md) · Search: [`docs/SEARCH-ARCHITECTURE.md`](docs/SEARCH-ARCHITECTURE.md) · Roadmap: [`docs/ROADMAP.md`](docs/ROADMAP.md) · Changelog: [`docs/CHANGES.md`](docs/CHANGES.md)

Vector banner (crisp): [`docs/assets/updated-github-hero.svg`](docs/assets/updated-github-hero.svg)

---

## Not yet wired

Honest backlog for later gates (see [`docs/ROADMAP.md`](docs/ROADMAP.md)):

- Modifier + hotkey flip for input mode (settings / Search tab toggles exist today)
- Third live search provider (e.g. Exa)
- Divergence CSV / in-app log viewer (reveal + copy path only)
- LLM claim extraction (one card per citation + summary today)
- Single merged widget window (still companion + panel + notification)
- Export search results (JSON/CSV)

---

## License

[MIT](LICENSE) — same license as the upstream Freestyle checkout in this repository.

## Credits

UPDATED is a fork of [freestyle-voice/freestyle](https://github.com/freestyle-voice/freestyle). Upstream product names (`@freestyle-voice/*` packages) are retained for compatibility; the shipped desktop product name is **UPDATED**.
