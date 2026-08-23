# Gate 1β€“3 changes (UPDATED fork)

Summary of files touched implementing Gates 1, 2, and 3.

---

## Gate 1 β€” Rebrand + design system

| File | Change |
|------|--------|
| `apps/electron/package.json` | `productName` β†’ UPDATED |
| `apps/electron/src/main/index.ts` | User-visible strings, `app.setName("UPDATED")`, tray tooltip |
| `apps/electron/src/renderer/src/components/panel.tsx` | Panel copy + wordmark |
| `apps/electron/src/renderer/src/components/settings-view.tsx` | Settings labels |
| `apps/electron/src/renderer/src/lib/dictation.ts` | Error strings |
| `apps/electron/src/renderer/src/components/companion.tsx` | Remove glass bubble styles; import updated-design |
| `apps/electron/src/renderer/src/components/notification.tsx` | Drop glass.css import |
| `packages/updated-design/` | **New** β€” token package (`tokens.css`) |
| `apps/electron/src/renderer/src/updated-design.css` | **New** β€” certificate overrides on tavern.css |
| `apps/electron/src/renderer/src/glass.css` | Gutted (retired) |
| `apps/electron/electron.vite.config.ts` | `@updated/design` alias |

**Not changed:** `LICENSE` (still MIT upstream). Internal package names (`@freestyle-voice/*`) unchanged.

---

## Gate 2 β€” Widget shell

| File | Change |
|------|--------|
| `apps/electron/src/shared/widget.ts` | **New** β€” pill/panel geometry, clamp, per-display keys |
| `apps/electron/src/shared/panel.ts` | Panel 420Γ—520, bottom-centre clearance |
| `apps/electron/src/main/index.ts` | Bottom-centre positioning, per-display `widgetPositions`, drag IPC, Escape collapses panel, hold/tap hotkey (220ms tap β†’ toggle panel) |
| `apps/electron/src/preload/index.ts` | `widgetDragMove`, `widgetDragEnd` |
| `apps/electron/src/renderer/src/components/companion.tsx` | Draggable spark handle |

**Partial / not fully wired:**

- Still three Electron windows (companion + panel + notification), not merged single widget
- Companion window remains sprite-sized (256px); pill slot is 180Γ—44 anchor
- Sheet sprites (Jeb) not re-anchored to bottom-centre drag slot
- `Alt+Space` summon shortcut still registered alongside main hotkey tap

---

## Gate 3 β€” Search architecture (no UI)

| File | Change |
|------|--------|
| `docs/SEARCH-ARCHITECTURE.md` | **New** β€” routing, keychain plan, mode switch |
| `packages/search/` | **New** β€” `SearchProvider`, `SearchCitation`, Brave stub |
| `apps/server/src/lib/search/` | **New** β€” mirrored TypeScript interfaces |

**Not implemented (by design):** search UI, keychain IPC, `dictation.ts` branch, HTTP to Brave.

---

## Gate 4 β€” Result rendering + search execution

| File | Change |
|------|--------|
| `packages/search/src/source-class.ts` | **New** β€” domain/citation classifier |
| `packages/search/src/source-class.test.ts` | **New** β€” full vitest coverage |
| `packages/search/src/result-stats.ts` | **New** β€” primary rate + age strip helpers |
| `packages/search/src/result-stats.test.ts` | **New** β€” helper tests |
| `packages/search/src/providers/brave.ts` | Brave Search HTTP provider |
| `packages/search/src/providers/mock.ts` | Dev mock provider (default without key) |
| `packages/search/src/providers/factory.ts` | Provider selection (`UPDATED_SEARCH_MOCK`, env key) |
| `packages/search/vitest.config.ts` | Test runner config |
| `apps/server/src/routes/search.ts` | **New** β€” `POST /api/search` |
| `apps/electron/src/main/search-keychain.ts` | **New** β€” Brave key via Electron `safeStorage` |
| `apps/electron/src/main/index.ts` | `search:query`, keychain IPC, `input-mode:*`, voice search panel open |
| `apps/electron/src/preload/index.ts` | Search + input-mode bridge APIs |
| `apps/electron/src/shared/panel.ts` | `search` panel tab |
| `apps/electron/src/shared/settings-keys.ts` | `input_mode` setting key |
| `apps/electron/src/shared/dictation-prefs.ts` | `inputMode` on prefs |
| `apps/electron/src/renderer/src/lib/dictation.ts` | Minimal `deliverSearch()` branch at `deliver()` |
| `apps/electron/src/renderer/src/lib/search.ts` | Renderer search client |
| `apps/electron/src/renderer/src/components/search-tab.tsx` | **New** β€” query form + mode toggle |
| `apps/electron/src/renderer/src/components/search-results.tsx` | **New** β€” certificate claim cards |
| `apps/electron/src/renderer/src/search-results.css` | **New** β€” Gate 4 certificate layout |
| `apps/electron/src/renderer/src/components/panel.tsx` | Search tab wired |
| `apps/electron/electron.vite.config.ts` | `@updated/search` alias |

