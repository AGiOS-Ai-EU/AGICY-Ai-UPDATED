# UPDATED roadmap

Prioritized after product decisions (2026-08-24): **combined Phase 1+2 release** — local whisper default, Deepgram EU BYOK opt-in, Phase 3 deferred.

## P0 — Combined release (local default + BYOK opt-in)

| Rank | Gap | Status | Notes |
|------|-----|--------|-------|
| 1 | **Docs match decisions** | **This PR** | Local = zero-key default; BYOK opt-in; Phase 3 deferred. [STT-MIGRATION-PLAN.md](STT-MIGRATION-PLAN.md), [VOICE-DATA-FLOW.md](VOICE-DATA-FLOW.md) |
| 2 | **Restore on-device STT** (whisper.cpp) as **default** | **Landing in PR** | Binary ensure + model download (resume/progress) + whisper-server inference. Spec: Phase 1+2 combined. |
| 3 | **Deepgram EU BYOK** (opt-in only) | Scaffold | Keychain + provider stub; not first-use gate |
| 4 | **GDPR / Art. 28 DPA** | Blocking | Deepgram subprocessor DPA + disclosures — [STT §11](STT-MIGRATION-PLAN.md#11-approval--blocking-checklist) |
| 5 | **Mode-dependent cleanup** | **This PR** | Search always off; dictation on **only with cleanup LLM**; zero-key = raw (“requires a cleanup provider”) |
| 6 | **Local batch STT (v1)** | **Decided** | Accept batch latency + Transcribing…; pseudo-streaming follow-up |
| 7 | **Brave key migration** | Spec’d | Preserve `search-keychain` / Brave `safeStorage` on upgrade — [STT §7](STT-MIGRATION-PLAN.md#7-migration-for-existing-beta-users) |

## P1 — Before 1.0

| Rank | Gap | Status | Notes |
|------|-----|--------|-------|
| 1 | **Divergence-log export** (Save As / share JSONL) | **Day-of-work** | Reveal + copy path live; finish export UX in one focused pass |
| 2 | Modifier + hotkey mode flip | Backlog | Highest remaining UX; Settings/Search tab only today |
| 3 | Companion → instrument state pill (or keep off) | Partial | Companion **off by default** (Package A) |
| 4 | Code signing (Apple + Windows EV/OV) | Docs ready | [CODE_SIGNING.md](CODE_SIGNING.md); secrets optional in CI |
| 5 | Pricing clarity pre-install | Partial | Credits / BYOK called out in README; surface on `/updated` |
| 6 | Freestyle / AGICY beta migration | Spec’d | No silent logout — [STT §7](STT-MIGRATION-PLAN.md#7-migration-for-existing-beta-users) |

## P2 — Worth doing

| Rank | Gap | Status | Notes |
|------|-----|--------|-------|
| 1 | Source classifier domain list + Greek/Cypriot gaps | Backlog | Publish + tests for `cylaw.org` etc. |
| 2 | Confirm fork point vs MIT relicense | Check | Upstream MIT via PR #103 / commit `2c01c5c` (May 2026); NOTICE cites it |
| 3 | Third live search provider | Backlog | Brave + mock/mock-alt |
| 4 | LLM claim extraction | Backlog | Cards are citation formatting only (stated in README) |
| 5 | Single merged widget window | Backlog | Still companion + panel + notification |
| 6 | In-app divergence viewer | Backlog | |
| 7 | Rakazo thread bridge | Backlog | `specs/rakazo-agios-bridge.md` |
| 8 | Phase 3 AGICY-hosted STT gateway | **Deferred** | Post combined release; optional account |

## Shipped (Gates 1–7 + beta.3 + Package A)

| Item | Notes |
|------|--------|
| Search query history | Last 30; local JSON |
| Certificate claim cards + CONTESTED | Jaccard 0.35 |
| Divergence JSONL | Local append; Settings reveal |
| AGICY device auth (optional) | Available; **not** required for first dictation after combined release |
| Instrument UI Package A | Companion off; copper cards; playground model picker ([PR #10](https://github.com/AGiOS-Ai-EU/UPDATED/pull/10) merged) |

## Differentiation

- Certificate claim cards with primary-source rate (`N / M`, including `0 / N`)
- CONTESTED via Jaccard — no merge/vote
- Dual-provider transparency + local divergence JSONL
- Voice-first search loop — **local STT default** is the privacy differentiator; cloud BYOK is opt-in accuracy
