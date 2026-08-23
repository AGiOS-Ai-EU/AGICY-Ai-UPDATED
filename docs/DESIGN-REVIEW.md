# Design review — certificate vs glass, mobile overlay spec

**Date:** 2026-08-23  
**Scope:** Code audit + user reference comparison. No image regeneration in this pass.

---

## Executive summary

| Question | Answer |
|----------|--------|
| **Is UPDATED production UI glassmorphism?** | **No.** Shipped Electron panel + Search UI is **certificate / paper** — flat fields, 0.5px hairlines, 2px radius, no blur, no glow. |
| **Does user’s desktop reference match UPDATED?** | **No.** Reference shows frosted-glass settings + floating vertical icon rail — closer to upstream Freestyle / a third-party mock, not Gate 1–6 UPDATED. |
| **Why mobile editorial image 3 looks wrong?** | Compositor draws UI as **floating rectangles on the photo**, not **inset inside the phone bezel**; wrong proportions; generic white cards; annotation clutter. |
| **Design tension?** ~~Yes~~ **Resolved (Gate 11):** Hybrid — glass shell + certificate content.

---

## Decision: Hybrid (Gate 11)

**User choice:** Glass **shell** (nav rail, panel frame, settings backdrop) + certificate **content** (Search claim cards, primary rate, CONTESTED, age strip).

| Surface | Treatment |
|---------|-----------|
| Vertical nav rail | Frosted glass pill, 20px radius, detached left |
| Panel frame | Light glass blur, neutral cool tint from `--updated-paper` |
| Search body | Flat `--updated-paper`, claim cards unchanged |
| Claim cards | Certificate only — no blur |

Implementation: `packages/updated-design/tokens.css` (glass tokens), `updated-hybrid-shell.css`, `components/panel-rail.tsx`, `panel.tsx` layout.

Mobile spec: `docs/MOBILE-HYBRID-SPEC.md`  
Compositor: `scripts/compose-mobile-hybrid.py` (screen-mask clip)

---

## 1. Production design audit (code)

### 1.1 Canonical tokens — certificate, not glass

```8:20:packages/updated-design/tokens.css
:root {
  /* Core surfaces */
  --updated-paper: #f7f8f6;
  --updated-ink: #16211f;
  --updated-graphite: #5c6663;
  --updated-rule: #d6dbd7;
  --updated-field: #ffffff;
  /* Spacing & shape */
  --updated-radius: 2px;
  --updated-hairline: 0.5px;
```

File header: *“overrides tavern.css variables **without glass**.”*

Typography: Newsreader (claims), Instrument Sans (UI), Martian Mono (chips/metadata, uppercase).

### 1.2 Runtime theme — glass explicitly retired

```1:42:apps/electron/src/renderer/src/updated-design.css
/**
 * UPDATED runtime theme — certificate aesthetic layered on tavern.css.
 * Loaded after tavern.css; retires glass.css overrides.
 */
...
.tavern-bub,
.tavern-bub-chip {
  ...
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  background: var(--updated-field);
}
```

`glass.css` is gutted:

```1:3:apps/electron/src/renderer/src/glass.css
/**
 * Retired — Gate 1 removes glassmorphism. See updated-design.css.
 */
```

### 1.3 Search UI — certificate claim cards

`search-results.css` header: *“no glass, blur, glow, or shadows.”*

Patterns in production Search tab:

