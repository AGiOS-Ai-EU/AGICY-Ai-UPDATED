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
| **Local whisper.cpp** | **Default** for first successful dictation (combined Phase 1+2 release) |
| **Deepgram EU BYOK** | Opt-in upgrade in Settings → Dictation (key in `safeStorage`) |
| AGICY hosted gateway | **Deferred** (Phase 3) — not the first-use path |
| Freestyle Cloud STT | Legacy only; not default; no silent logout of existing beta sessions |

Search citations / divergence JSONL stay on-device. Optional Brave Search sends **query text** only when you configure a key.

**LLM cleanup:** **on** in dictation mode; **off** in search mode (routing — query text should stay raw).