**API key storage:** Brave key stored encrypted in main-process userData via `safeStorage` (`search:set-brave-key` IPC). Server route accepts `X-Search-Api-Key` header injected by main on `search:query`. Without a key, `MockSearchProvider` serves deterministic citations (`UPDATED_SEARCH_MOCK=1` forces mock).

**Not fully wired (honest):**

- Hotkey modifier mode flip (Gate 6) β€” mode toggled in Search tab UI only
- Settings UI for Brave API key (Gate 6) β€” IPC exists, no settings panel field yet
- Multi-provider divergence (Gate 5)
- Claim-to-citation mapping is one card per citation + summary card (no LLM claim extraction)

---

## Gate 5 β€” Divergence detection

| File | Change |
|------|--------|
| `packages/search/src/divergence.ts` | **New** β€” Jaccard similarity, `DIVERGENCE_CONTESTED_JACCARD_THRESHOLD` (0.35) |
| `packages/search/src/divergence.test.ts` | **New** β€” Jaccard + CONTESTED tests |
| `packages/search/src/multi-search.ts` | **New** β€” multi-provider orchestration (no merge/vote) |
| `packages/search/src/providers/mock-alt.ts` | **New** β€” second dev provider for divergence demos |
| `packages/search/src/providers/factory.ts` | `createSearchProviders()` returns provider arrays |
| `apps/server/src/lib/search/divergence-log.ts` | **New** β€” append-only JSONL log |
| `apps/server/tests/search-divergence-log.test.ts` | **New** β€” log round-trip test |
| `apps/server/src/routes/search.ts` | Multi-provider search + divergence logging |
| `apps/electron/src/renderer/src/components/search-results.tsx` | CONTESTED banner + per-provider sections |
| `apps/electron/src/renderer/src/components/search-tab.tsx` | Multi-provider response handling |
| `apps/electron/src/renderer/src/lib/search.ts` | Updated response types |
| `apps/electron/src/renderer/src/search-results.css` | CONTESTED / divergence styles |


**Not fully wired (deferred to Gate 6 — completed below):** items listed historically above; Gate 6 implements settings UI for mode, Brave key, provider dual/single, and log export.

---

## Gate 6 — Settings

| File | Change |
|------|--------|
| `apps/electron/src/renderer/src/components/settings-view.tsx` | **Search** settings page — input mode, Brave key, provider dual/single, divergence log export |
| `apps/electron/src/shared/search-settings.ts` | **New** — `parseInputMode`, `parseSearchProviderMode` helpers |
| `apps/electron/src/shared/search-settings.test.ts` | **New** — unit tests for parsers |
| `apps/electron/src/shared/settings-keys.ts` | `search_provider_mode` key |
| `apps/electron/src/main/index.ts` | Clear Brave key IPC; divergence log reveal/path; provider mode header on `search:query`; shared parsers |
| `apps/electron/src/main/search-keychain.ts` | `clearBraveSearchApiKey` returns boolean |
| `apps/electron/src/preload/index.ts` + `index.d.ts` | `reloadHotkey`, clear key, divergence log APIs |
| `apps/server/src/routes/search.ts` | Reads `search_provider_mode` from SQLite / `X-Search-Provider-Mode` |
| `packages/search/src/providers/factory.ts` | `single` option for provider set |
| `apps/server/src/lib/search/divergence-log.ts` | Exported `resolveDivergenceLogPath` |