| Element | CSS pattern |
|---------|-------------|
| Claim cards | `border: 0.5px solid var(--updated-rule)`, `background: var(--updated-field)`, `border-radius: 2px` |
| PRIMARY chip | Martian Mono, 11px, uppercase, graphite |
| CONTESTED | `--updated-decay-contested` (#5e4e78), mono uppercase |
| Primary rate | Instrument Sans body text, no frosted panel |
| Age strip | Mono labels, hairline-separated |

Components: `search-tab.tsx` (mode toggle + query form), `search-results.tsx` (DivergenceBanner + ProviderResultsSection + SearchClaimCard).

### 1.4 Panel navigation — horizontal tabs, no side icon rail

```1194:1224:apps/electron/src/renderer/src/components/panel.tsx
        <div className="tavern-tabs" role="tablist">
          {PANEL_TABS.map((id) => (
            <button ... className="tavern-tab">
              {TAB_LABELS[id]}
            </button>
          ))}
          ...
          <button ... className="tavern-tab tavern-tab-gear">⚙</button>
        </div>
```

Tabs: **Chat · Search · History · Todos · Notes · Brain · Apps** + gear (Settings).  
No floating vertical icon rail in Electron panel. Companion is a separate sprite window (spark handle), not a liquid sidebar.

### 1.5 Legacy / partial glass remnants

| Location | Status |
|----------|--------|
| `sprites/stage.tsx` companion bubbles | Still uses `backdrop-filter: blur(18px)` on recording/transcribing bubbles — **upstream Freestyle sprite chrome**, not Search panel |
| `tavern.css` base | Manga panel shell (18px radius, 7px hard shadow) — **partially overridden** by `updated-design.css` (2px radius, no shadow on panels) but tavern structural classes remain |
| `apps/mobile/` FloatingTabBar | Bottom nav bubble (Freestyle mobile) — **not UPDATED certificate tokens**; separate app, not wired to `@updated/search` |

### 1.6 Dominant CSS variables (UPDATED surfaces)

When `updated-design.css` loads after `tavern.css`:

- Surfaces: `--updated-paper`, `--updated-field`
- Text: `--updated-ink`, `--updated-graphite`
- Structure: `--updated-rule`, `--updated-hairline`, `--updated-radius`
- Evidence: `--updated-decay-fresh` … `--updated-decay-contested`
- Fonts: `--updated-font-claim`, `--updated-font-ui`, `--updated-font-mono`

---

## 2. User reference comparison

### 2.1 Desktop glass reference

**Path:** `.cursor/.../image-731131a8-f530-4933-a508-a6c5f9770ca2.png`

Observed:

- Frosted dark panel (`backdrop-filter` blur, semi-transparent fill)
- Large corner radius (~16–24px)
- Floating **vertical icon rail** left of settings (waveform, chart, clock, gear, card)
- Soft outer glow / depth

**Distance from UPDATED Electron panel:**

| Attribute | User reference | UPDATED shipped |
|-----------|----------------|-----------------|
| Surface | Frosted glass | Opaque paper/field |
| Blur | Yes | Explicitly `none` |
| Nav | Vertical floating rail | Horizontal text tabs |
| Radius | Large rounded | 2px |
| Shadow | Soft glow | `box-shadow: none` on search cards |
| Settings | Glass modal | In-panel `SettingsView` via gear tab |

**Conclusion:** Reference aligns with **glassmorphism product mockups** (possibly Freestyle upstream or aspirational), **not** the certificate system documented in Gates 1–6.

### 2.2 Mobile overlay problem reference

**Path:** `.cursor/.../image-362e83de-0202-441c-9907-aae6a11893fb.jpg`

User markup (red arrows) flags:

1. White UI card **covers phone + hands** — not clipped to screen
2. Card **wider than phone** — breaks illusion of in-app UI
3. **Empty lower half** of overlay — awkward aspect vs phone
4. Annotations (CONTESTED, JACCARD, AGE STRIP) **outside** product chrome — magazine marks OK in concept, but here they highlight misalignment

Root cause in `scripts/compose-mobile-editorial.py`:

```171:183:scripts/compose-mobile-editorial.py
def compose3(img: Image.Image) -> Image.Image:
    ...
    phone = (int(W * 0.38), int(H * 0.12), int(W * 0.62), int(H * 0.88))
    draw_phone_ui(draw, phone, "contested")
    inner_w = phone[2] - phone[0] - 20
    draw_claim_card(draw, phone[0] + 10, phone[1] + 110, inner_w, ...)
    draw_annotation(draw, phone[2] + 8, ...)  # lines extend outside phone
```

Issues:

| Problem | Cause |
|---------|--------|
| Overlay not inset in bezel | Phone rect is a **percentage guess**, not detected screen mask; UI drawn as sibling layer on full photo |
| Wrong aspect | Phone in photo is ~9:19; compositor uses ~24% of frame width with tall rect — doesn't match physical screen |
| Generic white cards | Compositor uses `#ffffff` FIELD + Georgia/Consolas — **approximates** tokens but not production fonts/layout |
| Floating cards beside phone (image 1) | README spec asked for “editorial infographic overlays” — implemented as **detached panels**, not in-app Search tab scroll |
| Image 3 worst | Tallest phone rect + claim card + 3 annotation lines + CONTESTED header = **clutter**; card sits mid-screen not in results list |

Compositor **does** use certificate-ish hex (`#f8f6f1`, `#1a1814`, `#5c5850`, 2px radius) but renders **generic Bootstrap-style boxes**, not `SearchResults` DOM structure.

---

## 3. Side toolbar / liquid nav — mobile adaptation proposal

**Not implemented.** Brief for product direction discussion.

### 3.1 Design tension (must resolve first)

| Direction | Pros | Cons |
|-----------|------|------|
| **A. Certificate (current Gate 1–6)** | Matches shipped desktop Search; honest README; no blur perf issues | User reference doesn’t match; feels “document” not “app” |
| **B. Liquid glass (user reference)** | Modern, familiar from iOS/macOS; side rail saves vertical space | Contradicts Gate 1, `updated-design.css`, README “No glassmorphism”; major CSS rewrite |
| **C. Hybrid** | Glass **shell** (rail, settings sheet) + **certificate content** (claim cards inside) | Needs explicit design spec; risk of visual clash |

**Recommendation:** User must pick **A, B, or C** before mobile UI or README imagery proceeds.

### 3.2 Phone form factor options

| Pattern | Fit for UPDATED | Notes |
|---------|-----------------|-------|
| **Floating side rail** (user ref) | Strong for thumb reach on tall phones | Icons: Search, Dictation, History, Settings; active = filled pill; mirror desktop tab set |
| **Bottom nav** | Already in `apps/mobile` FloatingTabBar | Freestyle DNA; 5 tabs — would need reduction to UPDATED scope |
| **Collapsible bottom pill** | Matches desktop companion widget | Hold-to-speak on pill; tap opens panel — consistent with Gate 2 widget shell |

**Suggested mobile nav (if certificate stays):**

```
[ Search ]     ← primary
[ Dictation ]
[ History  ]
[ Settings ]
```

Vertical rail **left edge**, 48px wide, paper field background, hairline border, **no blur**. Icons mono line-art (waveform, keyboard, clock, gear).

### 3.3 Search / claim cards on narrow screen

Mirror desktop `SearchResults` stack:

1. Query field + mode toggle (full width)
2. Divergence banner (CONTESTED full width)
3. Primary-source rate header
4. Scrollable claim cards (100% width, no floating beside photo)
5. Age strip inline in card footer

No detached floating cards in marketing — cards **inside** the phone frame only.

---

## 4. Recommendations before next image batch

### 4.1 Prefer real screenshots for README (desktop)

**Yes, for product accuracy.** Capture Electron panel Search tab at 420×520 (or scaled 2×):

- Mock query with dual providers → CONTESTED visible
- Actual Newsreader/Martian Mono rendering
- Side-by-side with editorial lifestyle photo **without** fake UI on phone

Split README **Mobile** into:

1. **Desktop truth** — screenshot of shipped panel
2. **Mobile intent** — wireframe or labeled “concept” until mobile client exists

### 4.2 If compositing continues — mockup spec

| Rule | Spec |
|------|------|
| Phone mask | Detect or hand-annotate screen quad; **clip all UI** to mask |
| Bezel inset | 8–12px padding inside screen; respect rounded corners |
| Layout source | Export HTML → PNG from `SearchTab` + `SearchResults` (Playwright component screenshot) |
| Fonts | Load Newsreader, Instrument Sans, Martian Mono in compositor |
| Overlays | Max 1 floating annotation per image; no duplicate claim card inside + outside phone |
| Side rail | If shown, render from SVG spec matching chosen nav direction |
| File naming | `updated-mobile-mock-{1,2,3}.png` after direction lock |

### 4.3 Compositor script changes (future, not this pass)

- Replace percentage `phone` rects with per-image JSON masks
- `Image.composite` with alpha mask for screen region
- Optional: render React panel to PNG via headless Electron / Playwright
- Remove floating external claim cards unless explicitly “magazine annotation” mode

### 4.4 Decision checklist for user

- [ ] **Aesthetic:** Certificate only / Glass only / Hybrid shell
- [ ] **Mobile nav:** Side rail / Bottom tabs / Widget pill
- [ ] **README strategy:** Desktop screenshots + concept mobile **or** composited phone mocks
- [ ] **Retire or rewrite** `compose-mobile-editorial.py` after decision

---

## 5. Reference asset paths

| Asset | Role |
|-------|------|
| `docs/assets/updated-github-hero.png` | Certificate token reference (correct) |
| `docs/assets/updated-mobile-editorial-{1,2,3}.png` | Current README mobile set (overlay issues) |
| User: `.../image-362e83de-....jpg` | Overlay misalignment markup |
| User: `.../image-731131a8-....png` | Glass + side rail aspirational reference |

---

## 6. Related files

| File | Purpose |
|------|---------|
| `packages/updated-design/tokens.css` | Canonical palette |
| `apps/electron/src/renderer/src/updated-design.css` | Certificate overrides |
| `apps/electron/src/renderer/src/search-results.css` | Search card layout |
| `scripts/compose-mobile-editorial.py` | README compositor (needs mask + export pipeline) |
| `DESIGN.md` | Upstream Freestyle design doc (also says avoid glassmorphism) |
