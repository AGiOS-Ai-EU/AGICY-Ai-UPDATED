# Rakazo / AGiOS bridge — build spec

Connect **Updated** (desktop dictation) to **Rakazo** (Grok Bot on CX33 or self-hosted)
without merging the two backends.

## Constraints (from production lessons)

1. **Permission at point of use** — mic/accessibility checks when recording starts, not only at boot.
2. **No API swap** — Freestyle `/api/*` ≠ Rakazo `/rpc/*`; build an explicit bridge.
3. **Do not merge provider outputs** — if adding multi-provider web search later, show each
   provider’s citations side-by-side; never vote/average (disagreement is the signal).
4. **Two UI modes** — consumer widget (companion glass pill) vs trust/editorial (panel,
   certificates, primary-source header). Do not use widget chrome for trust surfaces.

## Bridge plugin: `plugins/rakazo-bridge`

### Settings (plugin storage)

| Key | Example | Purpose |
|-----|---------|---------|
| `rakazoBaseUrl` | `https://user-box:5173` or `http://103.x.x.x:5173` | Rakazo origin |
| `botId` | UUID | Target bot |
| `sendMode` | `off` \| `hotkey` \| `always-after-cleanup` | When to forward text |
| `authToken` | optional | If Better Auth exposes PAT (future) |

### Hook: `afterCleanup`

When `sendMode` matches and user confirmed (or hotkey held):

```ts
// Pseudocode — Gate 3
await rakazoClient.threads.send({
  botId: settings.botId,
  text: output.text,
});
```

Also keep default behaviour: paste at cursor via Freestyle `deliverOutput`.

### Client package

Add workspace package `@agios/rakazo-client`:

- Depends on `@orpc/client`, `@rakazo/contracts` (git submodule or npm publish from fork)
- `createRakazoClient(baseUrl, credentials)`
- Methods: `health()`, `me()`, `bots.list()`, `threads.send()`, `threads.subscribe()`

### Panel integration (Gate 4)

Option A — **iframe** Rakazo web app logged-in session (fastest).

Option B — **native thread strip** in panel using oRPC subscribe (cleaner, more work).

### AGICY dashboard link

`agicy-platform` `/dashboard/agios` should show:

- **AGiOS** — pay CX33, open `:5173`
- **Updated** — download desktop, configure bridge to same box URL

## Web search / trust instrument (optional Phase 6+)

Not in Rakazo `search.query` today (workspace index only).

If adding Cyprus/GEMI-style provenance search:

- Standalone panel route, certificate layout (not glass pill)
- Header: `primary sources: 0/8` stated plainly
- Providers: Brave or Exa first (structured citations); Perplexity optional synthesis
- Keep standalone from claim ledger until Phase 0 captures exist

## Test plan

1. Local Rakazo docker compose + Updated `pnpm dev` in electron
2. Dictate → text pastes **and** appears in Rakazo bot thread when sendMode=hotkey
3. CX33 box: same test against public IP :5173
4. Mic permission: revoke mid-session, re-grant, record again — must work without restart
