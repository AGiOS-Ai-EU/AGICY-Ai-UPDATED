# UPDATED — Voice & privacy data flow (canonical)

**Single source of truth for beta.3+.** If README, NOTICE, or UI copy disagree with this file, this file wins until updated.

```
┌─────────────┐     PCM/WAV      ┌──────────────────┐     Bearer JWT      ┌─────────────────┐
│  Microphone │ ───────────────► │ UPDATED desktop  │ ──────────────────► │ agicy.ai        │
│  (device)   │                  │ (Electron)       │   POST /api/stt/    │ requireAuth     │
└─────────────┘                  └──────────────────┘   transcribe        │ credit gate     │
                                                                          └────────┬────────┘
                                                                                   │
                                                                                   ▼
                                                                          ┌─────────────────┐
                                                                          │ Deepgram EU     │
                                                                          │ api.eu.deepgram │
                                                                          └────────┬────────┘
                                                                                   │
                                                                                   ▼
                                                                          transcript → app
```

| Path | Status in beta.3+ |
|------|-------------------|
| **AGICY hosted STT (Deepgram EU)** | **Default / required for voice today** |
| Freestyle Cloud STT | Not used for default voice (legacy code may remain) |
| On-device whisper.cpp | **Removed in v23** — restore planned (Phase 2); not available yet |

Search citations / divergence JSONL stay on-device. Optional Brave Search sends **query text** only when you configure a key.
