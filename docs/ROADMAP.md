# UPDATED roadmap

Prioritized gaps after Gate 7 (search query history). Ranked by user value for a **voice-driven search instrument**.

| Rank | Gap | Status | Notes |
|------|-----|--------|-------|
| 1 | **Search query history** | **Shipped (Gate 7)** | Last 30 queries in Search tab; persisted in `{userData}/search-query-history.json`; re-run from Recent list |
| 2 | In-app divergence log viewer | Backlog | JSONL append works; Settings reveals file path only |
| 3 | Export search results (JSON/CSV) | Backlog | Claim cards are on-screen only |
| 4 | Modifier + hotkey input-mode flip | Backlog | Mode toggles in Search tab + Settings today |
| 5 | Third live provider (Exa, etc.) | Backlog | Brave + mock/mock-alt only |
| 6 | LLM claim extraction | Backlog | One card per citation + summary |
| 7 | Single merged widget window | Backlog | Still companion + panel + notification |
| 8 | Rakazo thread bridge | Backlog | Spec in `specs/rakazo-agios-bridge.md`; no plugin |
| 9 | Full Freestyle string / onboarding rebrand | Backlog | Product shell is UPDATED; upstream strings remain |
| 10 | Mobile client (Expo) | Concept | Hybrid README imagery; desktop Electron is shipped |

## Differentiation vs Freestyle / Rakazo

- **Certificate claim cards** with plain primary-source rate (`N / M`, including `0 / N`)
- **CONTESTED** via Jaccard divergence — no merge or vote across providers
- **Dual-provider transparency** with append-only divergence JSONL
- **Hybrid glass shell** (nav rail) wrapping certificate Search content
- **Voice-first search loop** — hotkey STT → panel Search tab → persisted query history

## README honesty

Features list tracks **seven shipped capabilities** (Gates 1–6 + query history). Hybrid shell is part of the widget/panel experience (Gate 11) and is called out in Usage/Mobile sections, not duplicated as a separate gate number.
