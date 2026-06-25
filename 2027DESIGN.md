


# 2027 Design System — NTV Vault UI Update

> **Purpose:** This document is the single source of truth for the 2027 UI refresh of NTV Vault. It is derived from the reference HTML mockups in `Desktop UI Update/` and `Mobile UI Update/`, plus the Nocturne Audio `DESIGN.md` design system. Implement every section below. Do not deviate from these specs without explicit approval.

---

## 0. Reference Files

These are the approved mockups. Read them when you need to verify exact markup patterns:

| View | Desktop | Mobile |
|------|---------|--------|
| Discover / Home | `Desktop UI Update/discover_desktop/code.html` | `Mobile UI Update/discover_bungee/code.html` |
| Album Detail | `Desktop UI Update/album_view_desktop/code.html` | `Mobile UI Update/album_view/code.html` |
| Library | `Desktop UI Update/library_desktop/code.html` | `Mobile UI Update/library_bungee/code.html` |
| Now Playing | `Desktop UI Update/now_playing_desktop/code.html` | `Mobile UI Update/now_playing_bungee/code.html` |
| Design Tokens | `Desktop UI Update/nocturne_audio/DESIGN.md` | (same tokens) |

---

## 1. Color System

Replace every color value in `tailwind.config.ts` / `globals.css` with this expanded palette. The deepened background (`#090f0e`) is the most visible change — it makes the UI feel more premium and cinematic.

### Core Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#62f3e4` | CTAs, active states, teal glow accents |
| `secondary` | `#ffabef` | Contrast accents, badges, secondary data |
| `background` | `#393838` | Fallback page background |
| `surface-container-lowest` | `#090f0e` | **Page background** (replaces old `#393838`) |
| `surface-container-low` | `#161d1c` | Slightly elevated surfaces |
| `surface-container` | `#1a2120` | Sidebar, elevated panels |
| `surface-container-high` | `#242b2a` | Cards, inputs, secondary containers |
| `surface-container-highest` | `#2f3635` | Progress tracks, scrubbers, avatar bg |
| `surface-variant` | `#2f3635` | Active nav item background |
| `surface-elevated` | `#2a2929` | Hover surface |
| `surface-hover` | `#3e3e3e` | Generic hover state |
| `surface-bright` | `#343b39` | Subtle highlight |
| `surface-dim` | `#0e1514` | Scrollbar track |
| `on-surface` | `#dde4e2` | Primary text (replaces `#ffffff`) |
| `on-surface-variant` | `#bbcac6` | Secondary text, inactive nav icons |
| `text-muted` | `#b3b3b3` | Hints, timestamps, disabled |
| `border` | `rgba(255,255,255,0.08)` | Dividers (unchanged) |
| `outline` | `#859491` | Input borders, dividers |
| `outline-variant` | `#3c4947` | Subtle separators |
| `surface-tint` | `#45dccd` | Tint layer |
| `on-primary` | `#003733` | Text on teal buttons |
| `primary-container` | `#3dd6c8` | Light teal fill |
| `on-primary-container` | `#005952` | Text on primary container |
| `inverse-primary` | `#006a62` | Dark teal (inverted context) |
| `primary-fixed` | `#69f8ea` | Brightest teal |
| `primary-fixed-dim` | `#45dccd` | Mid teal |
| `secondary-container` | `#bf00b8` | Deep pink container |
| `on-secondary-container` | `#ffe5f6` | Text on pink container |
| `secondary-fixed-dim` | `#ffabef` | Soft pink |
| `error` | `#ffb4ab` | Error states |
| `error-container` | `#93000a` | Error background |
| `inverse-surface` | `#dde4e2` | Light-mode surface |
| `inverse-on-surface` | `#2b3231` | Text on light surface |

### Glow Utilities

Add these as Tailwind utility classes or CSS:

```css
.teal-glow        { box-shadow: 0 0 20px rgba(98, 243, 228, 0.3); }
.teal-glow-hover  { box-shadow: 0 0 20px rgba(98, 243, 228, 0.3); }
.teal-glow-hover:hover { box-shadow: 0 0 35px rgba(98, 243, 228, 0.6); }
.pink-glow        { box-shadow: 0 0 20px rgba(255, 171, 239, 0.3); }
```

### Glassmorphism Utility

