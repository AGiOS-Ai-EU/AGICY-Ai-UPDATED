# UPDATED roadmap

Prioritized after external audit (2026-08-24) and beta.3 AGICY-hosted STT ship.

## P0 — Before next public build

| Rank | Gap | Status | Notes |
|------|-----|--------|-------|
| 1 | **Single STT story in docs** | **Fixed** | [VOICE-DATA-FLOW.md](VOICE-DATA-FLOW.md) + README + [PRIVACY.md](../PRIVACY.md) |
| 2 | **Restore on-device STT** (whisper.cpp selectable) | **Committed** | Cloud default for accuracy; local option for EU / offline. Spec: [STT-MIGRATION-PLAN.md](STT-MIGRATION-PLAN.md) Phase 2. Code was removed in v23 — rebuild provider. |
| 3 | **GDPR surface** | **In progress** | PRIVACY.md draft shipped; need agicy.ai notice, Deepgram DPA, Art. 30 ROP |
| 4 | **Publish corrected README to main** | Open | GitHub main still had Freestyle STT rows — merge this branch |

## P1 — Before 1.0

| Rank | Gap | Status | Notes |
|------|-----|--------|-------|
| 1 | Modifier + hotkey mode flip | Backlog | Highest UX value; Settings/Search tab only today |
| 2 | Divergence log export beyond reveal | Partial | Reveal + copy path live; add Save As / share JSONL |
| 3 | Companion → instrument state pill (or keep off) | Partial | Companion **off by default** (Package A) |
| 4 | Code signing (Apple + Windows EV/OV) | Docs ready | [CODE_SIGNING.md](CODE_SIGNING.md); secrets optional in CI |
| 5 | Pricing clarity pre-install | Partial | Credits called out in README first-run; surface on `/updated` |

## P2 — Worth doing

| Rank | Gap | Status | Notes |
|------|-----|--------|-------|
| 1 | Source classifier domain list + Greek/Cypriot gaps | Backlog | Publish + tests for `cylaw.org` etc. |
| 2 | Confirm fork point vs MIT relicense | Check | Upstream MIT via PR #103 / commit `2c01c5c` (May 2026); NOTICE cites it — verify first UPDATED commit is post-relicense |
| 3 | Third live search provider | Backlog | Brave + mock/mock-alt |
| 4 | LLM claim extraction | Backlog | Cards are citation formatting only (stated in README) |
| 5 | Single merged widget window | Backlog | Still companion + panel + notification |
| 6 | In-app divergence viewer | Backlog | |
| 7 | Rakazo thread bridge | Backlog | `specs/rakazo-agios-bridge.md` |

## Shipped (Gates 1–7 + beta.3)

| Item | Notes |
|------|--------|
| Search query history | Last 30; local JSON |
| Certificate claim cards + CONTESTED | Jaccard 0.35 |
| Divergence JSONL | Local append; Settings reveal |
| AGICY device auth + hosted Deepgram EU | Default voice path |
| Instrument UI Package A | Companion off; copper cards; playground model picker (PR) |

## Differentiation

- Certificate claim cards with primary-source rate (`N / M`, including `0 / N`)
- CONTESTED via Jaccard — no merge/vote
- Dual-provider transparency + local divergence JSONL
- Voice-first search loop — **hosting honesty**: cloud STT today, local STT restore is the privacy differentiator we owe the thesis