**Live hotkey rebind:** Dictation hotkey re-registers via `stopHotkeyRecording(accel)` on record complete; saving `hotkey` / `hotkey_mode` also calls `hotkey:reload` so changes take effect without restart.

**Not fully wired (Gates 7–8 / later):**

- Modifier+hotkey mode flip (still panel/settings toggles only)
- Third live search provider (Exa, etc.)
- Divergence log CSV export / in-app viewer (reveal + copy path only)
- Claim-to-citation LLM extraction
- Merged single-widget shell (still three windows)

---

## Verification

```powershell
cd C:\Users\User\Desktop\AGICY.AI\UPDATED
pnpm install
pnpm --filter @updated/search test
pnpm --filter @freestyle-voice/electron exec vitest run src/shared/search-settings.test.ts
pnpm biome check --write apps/electron/src/renderer/src/components/settings-view.tsx apps/electron/src/shared apps/electron/src/main/search-keychain.ts apps/electron/src/preload packages/search/src/providers/factory.ts apps/server/src/routes/search.ts apps/server/src/lib/search
```

Manual smoke:

1. Launch app — companion appears bottom-centre on cursor display
2. Hold hotkey — dictation still records and pastes
3. Settings → Dictation → Change hotkey → new combo works without restart
4. Settings → Search → set input mode to Search → persists after reopen
5. Settings → Search → paste Brave key → Save → status Configured; Clear restores mock
6. Settings → Search → Provider set Single → search shows one provider (no CONTESTED)
7. Settings → Search → Reveal JSONL log → file manager opens on `search-divergence.jsonl`
8. Open panel → Search tab → type query → Enter — claim cards + divergence banner when Dual

---

## Gate 7 — Final pass + README / social image

| File | Change |
|------|--------|
| `README.md` | Rewritten for UPDATED (certificate voice, Gates 1–6 honesty, Freestyle credit, MIT) |
| `docs/assets/updated-github-hero.png` | **Replaced** — 1080×720 editorial hero (&lt;1 MB); people using UPDATED on laptop |
| `docs/assets/updated-github-hero.svg` | **New** — crisp vector banner |
| `apps/electron/.../search-results.tsx` | Drop `role="group"` a11y warning |

**Verification (Gate 7):**

```powershell
pnpm --filter @updated/search test                                          # 26 passed
pnpm --filter @freestyle-voice/electron exec vitest run src/shared/search-settings.test.ts  # 5 passed
cd apps/server; pnpm vitest run tests/search-divergence-log.test.ts         # 1 passed
pnpm biome check packages/search apps/server/src/lib/search apps/server/src/routes/search.ts apps/electron/src/shared/search-settings.ts apps/electron/src/renderer/src/components/search-results.tsx apps/electron/src/renderer/src/components/search-tab.tsx
```

**GitHub social preview (manual):** API cannot set Social preview. Maintainer step:

1. Open https://github.com/AGiOS-Ai-EU/UPDATED/settings
2. Scroll to **Social preview** → **Edit** → **Upload an image…**
3. Upload `docs/assets/updated-github-hero.png` (1080×720, PNG &lt; 1 MB)

**Not fully wired (Gate 8+):** modifier+hotkey mode flip; third live provider; divergence CSV / in-app viewer; LLM claim extraction; single-widget shell merge.

---

## Gate 8 — README usage imagery

| File | Change |
|------|--------|
| `docs/assets/updated-usage-hold-speak.png` | **New** — 1200×675, ~922 KB. Editorial scene: European professionals at desk, hotkey hold + voice question, certificate UI chrome. |
| `docs/assets/updated-usage-search-flow.png` | **New** — 1280×720, ~856 KB. Close-up: keyboard hotkey, waveform, PRIMARY / CONTESTED claim cards. |
| `README.md` | **Usage** section with both images and plain captions |

**Generation:** Cursor `GenerateImage` (certificate/lab prompts; palette from `packages/updated-design/tokens.css` and `updated-github-hero.png` reference). Resized/optimized with Pillow — no SVG companions (raster editorial only).