```css
.glass-panel {
  background: rgba(26, 33, 32, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.glass-card {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
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

---

## 2. Typography

### Fonts to Load

Add both fonts to `layout.tsx` via `next/font/google`:

```ts
import { Inter, Space_Mono, Bungee } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], weight: ['300','400','500','600','700'] })
const spaceMono = Space_Mono({ subsets: ['latin'], weight: ['400','700'], variable: '--font-mono' })
const bungee = Bungee({ subsets: ['latin'], weight: ['400'], variable: '--font-bungee' })
```

Add `font-bungee` to Tailwind config:
```js
fontFamily: {
  bungee: ['var(--font-bungee)', 'cursive'],
  mono: ['var(--font-mono)', 'monospace'],
}
```

### Bungee Usage Rules

`font-bungee` (Bungee) is used **only** for:
- Brand wordmark `LUXE` / `NTV` in the sidebar/topbar
- Hero section headings (Discover page featured title)
- Album title on the Now Playing / Album Detail page
- Section labels on Discover: "New Horizons", "Weekly Selections"
- Page title on Library: "YOUR COLLECTION"

**Never** use Bungee for body text, track titles, metadata, or navigation items.

### Type Scale (unchanged from CLAUDE.md, reconfirmed)

| Role | Size | Weight | Font | Usage |
|------|------|--------|------|-------|
| Display | 48px | 700 | Inter | Hero page titles |
| Headline LG | 32px | 700 | Inter / Bungee | Section headers |
| Headline MD | 24px | 600 | Inter | Subsection titles |
| Headline SM | 20px | 600 | Inter | Card titles |
| Body | 16px | 400 | Inter | Main text |
| Body SM | 14px | 400 | Inter | Secondary text |
| Label Mono | 12px | 500 | Space Mono | Timestamps, counts, metadata |

### Bungee-specific styles

```css
.bungee-title {
  font-family: 'Bungee', cursive;
  letter-spacing: -0.02em;
  line-height: 1;
}
/* Used for branding in header/sidebar */
.font-bungee { font-family: 'Bungee', cursive; }
```

---

## 3. Global Base Styles

Update `globals.css`:

```css
body {
  background-color: #090f0e; /* surface-container-lowest */
  color: #dde4e2;             /* on-surface */
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}

