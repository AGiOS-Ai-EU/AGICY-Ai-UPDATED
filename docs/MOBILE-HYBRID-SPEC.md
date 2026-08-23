# Mobile hybrid UI spec

**Decision:** Glass shell + certificate content (matches desktop hybrid, Gate 11).

---

## Recommended pattern: narrow left glass rail

| Option | Verdict |
|--------|---------|
| **Left glass rail** | **Recommended** — mirrors desktop `PanelRail`; thumb can reach with one hand; certificate content column gets full width |
| Bottom glass pill | Better for dictation-only apps; competes with iOS home indicator; harder to show 5+ destinations |

### Phone layout (390×844 logical, 1170×2532 @3x export)

```
┌──┬──────────────────────────────┐
│▢ │  UPDATED          [×]       │  ← glass header strip
│▢ │──────────────────────────────│
│▢ │  ┌ certificate paper ─────┐  │
│▢ │  │ CONTESTED              │  │
│▢ │  │ Primary rate: 1 / 5    │  │
│▢ │  │ ┌ claim card ─────────┐│  │
│▢ │  │ │ PRIMARY             ││  │
│▢ │  │ │ …claim text…        ││  │
│▢ │  └─┴─────────────────────┘│  │
│▢ │  └──────────────────────────┘  │
│⋯ │                              │
└──┴──────────────────────────────┘
 ↑ 52px glass rail (blur, 20px radius pill)
```

### Rail icons (top → bottom)

1. Chat  
2. Search (default for voice hotkey)  
3. History  
4. Settings  
5. ⋯ More → Todos, Notes, Brain, Apps  

### Content zone (certificate — never blur)

- Background: `--updated-paper` (#f7f8f6)  
- Claim cards: `--updated-field`, 2px radius, 0.5px `--updated-rule`  
- Chips: Martian Mono uppercase  
- Query input: certificate field (not glass) — matches desktop Search tab  

### Glass shell tokens (phone)

| Token | Mobile value |
|-------|----------------|
| Rail width | 44–52px |
| Rail radius | 18–20px |
| Frame blur | 16–20px |
| Tint | `color-mix(paper 68%, transparent)` — no purple |

---

## README compositor mockup dimensions

For `scripts/compose-mobile-hybrid.py`:

| Region | Fraction of phone screen (W×H) |
|--------|--------------------------------|
| Screen inset from bezel | 4% each edge |
| Glass rail | left 0–14% of screen width |
| Certificate body | 14–96% width, 8–92% height |
| Claim card height | ~18% screen height each |
| Corner radius (screen clip) | 6% of min(screen W,H) |

Phone screen mask: rounded rect, **clip all UI** — no floating overlays on photo.

---

## Desktop parity checklist

- [ ] Rail icons match `panel-rail.tsx` order  
- [ ] Search results use same card structure as `search-results.tsx`  
- [ ] CONTESTED banner above provider sections  
- [ ] Primary rate in header, not floating beside phone  

---

## Out of scope (this spec)

- Shipped Expo mobile app (`apps/mobile/` still Freestyle bottom tabs)  
- Live hotkey on phone OS  
- README image batch (await proof approval)