**GitHub social preview (manual):** Social preview remains a single image. Keep `docs/assets/updated-github-hero.png` as the repo OG unless you upload a composite manually at Settings → Social preview. Usage PNGs are README-only.

---

## Gate 9 — Mobile usage imagery (gala style) — **superseded**

| File | Status |
|------|--------|
| `docs/assets/updated-mobile-hold-speak-1.png` | **Deleted** (Gate 10) |
| `docs/assets/updated-mobile-hold-speak-2.png` | **Deleted** (Gate 10) |
| `docs/assets/updated-mobile-hold-speak-3.png` | **Deleted** (Gate 10) |

Original gala/Dubai close-ups replaced by NY editorial set in Gate 10.

---

## Gate 10 — Mobile usage imagery (NY editorial + composited UI)

| File | Change |
|------|--------|
| `docs/assets/updated-mobile-hold-speak-*.png` | **Removed** via `git rm` |
| `docs/assets/updated-mobile-editorial-1.png` | **New** — 1200×675, ~931 KB. Café interview gesture, Brooklyn bokeh, floating claim cards + PRIMARY 2/5. |
| `docs/assets/updated-mobile-editorial-2.png` | **New** — 1280×720, ~907 KB. Over-shoulder, waveform ribbon, primary rate 1/5. |
| `docs/assets/updated-mobile-editorial-3.png` | **New** — 1280×720, ~763 KB. Hands hero, CONTESTED UI, annotation lines. |
| `scripts/compose-mobile-editorial.py` | **New** — Pillow compositor for certificate UI overlays |
| `README.md` | **Usage → Mobile** rewritten for editorial set |

**Generation:** Hybrid pipeline — Cursor `GenerateImage` for NY editorial base photos (1 attempt each; hands verified acceptable), then programmatic Pillow overlays for pixel-perfect certificate UI (paper `#f8f6f1`, ink `#1a1814`, graphite `#5c5850`, PRIMARY/CONTESTED chips, age strip, annotation rules). No microphones. Wardrobe: camel coat, navy blazer, cream knit — not gala leather.

---

## Gate 11 — Hybrid design (glass shell + certificate content)

| File | Change |
|------|--------|
| `packages/updated-design/tokens.css` | Glass shell tokens (`--updated-glass-*`) documented alongside certificate tokens |
| `apps/electron/src/renderer/src/updated-hybrid-shell.css` | **New** — frosted rail + frame; certificate body zone |
| `apps/electron/src/renderer/src/components/panel-rail.tsx` | **New** — vertical icon rail (Chat, Search, History, Settings, More overflow) |
| `apps/electron/src/renderer/src/components/panel.tsx` | Hybrid layout; horizontal tabs removed |
| `apps/electron/src/renderer/src/updated-design.css` | Import hybrid shell |
| `apps/electron/src/renderer/src/search-results.css` | Comment — claim cards stay certificate |
| `docs/MOBILE-HYBRID-SPEC.md` | **New** — mobile rail + compositor dimensions |
| `docs/DESIGN-REVIEW.md` | Decision: Hybrid section |
| `scripts/compose-mobile-hybrid.py` | **New** — screen-mask clip, glass rail + certificate UI |
| `docs/assets/phone-masks/editorial-3.json` | Mask fractions for compositor |

**Nav change:** Horizontal text tabs → floating left glass rail. Secondary tabs (Todos, Notes, Brain, Apps) in rail **More** menu.

---

## Gate 12 — Mobile README hybrid compositor batch

| File | Change |
|------|--------|
| `docs/assets/updated-mobile-hybrid-1.png` | **New** — 1200×675, ~958 KB. Café interview, Search + PRIMARY cards |
| `docs/assets/updated-mobile-hybrid-2.png` | **New** — 1200×675, ~821 KB. Over-shoulder, waveform + PRIMARY |
| `docs/assets/updated-mobile-hybrid-3.png` | **New** — 1200×675, ~720 KB. Hands hero, CONTESTED |
| `docs/assets/phone-masks/editorial-{1,2,3}.json` | Tuned screen bezels (debug-overlay verified) |
| `scripts/compose-mobile-hybrid.py` | Batch mode, 3 scene variants, screen clip |
| `docs/assets/updated-mobile-editorial-*.png` | **Removed** — superseded by hybrid set |
| `README.md` | Usage → Mobile updated |

