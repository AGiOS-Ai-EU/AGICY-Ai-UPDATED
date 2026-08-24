# UPDATED — Privacy (beta)

**Controller:** AGICY.Ai (Cyprus / EU)  
**Product:** UPDATED desktop beta (`AGiOS-Ai-EU/UPDATED`)  
**Contact:** privacy@agicy.ai (data-subject requests)  
**Web policy (canonical when published):** https://agicy.ai/legal/privacy  
**Last updated:** 2026-08-24

This document describes personal-data processing for the **UPDATED desktop beta**. It is a product disclosure for reviewers and users. It does **not** replace a full GDPR Article 13/14 privacy notice on agicy.ai — that notice must be published before calling the product 1.0.

---

## 1. Roles

| Role | Party |
|------|--------|
| **Controller** | AGICY.Ai — decides purposes of account auth, inference metering, and hosted STT |
| **Processor (STT)** | Deepgram (EU endpoint `api.eu.deepgram.com`) — audio → transcript under AGICY’s instruction |
| **Processor (auth)** | Supabase Auth (`auth.agicy.ai`) — account identity for device pairing |
| **Optional processor (search)** | Brave Search — only if you paste a Brave API key |

UPDATED does **not** use Freestyle Cloud for voice in beta.3+. Legacy Freestyle Cloud code may remain in the repository for compatibility; the default shipped path does not send microphone audio to Freestyle.

---

## 2. Voice / STT data flow (canonical)

```
Microphone (device)
  → UPDATED Electron (local PCM/WAV)
  → HTTPS POST https://agicy.ai/api/stt/transcribe
       Authorization: Bearer <Supabase access token from device pairing>
  → AGICY platform (auth + inference credit gate)
  → Deepgram EU (audio processing)
  → transcript text returned to UPDATED
```

| Data | Leaves device? | Retention (as implemented / intended) |
|------|----------------|----------------------------------------|
| Microphone audio | Yes — to AGICY → Deepgram EU for the request | Not stored long-term by UPDATED; processed for transcription. Confirm Deepgram retention in DPA. |
| Transcript text | Returned to device; may appear in paste/search UI | Local app state; not uploaded for search history |
| AGICY account (email, user id) | Yes — session / device pairing | Per AGICY account policy |
| Inference usage (seconds) | Yes — metered on AGICY Neon | Usage events for billing/limits |
| Search queries / divergence JSONL | **No** — local only | `{userData}/logs/search-divergence.jsonl` until you delete |
| Brave API key | Stored encrypted locally (`safeStorage`); query text sent to Brave if configured | Until you clear the key |

---

## 3. Lawful basis (draft — counsel to confirm)

| Processing | Intended basis |
|------------|----------------|
| Account + device pairing | Contract / steps prior to contract (Art. 6(1)(b)) |
| Hosted STT for dictation/search | Contract (Art. 6(1)(b)) — core product feature you request |
| Inference metering | Legitimate interests / contract (Art. 6(1)(b)/(f)) — prevent abuse, allocate free tier |
| Optional Brave search | Consent / contract when you supply a key |

**Special category risk:** raw voice may allow identification. Treat audio as personal data; avoid unnecessary retention; do not use audio for secondary profiling in this beta.

---

## 4. Retention (product intent)

| Record | Intent |
|--------|--------|
| Audio buffers | Ephemeral for the STT request only |
| Deepgram | Per Deepgram EU DPA — **must be documented in production DPA** |
| Inference usage events | Account lifetime / statutory accounting |
| Local divergence JSONL | Until user deletes / uninstalls |
| Device pairing codes | Short-lived (minutes); tokens until sign-out / expiry |

Exact Deepgram retention and subprocessors must appear in the published agicy.ai privacy notice and DPA pack.

---

## 5. Data-subject rights

Email **privacy@agicy.ai** (or the address published on agicy.ai) to:

- Access / rectify account data  
- Erase account and associated metering (subject to legal holds)  
- Export machine-readable account data where applicable  
- Object / restrict where Art. 6(1)(f) is relied upon  

