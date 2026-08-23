# UPDATED mark

The mark combines three product cues in one compact silhouette:

- **U / evidence card:** the paper U is both the product initial and the open edge of a sourced claim card.
- **Voice:** four unequal copper bars form a deliberately simple waveform that survives reduction.
- **Traceable source:** the darker folded corner makes the card/evidence reading explicit without text.

## Mini visual system

| Role | Treatment |
| --- | --- |
| Primary app mark | Ink tile `#1A1A2E`, paper U `#F5F0EB`, copper waveform `#C9894A`, strong-copper fold `#B87333` |
| 16–32 px | Keep the same flat shapes; do not add strokes, shadows, text, or gradients |
| Monochrome / tray | Solid U plus one central voice bar, rendered through alpha as an OS template image |
| Clear space | Keep at least one waveform-bar width around the outer tile |

`updated-mark.svg` is the canonical editable source. `updated-tray-template.svg` is the platform-template source. Regenerate packaging and review assets with:

```powershell
python apps/electron/scripts/generate-brand-assets.py
```
