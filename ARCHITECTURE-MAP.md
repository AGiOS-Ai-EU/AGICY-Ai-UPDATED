# Updated (Freestyle fork) — architecture map

> Gate 0 artifact. Read before changing UI, server wiring, or Rakazo integration.
> Generated for AGiOS-Ai-EU/UPDATED — not a Tauri/Rust app.

## Monorepo layout

```
UPDATED/
├── apps/
│   ├── electron/          # Desktop: companion widget + panel + notifications
│   ├── server/            # Local Hono API (default :4649)
│   ├── mobile/            # Expo
│   └── docs/
├── packages/
│   ├── sdk/               # freestyle-voice plugin contract
│   ├── stt/               # Speech-to-text
│   ├── validations/
│   └── utils/
└── plugins/               # Example plugins (audio-transcription, emoji, …)
```

**Stack:** pnpm + Turbo, TypeScript ~44%, JavaScript ~51%, Electron (not Tauri).
**Desktop windows:** frameless, transparent BrowserWindows in `apps/electron/src/main/index.ts`.

| Window | Renderer | Role |
|--------|----------|------|
| `companionWindow` | `companion.html` → `companion.tsx` | Floating spark + dictation pill (desktop widget) |
| `panelWindow` | `panel.html` → `panel.tsx` | Chat, settings, connectors, scheduled tasks |
| `notificationWindow` | `notification.html` | Toast stack |

## Styling

| File | Role |
|------|------|
| `renderer/src/overlay.css` | Transparent root (required for floating windows) |
| `renderer/src/tavern.css` | Primary design system (~4k lines, editorial “tavern”) |
| `renderer/src/glass.css` | AGICY glass widget overlay (fork-specific) |
| `DESIGN.md` | Upstream direction: warm paper, **no glassmorphism** |

**Fork tension:** `glass.css` is the consumer-widget skin; `DESIGN.md` is the trust/editorial skin.
Use glass for the companion pill only, or revert for full upstream alignment.

## Local server API (Freestyle)

Base: `http://127.0.0.1:4649` (see `renderer/src/lib/api.ts`).

| Endpoint | Purpose |
|----------|---------|
| `GET /api/health` | Liveness (`{ status, name: "freestyle" }`) |
| `/api/agent/*` | Agent threads, chat (Freestyle agent, not Rakazo) |
| `/api/connectors/*` | Proxy to Freestyle Cloud connectors |
| Plugin hooks | Server-side pipeline: `beforeTranscribe` → `afterCleanup` → `beforeOutput` |

Remote mode: Electron IPC `server:set-url` + `server:set-token` repoints the client.
Health check expects **Freestyle** shape — **cannot** point this at Rakazo directly.

## Dictation pipeline (permission rule)

Mic/accessibility checks must run **at the function that records**, not only at app mount.
See `specs/app-stability/app-stability-audit.md` and companion dictation flow in
`apps/electron/src/main/index.ts` (`deliverOutput`, plugin pipeline).

## Plugin extension point (Rakazo bridge target)

Plugins: `packages/sdk` (`freestyle-voice`).

Hook for “send transcript to Grok bot”:

1. `afterCleanup` — final polished text before paste
2. `beforeOutput` — last chance before clipboard/paste

Plugins load from `<userData>/plugins/` or npm `plugins` setting.
Server-side hooks run in `apps/server` during `/api/output/deliver`.

---

## Rakazo (AGiOS) — sibling repo

Repo: `https://github.com/AGiOS-Ai-EU/rakazo`

**Stack:** TypeScript monorepo — React 19, Vite, Electron, Expo, Hono, **oRPC** (`/rpc/*`),
PostgreSQL, Prisma, Better Auth, Graphile Worker, Pi, Docker sandboxes.

**No Rust.** Same language family as Updated.

| Surface | URL / path |
|---------|------------|
| Web UI | `:5173` (CX33 cloud-init via agicy-platform) |
| API | Hono app + `POST /rpc/*` oRPC handler |
| Voice | `voice.*` + HTTP routes in `apps/api/src/voice.ts` |
| Bots / chat | `threads.send`, `threads.subscribe`, … |
| Workspace search | `search.query` (internal hits only — not Brave/Exa web search) |

### CX33 deploy (agicy-platform)

`src/lib/cpuBridge/agiosProvision.ts` clones rakazo, `docker compose up`, port **5173**.

---

## Why Updated ≠ Rakazo server swap

| | Updated / Freestyle | Rakazo / AGiOS |
|--|---------------------|----------------|
| Protocol | REST `/api/*` (Hono) | oRPC `/rpc/*` |
| Health | `{ name: "freestyle" }` | `{ ok: true, version }` |
| Auth | Bearer token (optional) | Better Auth session / workspace actor |
| Agent | Freestyle scheduled tasks + connectors | Persistent bots, sandboxes, routines |

**Integration must be a bridge**, not a URL setting change.

---

## Recommended bridge architecture

```
┌─────────────────────────────────────┐
│  Updated desktop (Electron)         │
│  ┌─────────────┐  ┌──────────────┐  │
│  │ Companion   │  │ Panel        │  │
│  │ (dictation) │  │ (optional    │  │
│  │             │  │  Rakazo tab) │  │
│  └──────┬──────┘  └──────┬───────┘  │
│         │ afterCleanup    │ iframe /  │
│         ▼                 │ oRPC client│
│  ┌──────────────────────────────┐   │
│  │ plugins/rakazo-bridge        │   │
│  │ (freestyle-voice plugin)     │   │
│  └──────────────┬───────────────┘   │
└─────────────────┼───────────────────┘
                  │ HTTPS + session cookie / API key
                  ▼
┌─────────────────────────────────────┐
│  Rakazo on CX33 (:5173) or local      │
│  threads.send({ botId, text })        │
│  threads.subscribe → stream reply     │
└─────────────────────────────────────┘
```

### Phase gates

| Gate | Deliverable | Done when |
|------|-------------|-----------|
| **0** | This file + `specs/rakazo-agios-bridge.md` | Map reviewed |
| **1** | `plugins/rakazo-bridge` — settings: base URL, botId, token | Config persists |
| **2** | oRPC client wrapper (`@orpc/client` + `@rakazo/contracts`) | `health` + `me` pass |
| **3** | `afterCleanup` optional “Send to AGiOS” + hotkey | Transcript reaches bot |
| **4** | Panel tab: embed Rakazo web or minimal thread view | User sees reply |
| **5** | Windows release from AGiOS-Ai-EU/UPDATED | Installer on GitHub Releases |

### Out of scope for v1

- Replacing Freestyle local server with Rakazo
- Merging multi-provider web search results (Rakazo `search.query` is workspace-only)
- Claim ledger / primary-source certificate UI (separate trust instrument — see spec)

---

## License (verify before commercial ship)

**Current upstream + this fork:** `LICENSE` is **MIT** (Freestyle copyright 2026).

If you were quoted **FSL-1.1-ALv2**, that may refer to another branch, roadmap, or product.
Re-read `LICENSE` on every upstream merge before selling a competing dictation product.

---

## Related AGICY surfaces

| Repo | Role |
|------|------|
| `agicy-platform` | `/dashboard/agios` — CX33 checkout, Rakazo auto-install |
| `AGiOS-Ai-EU/rakazo` | Grok Bot alternative stack |
| `AGiOS-Ai-EU/UPDATED` | Desktop dictation + agent shell (this repo) |
| `agicy-platform/src/lib/updated/` | GEMI registry (name collision — not this desktop app) |