**Mask tuning:** Red debug rectangles on NY editorial bases; tightened y1 on images 2–3 to exclude sweater/table bleed.

**Desktop screenshot:** Skipped — dev server not captured in this pass. Capture manually: Search tab with CONTESTED mock, save as `docs/assets/updated-desktop-hybrid-search.png`.

---

## Gate 13 — Search query history (README feature #7)

| File | Change |
|------|--------|
| `packages/search/src/query-history.ts` | **New** — history entry builder, append/dedupe, JSON parse |
| `packages/search/src/query-history.test.ts` | **New** — vitest coverage |
| `packages/search/src/index.ts` | Export query-history helpers |
| `apps/electron/src/main/search-query-history.ts` | **New** — `{userData}/search-query-history.json` persistence |
| `apps/electron/src/main/index.ts` | Record history on successful `search:query`; `search:history-list` / `search:history-clear` IPC |
| `apps/electron/src/preload/index.ts` + `index.d.ts` | History bridge APIs |
| `apps/electron/src/renderer/src/lib/search.ts` | `fetchSearchQueryHistory`, `clearSearchQueryHistory` |
| `apps/electron/src/renderer/src/components/search-tab.tsx` | Recent list + re-run + clear |
| `apps/electron/src/renderer/src/search-results.css` | History list styles |
| `README.md` | Features → Gates 1–7 |
| `docs/ROADMAP.md` | **New** — prioritized gap list |

**Verification:**

```powershell
pnpm --filter @updated/search test
pnpm biome check packages/search/src/query-history.ts apps/electron/src/main/search-query-history.ts apps/electron/src/renderer/src/components/search-tab.tsx
```

Manual smoke: run two searches in Search tab → Recent shows both with CONTESTED/primary metadata → click older row re-runs → Clear empties list.

---

## Gate 14 — README imagery redo (AGICY.Ai + EU privacy + provider SVGs)

| File | Change |
|------|--------|
| `docs/assets/providers/*.svg` | **New** — OpenAI, Anthropic, Groq, Mistral, Cerebras, Brave (search) copied from agicy-platform favicons; `brave-search.svg` simplified mark |
| `scripts/lib/readme_image_lib.py` | **New** — `hex_rgb`, SVG rasterize (cairosvg @2×), privacy chip, co-brand helpers |
| `scripts/compose-mobile-hybrid.py` | AGICY.Ai header/footer, provider icon rows on scenes 1 + 3; tuned `v2-*.json` screen masks |
| `scripts/compose-desktop-usage.py` | **New** — overlays co-brand + privacy + provider icons on desktop usage PNGs; Pillow hero PNG |
| `docs/assets/updated-github-hero.svg` | Co-brand subline, EU privacy chip, local keychain strip |
| `docs/assets/updated-github-hero.png` | Regenerated 1280×640 (~25 KB vector-style raster) |
| `docs/assets/updated-usage-hold-speak.png` | Overlay: **by AGICY.Ai**, EU chip, OpenAI + Brave + Groq icons |
| `docs/assets/updated-usage-search-flow.png` | Overlay: privacy chip; Anthropic + Mistral + Cerebras on CONTESTED card |
| `docs/assets/updated-mobile-hybrid-{1,2,3}.png` | Regenerated — readable hybrid UI clipped in phone; provider SVGs on 1 + 3 |
| `README.md` | Usage captions note AGICY.Ai, EU-hosted · GDPR-aligned, provider marks |

**Readability (export @ 1200×675 / 1280×720, README width 960px):** body equivalent ≥14px (18px serif claims); mono chips ≥11px; privacy footer ≥10px.

**GitHub social preview:** `docs/assets/updated-github-hero.png` (1280×640).