Desktop local files (settings, divergence log, Brave key) are under your control: uninstall or delete `%APPDATA%` / application support directories.

---

## 6. International transfers

STT is routed to **Deepgram’s EU API**. Auth uses AGICY’s Supabase project on `auth.agicy.ai`. If any US or other transfer applies, SCCs / appropriate safeguards must be listed on agicy.ai.

---

## 7. Telemetry / product analytics

**Sub-processor:** PostHog (project endpoint `https://us.i.posthog.com`)
**Default:** **off.** Nothing is sent until you turn it on.
**Opt out / opt in:** Settings → Data → **Share anonymous usage data**. Takes effect immediately, no restart. `DO_NOT_TRACK=1` in the environment disables it unconditionally.

### 7.1 International transfer

PostHog is addressed on its **US** endpoint, so enabling this setting transfers the data below **outside the EEA**. That transfer needs SCCs / an appropriate safeguard listed on agicy.ai before 1.0 (§8). The EU-region PostHog endpoint (`eu.i.posthog.com`) would remove the transfer question entirely and is the recommended fix.

### 7.2 What is collected when it is on

| Category | Examples |
|---|---|
| Feature events | app installed / updated / launched, panel opened, tab opened, onboarding beat reached / skipped / completed, capability opened, suggestion shown / accepted / dismissed, automation applied |
| Counts and shapes | message length in characters, number of todos, number of vocabulary terms imported, scheduled-task **name length** (never the name), transcription duration in ms |
| Configuration ids | STT/LLM provider and model id, sprite id, connector slug (e.g. `gmail`), UI tab id, permission kind, setting **key** (never its value) |
| Anonymous identity | a random device UUID generated locally; after sign-in, your AGICY **account id** |
| Super properties (on every event) | `app_version`, `environment` (`production`/`development`), `os` (platform string), `plan` (`free`/`pro`) |
| Crash reports | error **message and stack trace**, plus a source label. `enableExceptionAutocapture: true` is set, so unhandled exceptions in the server process are reported automatically as well as the ones reported explicitly. Stack traces name file paths and function names from the app bundle. |

Crash reports are always written to the local log file for diagnostics; only the upload to PostHog is gated by this setting.

### 7.3 What is never collected

This is a product commitment, enforced in code by a server-side content guard on the telemetry relay (`apps/server/src/lib/telemetry-guard.ts`) that drops any event property containing free text:

- **No transcripts.** No dictated or cleaned text, ever.
- **No audio.** No recordings or audio buffers.
- **No search queries** and no divergence-log contents.
- **No LLM prompts or completions.**
- **No window titles, application content, or URLs.**
- **No clipboard contents.**
- **No brain files** — no memories, notes, todo text, or evidence-card text.
- **No email address or display name.** Sign-in identifies you to PostHog by account id only; account details stay in AGICY's own systems.
- **No setting values** — only which key changed.

### 7.4 Lawful basis

Consent (Art. 6(1)(a)), given by turning the setting on and withdrawn by turning it off. Nothing is collected before consent.

---

## 8. Open compliance work (before 1.0)

- [ ] Publish full privacy notice at `agicy.ai/legal/privacy`  
- [ ] Execute DPA with Deepgram (EU)  
- [ ] Article 30 record of processing  
- [ ] Confirm audio retention = zero / ephemeral on AGICY side  
- [ ] Restore **on-device STT** as optional provider (no cloud audio) — see `docs/STT-MIGRATION-PLAN.md` Phase 2  
- [ ] Age-appropriate / parental guidance if under-16 use is expected  
- [ ] List **PostHog** as a sub-processor on agicy.ai, and either move analytics to PostHog's EU endpoint or document the US transfer safeguard (§7.1)  

---

## 9. Related docs

- [README.md](../README.md) — user-facing install + data-flow summary  
- [NOTICE](../NOTICE) — third-party notices  
- [docs/STT-MIGRATION-PLAN.md](STT-MIGRATION-PLAN.md) — hosted vs local STT roadmap  
- [docs/CODE_SIGNING.md](CODE_SIGNING.md) — signed installers (trust / SmartScreen)
