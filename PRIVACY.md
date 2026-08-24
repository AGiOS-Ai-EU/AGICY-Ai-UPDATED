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
| **Controller** | AGICY.Ai — product, optional account auth, and (if resumed) hosted STT |
| **Default STT** | On-device whisper.cpp — **no processor**; audio stays on device |
| **Processor (opt-in STT)** | Deepgram EU — only if user pastes a Deepgram API key (BYOK). Counsel note: BYOK may make the **user controller** and Deepgram **their** processor — confirm before final notice. |
| **Processor (auth)** | Supabase Auth (`auth.agicy.ai`) — only when user signs in |
| **Optional processor (search)** | Brave Search — only if you paste a Brave API key |

UPDATED does **not** require Freestyle Cloud or AGICY hosted STT for first dictation after the combined local+BYOK release. Legacy cloud code may remain; default path is local.

---

## 2. Voice / STT data flow (canonical)

**Default (local):**

```
Microphone (device) → UPDATED Electron → whisper.cpp on device → transcript
```

**Opt-in (Deepgram EU BYOK):**

```
Microphone → UPDATED → api.eu.deepgram.com (user API key) → transcript
```

| Data | Leaves device? | Retention |
|------|----------------|-----------|
| Microphone audio (local default) | **No** | N/A off-device |
| Microphone audio (BYOK) | Yes — to Deepgram EU | Per Deepgram DPA / user agreement — **Art. 28 DPA is a release blocker** when BYOK ships |
| Transcript text | Returned to device; may appear in paste/search UI | Local app state |
| AGICY account (email, user id) | Only if signed in | Per AGICY account policy |
| Search queries / divergence JSONL | **No** — local only | Until you delete |
| Brave API key | Encrypted locally (`safeStorage`) | Until you clear the key |

See [docs/VOICE-DATA-FLOW.md](docs/VOICE-DATA-FLOW.md).

---

## 3. Lawful basis (draft — counsel to confirm)

| Processing | Intended basis |
|------------|----------------|
| Local STT | Contract / steps prior to contract (Art. 6(1)(b)) — core feature; processing on-device |
| Optional BYOK STT | Consent / contract when you supply a Deepgram key |
| Account + device pairing | Contract / steps prior to contract (Art. 6(1)(b)) — optional |
| Optional Brave search | Consent / contract when you supply a key |

**Special category risk:** raw voice may allow identification. Treat audio as personal data; avoid unnecessary retention; do not use audio for secondary profiling in this beta.

---

## 4. Retention (product intent)

| Record | Intent |
|--------|--------|
| Audio buffers (local) | Ephemeral decode on device |
| Audio (BYOK) | Ephemeral for the STT request; Deepgram per DPA |
| Local divergence JSONL | Until user deletes / uninstalls |
| Device pairing codes | Short-lived; tokens until sign-out / expiry |

---

## 5. Data-subject rights

Email **privacy@agicy.ai** to access, rectify, erase, export, or object where applicable. Desktop local files are under your control via uninstall / userData deletion.

---

## 6. International transfers

Default STT does not transfer audio. Opt-in BYOK uses **Deepgram’s EU API**. Auth (if used) uses AGICY’s Supabase project on `auth.agicy.ai`.

---

## 7. Open compliance work (before 1.0)

- [ ] Publish full privacy notice at `agicy.ai/legal/privacy`  
- [ ] **Art. 28 DPA** with Deepgram (EU) before marketing BYOK as a supported path — blocking checklist in [STT-MIGRATION-PLAN.md §11](docs/STT-MIGRATION-PLAN.md)  
- [ ] Counsel confirmation of BYOK controller/processor framing (§1)  
- [ ] Article 30 record of processing  
- [ ] Complete on-device STT binary/model restore (default path)  
- [ ] Age-appropriate / parental guidance if under-16 use is expected  

---

## 8. Related docs

- [README.md](README.md) — user-facing install + data-flow summary  
- [NOTICE](NOTICE) — third-party notices  
- [docs/STT-MIGRATION-PLAN.md](docs/STT-MIGRATION-PLAN.md) — local default + BYOK opt-in  
- [docs/VOICE-DATA-FLOW.md](docs/VOICE-DATA-FLOW.md) — canonical STT path  
- [docs/CODE_SIGNING.md](docs/CODE_SIGNING.md) — signed installers  
