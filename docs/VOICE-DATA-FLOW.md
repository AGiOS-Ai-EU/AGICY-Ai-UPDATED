# UPDATED — Voice & privacy data flow (canonical)

**Single source of truth for the next combined release (local STT + optional BYOK).**  
If README, NOTICE, or UI copy disagree with this file, this file wins until updated.

**Product default:** on-device whisper.cpp — **zero keys, no account, no card.**  
**Opt-in upgrade:** Deepgram EU **BYOK** (user API key in Electron `safeStorage`).  
**Deferred:** AGICY-hosted STT gateway (Phase 3).

## Default path — local (on-device)

```
┌─────────────┐     PCM/WAV      ┌──────────────────┐
│  Microphone │ ───────────────► │ UPDATED desktop  │
│  (device)   │                  │ whisper.cpp      │
└─────────────┘                  │ (local binary)   │
                                 └────────┬─────────┘
                                          │
                                          ▼
                                   transcript → app
                                   (audio never leaves device)
```

## Opt-in path — Deepgram EU BYOK

```
Microphone → UPDATED → api.eu.deepgram.com (user’s Deepgram key) → transcript
```

| Path | Status |
|------|--------|
| **Local whisper.cpp** | **Default** — binary + model download with resume/progress; inference via local whisper-server |
| **Deepgram EU BYOK** | Opt-in upgrade in Settings → Dictation (key in `safeStorage`); offered on download failure |
| AGICY hosted gateway | **Deferred** (Phase 3) — not the first-use path |
| Freestyle Cloud STT | Legacy only; not default; no silent logout of existing beta sessions |

### Smoke test — zero-key first dictation

1. **Fresh profile, no cached model** (clear `~/.cache/updated/whisper-models` and `whisper-bin` if present).
2. Open Settings → Dictation → confirm **Local (on-device)**.
3. Click **Download model** (or first hold triggers download). Confirm **visible progress**; optionally interrupt and confirm **resume**.
4. When Ready: **disconnect network**.
5. Focus a text field, hold dictation hotkey, speak, release → **Transcribing…** then text at cursor (**offline**).
6. Search mode: cleanup stays off. Dictation: cleanup stays off until a cleanup LLM is configured (“requires a cleanup provider”).
7. Force a download failure (bad network before Ready) → UI offers **Deepgram EU BYOK**, not a dead-end.
8. Upgrade path: Brave key in `search-keychain` still powers live search (no silent mock).

Search citations / divergence JSONL stay on-device. Optional Brave Search sends **query text** only when you configure a key.

**LLM cleanup:** Search always **off**. Dictation **on only when a cleanup provider is configured**; zero-key local path = **raw transcript**. Settings: cleanup “requires a cleanup provider.”

**Local transport (v1):** **Batch** whisper (not Freestyle-style streaming partials). Show **Transcribing…** after hotkey release; chunked pseudo-streaming is a follow-up.
