---
colors:
  primary: "#62f3e4"
  secondary: "#ffabef"
  surfaceContainerLowest: "#090f0e"
  surfaceContainerLow: "#161d1c"
  surfaceContainer: "#1a2120"
  surfaceContainerHigh: "#242b2a"
  surfaceContainerHighest: "#2f3635"
  onSurface: "#dde4e2"
  onSurfaceVariant: "#bbcac6"
  textMuted: "#b3b3b3"
  border: "rgba(255, 255, 255, 0.08)"
typography:
  sans: "Geist Sans (Inter-compatible)"
  mono: "Geist Mono / Space Mono"
  display: "Bungee"
  baseSize: "16px"
  lineHeight: 1.5
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
elevation:
  card: "0 8px 24px rgba(0,0,0,0.5)"
  hover: "0 4px 12px rgba(0,0,0,0.3)"
---

# Design

> This document reflects the **2027 dark-luxury refresh**, live in production. It supersedes any earlier "Nocturne Audio" palette (`#393838` background, plain Inter/Space Mono). For implementation-level specs (exact component markup, file checklist), see `2027DESIGN.md`. Live tokens are defined in `src/styles/globals.css`.

## Color

**Strategy: Cinematic, near-black luxury.** A deepened, almost-black surface hierarchy with a single vivid teal accent and a soft pink counter-accent. The palette reads as premium and exclusive through contrast and restraint, not saturation.

### Palette

| Role | Value | Usage |
|------|-------|-------|
| Primary Accent | `#62f3e4` (teal) | CTAs, active states, play buttons, glows, focus rings |
| Secondary Accent | `#ffabef` (pink) | Contrast accents, badges, "Weekly Selections" left-border, secondary data |
| Page Background | `#090f0e` (surface-container-lowest) | Base page background — the single most defining change from the old palette |
| Sidebar / Panels | `#1a2120` (surface-container) | Sidebar, elevated panels |
| Cards / Inputs | `#242b2a` (surface-container-high) | Cards, inputs, secondary containers |
| Progress Tracks | `#2f3635` (surface-container-highest) | Scrubbers, progress tracks, avatar backgrounds |
| Text Primary | `#dde4e2` (on-surface) | Body text, headings — never pure `#ffffff` |
| Text Secondary | `#bbcac6` (on-surface-variant) | Secondary text, inactive nav icons |
| Text Muted | `#b3b3b3` | Hints, timestamps, disabled state |
| Border | `rgba(255, 255, 255, 0.08)` | Dividers, subtle structure |
| On-Primary | `#003733` | Text/icons on teal-filled buttons — never `text-black` |

### Dark Theme Justification

User context: listeners curating music late at night, in dark rooms, on desktop monitors. The near-black `#090f0e` base (rather than the old dark-grey `#393838`) pushes the UI closer to cinematic black, making teal glows and album art pop harder and reinforcing exclusivity. Light UI would feel cheap by comparison.

### Accent Logic

- **Teal** (`#62f3e4`) carries the majority of interactive emphasis — play buttons, active nav, progress fills, focus rings, glows. Roughly 8–10% of the interface.
- **Pink** (`#ffabef`) emerges sparingly — badges, "Editor's Choice" labels, the left-accent bar on featured track rows. Less than 3% of the interface.
- Accents are never layered; use one or the other, never both on the same element.

### Glow & Glass Utilities (live in `globals.css`)

```css
.teal-glow        { box-shadow: 0 0 20px rgba(98, 243, 228, 0.3); }
.teal-glow-hover  { box-shadow: 0 0 20px rgba(98, 243, 228, 0.3); }
.teal-glow-hover:hover { box-shadow: 0 0 35px rgba(98, 243, 228, 0.6); }
.pink-glow         { box-shadow: 0 0 20px rgba(255, 171, 239, 0.3); }

.glass-panel {
  background: rgba(26, 33, 32, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.glass-card {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.3s ease-out;
}
.glass-card:hover {
  background: rgba(26, 33, 32, 0.8);
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  border-color: rgba(98, 243, 228, 0.3);
}
```

Reserve glows for hero moments (album previews, featured tracks, play buttons) or micro-interactions. `glass-panel`/`glass-card` are used for modals, the profile panel, queue/volume side panels, and library cards — never nested inside one another.

## Typography

### Typefaces

