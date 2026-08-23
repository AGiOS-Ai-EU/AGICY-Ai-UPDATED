# UPDATED — Architecture map (Gate 0)

> **Status:** Gate 0 complete — awaiting approval before Phase 2 (rebrand / design system).
> **Repo:** Fork of [freestyle-voice/freestyle](https://github.com/freestyle-voice/freestyle), working name **UPDATED**.
> **Agent rule:** Do not proceed past this gate without explicit approval.

---

## 1. Monorepo map

**Toolchain:** pnpm workspaces (`pnpm-workspace.yaml`) + Turbo (`turbo.json`), **Biome** (lint/format), **husky** + nano-staged. Do **not** add ESLint or Prettier.

| Path | Package / role |
|------|----------------|
| `apps/electron/` | **Desktop shell** — Electron main, preload, three renderer windows |
| `apps/server/` | Local Hono API (default port **4649**), WebSocket streaming STT, plugins, agent |
| `apps/mobile/` | Expo React Native (out of scope for desktop widget work) |
| `apps/docs/` | Mintlify documentation site |
| `packages/sdk/` | `freestyle-voice` — plugin contract and pipeline hooks |
| `packages/stt/` | Transcript sanitization helpers |
| `packages/validations/` | Shared Zod schemas |
| `packages/utils/` | Logging, shared utilities |
| `packages/create-freestyle-plugin/` | Plugin scaffolding CLI |
| `plugins/*` | Example plugins (audio-transcription, emoji, profanity-filter) |
| `templates/*` | Plugin starter templates |
| `specs/` | Internal design/audit notes (not user docs) |
| `docs/` | User/contributor docs + superpowers specs |

### `freestyle-design`

**Not present in this checkout.** `biome.json` excludes a path named `freestyle-design`, but no such directory exists. Design tokens today live in:

| File | Role |
|------|------|
| `DESIGN.md` | Upstream design brief (warm paper, editorial, **explicitly rejects glassmorphism**) |
| `apps/electron/src/renderer/src/tavern.css` | **Active** runtime CSS (~4k lines, “tavern” theme) |
| `apps/electron/src/renderer/src/overlay.css` | Transparent window roots |
| `apps/electron/src/renderer/src/glass.css` | **Fork-only** glass overlay (conflicts with Gate 1 brief — remove or gate in Phase 2) |

Gate 1 asks to replace tokens in `freestyle-design`; **first step is either add that package or retarget `tavern.css` + a new `updated-design` token file** — decide before Phase 2.

---

## 2. Shell: Electron (not Tauri)

**Confirmed:** zero Rust application code. Native helpers are C++ (`apps/electron/native/`, built via `compile:native`).

| Layer | Location |
|-------|----------|
| **Main process** | `apps/electron/src/main/index.ts` (~4.4k lines) — windows, hotkeys, IPC, paste, server spawn |
| **Preload bridge** | `apps/electron/src/preload/index.ts` — `contextBridge` → `window.api` |
| **Renderers** | Three HTML entrypoints under `apps/electron/src/renderer/` |

### Desktop windows (current architecture)

| Window | HTML | Component | Purpose |
|--------|------|-----------|---------|
| Companion | `companion.html` | `components/companion.tsx` | Floating spark/sprite + dictation bubble |
| Panel | `panel.html` | `components/panel.tsx` | Chat, settings, connectors, scheduled tasks |
| Notification | `notification.html` | `components/notification.tsx` | Toast stack |

All three: `frame: false`, `transparent: true`, `alwaysOnTop: true`, `skipTaskbar: true` (see `createPanelWindow`, `createCompanionWindow` in main `index.ts`).

**Gate 3 goal** (single widget, pill ↔ panel) **does not match current architecture** — it is three windows today. Phase 3 must merge or tightly coordinate companion + panel behaviour.

---

## 3. IPC / command layer (UI ↔ backend)

| Boundary | File | Mechanism |
|----------|------|-----------|
| Renderer → Main | `apps/electron/src/preload/index.ts` | `ipcRenderer.invoke` / `send` |
| Main handlers | `apps/electron/src/main/index.ts` | `ipcMain.handle` / `ipcMain.on` |
| Renderer → Server | `apps/electron/src/renderer/src/lib/api.ts` | Hono typed client `getClient()` + `apiFetch()` |
| Server app | `apps/server/src/index.ts` | `createApp()`, routes mounted in `routes/index.ts` |

Key IPC channels for dictation:

- `hotkey:down` / `hotkey:up` — main → companion renderer
- `paste:text` / `copy:text` — renderer → main → `pasteIntoFocusedApp()` in `paste.ts`
- `permissions:check-mic`, `permissions:request-mic`, `permissions:check-accessibility`
- `server:port`, `server:url`, `server:set-url`, `server:token`
- `dictation:state`, `dictation:cancel`, `transcription:done`

---

## 4. Global hotkey

| Concern | File |
|---------|------|
| Default accelerator | `apps/electron/src/shared/hotkey-defaults.ts` — Fn (macOS), RightAlt (Windows), Control+Alt+Space (Linux) |
| Registration | `apps/electron/src/main/index.ts` — `registerHotkey()`, `NativeKeyListener`, fallback `globalShortcut` |
| Down/up handlers | `handleNativeHotkeyDown()` / `handleNativeHotkeyUp()` → `sendHotkeyDown()` / `sendHotkeyUp()` |
| Settings reload | IPC `hotkey:update`, `hotkey:reload`, `hotkey-record:*` via `hotkey-recorder.ts` |
| Recording chord | `apps/electron/src/main/hotkey-utils.ts`, `normalizeAccelerator()` |

Panel summon uses a **separate** shortcut (`registerSummonShortcut()`).

---

## 5. Transcription providers (this fork)

**Important:** Upstream README/marketing may list OpenAI, Groq, Anthropic, Deepgram, ElevenLabs, etc. **This fork’s runtime registry has been reduced:**

| File | Finding |
|------|---------|
| `apps/server/src/lib/streaming/registry.ts` | **Only** `FreestyleCloudTranscriptionProvider` registered |
| `apps/server/src/lib/streaming-stt.ts` | `getApiKeyForProvider()` returns session token for `freestyle-cloud` only |
| `apps/server/src/lib/schema.ts` | Migration deletes non–`freestyle-cloud` `model_configs` and legacy API key settings |

**Auth / secrets today:** Freestyle Cloud **device OAuth** → session row in SQLite (`apps/server/src/lib/sessions.ts`). Not OS keychain in this fork’s server path. `keytar` appears in lockfile (Electron transitive) but is **not** used in app code grep.

Gate 4 search provider keys should follow **whatever secret mechanism we add** — likely keytar or Electron `safeStorage` in main, proxied via IPC — because Freestyle Cloud session storage is not the same as BYOK API keys.

Historical provider code still appears in tests (`vocabulary-bias.ts`, `transcribe-bias.ts`) for when BYOK returns.

---

## 6. Data flow: hotkey press → pasted text

One line per step, file path only:

1. User presses hotkey → `apps/electron/src/main/index.ts` (`NativeKeyListener` / `globalShortcut`)
2. Permission gate at hotkey down → `getMissingDictationPermission()` → `sendHotkeyDown()` (same file)
3. Companion repositioned to cursor/focus display → `anchorCompanionForDictation()` → `positionDictationWindows()` (same file)
4. IPC `hotkey:down` → `apps/electron/src/preload/index.ts` → companion renderer
5. Companion hook → `apps/electron/src/renderer/src/components/companion.tsx` (`useDictation`, `onHotkeyDown`)
6. Start capture → `apps/electron/src/renderer/src/lib/dictation.ts` (`DictationController.start()`)
7. Mic stream → `apps/electron/src/renderer/src/lib/recorder.ts` (`acquireStream` — **getUserMedia at record time**)
8. WebSocket stream → `apps/electron/src/renderer/src/lib/streamer.ts` → `apps/server/src/routes/stream.ts`
9. STT + cleanup plugins → `apps/server/src/lib/plugins/pipeline.ts`, `post-process.ts`
10. Final text back to renderer → streamer `onFinal` → `dictation.ts` `enqueue` → `deliver()`
11. Plugin hook before paste → `apps/server/src/routes/output` (via `api.output.deliver`)
12. IPC paste → `preload/index.ts` `pasteText` → `index.ts` handler → `apps/electron/src/main/paste.ts` `pasteIntoFocusedApp()`
13. OS simulate paste → platform-specific in `paste.ts` (accessibility **at paste time**)

**Known risk (from brief):** Main process checks mic/accessibility in `getMissingDictationPermission()` at **hotkey down**, before renderer `getUserMedia`. Linux mic is `"unknown"` until renderer probes. Audit whether stale macOS mic state matches “permission at point of use” requirement.

---

## 7. Phase touch map (where to edit)

### Phase 2 — Rebrand + design system (Gate 1)

| Touch | Files |
|-------|-------|
| Product strings | `apps/electron/package.json` (`productName`), renderer components, `README.md` (after approval) |
| Design tokens | Create `packages/updated-design/` **or** replace `:root` in new CSS; retire `tavern.css` tokens gradually |
| Remove glass | Delete or disable `apps/electron/src/renderer/src/glass.css` imports in `panel.tsx`, `notification.tsx`, `companion.tsx` |
| Fonts | `tavern.css` @font-face → Newsreader, Instrument Sans, Martian Mono |
| Upstream attribution | `LICENSE`, `README.md` — **do not overwrite LICENSE**; add fork notice |

### Phase 3 — Widget shell (Gate 2)

| Touch | Files |
|-------|-------|
| Window geometry | `apps/electron/src/main/index.ts` — `createPanelWindow`, `createCompanionWindow`, `panelPosition`, `companionPosition` |
| Shared constants | `apps/electron/src/shared/panel.ts`, `shared/companion.ts`, `shared/sprites.ts` |
| Collapsed/expanded | Likely merge panel visibility with companion bounds; `openPanel()` helpers in main |
| Display follow cursor | Extend `anchorCompanionForDictation()` / fix boot placement on display 0 |
| Non-activating focus | `setFocusable`, `type: "panel"` (macOS), companion `setIgnoreMouseEvents` |

### Phase 4 — Search architecture (Gate 3)

| Touch | Files |
|-------|-------|
| New module | `packages/search/` or `apps/server/src/lib/search/` — `SearchProvider` interface |
| Mode switch | `apps/electron/src/main/index.ts` (hotkey modifier), `shared/hotkey-defaults.ts`, settings in server DB |
| Transcript routing | `apps/electron/src/renderer/src/lib/dictation.ts` — branch `deliver()` vs search dispatch |
| Secrets | New IPC + main-process keychain wrapper (pattern TBD; no existing BYOK keychain in this fork) |
| Docs | `docs/SEARCH-ARCHITECTURE.md` |

### Phase 5 — Result rendering (Gate 4)

| Touch | Files |
|-------|-------|
| UI | New panel route/tab in `components/panel.tsx` or dedicated renderer |
| Classifier | `packages/search/src/source-class.ts` + unit tests |
| Styles | Certificate layout CSS (2px radius, 0.5px rules) — **not** `tavern.css` glass |

### Phase 6 — Divergence (Gate 5)

| Touch | Files |
|-------|-------|
| Orchestration | `packages/search/src/divergence.ts`, `multi-search.ts` |
| Log | `apps/server/src/lib/search/divergence-log.ts` |
| Tests | `divergence.test.ts`, `search-divergence-log.test.ts` |
| UI | `search-results.tsx` — CONTESTED banner, per-provider sections |

### Phase 7 — Settings (Gate 6)

| Touch | Files |
|-------|-------|
| Settings UI | `settings-view.tsx` — **Search** page (mode, Brave key, dual/single, log reveal) |
| Live hotkey | `hotkey:reload` + `stopHotkeyRecording(accel)` end-to-end |
| Server settings | SQLite `input_mode`, `search_provider_mode` |
| Export | `search:divergence-log-reveal` IPC → `showItemInFolder` |

### Rakazo bridge (parallel track, optional)

| Touch | Files |
|-------|-------|
| Spec | `specs/rakazo-agios-bridge.md` (already drafted) |
| Plugin | `plugins/rakazo-bridge/` using `freestyle-voice` `afterCleanup` hook |
| oRPC client | Separate package; Rakazo is `/rpc/*`, not Freestyle `/api/*` |

---

## 8. License discrepancy (resolve before commercial ship)

| Source | License stated |
|--------|----------------|
| `LICENSE` in this repo | **MIT** (Freestyle copyright 2026) |
| GitHub API (`freestyle-voice/freestyle`) | **MIT** |
| Build brief | **FSL-1.1-ALv2** |

**Action:** Confirm with upstream and counsel before rebranding README as FSL. Gate 1 instruction to cite FSL may be wrong for **this** checkout — do not change `LICENSE` without explicit approval.

---

## 9. Fork-specific notes (pre–Gate 1)

| Item | Note |
|------|------|
| `glass.css` | Added in fork commit `b989b19` — **must be reverted** for certificate aesthetic (Gate 1) |
| Root `ARCHITECTURE-MAP.md` | Earlier draft at repo root; **this file is the Gate 0 canonical copy** under `docs/` |
| Display positioning | Partial fix exists (`anchorCompanionForDictation`); Gate 3 still requires pill-on-active-display at idle |
| Widget vs agent | Upstream product is “intelligent reminders + dictation”; UPDATED pivots to **search instrument** — panel agent/chat may stay for Rakazo bridge or be hidden later |

---

## 10. Gate 0 checklist

- [x] Monorepo mapped
- [x] Shell confirmed Electron (not Tauri)
- [x] IPC layer named
- [x] Hotkey registration located
- [x] Transcription providers documented (**freestyle-cloud only** in this fork)
- [x] Design token sources identified (`freestyle-design` missing)
- [x] Toolchain confirmed (Biome, husky, Turbo)
- [x] Hotkey → paste flow traced file-by-file
- [x] Phase touch map written

---

**STOP — Gate 0 complete.**

**Gates 1–3:** Implemented in commit `354a7ff`. See `docs/CHANGES.md` and `docs/SEARCH-ARCHITECTURE.md`.

**Gate 4:** Result rendering + minimal search execution — see `docs/CHANGES.md`.

**Gate 5:** Divergence detection + CONTESTED state — see `docs/CHANGES.md`.

**Gate 6:** Settings — hotkey rebind, mode switch, Brave key, provider dual/single, divergence log reveal — see `docs/CHANGES.md`.

**Gate 7:** Final pass — README + GitHub hero assets, lint/tests on Gate packages — see `docs/CHANGES.md`.

**Gate 8+:** Modifier mode flip, third live provider, claim extraction, single-widget merge.