/* Custom scrollbar — thin, teal on hover */
::-webkit-scrollbar { width: 6px; height: 4px; }
::-webkit-scrollbar-track { background: #0e1514; } /* surface-dim */
::-webkit-scrollbar-thumb { background: #2f3635; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #62f3e4; }

/* Hide scrollbar on horizontal scroll containers */
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

/* Ambient background gradient mesh for Now Playing */
.bg-gradient-mesh {
  background:
    radial-gradient(circle at 20% 30%, rgba(0,106,98,0.15) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(98,243,228,0.1) 0%, transparent 50%);
}

/* Subtle scale drift animation for album art backgrounds */
@keyframes subtle-drift {
  0%   { transform: scale(1); }
  100% { transform: scale(1.05); }
}
.animate-drift {
  animation: subtle-drift 20s infinite alternate ease-in-out;
}
```

---

## 4. Layout Shell

### Desktop Shell (`src/app/layout.tsx`)

Three layers:
1. **Fixed left sidebar** — 320px wide, full height
2. **Main content area** — `ml-0 md:ml-80`, scrollable, `bg-surface-container-lowest`
3. **Fixed bottom PlayerBar** — 80px height, full width, `z-50`

```tsx
<body className="flex min-h-screen bg-surface-container-lowest">
  <Sidebar />                     {/* fixed left-0, w-80, hidden on mobile */}
  <main className="flex-1 ml-0 md:ml-80 min-h-screen pb-20">
    {children}
  </main>
  <PlayerBar />                   {/* fixed bottom-0, h-20 */}
  <MobileTabBar />                {/* md:hidden, fixed bottom-0 */}
</body>
```

---

## 5. Component Updates

### 5.1 Sidebar (`src/components/layout/Sidebar.tsx`)

**Structure:**
- Width: `w-80` (320px), `hidden md:flex flex-col h-full`
- Background: `bg-surface-container`
- Right border: `border-r border-border`
- Padding: `p-lg` (24px)
- Fixed position: `fixed left-0 top-0 z-40`

**Brand section (top):**
```tsx
<div className="mb-xl px-sm">
  <h1 className="font-bungee text-headline-md tracking-tighter text-primary">
    NTV {/* or LUXE — use the actual brand name */}
  </h1>
</div>
```

**Nav items:**
```tsx
// Inactive
<a className="flex items-center gap-md p-md rounded-lg text-on-surface-variant hover:bg-surface-hover transition-colors group">
  <span className="material-symbols-outlined group-hover:text-primary">home</span>
  <span className="font-body text-body">Home</span>
</a>

// Active
<a className="flex items-center gap-md p-md rounded-lg bg-surface-variant text-primary font-bold transition-all">
  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>explore</span>
  <span className="font-body text-body">Explore</span>
</a>
```

**Section divider (above premium features):**
```tsx
<div className="pt-xl pb-md opacity-30 border-t border-border">
  <span className="font-label-mono text-label-mono uppercase tracking-widest px-md text-text-muted">
    Premium Features
  </span>
</div>
```

**Profile section (bottom):**
```tsx
<div className="mt-auto glass-panel p-md rounded-lg flex items-center gap-md">
  <div className="w-10 h-10 rounded-full bg-surface-container-highest overflow-hidden">
    <img ... />
  </div>
  <div className="flex-1 min-w-0">
    <p className="font-body font-bold truncate">{userName}</p>
    <p className="font-label-mono text-[10px] text-primary uppercase">Platinum Member</p>
  </div>
  <span className="material-symbols-outlined text-on-surface-variant">settings</span>
</div>
```

---

### 5.2 TopBar (`src/components/layout/TopBar.tsx`)

**Desktop (inside main content area, sticky):**
- `sticky top-0 z-30`
- Background: `bg-gradient-to-b from-surface-container-lowest to-transparent`
- Flex row: search pill left, icons right

**Search pill:**
```tsx
<div className="flex items-center gap-md bg-surface-container-high px-md py-sm rounded-full border border-border w-1/3">
  <span className="material-symbols-outlined text-text-muted">search</span>
  <input
    className="bg-transparent border-none focus:ring-0 text-body-sm w-full placeholder-text-muted"
    placeholder="Artists, songs, or albums"
    type="text"
  />
</div>
```
On focus, add `border-primary` to the pill wrapper.

**Mobile TopBar:**
- Brand name in Bungee: `font-bungee text-[20px] tracking-wider`
- Hamburger menu button: `text-primary`
- Avatar: `w-10 h-10 rounded-full border border-border`
- Background: `bg-gradient-to-b from-surface-container-lowest to-transparent` with `backdrop-filter: blur(12px)`

---

### 5.3 PlayerBar (`src/components/layout/PlayerBar.tsx`)

**Dimensions:** `h-20` (80px), `fixed bottom-0 left-0 right-0 z-50`
**Background:** `bg-surface-container-lowest border-t border-border`
**Layout:** Three-column flex: `px-lg flex items-center justify-between`

**Left (1/4): Now playing info**
```tsx
<div className="flex items-center gap-md w-1/4">
  <div className="w-12 h-12 rounded overflow-hidden shadow-lg">
    <img ... />  {/* album art via getAlbumCover() */}
  </div>
  <div className="min-w-0">
    <h6 className="font-body font-bold text-sm truncate">{track.title}</h6>
    <p className="text-[10px] font-label-mono text-primary uppercase">{artist.name}</p>
  </div>
  <button className="material-symbols-outlined text-text-muted hover:text-primary ml-sm">
    favorite
  </button>
</div>
```

**Center (1/2): Controls + progress**
```tsx
<div className="flex flex-col items-center gap-xs w-1/2">
  {/* Control row */}
  <div className="flex items-center gap-lg">
    <button className="material-symbols-outlined text-text-muted hover:text-on-surface">shuffle</button>
    <button className="material-symbols-outlined text-on-surface hover:text-primary">skip_previous</button>
    
    {/* Play/Pause — teal bg, teal glow */}
    <button className="w-10 h-10 bg-primary text-on-primary rounded-full flex items-center justify-center teal-glow-hover shadow-[0_0_15px_rgba(98,243,228,0.3)] transition-all active:scale-95">
      <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
        {isPlaying ? 'pause' : 'play_arrow'}
      </span>
    </button>
    
    <button className="material-symbols-outlined text-on-surface hover:text-primary">skip_next</button>
    <button className="material-symbols-outlined text-text-muted hover:text-on-surface">repeat</button>
  </div>
  
  {/* Progress bar */}
  <div className="flex items-center gap-sm w-full max-w-lg">
    <span className="text-[10px] font-label-mono text-text-muted">{currentTime}</span>
    <div className="flex-1 h-1 bg-surface-container-highest rounded-full relative group cursor-pointer">
      <div className="absolute left-0 top-0 h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
      <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_rgba(98,243,228,0.6)]"
           style={{ left: `${progress}%` }} />
    </div>
    <span className="text-[10px] font-label-mono text-text-muted">{duration}</span>
  </div>
</div>
```

**Right (1/4): Extra controls**
```tsx
<div className="flex items-center justify-end gap-md w-1/4">
  <button className="material-symbols-outlined text-text-muted hover:text-primary">lyrics</button>
  <button className="material-symbols-outlined text-text-muted hover:text-primary">queue_music</button>
  <div className="flex items-center gap-sm group">
    <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary">volume_up</span>
    <div className="w-24 h-1 bg-surface-container-highest rounded-full relative cursor-pointer">
      <div className="absolute left-0 top-0 h-full bg-on-surface-variant group-hover:bg-primary rounded-full" style={{ width: `${volume}%` }} />
    </div>
  </div>
  <button className="material-symbols-outlined text-text-muted hover:text-primary">fullscreen</button>
</div>
```

---

### 5.4 MobileTabBar (`src/components/layout/MobileTabBar.tsx`)

Shown only on mobile (`md:hidden`). Fixed bottom, above keyboard.

```tsx
<nav className="md:hidden fixed bottom-0 w-full z-50 flex justify-around items-center h-16 border-t border-border bg-surface-container-lowest">
  {/* Each tab */}
  <Link href="/" className="flex flex-col items-center justify-center text-text-muted hover:text-primary transition-colors">
    <span className="material-symbols-outlined">home</span>
    <span className="font-label-mono text-label-mono">Home</span>
  </Link>
  <Link href="/search" className="flex flex-col items-center justify-center text-text-muted hover:text-primary transition-colors">
    <span className="material-symbols-outlined">explore</span>
    <span className="font-label-mono text-label-mono">Explore</span>
  </Link>
  <Link href="/library" className="flex flex-col items-center justify-center text-text-muted hover:text-primary transition-colors">
    <span className="material-symbols-outlined">library_music</span>
    <span className="font-label-mono text-label-mono">Library</span>
  </Link>
</nav>
```

Active tab: `text-primary`, icon uses `fontVariationSettings: "'FILL' 1"`.

**Mini player bar (mobile):** Position `fixed bottom-16 left-0 right-0 z-40` (sits above MobileTabBar). Use a condensed single-row layout: album art + title + play/pause button + progress bar as a thin strip at the top of the mini-bar.

---

### 5.5 AlbumCard (`src/components/music/AlbumCard.tsx`)

No changes to card dimensions (180px / 230px). Update hover and overlay styles:

```tsx
<div className="group cursor-pointer">
  <div className="relative aspect-square rounded-lg overflow-hidden mb-md shadow-lg border border-border group-hover:scale-105 transition-transform duration-300">
    {/* Album art — always via getAlbumCover() */}
    <img className="w-full h-full object-cover" src={getAlbumCover(album.coverImage, 230)} alt={album.title} />
    
    {/* Hover overlay — teal play button */}
    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
      <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-on-primary shadow-xl">
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
      </div>
    </div>
  </div>
  
  {/* Text below image */}
  <h4 className="font-body font-bold truncate">{album.title}</h4>
  <p className="font-body-sm text-text-muted truncate">{album.artistName}</p>
</div>
```

**Currently playing album:** Add `ring-2 ring-primary teal-glow` to the image wrapper.

---

### 5.6 AlbumHero / Discover Hero Section

Full-bleed hero at top of the home/discover page. 450px height desktop, full viewport width.

```tsx
<section className="px-lg pt-md pb-xl">
  <div className="relative h-[450px] rounded-xl overflow-hidden group cursor-pointer">
    {/* Scrim */}
    <div className="absolute inset-0 bg-black/40 z-10" />
    
    {/* Background image with subtle zoom on hover */}
    <div
      className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
      style={{ backgroundImage: `url(${getAlbumCover(album.coverImage, 1200)})` }}
    />
    
    {/* Content overlay */}
    <div className="absolute bottom-0 left-0 p-2xl z-20 w-full max-w-2xl">
      <span className="font-label-mono text-label-mono text-secondary mb-md block tracking-widest uppercase">
        Editor's Choice
      </span>
      <h2 className="font-bungee text-display text-white leading-tight mb-md">
        {album.title}
      </h2>
      <p className="font-body text-text-muted text-lg mb-lg">
        {album.description}
      </p>
      <div className="flex items-center gap-md">
        <button className="bg-primary text-on-primary px-xl py-md rounded-lg font-bold flex items-center gap-sm hover:scale-105 transition-transform teal-glow">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
          Listen Now
        </button>
        <button className="glass-panel px-xl py-md rounded-lg font-bold hover:bg-surface-hover transition-colors">
          Save to Library
        </button>
      </div>
    </div>
  </div>
</section>
```

---

### 5.7 TrackRow (`src/components/music/TrackRow.tsx`)

Grid layout: `grid-template-columns: 40px 1fr 60px`. Match exactly.

```tsx
<div className="group grid items-center p-sm rounded-lg hover:bg-white/[0.04] transition-all duration-150 cursor-pointer"
     style={{ gridTemplateColumns: '40px 1fr 60px' }}>
  
  {/* Col 1: track number → play button on hover */}
  <div className="flex items-center justify-center">
    {isPlaying ? (
      <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>equalizer</span>
    ) : (
      <>
        <span className="font-label-mono text-text-muted group-hover:hidden">
          {String(track.trackNumber).padStart(2, '0')}
        </span>
        <span className="material-symbols-outlined text-primary hidden group-hover:block" style={{ fontVariationSettings: "'FILL' 1" }}>
          play_arrow
        </span>
      </>
    )}
  </div>
  
  {/* Col 2: title + artist */}
  <div className="px-md flex flex-col">
    <span className={`font-body font-medium ${isPlaying ? 'text-primary font-bold' : 'text-on-surface'}`}>
      {track.title}
    </span>
    <span className="text-xs text-text-muted uppercase tracking-wider">
      {artist}{track.features?.length ? ` • feat. ${track.features.join(', ')}` : ''}
    </span>
  </div>
  
  {/* Col 3: duration + more menu */}
  <div className="flex items-center justify-end gap-md">
    <span className={`font-label-mono ${isPlaying ? 'text-primary' : 'text-text-muted'}`}>
      {formatDuration(track.duration)}
    </span>
    <button className="opacity-0 group-hover:opacity-100 transition-opacity">
      <span className="material-symbols-outlined text-on-surface-variant text-sm">more_vert</span>
    </button>
  </div>
</div>
```

**Active (currently playing) track row:**
```tsx
// Wrapper gets these classes instead of the hover variant:
className="bg-primary/10 border border-primary/20"
```

---

### 5.8 AlbumDetail (`src/components/music/AlbumDetail.tsx`)

Desktop layout: two-column side-by-side (`flex-row`), left = artwork + info, right = scrollable tracklist.

**Left column (2/5 width):**
```tsx
<section className="w-2/5 flex flex-col gap-lg">
  {/* Album art */}
  <div className="aspect-square w-full rounded-lg overflow-hidden shadow-2xl group relative">
    <img className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
         src={getAlbumCover(album.coverImage, 600)} alt={album.title} />
    {/* Play overlay */}
    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
      <button className="w-20 h-20 bg-primary text-on-primary rounded-full flex items-center justify-center teal-glow-hover shadow-[0_0_30px_rgba(98,243,228,0.4)]">
        <span className="material-symbols-outlined text-[40px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
      </button>
    </div>
  </div>
  
  {/* Album metadata */}
  <div className="space-y-sm">
    <h2 className="font-bungee text-display text-primary uppercase tracking-tight">{album.title}</h2>
    <p className="font-headline-md text-headline-md text-on-surface">{artistName}</p>
    <div className="flex items-center gap-md pt-sm">
      <span className="font-label-mono text-label-mono text-text-muted">
        {album.releaseYear} • {trackCount} TRACKS • {totalDuration}
      </span>
      <span className="px-sm py-xs border border-border rounded text-[10px] text-text-muted uppercase font-bold tracking-widest">
        Hi-Res Lossless
      </span>
    </div>
  </div>
  
  {/* Action buttons */}
  <div className="flex gap-md mt-md">
    <button className="flex-1 py-md bg-surface-container hover:bg-surface-hover rounded-lg font-label-mono text-label-mono transition-colors flex items-center justify-center gap-sm">
      <span className="material-symbols-outlined text-sm">shuffle</span>
      SHUFFLE
    </button>
    <button className="flex-1 py-md border border-border hover:bg-surface-container rounded-lg font-label-mono text-label-mono transition-colors flex items-center justify-center gap-sm">
      <span className="material-symbols-outlined text-sm">favorite</span>
      SAVE TO LIBRARY
    </button>
  </div>
</section>
```

**Right column (flex-1): Tracklist**
```tsx
<section className="flex-1 flex flex-col overflow-hidden">
  <div className="mb-md flex justify-between items-end border-b border-border pb-md">
    <h3 className="font-headline-sm text-headline-sm text-on-surface">Tracklist</h3>
    <span className="font-label-mono text-label-mono text-text-muted">Duration</span>
  </div>
  <div className="flex-1 overflow-y-auto pr-md space-y-xs custom-scrollbar">
    {tracks.map(track => <TrackRow key={track.id} track={track} />)}
  </div>
</section>
```

**Mobile album detail:** Stack vertically. Album art full-width at top, metadata below, then tracklist. Use mobile-appropriate padding (`px-md`) and smaller album art (`max-w-[300px] mx-auto`).

---

### 5.9 FullScreenPlayer (`src/components/layout/FullScreenPlayer.tsx`)

**Desktop layout:**
- Full viewport overlay (`fixed inset-0 z-50`)
- Ambient background: `bg-gradient-mesh` radial gradient
- Center: large album art (`320px` → `480px` on md), track title in Bungee, controls
- Left sidebar (fixed): vertical volume slider in `glass-panel`
- Right sidebar (fixed): "Up Next" queue in `glass-panel`

```tsx
{/* Ambient background layer */}
<div className="absolute inset-0 z-0 bg-gradient-mesh pointer-events-none" />

{/* Artwork */}
<div className="relative group mb-xl">
  <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
  <div className="relative w-[320px] h-[320px] md:w-[480px] md:h-[480px] rounded-lg shadow-2xl overflow-hidden group-hover:scale-[1.02] transition-transform duration-500">
    <img className="w-full h-full object-cover" ... />
  </div>
</div>

{/* Track info */}
<div className="text-center mb-xl">
  <h1 className="font-bungee text-4xl md:text-7xl mb-sm text-on-surface tracking-tight uppercase">
    {track.title}
  </h1>
  <p className="text-primary font-headline-sm text-headline-sm tracking-wide opacity-80 uppercase">
    {artistName} • {album.title}
  </p>
</div>

{/* Progress + controls */}
<div className="w-full max-w-3xl flex flex-col items-center gap-lg">
  {/* Scrubber */}
  <div className="relative h-1 w-full bg-white/10 rounded-full overflow-hidden cursor-pointer">
    <div className="absolute top-0 left-0 h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
  </div>
  <div className="flex justify-between font-label-mono text-label-mono text-text-muted w-full">
    <span>{currentTime}</span><span>{duration}</span>
  </div>
  
  {/* Controls */}
  <div className="flex items-center gap-xl">
    <button className="material-symbols-outlined text-on-surface-variant hover:text-on-surface text-[32px]">shuffle</button>
    <button className="material-symbols-outlined text-on-surface hover:text-primary text-[40px]">skip_previous</button>
    <button className="w-20 h-20 rounded-full bg-on-surface text-on-primary flex items-center justify-center teal-glow hover:scale-110 active:scale-95 transition-all">
      <span className="material-symbols-outlined text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }}>
        {isPlaying ? 'pause' : 'play_arrow'}
      </span>
    </button>
    <button className="material-symbols-outlined text-on-surface hover:text-primary text-[40px]">skip_next</button>
    <button className="material-symbols-outlined text-on-surface-variant hover:text-on-surface text-[32px]">repeat</button>
  </div>
</div>

{/* Left sidebar: volume */}
<aside className="fixed left-8 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-md z-20">
  <div className="glass-panel p-md rounded-xl flex flex-col items-center gap-lg w-16">
    <button className="material-symbols-outlined text-on-surface-variant hover:text-primary">volume_up</button>
    <div className="h-40 w-1 bg-white/10 rounded-full relative cursor-pointer">
      <div className="absolute bottom-0 left-0 w-full bg-primary rounded-full" style={{ height: `${volume}%` }} />
    </div>
    <button className="material-symbols-outlined text-on-surface-variant hover:text-primary">volume_off</button>
  </div>
</aside>

{/* Right sidebar: queue */}
<aside className="fixed right-8 top-1/2 -translate-y-1/2 hidden lg:flex z-20">
  <div className="glass-panel p-lg rounded-xl w-72 max-h-[400px] overflow-hidden">
    <h3 className="font-label-mono text-label-mono text-text-muted uppercase mb-md tracking-widest">Up Next</h3>
    {/* Queue items — grayscale until hover */}
    {queueTracks.map(t => (
      <div key={t.id} className="flex items-center gap-md group cursor-pointer opacity-60 hover:opacity-100 transition-opacity">
        <div className="w-10 h-10 rounded overflow-hidden">
          <img className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
               src={getAlbumCover(t.coverImage, 40)} alt={t.title} />
        </div>
        <div>
          <p className="text-body-sm font-bold text-on-surface truncate">{t.title}</p>
          <p className="text-[10px] text-text-muted uppercase">{t.artistName}</p>
        </div>
      </div>
    ))}
    <button className="mt-lg w-full py-sm rounded-lg bg-surface-hover text-on-surface text-xs font-label-mono uppercase tracking-tighter hover:bg-surface-variant transition-colors">
      Open Full Queue
    </button>
  </div>
</aside>
```

**Mobile Now Playing:**
- Full-screen overlay
- Blurred, scaled album art as background (`absolute inset-0 opacity-30 blur-3xl animate-drift`)
- Gradient scrim: `bg-gradient-to-t from-surface-container-lowest via-transparent to-transparent`
- Centered album art: `w-full max-w-lg aspect-square rounded-lg overflow-hidden border border-border`
- Track title: `font-bungee text-headline-lg tracking-tight`
- Badge next to artist: `font-label-mono border border-secondary/20 rounded-full px-sm text-secondary`
- Progress: thin `h-1` scrubber with `<input type="range">` for touch interaction
- Controls: `justify-around` with oversized skip/play icons (`text-[40px]` / `w-20 h-20`)

---

### 5.10 Library Page (`src/app/library/`)

**Page heading:**
```tsx
<h1 className="font-bungee text-headline-lg text-primary tracking-tight">YOUR COLLECTION</h1>
```

**Tab bar:**
```tsx
<div className="flex items-center gap-xl mb-xl border-b border-border">
  {['Playlists', 'Artists', 'Albums', 'Sounds'].map(tab => (
    <button key={tab}
      className={`pb-md border-b-2 font-headline-sm transition-all ${
        activeTab === tab
          ? 'border-primary text-primary'
          : 'border-transparent text-text-muted hover:text-on-surface'
      }`}
      onClick={() => setActiveTab(tab)}>
      {tab}
    </button>
  ))}
</div>
```

**Bento grid:**
```tsx
// CSS
.bento-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1.5rem;
}
```

**Featured playlist card (spans 2 cols on lg):**
```tsx
<div className="glass-card rounded-xl p-md group cursor-pointer lg:col-span-2">
  <div className="relative aspect-video rounded-lg overflow-hidden mb-md">
    <img className="w-full h-full object-cover" ... />
    {/* Hover play overlay */}
    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
      <button className="w-16 h-16 rounded-full bg-primary text-on-primary flex items-center justify-center scale-90 group-hover:scale-100 transition-transform">
        <span className="material-symbols-outlined text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
      </button>
    </div>
  </div>
  <h3 className="font-headline-md text-on-surface mb-xs">{playlist.name}</h3>
  <div className="flex justify-between items-end">
    <div className="font-label-mono text-label-mono text-text-muted space-y-1">
      <p>{playlist.trackCount} TRACKS</p>
      <p>UPDATED {updatedLabel}</p>
    </div>
    <span className="font-label-mono text-label-mono text-primary">CURATED BY NTV</span>
  </div>