- **Body & UI**: Geist Sans (Inter-compatible), weights 300–700
- **Monospace**: Geist Mono / Space Mono, weights 400–700 — timestamps, track counts, metadata labels
- **Display**: Bungee — applied only via the explicit utility `font-[family-name:var(--font-bungee)]`, never inherited by headings by default

Geist Sans is the backbone; it's modern, neutral, and legible. Bungee is reserved for a small set of high-impact brand/hero moments so it retains its punch.

### Bungee Usage Rules

Bungee is used **only** for:
- Brand wordmark in the sidebar/top bar
- Hero section titles (Discover/home page featured album)
- Album title on the Album Detail / Now Playing screens
- Section labels: "New Horizons", "YOUR COLLECTION"
- Sounds / Artists / Library page headings

**Never** on body text, track titles, nav items, or metadata.

### Scale

Hierarchy through scale and weight, not color:

| Role | Size | Weight | Usage |
|------|------|--------|-------|
| Display | 48px / 3rem | 700 | Page titles, album hero names |
| Headline LG | 32px / 2rem | 700 | Section titles, featured artist names |
| Headline MD | 24px / 1.5rem | 600 | Subsection titles |
| Headline SM | 20px / 1.25rem | 600 | Card titles, compact headings |
| Body | 16px / 1rem | 400 | Main text |
| Body Small | 14px / 0.875rem | 400 | Secondary text, helper text |
| Label Mono | 12px / 0.75rem | 500 (mono) | Metadata, timestamps, track counts |

**Line length cap**: 65–72 characters for body text. Music cards and grids are exempt.

**Line height**: 1.5 for body text, tighter (1.3) for headings.

## Spacing & Layout

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon padding, tight groupings |
| sm | 8px | Button padding, card internal spacing |
| md | 16px | Default padding, section spacing |
| lg | 24px | Large gaps between sections |
| xl | 32px | Major layout divisions |
| 2xl | 48px | Top-level spacing (page margins) |

**Rhythm rule**: Don't use the same padding twice in a row — vary it (e.g., sm, md, sm) for breathing room.

**No wrapper bloat**: Cards, sections, and grids stand on their own without redundant containers.

### Shell

- **Sidebar**: fixed left, 280–320px wide, `surface-container` background, hidden below `md`
- **Main content**: fills remaining width, `surface-container-lowest` background, bottom padding to clear the player bar
- **PlayerBar**: fixed bottom, 56px (mobile) / 80px (desktop), `surface-container-lowest` with top border
- **MobileTabBar**: fixed bottom on mobile, above a condensed mini player strip

## Elevation & Depth

| Level | Shadow | Usage |
|-------|--------|-------|
| Base (no shadow) | none | Flat backgrounds, text-only |
| Card (hover) | `0 4px 12px rgba(0,0,0,0.3)` | Album/library cards on hover, interactive elements |
| Hero (raised) | `0 8px 24px rgba(0,0,0,0.5)` | Featured album hero, modals, glass-card hover |
| Button default | `0 2px 8px rgba(0,0,0,0.45)` | Every `<button>` and link-styled button (`.ntv-btn`) carries a subtle drop shadow by default; ghost/text buttons must explicitly override with `boxShadow: none` |

No drop shadows on text. Shadows are for surfaces only.

## Borders & Radius

- **Default corner radius**: 8px (cards, buttons, inputs)
- **Panel/modal radius**: up to 12–16px (`rounded-xl`) — glass panels, modals only
- **Compact radius**: 4px (small UI elements, inline controls, focus outline)
- **Border style**: 1px solid `rgba(255, 255, 255, 0.08)` for dividers — never thick side stripes, except the deliberate 4px pink left-accent on featured "Weekly Selections" rows

## Motion

All transitions use ease-out curves (Framer Motion: `{ ease: "easeOut" }`):

| Action | Duration | Easing |
|--------|----------|--------|
| Hover state | 150ms | easeOut |
| Page transition | 300ms | easeOut |
| Stagger (children) | ~40ms offset | easeOut |
| Ambient drift (blurred background art) | 20s loop, scale 1 → 1.05 | ease-in-out alternate |

**No animated layout properties.** Animate opacity, transform (scale, translate), and color only. Never animate width, height, or padding.

Reduced-motion is respected globally: `prefers-reduced-motion: reduce` collapses all animation/transition durations to near-zero.

