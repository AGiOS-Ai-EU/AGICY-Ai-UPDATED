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

## Gate 4 — Result rendering + search execution

| File | Change |
|------|--------|
| `packages/search/src/source-class.ts` | **New** — domain/citation classifier |
| `packages/search/src/source-class.test.ts` | **New** — full vitest coverage |
| `packages/search/src/result-stats.ts` | **New** — primary rate + age strip helpers |
| `packages/search/src/result-stats.test.ts` | **New** — helper tests |
| `packages/search/src/providers/brave.ts` | Brave Search HTTP provider |
| `packages/search/src/providers/mock.ts` | Dev mock provider (default without key) |
| `packages/search/src/providers/factory.ts` | Provider selection (`UPDATED_SEARCH_MOCK`, env key) |
| `packages/search/vitest.config.ts` | Test runner config |
| `apps/server/src/routes/search.ts` | **New** — `POST /api/search` |
| `apps/electron/src/main/search-keychain.ts` | **New** — Brave key via Electron `safeStorage` |
| `apps/electron/src/main/index.ts` | `search:query`, keychain IPC, `input-mode:*`, voice search panel open |
| `apps/electron/src/preload/index.ts` | Search + input-mode bridge APIs |
| `apps/electron/src/shared/panel.ts` | `search` panel tab |
| `apps/electron/src/shared/settings-keys.ts` | `input_mode` setting key |
| `apps/electron/src/shared/dictation-prefs.ts` | `inputMode` on prefs |
| `apps/electron/src/renderer/src/lib/dictation.ts` | Minimal `deliverSearch()` branch at `deliver()` |
| `apps/electron/src/renderer/src/lib/search.ts` | Renderer search client |
| `apps/electron/src/renderer/src/components/search-tab.tsx` | **New** — query form + mode toggle |
| `apps/electron/src/renderer/src/components/search-results.tsx` | **New** — certificate claim cards |
| `apps/electron/src/renderer/src/search-results.css` | **New** — Gate 4 certificate layout |
| `apps/electron/src/renderer/src/components/panel.tsx` | Search tab wired |
| `apps/electron/electron.vite.config.ts` | `@updated/search` alias |

**API key storage:** Brave key stored encrypted in main-process userData via `safeStorage` (`search:set-brave-key` IPC). Server route accepts `X-Search-Api-Key` header injected by main on `search:query`. Without a key, `MockSearchProvider` serves deterministic citations (`UPDATED_SEARCH_MOCK=1` forces mock).

**Not fully wired (honest):**

- Hotkey modifier mode flip (Gate 6) — mode toggled in Search tab UI only
- Settings UI for Brave API key (Gate 6) — IPC exists, no settings panel field yet
- Multi-provider divergence (Gate 5)
- Claim-to-citation mapping is one card per citation + summary card (no LLM claim extraction)

---

## Gate 5 — Divergence detection

| File | Change |
|------|--------|
| `packages/search/src/divergence.ts` | **New** — Jaccard similarity, `DIVERGENCE_CONTESTED_JACCARD_THRESHOLD` (0.35) |
| `packages/search/src/divergence.test.ts` | **New** — Jaccard + CONTESTED tests |
| `packages/search/src/multi-search.ts` | **New** — multi-provider orchestration (no merge/vote) |
| `packages/search/src/providers/mock-alt.ts` | **New** — second dev provider for divergence demos |
| `packages/search/src/providers/factory.ts` | `createSearchProviders()` returns provider arrays |
| `apps/server/src/lib/search/divergence-log.ts` | **New** — append-only JSONL log |
| `apps/server/tests/search-divergence-log.test.ts` | **New** — log round-trip test |
| `apps/server/src/routes/search.ts` | Multi-provider search + divergence logging |
| `apps/electron/src/renderer/src/components/search-results.tsx` | CONTESTED banner + per-provider sections |
| `apps/electron/src/renderer/src/components/search-tab.tsx` | Multi-provider response handling |
| `apps/electron/src/renderer/src/lib/search.ts` | Updated response types |
| `apps/electron/src/renderer/src/search-results.css` | CONTESTED / divergence styles |

**Not fully wired (deferred to Gate 6):**

- Hotkey modifier mode flip
- Settings UI for Brave API key and provider selection
- Export divergence JSONL from settings
- Third live provider (Exa, etc.) — only Brave + mocks today
- `UPDATED_SEARCH_SINGLE=1` disables divergence (documented escape hatch)

---

## Verification

```powershell
cd C:\Users\User\Desktop\AGICY.AI\UPDATED
pnpm install
pnpm --filter @updated/search test
pnpm biome check --write apps/electron packages/search packages/updated-design apps/server/src/routes/search.ts apps/server/src/lib/search
```

Manual smoke:

1. Launch app — companion appears bottom-centre on cursor display
2. Drag spark — position persists per monitor after restart
3. Tap dictation hotkey quickly — panel toggles without recording
4. Hold hotkey — dictation still records and pastes
5. Escape with panel open — panel hides
6. Visual — no blur/glass on panel or bubbles; paper palette
7. Open panel → **Search** tab → type query → Enter — mock claim cards render with primary rate + age strip
8. Toggle **Search** input mode → hold hotkey → speak query — panel opens on Search tab with results
9. Set Brave key via devtools: `await window.api.setBraveSearchKey('BSA...')` then repeat search (live Brave)
