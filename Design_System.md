# Design System — Tibb (طب)

## 1. Visual Philosophy & Tone (Part B Choices)
- **Style (B1):** Warm Botanical Calm Minimal (inspired by dark forest & cream mobile wellness UI + Swiss grid restraint).
- **Tone (B6):** Tone 1 — Calm & Clear. Short, concrete sentences without buzzwords (`Unlock`, `Elevate`, `Supercharge`, `Seamless`, `Cutting-edge`), exclamation hype, or em-dash clutter.
- **Zero-Emoji Rule:** Never use emojis in headings, labels, cards, or status tags. Use crisp `lucide-react` strokes (`1.75px`).

## 2. Strict 60-30-10 Color System (B2)
### Default: Deep Forest Pine Wellness (Dark Mode — Mockup Reference)
- **60% Dominant Canvas (`--bg`):** `#0F1F1C` (Deep Forest Pine)
- **30% Structural Card Surfaces (`--surface` / `--surface-muted`):** `#172B27` cards, `#1E3530` elevated drawers, `1px` hairline border `rgba(242, 239, 228, 0.12)`
- **10% Accent & Primary CTAs:**
  - Primary CTA Surface (`--cta-bg` / `--cta-text`): Warm Cream `#F2EFE4` with Deep Forest ink `#0F1F1C`
  - Secondary Accent (`--accent` / `--accent-soft`): Botanical Sage Mint `#7BB88D` (progress rings, leaf metric badges, active borders)
  - Text Hierarchy: Primary `#F2EFE4` (>= 13:1 contrast on `#0F1F1C`/`#172B27`), Muted `#A6BAB2` (>= 6.4:1 contrast)

### Alternate: Botanical Light Cream (Light Mode Toggle)
- **60% Dominant Canvas (`--bg`):** `#F6F4EC` (Warm Botanical Cream)
- **30% Structural Card Surfaces:** `#FFFFFF` / `#ECE9DD` cards, `1px` border `rgba(20, 38, 33, 0.12)`
- **10% Accent & Primary CTAs:** Deep Forest `#14342B` CTA with `#F6F4EC` ink + Botanical Sage `#2E7D5B` accent (`>= 4.8:1` contrast)

### Safety Semantic Colors (Locked)
- **RED Emergency / `1122 SOS` Only:** `#DC2626` (never reused for decorative badges)
- **AMBER Caution:** `#D97706` / `#F59E0B`

## 3. Self-Hosted Typography Pairing (B3 Pairing 2)
- **Font Families (max 2 UI families, bundled via `@fontsource`):**
  1. `Outfit` (400, 500, 600, 700) — Display headings, UI labels, body copy (`line-height: 1.45–1.6`, `letter-spacing: -0.02em` on hero titles).
  2. `IBM Plex Mono` (400, 500) — Tabular clinical readings, timestamps, timers (`font-variant-numeric: tabular-nums`).
- **Urdu RTL Script Support:** `.font-urdu` uses `leading-[2.25]` + vertical padding `0.3rem` + `unicode-bidi: isolate` so Nastaliq ascenders/descenders never clip.
- **Zero External Font CDNs:** `fonts.googleapis.com` is strictly prohibited to prevent third-party IP leakage and preserve offline PWA parity.

## 4. Spacing, Elevation & Components
- **8px Spacing Scale:** `8px`, `16px`, `24px`, `32px`, `48px` with generous breathing room between every card and section.
- **Single-Elevation Matte Cards:** `rounded-[24px]` to `rounded-[32px]` cards with crisp `1px` borders — never glass-on-glass nested borders or giant ambient radial blur orbs.
- **Tactile Hit Targets:** All interactive buttons/links >= `44px` tall on touch screens with `active:scale-[0.97] transition-transform duration-150`.
- **Primary vs Secondary Hierarchy:** Exactly ONE filled primary CTA per section (`Warm Cream` in Dark Forest / `Deep Forest` in Light Cream); secondary options use quiet hairline outline pills.
- **Loading States:** Explicit Skeleton placeholder screens (`SkeletonLoaders.tsx`) on initial boot and lazy route suspense.
