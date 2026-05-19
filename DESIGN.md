---
colors:
  primary: "#3dd6c8"
  secondary: "#eb41df"
  background: "#393838"
  surface: "#282828"
  surfaceElevated: "#2a2929"
  surfaceHover: "#3e3e3e"
  text: "#ffffff"
  textMuted: "#b3b3b3"
  border: "rgba(255, 255, 255, 0.08)"
typography:
  sans: "'Inter', sans-serif"
  mono: "'Space Mono', monospace"
  baseSize: "16px"
  lineHeight: 1.5
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  2xl: "3rem"
elevation:
  card: "0 8px 24px rgba(0,0,0,0.5)"
  hover: "0 4px 12px rgba(0,0,0,0.3)"
---

# Design

## Color

**Strategy: Restrained luxury.** Tinted neutrals with two carefully-chosen accent colors (teal and pink). The palette whispers exclusivity through restraint, not saturation.

### Palette

| Role | Value | Usage |
|------|-------|-------|
| Primary Accent | `#3dd6c8` (teal) | Call-to-action, hero moments, accent highlights |
| Secondary Accent | `#eb41df` (pink) | Contrast, energy, occasional highlights |
| Background | `#393838` | Page background |
| Surface | `#282828` | Cards, modals, content containers |
| Surface (Elevated) | `#2a2929` | Sidebar, secondary surfaces |
| Surface (Hover) | `#3e3e3e` | Interactive hover state |
| Text Primary | `#ffffff` | Body text, headings |
| Text Muted | `#b3b3b3` | Secondary text, hints, disabled state |
| Border | `rgba(255, 255, 255, 0.08)` | Dividers, subtle structure |

### Dark Theme Justification

User context: listeners curating music late at night, in dark rooms, on desktop monitors. Ambient light is low; dark mode feels natural and reduces eye strain. The moody aesthetic reinforces exclusivity and sophistication—light UI would feel cheap by comparison.

### Accent Logic

- **Teal** carries 8–10% of the interface (play buttons, hover states, links). It's energetic but restrained.
- **Pink** emerges sparingly in secondary CTAs or data viz. Less than 3% of the interface.
- Accents are never layered; use one or the other, never both on the same element.

### Glow Effects

- `.teal-glow`: `box-shadow: 0 0 20px rgba(61, 214, 200, 0.3)`
- `.pink-glow`: `box-shadow: 0 0 20px rgba(235, 65, 223, 0.3)`

Reserve glows for hero moments (album previews, featured tracks) or micro-interactions. Do not overuse.

## Typography

### Typefaces

- **Body & UI**: Inter (300, 400, 500, 600, 700 weights)
- **Monospace**: Space Mono (400, 700 weights) for timestamps, track counts, metadata

Inter is the backbone; it's modern, neutral, and legible. Space Mono adds structure to numerical or technical information without feeling cold.

### Scale

Hierarchy through scale and weight, not color:

| Role | Size | Weight | Usage |
|------|------|--------|-------|
| Display | 48px / 3rem | 700 | Page titles, album hero names |
| H1 | 32px / 2rem | 700 | Section titles, featured artist names |
| H2 | 24px / 1.5rem | 600 | Subsection titles |
| H3 | 20px / 1.25rem | 600 | Card titles, compact headings |
| Body | 16px / 1rem | 400 | Main text |
| Body Small | 14px / 0.875rem | 400 | Secondary text, helper text |
| Caption | 12px / 0.75rem | 500 (monospace) | Metadata, timestamps, track counts |

