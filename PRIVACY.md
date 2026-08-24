# UPDATED — Privacy (beta)

**Controller:** AGICY.Ai (Cyprus / EU)  
**Product:** UPDATED desktop beta (`AGiOS-Ai-EU/UPDATED`)  
**Contact:** privacy@agicy.ai (data-subject requests)  
**Web policy (canonical when published):** https://agicy.ai/legal/privacy  
**Last updated:** 2026-08-24

This document describes personal-data processing for the **UPDATED desktop beta**. It is a product disclosure for reviewers and users. It does **not** replace a full GDPR Article 13/14 privacy notice on agicy.ai — that notice must be published before calling the product 1.0.

> **What is shipping right now:** the installers in the wild (**`v0.9.0-beta.3`**) use **AGICY-hosted cloud transcription**. **Your microphone audio leaves your device** and is sent to AGICY, which forwards it to **Deepgram (EU)** for speech-to-text. The on-device (local) path and the bring-your-own-key path described below are **not yet in a released installer** — they arrive with the next release. Read §2.1 for what applies to you today.

---

## 1. Roles

### 1.1 Today — hosted STT (`v0.9.0-beta.3`, currently released)

| Role | Party |
|------|--------|
| **Controller** | **AGICY.Ai** — product, account auth, **and the hosted STT path that is live now** |
| **Sub-processor (STT)** | **Deepgram (EU endpoint)** — receives your microphone audio via `agicy.ai/api/stt/transcribe` on **every** dictation |
| **Processor (auth)** | Supabase Auth (`auth.agicy.ai`) — hosted STT requires AGICY sign-in |
| **Optional processor (search)** | Brave Search — only if you paste a Brave API key |

AGICY is the controller for this processing. An **Art. 28 sub-processor agreement with Deepgram is required for it and is being remediated** — tracked in [STT-MIGRATION-PLAN.md §11](docs/STT-MIGRATION-PLAN.md). Deepgram's **server-side audio retention period is being confirmed in writing**; until then, assume audio is held by Deepgram for at least the duration of the request and treat the retention row in §4 as provisional.

### 1.2 Forthcoming — local default + optional BYOK (next release, not yet shipped)

| Role | Party |
|------|--------|
| **Default STT** | On-device whisper.cpp (`base-q5_1`, ~57 MB first-use download) — **no processor**; audio stays on device |
| **Processor (opt-in STT)** | Deepgram EU — only if user pastes their own Deepgram API key (BYOK). Counsel note: BYOK **may** make the **user** the controller and Deepgram **their** processor — confirm before final notice. **This note does not apply to the hosted path in §1.1, where AGICY is the controller.** |

This change **reduces** data exposure: once it ships and you keep the default, your audio stops leaving the device.

UPDATED does **not** use Freestyle Cloud as its microphone path. Legacy Freestyle code may remain in the binary for users who upgraded from Freestyle-branded builds; it is not the live path.

---

## 2. Voice / STT data flow (canonical)

### 2.1 LIVE NOW — AGICY hosted (default in `v0.9.0-beta.3`)

```
Microphone → UPDATED Electron → https://agicy.ai/api/stt/transcribe  (AGICY session)
          → Deepgram EU → transcript → back to your device
```

**Your audio leaves your device.** Requires AGICY sign-in and metered credits. AGICY is controller; Deepgram EU is sub-processor.

| Data | Leaves device? | Retention |
|------|----------------|-----------|
| **Microphone audio (hosted — live now)** | **Yes** — to AGICY, then Deepgram EU | AGICY: transient relay, not stored as recordings. **Deepgram: retention period pending written confirmation** — see §1.1 |
| **Transcript text (hosted)** | Returned to device | Local app state; not retained server-side as a transcript store |
| AGICY account (email, user id) | Yes — required for hosted STT | Per AGICY account policy |
| Search queries / divergence JSONL | **No** — local only | Until you delete |
| Brave API key | Encrypted locally (`safeStorage`) | Until you clear the key |

### 2.2 Forthcoming — local default (next release)

```
Microphone (device) → UPDATED Electron → whisper.cpp on device → transcript
```

### 2.3 Forthcoming — opt-in Deepgram EU BYOK (next release)

```
Microphone → UPDATED → api.eu.deepgram.com (your own API key) → transcript
```

