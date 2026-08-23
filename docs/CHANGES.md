# Gate 1–3 changes (UPDATED fork)

Summary of files touched implementing Gates 1, 2, and 3.

---

## Gate 1 — Rebrand + design system

| File | Change |
|------|--------|
| `apps/electron/package.json` | `productName` → UPDATED |
| `apps/electron/src/main/index.ts` | User-visible strings, `app.setName("UPDATED")`, tray tooltip |
| `apps/electron/src/renderer/src/components/panel.tsx` | Panel copy + wordmark |
| `apps/electron/src/renderer/src/components/settings-view.tsx` | Settings labels |
| `apps/electron/src/renderer/src/lib/dictation.ts` | Error strings |
| `apps/electron/src/renderer/src/components/companion.tsx` | Remove glass bubble styles; import updated-design |
| `apps/electron/src/renderer/src/components/notification.tsx` | Drop glass.css import |
| `packages/updated-design/` | **New** — token package (`tokens.css`) |
| `apps/electron/src/renderer/src/updated-design.css` | **New** — certificate overrides on tavern.css |
| `apps/electron/src/renderer/src/glass.css` | Gutted (retired) |
| `apps/electron/electron.vite.config.ts` | `@updated/design` alias |

**Not changed:** `LICENSE` (still MIT upstream). Internal package names (`@freestyle-voice/*`) unchanged.

---

## Gate 2 — Widget shell

| File | Change |
|------|--------|
| `apps/electron/src/shared/widget.ts` | **New** — pill/panel geometry, clamp, per-display keys |
| `apps/electron/src/shared/panel.ts` | Panel 420×520, bottom-centre clearance |
| `apps/electron/src/main/index.ts` | Bottom-centre positioning, per-display `widgetPositions`, drag IPC, Escape collapses panel, hold/tap hotkey (220ms tap → toggle panel) |
| `apps/electron/src/preload/index.ts` | `widgetDragMove`, `widgetDragEnd` |
| `apps/electron/src/renderer/src/components/companion.tsx` | Draggable spark handle |

**Partial / not fully wired:**

- Still three Electron windows (companion + panel + notification), not merged single widget
- Companion window remains sprite-sized (256px); pill slot is 180×44 anchor
- Sheet sprites (Jeb) not re-anchored to bottom-centre drag slot
- `Alt+Space` summon shortcut still registered alongside main hotkey tap

---

## Gate 3 — Search architecture (no UI)

| File | Change |
|------|--------|
| `docs/SEARCH-ARCHITECTURE.md` | **New** — routing, keychain plan, mode switch |
| `packages/search/` | **New** — `SearchProvider`, `SearchCitation`, Brave stub |
| `apps/server/src/lib/search/` | **New** — mirrored TypeScript interfaces |

**Not implemented (by design):** search UI, keychain IPC, `dictation.ts` branch, HTTP to Brave.

---

## Verification

```powershell
cd C:\Users\User\Desktop\AGICY.AI\UPDATED
pnpm biome check --write apps/electron packages/search packages/updated-design apps/server/src/lib/search
```

Manual smoke:

1. Launch app — companion appears bottom-centre on cursor display
2. Drag spark — position persists per monitor after restart
3. Tap dictation hotkey quickly — panel toggles without recording
4. Hold hotkey — dictation still records and pastes
5. Escape with panel open — panel hides
6. Visual — no blur/glass on panel or bubbles; paper palette
