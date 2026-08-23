# UPDATED — Search architecture (Gate 3)

> **Status:** Gate 5 — multi-provider divergence detection, CONTESTED UI, JSONL log wired.

---

## 1. Goals

- **Dictation path unchanged:** hotkey hold → mic → STT → paste/clipboard via existing `dictation.ts` / `paste.ts` pipeline.
- **Search path (new):** hotkey hold in search mode → mic → STT → `SearchProvider.search()` → certificate UI (Gate 4).
- **Secrets:** provider API keys in OS keychain, never plaintext in SQLite or renderer.

---

## 2. Core types

Shared in `packages/search/src/types.ts` and mirrored in `apps/server/src/lib/search/types.ts`.

```typescript
interface SearchCitation {
  url: string;
  title: string;
  domain: string;
  publishedAt?: string;
  snippet?: string;
}

interface SearchAnswer {
  answer: string;
  citations: SearchCitation[];
  engineVersion?: string;
  latencyMs?: number;
}

interface SearchProvider {
  readonly id: string;
  search(query: string, signal?: AbortSignal): Promise<SearchAnswer>;
}

type InputMode = "dictation" | "search";
```

---

## 3. Provider choice: Brave (stub)

**File:** `packages/search/src/providers/brave.ts`

| Option | Why not chosen (Gate 3) | Why Brave |
|--------|-------------------------|-----------|
| Exa | Strong semantic retrieval but weaker predictable page titles/snippets for certificate citations | — |
| Brave | — | Mature web index, explicit result URLs, REST API, fits citation-first UI |

Stub throws until Gate 4 wires HTTP + keychain.

---

## 4. Mode switch

| Control | Behavior |
|---------|----------|
| Default | `dictation` — existing paste path |
| Modifier + panel toggle hotkey | Flip `InputMode` (`dictation` ↔ `search`) |
| Settings (Gate 6) | Persist mode + provider in server SQLite `settings` |

**Routing (Gate 4 implementation point):**

```
hotkey:up + final transcript
  ├─ mode === dictation → dictation.deliver() [UNCHANGED]
  └─ mode === search    → IPC search:query → server SearchProvider
```

**Dictation minimization rule:** If `dictation.ts` must change, only add a branch at `deliver()` — do not alter capture, stream, or paste IPC.

---

## 5. API key storage (planned IPC)

No BYOK keychain exists in this fork today. Planned flow:

```
Renderer (settings) ──invoke──► Main: keychain:set/get/delete
                                    │
                                    ├─ macOS: safeStorage + Keychain via keytar pattern
                                    ├─ Windows: DPAPI / Credential Manager
                                    └─ Linux: libsecret (best-effort)

Main ──authorized fetch──► Server route /api/search (Gate 4)
                              └─ BraveSearchProvider.search()
```

Renderer never receives raw keys — only `{ configured: boolean, providerId }`.

---

## 6. Electron touch map (future gates)

| Gate | File | Change |
|------|------|--------|
| 4 | `apps/electron/src/renderer/src/lib/dictation.ts` | Branch at deliver vs search dispatch |
| 4 | `apps/electron/src/main/index.ts` | `search:query` IPC, keychain handlers |
| 4 | `apps/server/src/routes/search.ts` | POST search endpoint |
| 6 | `settings-view.tsx` | Mode toggle + provider key UI (live, not dummy) |

---

## Gate 5 — Divergence detection

### Similarity model

Each citation becomes a stable identity key: **normalized domain + sorted title tokens** (snippets excluded — providers paraphrase them). For each provider, citations form a set of keys. Pairwise **Jaccard similarity** is `|A∩B| / |A∪B|`.

### CONTESTED threshold

`DIVERGENCE_CONTESTED_JACCARD_THRESHOLD = 0.35` in `packages/search/src/divergence.ts`. When **any** provider pair scores below 0.35, the run is **CONTESTED**. Results are never merged or voted — each provider section renders separately.

### Divergence log

Append-only JSONL at `{userData}/logs/search-divergence.jsonl` (override with `UPDATED_SEARCH_DIVERGENCE_LOG`). Each line:

```json
{
  "timestamp": "2026-08-23T08:00:00.000Z",
  "query": "...",
  "providers": ["mock", "mock-alt"],
  "contested": true,
  "threshold": 0.35,
  "minSimilarity": 0,
  "pairScores": [{ "providerA": "mock", "providerB": "mock-alt", "jaccard": 0 }]
}
```

### Multi-provider defaults

| Mode | Providers |
|------|-----------|
| Dev (no Brave key) | `mock` + `mock-alt` |
| Live Brave key | `brave` + `mock-alt` |
| `UPDATED_SEARCH_SINGLE=1` | single provider only (no divergence) |

---

## 7. Latency & telemetry

- `SearchAnswer.latencyMs` — provider round-trip only.
- `engineVersion` — Brave API version header when available.
- Divergence log (Gate 5) appends `{ query, citations, mode }` JSONL — separate from dictation telemetry.

---

## 8. Gate 3 deliverables checklist

- [x] This document
- [x] `packages/search/` interfaces + Brave stub
- [x] `apps/server/src/lib/search/` mirror types
- [x] Keychain IPC (Gate 4 — `safeStorage` in main)
- [ ] Mode persistence hotkey modifier (Gate 6 — panel toggle only in Gate 4)
- [x] Search UI (Gate 4)
- [x] Divergence detection + CONTESTED state (Gate 5)
- [x] Divergence JSONL log (Gate 5)
- [ ] Mode persistence hotkey modifier (Gate 6 — panel toggle only in Gate 4)