| Data | Leaves device? | Retention |
|------|----------------|-----------|
| Microphone audio (local default) | **No** | N/A off-device |
| Microphone audio (BYOK) | Yes — to Deepgram EU under **your** key | Per your own Deepgram agreement |
| Deepgram API key (BYOK) | **No** — encrypted locally (`safeStorage`) | Until you clear the key |

See [docs/VOICE-DATA-FLOW.md](docs/VOICE-DATA-FLOW.md).

---

## 3. Lawful basis (draft — counsel to confirm)

| Processing | Intended basis |
|------------|----------------|
| **Hosted STT via Deepgram EU (live now)** | Contract (Art. 6(1)(b)) — the transcription service you signed in for. **AGICY is controller**; Art. 28 sub-processor agreement under remediation (§7) |
| Local STT (forthcoming) | Contract / steps prior to contract (Art. 6(1)(b)) — core feature; processing on-device |
| Optional BYOK STT (forthcoming) | Consent / contract when you supply a Deepgram key |
| Account + device pairing | Contract / steps prior to contract (Art. 6(1)(b)) — **required today** for hosted STT |
| Optional Brave search | Consent / contract when you supply a key |

**Special category risk:** raw voice may allow identification. Treat audio as personal data; avoid unnecessary retention; do not use audio for secondary profiling in this beta.

---

## 4. Retention (product intent)

| Record | Intent |
|--------|--------|
| **Audio (hosted — live now)** | Relayed by AGICY for the request, not stored as recordings. **Deepgram server-side retention: pending written answer** — will be stated here once confirmed (§7) |
| Audio buffers (local — forthcoming) | Ephemeral decode on device |
| Audio (BYOK — forthcoming) | Ephemeral for the STT request; Deepgram per your own agreement |
| Local divergence JSONL | Until user deletes / uninstalls |
| Device pairing codes | Short-lived; tokens until sign-out / expiry |

---

## 5. Data-subject rights

Email **privacy@agicy.ai** to access, rectify, erase, export, or object where applicable. Desktop local files are under your control via uninstall / userData deletion.

---

## 6. International transfers

**Today:** hosted STT sends audio to AGICY (Cyprus / EU) and on to **Deepgram’s EU endpoint**. Deepgram is a US-headquartered provider operating an EU processing region; the transfer position for Deepgram corporate access is part of the Art. 28 remediation in §7.

**After the next release:** the default local path transfers **no** audio; opt-in BYOK uses **Deepgram’s EU API** under your own key. Auth uses AGICY’s Supabase project on `auth.agicy.ai`.

---

## 7. Open compliance work

### Already due — remediation in progress (hosted path is live)

- [ ] **Art. 28 sub-processor agreement with Deepgram (EU) — OVERDUE.** The obligation attached when `v0.9.0-beta.3` shipped, because that build already sends user audio to Deepgram EU with **AGICY as controller** (§1.1). It is **not** conditional on BYOK or on the next release. Tracked in [STT-MIGRATION-PLAN.md §11](docs/STT-MIGRATION-PLAN.md).
- [ ] **Deepgram audio retention answer in writing** — how long submitted audio is held server-side, and whether zero-retention / no-model-training is available on the EU endpoint. Needed now if beta.3 has EU users; feeds §2.1 and §4.
- [ ] **Sub-processor disclosure** — list Deepgram EU as a **current** sub-processor on `agicy.ai` and in `NOTICE` / README.
- [ ] **Article 30 record of processing** — must cover the hosted STT activity running today.

**Direction of travel:** the forthcoming local-default release **reduces** exposure — most users' audio stops leaving the device — so it should ship as mitigation rather than wait on the items above. It does not, however, cure the beta.3 period.

### Before 1.0

- [ ] Publish full privacy notice at `agicy.ai/legal/privacy`  
- [ ] Counsel confirmation of the **BYOK** controller/processor framing (§1.2) — applies to the forthcoming BYOK path only, not to today's hosted path
- [ ] Complete on-device STT binary/model restore (default path)  
- [ ] Age-appropriate / parental guidance if under-16 use is expected  

---

## 8. Related docs

- [README.md](README.md) — user-facing install + data-flow summary  
- [NOTICE](NOTICE) — third-party notices  
- [docs/STT-MIGRATION-PLAN.md](docs/STT-MIGRATION-PLAN.md) — local default + BYOK opt-in  
- [docs/VOICE-DATA-FLOW.md](docs/VOICE-DATA-FLOW.md) — canonical STT path  
- [docs/CODE_SIGNING.md](docs/CODE_SIGNING.md) — signed installers  
