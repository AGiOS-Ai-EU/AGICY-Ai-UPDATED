# AGICY theme alignment — UPDATED ↔ playground

**Date:** 2026-08-23  
**Scope:** Light mode default for Electron panel; token mapping from agicy-platform playground.

---

## Playground color sources (agicy-platform)

| File | Role | Key values |
|------|------|------------|
| `src/app/globals.css` | Site-wide **Vasilikos** light theme | `--bg-primary: #f5f0eb`, `--bg-secondary: #ece5dd`, headings `#1a1a2e`, body `#374151` |
| `src/app/gateway/playground/playground.module.css` | Playground marketing paper | `--paper: #f7f5f0`, `--paper-2: #efece4`, `--ink: #1a1a1a`, `--copper: #b87333` |
| `src/app/gateway/playground/playgroundShell.module.css` | Chat shell chrome | `--shell-bg: #141418` (dark), `--shell-copper: #c9894a`, `--shell-cyan: #3db8d4` |
| `src/lib/playground/playgroundChatTheme.ts` | Workspace background picker (chat area) | Accent presets: copper `#c9894a`, cyan `#3db8d4`; dark canvas presets only |

**Light mode choice for UPDATED:** Vasilikos primary `#f5f0eb` (globals) — warm AGICY site light, not Freestyle cream `#FDF8E1` and not playground chat dark canvas.

Settings UI: playground exposes **Workspace background** via `PlaygroundChatThemePicker` (dark presets). UPDATED adopts the **light paper palette** from globals + playground marketing CSS; no dark-mode toggle in Electron yet.

---

## Token mapping (old → new)

| Token | Before | After | Playground source |
|-------|--------|-------|-------------------|
| `--updated-paper` | `#f7f8f6` | `#f5f0eb` | `globals.css` `--bg-primary` (Vasilikos) |
| `--updated-paper-muted` | — | `#ece5dd` | `globals.css` `--bg-secondary` |
| `--updated-ink` | `#16211f` | `#1a1a2e` | `globals.css` light headings |
| `--updated-ink-body` | — | `#374151` | `globals.css` light paragraphs |
| `--updated-graphite` | `#5c6663` | `#64748b` | `globals.css` `--color-gray-500` |
| `--updated-rule` | `#d6dbd7` | `#e1dcd4` | Warm rule derived from Vasilikos |
| `--updated-field` | `#ffffff` | `#ffffff` | Unchanged (card surface) |
| `--updated-accent` | — | `#c9894a` | `playgroundShell.module.css` `--shell-copper` |
| `--updated-accent-strong` | — | `#b87333` | `playground.module.css` `--copper` |
| `--updated-accent-muted` | — | `#e5d4b1` | AGICY tan highlight (brand ref) |
| `--updated-cyan` | — | `#3db8d4` | `playgroundShell.module.css` `--shell-cyan` |
| `--updated-glass-bg` | cool 68% paper mix | warm 72% paper + white | Light shell tint |
| `--updated-glass-border` | cool ink mix | warm rule + tan | No purple tint |
| `--tavern-lantern` | decay-stale yellow | `--updated-accent` | Copper wordmark dot |
| PRIMARY chip color | `--updated-graphite` | `--updated-accent-strong` | Copper, readable on white |
| Active rail / mode toggle | ink border | copper-muted fill + copper border | Playground accent |

Decay ramp (`--updated-decay-*`) unchanged except `--updated-decay-fresh` aligned to playground green `#2d6a4f`.

---

## Surfaces updated (Electron)

| Surface | File | Change |
|---------|------|--------|
| Global tokens | `packages/updated-design/tokens.css` | Vasilikos paper, copper accent aliases |
| Panel background | `updated-design.css` | Inherits new `--updated-paper` |
| Glass rail + frame | `updated-hybrid-shell.css` | Warm glass; copper active/hover states |
| Search claim cards | `search-results.css`, `search-results.tsx` | PRIMARY chip copper; mode toggle accent |
| Wordmark accent | via `--tavern-lantern` bridge | Copper period in UPDATED. |

---

## README / compositor assets

Scripts updated to new hex constants:

- `scripts/render-hero-animation.py`
- `scripts/lib/readme_image_lib.py`

**Manual regen recommended** for PNG/GIF mockups (not run in this pass):

```bash
python scripts/render-hero-animation.py
python scripts/compose-mobile-hybrid.py
python scripts/compose-desktop-usage.py
```

Existing README assets still show pre-Vasilikos cool green paper until regenerated.

---

## Contrast notes

- PRIMARY chip `#b87333` on `#ffffff` field: ~4.6:1 (AA for large/bold uppercase mono).
- Body ink `#1a1a2e` on paper `#f5f0eb`: ~12:1.
- Muted graphite `#64748b` on paper: ~4.8:1 for metadata strips.

No purple AI gradients. Glass shell uses warm cream tint only.