</div>
```

**Regular library card:**
```tsx
<div className="glass-card rounded-xl p-md group cursor-pointer">
  <div className="relative aspect-square rounded-lg overflow-hidden mb-md bg-surface-container-highest">
    <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
         src={getAlbumCover(item.coverImage, 300)} alt={item.title} />
  </div>
  <h3 className="font-headline-sm text-on-surface truncate">{item.title}</h3>
  <p className="font-label-mono text-label-mono text-text-muted mt-xs uppercase">{item.trackCount} TRACKS • {item.year}</p>
</div>
```

---

### 5.11 Discover / Home Page (`src/app/page.tsx`)

**Section structure:**
1. Sticky header with search
2. Hero section (see 5.6)
3. "New Horizons" album grid — 5 columns on lg (`grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-lg`)
4. Two-column section: "Weekly Selections" list (2/3) + "Sonic Profile" sidebar (1/3)

**Section heading pattern:**
```tsx
<div className="flex justify-between items-end mb-lg">
  <div>
    <h3 className="font-bungee text-headline-md text-on-surface">New Horizons</h3>
    <p className="text-text-muted font-body-sm">Fresh sounds from the underground circuit.</p>
  </div>
  <a className="text-primary font-label-mono text-label-mono uppercase hover:underline" href="#">View All</a>