## Components

### Album Card

- Base size: 180px × 180px (md), 230px × 230px (lg)
- Rounded corners: 8px, border `border-border`
- On hover: scale 1.04–1.10 image zoom, full-card centered teal play circle (dark scrim + teal glow shadow) — not a bottom-right corner button
- Currently-playing album: `ring-2 ring-primary` + `teal-glow`
- Image with fallback background from `album.bgColor`; always rendered through `getAlbumCover()`
- Text (title, artist) below the image, never overlaid on it

### Track Row

- Grid layout: `[40px (play/track#) | 1fr (title) | 60px (duration/actions)]`
- Hover state: `background: rgba(255,255,255,0.04)`
- Active (playing): `bg-primary/10 border border-primary/20`, title turns teal + bold, track-number column shows an animated equalizer icon
- Padding: 8px vertical/horizontal, tighter on mobile

### Play Button (Material Symbols / Lucide)

- Icon size: 20px inline, up to 40–48px on hero/full-screen player
- Filled variant (`fontVariationSettings: "'FILL' 1"`) on primary play actions
- Color: `on-surface` default, teal on hover/active
- Primary play button (hero, player bar, full-screen): solid teal fill, `on-primary` icon color, `.teal-glow-hover`

### PlayerBar

- Fixed bottom, three-column layout: now-playing info (1/4) — controls + scrubber (1/2) — volume/extra controls (1/4)
- Play/pause button: teal circle, `on-primary` icon, glow on hover, `active:scale-95`
- Progress bar: teal fill on `surface-container-highest` track, teal glow thumb on hover

### Full-Screen "Now Playing"

- Full-viewport overlay, `bg-gradient-mesh` ambient radial teal gradient
- Center: large album art (320px → 480px), Bungee track title, teal transport controls
- Desktop: glass-panel side rails for volume (left) and "Up Next" queue (right)
- Mobile: blurred/scaled album art background (`animate-drift`), gradient scrim to page background

## Interaction Patterns

### Hover States

- **Cards**: image scale + shadow lift; `glass-card` variants also translateY(-4px) and gain a teal-tinted border
- **Buttons**: color shift, background tint, or glow intensification — never a color change alone on filled buttons
- **Links**: underline fade-in; text stays `on-surface`, no color shift unless it's a teal CTA link
- **Icons**: scale 1.1, optional teal glow

### Active/Playing States

- Current track row: teal-tinted background + border
- Play indicator: animated three-bar equalizer (`.eq-bar-1/2/3`)
- Currently-playing album card: teal ring + glow

### Loading States

Skeleton screens (`.ntv-shimmer`) match the card grid layout — a shimmering gradient sweep, no spinners.

### Empty States

- Centered message with icon, generous whitespace, teal CTA (e.g., "Browse music")

## Theme & Mood

The interface is **dark, cinematic, and focused**. Near-black backgrounds put every accent and every piece of album art in relief. Teal carries energy and interactivity; pink appears rarely, as a flourish. Bungee display type marks the handful of moments that deserve full brand presence; everything else stays quiet in Geist Sans. The overall impression:

- **Exclusive**: not for everyone, but for those who appreciate craft
- **Cinematic**: near-black base, glows, blurred ambient backgrounds
- **Sophisticated**: restrained accent usage, no decoration for decoration's sake
- **Alive**: subtle drift/stagger motion, glows on interaction, never static

## Anti-patterns

🚫 **Never:**
- Use `#393838` or any grey background — the page background is `#090f0e`
- Use side-stripe borders except the deliberate pink accent on featured track rows
- Apply gradient text (use solid color, vary weight/size instead)
- Overuse shadows or glows (reserve for hero moments and interaction feedback)
- Animate layout properties (opacity and transform only)
- Use Bungee on body text, nav items, track titles, or metadata
- Add rounded corners beyond `rounded-xl` on interactive cards/buttons (modals/panels only)
- Nest cards inside cards, or glass panels inside glass panels
- Pass raw `coverImage`/`profileImage` to `<img src>` — always `getAlbumCover()`

---

**Status**: Reflects the live 2027 dark-luxury design system as implemented in `src/styles/globals.css` and the component tree. For per-component implementation specs and the file-by-file rollout checklist, see `2027DESIGN.md`.