**Line length cap**: 65–72 characters for body text. Music cards and grids are exempt (they're content containers, not prose).

**Line height**: 1.5 for body text (16px), tighter (1.3) for headings.

## Spacing & Layout

Spacing is intentional and varied to create rhythm:

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon padding, tight groupings |
| sm | 8px | Button padding, card internal spacing |
| md | 16px | Default padding, section spacing |
| lg | 24px | Large gaps between sections |
| xl | 32px | Major layout divisions |
| 2xl | 48px | Top-level spacing (page margins) |

**Rhythm rule**: Don't use the same padding twice in a row. Vary it (e.g., sm, md, sm to create visual breathing room).

**No wrapper bloat**: Don't wrap every element in a container. Cards, sections, and grids stand on their own.

## Elevation & Depth

Use shadows sparingly for hierarchy, not decoration:

| Level | Shadow | Usage |
|-------|--------|-------|
| Base (no shadow) | none | Flat backgrounds, text-only |
| Card (hover) | `0 4px 12px rgba(0,0,0,0.3)` | Album cards on hover, interactive elements |
| Hero (raised) | `0 8px 24px rgba(0,0,0,0.5)` | Featured album hero, modal overlays |

No drop shadows on text. Shadows are for surfaces only.

## Borders & Radius

- **Default corner radius**: 8px (all cards, buttons, inputs)
- **Compact radius**: 4px (small UI elements, inline controls)
- **No radius**: Disabled or inactive states
- **Border style**: 1px solid `rgba(255, 255, 255, 0.08)` for dividers (never thick side stripes)

## Motion

All transitions use ease-out curves (Framer Motion: `{ ease: "easeOut" }`):

| Action | Duration | Easing |
|--------|----------|--------|
| Hover state | 150ms | easeOut |
| Page transition | 300ms | easeOut |
| Stagger (children) | 50ms offset | easeOut |

**No animated layout properties.** Animate opacity, transform (scale, translate), and color only. Never animate width, height, or padding.

## Components

### Album Card

- Base size: 180px × 180px (md), 230px × 230px (lg)
- Rounded corners: 8px
- On hover (desktop): scale 1.04, shadow upgrade, overlay fade-in
- Image with fallback background color from `album.bgColor`
- No text overlay on image; text appears below card on small screens

### Track Row

- Grid layout: `[40px (play btn) _ 1fr (title) _ 60px (actions)]`
- Hover state: `background: rgba(255, 255, 255, 0.04)`
- Active (playing): maintains hover background
- Padding: 8px horizontal, 8px vertical (responsive: 4px on mobile)

### Play Button (Lucide)

- Icon size: 20px
- Color: text-primary (`#ffffff`)
- On hover: scale 1.1, teal glow appears
- State indicator: animated bars if currently playing

### Player Header

- Fixed top bar with gradient-to-transparent fade
- Album art (small, 40px), current track title, artist
- Right side: shuffle, next, pause/play, queue
- Never sticky; scrolls away on list scroll

## Interaction Patterns

### Hover States

- **Cards**: opacity lift + shadow + scale (1.04)
- **Buttons**: color shift or subtle background change
- **Links**: underline fade-in, no color change (text is always white)
- **Icons**: scale 1.1, teal glow (optional)

### Active/Playing States

- Current track row: background highlight
- Play button: animated bars (three vertical bars at different heights)
- Album card (if currently playing album): teal border or glow

### Loading States

Skeleton screens match the card grid layout. No spinners; use placeholder boxes that fade to content.

### Empty States

- Centered message with icon
- Generous whitespace
- Invite CTA (e.g., "Browse music" or "Create playlist")

## Theme & Mood

The interface is **dark, focused, and uncluttered**. Every element serves a purpose. The teal and pink accents provide life and energy without noise. Typography is generous and readable. Spacing breathes. The overall impression should be:

- **Exclusive**: not for everyone, but for those who appreciate craft
- **Calm**: dark colors, restrained motion, ample whitespace
- **Sophisticated**: modern typography, careful color choices, no decoration
- **Alive**: subtle motion, carefully-placed accents, responsive interactions

## Anti-patterns

🚫 **Never:**
- Use side-stripe borders (replace with full borders or background tints)
- Apply gradient text (use solid color, vary weight/size instead)
- Overuse shadows (they should be subtle, not theatrical)
- Animate layout properties (opacity and transform only)
- Mix serif fonts in the main UI (Space Mono is the only secondary face)
- Add rounded corners beyond 8px (feels dated)
- Nest cards inside cards (flatten the hierarchy)

---

**Status**: This DESIGN.md was generated from the existing codebase. Run `/impeccable document` periodically to keep it in sync with your live components and tokens.