</div>
```

**Weekly Selections track row (with pink left accent on first item):**
```tsx
<div className="group flex items-center gap-md p-md rounded-lg hover:bg-surface-variant/30 transition-colors cursor-pointer border-l-4 border-secondary/60">
  {/* Track number → play on hover */}
  <span className="font-label-mono text-text-muted w-8 text-center group-hover:hidden">01</span>
  <span className="material-symbols-outlined text-primary hidden group-hover:block w-8 text-center" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
  
  {/* Thumbnail */}
  <div className="w-12 h-12 rounded bg-surface-container overflow-hidden">
    <img className="w-full h-full object-cover" src={getAlbumCover(track.coverImage, 48)} alt={track.title} />
  </div>
  
  <div className="flex-1">
    <h5 className="font-body font-bold">{track.title}</h5>
    <p className="text-body-sm text-text-muted">{artistName}</p>
  </div>
  
  <div className="hidden md:block text-body-sm text-text-muted">{formatDuration(track.duration)}</div>
  <span className="material-symbols-outlined text-text-muted hover:text-primary transition-colors">more_horiz</span>
</div>
```

---

## 6. Animation & Motion

Keep all existing Framer Motion transitions. Add these patterns:

**Stagger entry for track lists:**
```tsx
// On mount, stagger each TrackRow
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } }
}
const itemVariants = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
}
```

**Album art parallax (desktop FullScreenPlayer only):**
```tsx
useEffect(() => {
  const handler = (e: MouseEvent) => {
    const xAxis = (window.innerWidth / 2 - e.pageX) / 50
    const yAxis = (window.innerHeight / 2 - e.pageY) / 50
    artworkRef.current.style.transform = `rotateY(${xAxis}deg) rotateX(${yAxis}deg)`
  }
  document.addEventListener('mousemove', handler)
  return () => document.removeEventListener('mousemove', handler)
}, [])
```

---

## 7. Responsive Breakpoints

| Breakpoint | Layout |
|------------|--------|
| `< 768px` (mobile) | No sidebar. MobileTabBar at bottom. Mini player above tabbar. Full-screen now playing. |
| `768px – 1024px` (tablet) | Sidebar hidden. TopBar hamburger visible. Single-column album grid. |
| `>= 1024px` (desktop) | Fixed sidebar. 5-col album grid. Two-column album detail. FullScreenPlayer side panels visible. |

---

## 8. Tailwind Config Update

Full `tailwind.config.ts` `extend` block — replace existing:

```ts
extend: {
  colors: {
    primary: '#62f3e4',
    secondary: '#ffabef',
    background: '#393838',
    'surface-container-lowest': '#090f0e',
    'surface-container-low': '#161d1c',
    'surface-container': '#1a2120',
    'surface-container-high': '#242b2a',
    'surface-container-highest': '#2f3635',
    'surface-variant': '#2f3635',
    'surface-elevated': '#2a2929',
    'surface-hover': '#3e3e3e',
    'surface-bright': '#343b39',
    'surface-dim': '#0e1514',
    'surface-tint': '#45dccd',
    'on-surface': '#dde4e2',
    'on-surface-variant': '#bbcac6',
    'text-muted': '#b3b3b3',
    'border': 'rgba(255,255,255,0.08)',
    'outline': '#859491',
    'outline-variant': '#3c4947',
    'on-primary': '#003733',
    'primary-container': '#3dd6c8',
    'on-primary-container': '#005952',
    'inverse-primary': '#006a62',
    'primary-fixed': '#69f8ea',
    'primary-fixed-dim': '#45dccd',
    'secondary-container': '#bf00b8',
    'on-secondary-container': '#ffe5f6',
    'secondary-fixed-dim': '#ffabef',
    'on-background': '#dde4e2',
    'inverse-surface': '#dde4e2',
    'inverse-on-surface': '#2b3231',
    'surface': '#282828',
    error: '#ffb4ab',
    'error-container': '#93000a',
  },
  borderRadius: {
    DEFAULT: '0.25rem',
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    full: '9999px',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },
  fontSize: {
    display:       ['48px', { lineHeight: '1.3', fontWeight: '700' }],
    'headline-lg': ['32px', { lineHeight: '1.3', fontWeight: '700' }],
    'headline-md': ['24px', { lineHeight: '1.3', fontWeight: '600' }],
    'headline-sm': ['20px', { lineHeight: '1.3', fontWeight: '600' }],
    body:          ['16px', { lineHeight: '1.5', fontWeight: '400' }],
    'body-sm':     ['14px', { lineHeight: '1.5', fontWeight: '400' }],
    'label-mono':  ['12px', { lineHeight: '1',   fontWeight: '500' }],
  },
  fontFamily: {
    bungee: ['var(--font-bungee)', 'cursive'],
    mono:   ['var(--font-mono)', 'monospace'],
  },
  boxShadow: {
    card:  '0 8px 24px rgba(0,0,0,0.5)',
    hover: '0 4px 12px rgba(0,0,0,0.3)',
  },
}
```

---

## 9. File-by-File Checklist

Use this to track progress. Check off each file as you update it.

### Global / Config
- [ ] `tailwind.config.ts` — replace color/spacing/font tokens (Section 8)
- [ ] `src/app/globals.css` — body bg, scrollbar, glow utilities, glassmorphism, animate-drift (Section 3)
- [ ] `src/app/layout.tsx` — add Bungee + Space Mono font, shell structure (Sections 2, 4)

### Layout Components
- [ ] `src/components/layout/Sidebar.tsx` — new structure, glass profile panel, Bungee brand (5.1)
- [ ] `src/components/layout/TopBar.tsx` — search pill, gradient bg, mobile styles (5.2)
- [ ] `src/components/layout/PlayerBar.tsx` — teal play button, 3-column layout, progress glow (5.3)
- [ ] `src/components/layout/MobileTabBar.tsx` — 3-tab nav, active fill icon, mini player (5.4)
- [ ] `src/components/layout/FullScreenPlayer.tsx` — desktop side panels, mobile blurred bg, Bungee title (5.9)
- [ ] `src/components/layout/LyricsModal.tsx` — update surface/border colors to new tokens

### Music Components
- [ ] `src/components/music/AlbumCard.tsx` — teal play overlay, border, hover scale (5.5)
- [ ] `src/components/music/AlbumHero.tsx` — full-bleed hero, Bungee title, glass CTA buttons (5.6)
- [ ] `src/components/music/TrackRow.tsx` — 40/1fr/60 grid, active teal bg, stagger animation (5.7)
- [ ] `src/components/music/AlbumDetail.tsx` — 2-col desktop layout, Bungee album title (5.8)

### Pages
- [ ] `src/app/page.tsx` — hero, 5-col grid, weekly selections, Bungee section headings (5.11)
- [ ] `src/app/library/page.tsx` — bento grid, Bungee heading, glass cards, tab bar (5.10)
- [ ] `src/app/album/[id]/page.tsx` — ensure AlbumDetail 2-col layout renders correctly
- [ ] `src/app/artist/[slug]/page.tsx` — update hero and card colors to new tokens

---

## 10. Anti-Patterns — Do Not Do

These are explicitly forbidden by the design system:

- **No `background-color: #393838`** anywhere as a page background — use `#090f0e`
- **No Bungee on body text, nav items, track titles, or metadata** — Inter only
- **No gradient text** — use solid color, vary weight/size
- **No thick side-stripe borders** — use `border border-border` (full border) or background tint
- **No shadows on text** — shadows on surfaces only
- **No rounded corners > 8px (`rounded-lg`)** on interactive cards/buttons — use xl only on modals/panels
- **No `console.log` with tokens, session data, or user info** (CLAUDE.md rule 1)
- **No raw `coverImage` or `profileImage` passed to `<img src>`** — always `getAlbumCover()` (CLAUDE.md rule 13)
- **No nested cards** (card inside card) — flatten the hierarchy
- **No animated layout properties** — animate only opacity, transform (scale/translate), and color

---

## 11. Security Reminders

These rules from `CLAUDE.md` apply to all UI work in this refresh:

- Any new public API endpoint (e.g., play count, analytics) must call `checkRateLimit()` first
- Admin-facing UI must not weaken CSP — no new `*` wildcard script-src
- All covers rendered via `getAlbumCover()` from `src/lib/albumCover.ts`
- No stack traces or internal paths in client-side error messages

---

*Last updated: 2026-06-22. Derived from: `Desktop UI Update/` + `Mobile UI Update/` reference mockups.*