**Provider icons on images:** hold-speak + hybrid-1 (OpenAI, Brave, Groq); search-flow CONTESTED row (Anthropic, Mistral, Cerebras); hybrid-3 (Groq, Anthropic, Mistral). Waveform scene (hybrid-2) intentionally clean.

---

## Gate 15 — Mobile README SVG mockups (replaces photo compositor)

| File | Change |
|------|--------|
| `docs/assets/updated-mobile-search.svg` | **New** — 390×844 Search tab mockup |
| `docs/assets/updated-mobile-voice.svg` | **New** — hold hotkey + waveform + recent history |
| `docs/assets/updated-mobile-contested.svg` | **New** — CONTESTED + dual provider sections |
| `docs/assets/updated-mobile-hybrid-{1,2,3}.png` | **Removed** — broken photo paste |
| `docs/assets/bases/updated-mobile-base-v2-*.png` | **Removed** — editorial bases no longer used |
| `docs/assets/phone-masks/v2-*.json` | **Deprecated** — compositor masks unused |
| `scripts/compose-mobile-hybrid.py` | Marked **DEPRECATED** (reference only) |
| `scripts/render-readme-svgs.py` | **New** — optional SVG→PNG @2× for social preview |
| `README.md` | Mobile Usage uses **PNG** in `<img>` (`updated-mobile-*.png`); SVG sources kept for edit |

**Why compositor failed:** Pillow pasted a 3× virtual UI into fractional phone masks on editorial photos — aspect letterboxing, bezel misalignment, and downscale clipped header/footer text. SVG mockups draw the real hybrid shell (52px rail, 16px frame, 2px certificate cards) with no mask guesswork.

**GitHub README fix (Gate 15b):** Raw repo SVG is served as `Content-Type: text/plain`, so `<img src="*.svg">` showed broken icons on github.com. **Fix:** sanitize SVG (valid UTF-8, strip XML control chars); export PNG @2× (780×1688) via `scripts/render-readme-svgs.py` + resvg-js; README primary format is **PNG**.

---

## Gate 16 — README hero — people using UPDATED

| File | Change |
|------|--------|
| `docs/assets/updated-github-hero.png` | **Replaced** — editorial two-person desk scene; laptop shows hybrid Search UI in-screen (GenerateImage; refs `updated-usage-hold-speak.png`, `updated-mobile-search.png`) |
| `README.md` | Hero alt + subcaption: people using product on laptop |
| `docs/assets/updated-github-hero.svg` | Unchanged abstract vector; **PNG is canonical** for README + Social preview |

**Compositing:** Single-pass GenerateImage editorial (UI rendered on laptop screen in prompt); Pillow resize **1080×720**, PNG optimize (**~1002 KB**).

---

## Gate 17 — Animated README hero — streaming text with app fonts

| File | Change |
|------|--------|
| `docs/assets/updated-github-hero.gif` | **New** — 800×533, 38 frames @ 10 fps, ~4.3 MB; query + claim stream on laptop screen |
| `docs/assets/updated-github-hero.webp` | **New** — ~228 KB loop (optional smaller format) |
| `docs/assets/hero-laptop-mask.json` | Laptop screen bbox (normalized) for UI compositing |
| `docs/assets/fonts/*.ttf` | Newsreader, Instrument Sans, Martian Mono (Google Fonts variable TTF) |
| `scripts/render-hero-animation.py` | **New** — frame renderer; composites hybrid UI into hero mask |
| `README.md` | Hero `<img>` → GIF; static PNG + WebP fallback links in subcaption |
| `docs/assets/updated-github-hero.png` | **Kept** — static fallback + GitHub Social preview |

**Animation beats:** query types “Cyprus annual return” → primary rate **2 / 5** → PRIMARY claim card streams → EU-hosted chip fades in. Editorial photo static; only in-screen UI animates.

**Fonts (match `packages/updated-design/tokens.css`):** Newsreader (claims/rate), Instrument Sans (query/UI), Martian Mono (chips/metadata).

**Mask @ 800×533:** x=129 y=244 w=304 h=188 radius=9 (normalized x0=0.162 y0=0.458 x1=0.542 y1=0.812).

**Regenerate:** `python scripts/render-hero-animation.py`

