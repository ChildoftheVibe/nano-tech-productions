# NTV Vault — UI & Feature Update Prompts
**Project:** Nano Tech Vibe (NTV) Vault
**Stack:** Next.js 16 · React 19 · Tailwind CSS 4 · TypeScript 5 · Supabase · Cloudinary · Zustand 5 · Framer Motion 12
**Repo:** /workspaces/nano-tech-productions/

---

## Standing Rules — Read Before Every Phase

1. **Read before touching.** Every phase starts by reading the target file and confirming what is there. Never assume.
2. **One build per phase.** Run `npm run build` after every phase. Stop if it fails.
3. **Minimum change only.** Change only what the phase describes. Do not refactor, rename, reorder, or reformat anything else in the file.
4. **Do not reorganize imports.** Add new imports at the end of the existing import block. Never move or sort existing imports.
5. **Do not run prettier, eslint --fix, or any formatter.** Leave existing code style as-is.
6. **Null-safe everything.** Any access to a ref or DOM element must use optional chaining: `audioRef.current?.muted`, never `audioRef.current.muted`.
7. **SSR guard for browser APIs.** Any use of `window`, `navigator`, `localStorage`, or `document` must be inside a check: `if (typeof window === 'undefined') return`.
8. **"use client" is always the literal first line** of any new client component file — before any imports.
9. **Never prefetch vault audio.** Any prestream or prefetch operation must only use the public audio URL field. The vault audio field (used for admin WAV downloads) requires authentication headers. Prefetching it would send credentials to Cloudinary without user intent and must never be done.
10. **Prefetch requests must use `credentials: 'omit'`.** Public Cloudinary audio URLs require no authentication. Always set `credentials: 'omit'` on any `fetch()` call used for audio prefetching so session tokens are never sent.
11. **Validate color values before rendering.** Any hex color coming from the database must be validated against `/^#([A-Fa-f0-9]{6})$/` before being set as an inline style. Fall back to the app default `#3DD6C8` if the value is missing, null, or malformed. This prevents XSS via stored style injection.

---

## PHASE 1 — Favicon

```
Open src/app/layout.tsx.

Find the exported `metadata` object (it uses the Next.js
App Router Metadata API, not a <Head> tag).

Show me the exact current value of the `icons` field
inside that metadata object. If there is no `icons`
field, show me the line where the metadata object starts.

Then make this single change — replace or add the icons
field so it reads exactly:

  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },

The file /public/icon-192.png already exists. Do not
add or change any import. Do not change anything else
in this file.

Run: npm run build
Paste the full terminal output here. Stop here.
```

---

## PHASE 2 — Read Player Layout Files (No Changes)

```
Read the following three files completely and paste the
specific sections I list. Do not change anything.

FILE 1: src/components/layout/PlayerBar.tsx
Paste:
  a) The "use client" line and every import statement
     at the top of the file
  b) The opening JSX tag of the outermost returned div
     — just that one line with its full className string
  c) The element that renders the album art thumbnail
     — just that element and its className
  d) The element that renders the track title text
     — just that element and its className
  e) The element that renders the artist name text
     — just that element and its className
  f) Every control button element (play, pause, next,
     prev, mute) — each button's opening tag and className
  g) The full className of the container that holds
     the control buttons

FILE 2: src/components/layout/MobileTabBar.tsx
Paste:
  a) Every import statement
  b) The outermost returned div's full className
  c) The className of each tab icon
  d) The className of each tab label text
  e) Any class or style referencing safe-area,
     padding-bottom, env(), or pb-safe

FILE 3: src/app/layout.tsx
Paste:
  a) Every line that renders PlayerBar or MobileTabBar
     including the surrounding 3 lines of context

Stop here. Make zero changes.
```

> ⚠️ Wait for Claude Code to paste the full output. Then enter Phase 3.

---

## PHASE 3 — Compact Player Height + Correct Stacking

```
Using the exact code you pasted in Phase 2, make these
targeted changes. Touch nothing else.

IN src/components/layout/PlayerBar.tsx:

CHANGE 1 — Container height:
On the outermost div, find the height class (h-*, 
min-h-*, or a fixed height in a style prop).
Replace it with h-14. If there is no height class,
add h-14 to the existing className.

CHANGE 2 — Container bottom position:
On that same outermost div, find the bottom-* positioning
class. Replace it with: bottom-14 md:bottom-0
If the bottom position is set via a style prop instead
of a className, add style={{ bottom: '3.5rem' }} on
mobile and handle md breakpoint via className md:bottom-0
alongside removing the inline style.

CHANGE 3 — Internal padding:
Find the py-* class on the direct child wrapper inside
the container. Change it to py-1. If py-* does not
exist on that wrapper, add py-1.

CHANGE 4 — Thumbnail size:
Find the album art <img> or <Image> element. Change
its width and height classes to w-10 h-10.
If it uses width={} height={} numeric props instead,
change them to width={40} height={40}.

CHANGE 5 — Track title font size:
Find the track title text element. Change its text
size class to text-xs. Keep all other classes.

CHANGE 6 — Artist name font size:
Find the artist name text element. Change its text
size class to text-xs. Keep all other classes.

CHANGE 7 — Control icon sizes:
For each control button icon (play, pause, next, prev,
mute): change the size class to w-4 h-4.
If icons use size={} prop instead of className,
change to size={16}.

Do NOT touch: onClick handlers, Zustand selectors,
conditional rendering logic, or animation classes.

IN src/components/layout/MobileTabBar.tsx:

CHANGE 8 — Container height:
Change the height class on the outermost div to h-14.

CHANGE 9 — Icon sizes:
Change every icon size class to w-5 h-5, or size={20}
if using a size prop.

CHANGE 10 — Label font size:
Change every label text size class to text-[10px].

CHANGE 11 — Vertical padding:
Change the internal py-* class to py-1.

CHANGE 12 — Safe area:
Do not remove or change any class or style containing:
safe-area, pb-safe, env(, or padding-bottom.
Leave those exactly as they are.

IN src/app/layout.tsx:

CHANGE 13 — Component order:
Look at the two lines where PlayerBar and MobileTabBar
are rendered. MobileTabBar must come AFTER PlayerBar
in the file (later in the JSX = rendered on top in a
fixed stacking context). If MobileTabBar is already
after PlayerBar, make no change. If it is before,
swap only those two lines.

Run: npm run build
Paste the full terminal output. If there are errors,
paste them and fix only the erroring lines.
Stop here.
```

---

## PHASE 4 — Read Mute-Related Code (No Changes)

```
Read the following files and paste the exact sections
listed. Make zero changes.

FILE 1: src/store/playerStore.ts
Paste:
  a) The complete TypeScript type or interface for
     the store state (every field and its type)
  b) Every action function defined in the store
  c) Any field or action containing the words:
     mute, muted, isMuted, volume, or setVolume

FILE 2: src/context/PlayerContext.tsx
Paste:
  a) Every import statement
  b) How the HTMLAudioElement ref is declared
     (the exact useRef line)
  c) Every useEffect in the file — paste each one
     completely including its dependency array
  d) Any code that reads or sets audioRef.current.muted
     or audioRef.current.volume

FILE 3: src/components/layout/PlayerBar.tsx
Paste:
  a) The mute button element — its full JSX including
     the onClick handler and the icon inside it
  b) How isMuted is read in this component — is it
     from a Zustand selector, local useState, or a
     context value? Paste the exact line.

Stop here. Make zero changes.
```

---

## PHASE 5 — Fix Mute Button

```
Using only the code pasted in Phase 4, apply the
minimum fix to make the mute button work.

THE BUG: The isMuted value in Zustand state is toggled
correctly but HTMLAudioElement.muted is never actually
set on the audio element, so audio continues playing
at full volume.

--- IF isMuted DOES NOT EXIST in playerStore.ts ---

In src/store/playerStore.ts:
Add these two items to the store. Do not change,
rename, or remove any existing field or action:
  State field:  isMuted: boolean
  Initial value: false
  Action: toggleMute: () => void
  Implementation: () => set((state) => ({
    isMuted: !state.isMuted
  }))

--- IF isMuted ALREADY EXISTS in playerStore.ts ---
Make no changes to playerStore.ts.

--- ALWAYS — In src/context/PlayerContext.tsx ---

Add this one new useEffect. Add it after the last
existing useEffect. Do not modify any existing
useEffect:

  const isMuted = usePlayerStore((s) => s.isMuted)

  useEffect(() => {
    if (!audioRef.current) return
    audioRef.current.muted = isMuted
  }, [isMuted])

Replace usePlayerStore with whatever the actual store
hook name is in this file, matching how it is already
imported and used.

Add isMuted to the import line for the player store
selector. Do not change anything else on that import.

--- ALWAYS — In src/components/layout/PlayerBar.tsx ---

Check: does the mute button's onClick call toggleMute?
If yes, make no change to the onClick.
If no, change the onClick to call toggleMute() from
the store. Import toggleMute using the same pattern
already used in this file for other store actions.

Check: does the mute button icon switch between a
muted icon and an unmuted icon based on isMuted?
If yes, make no change.
If no, update only the icon element inside the button
to render conditionally:
  isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />
Use the Lucide icon names already imported in this
file if they differ. Do not change button layout,
className, or onClick.

Run: npm run build
Paste full output. Stop here.
```

---

## PHASE 6 — Swipe Up to Open Full Screen Player

```
Open src/components/layout/PlayerBar.tsx.

STEP 1 — Find the open-fullscreen action:
Search the file for any of these patterns:
  setIsFullScreen, setFullScreen, openFullScreen,
  isFullScreen, showFullScreen, expandPlayer
Also search src/store/playerStore.ts for the same.
Paste the exact action name and how it is called.

STEP 2 — Add the swipe gesture:
Add the following to the PlayerBar component.
Add the useRef import to the existing React import
line if useRef is not already imported there.

Declare the ref at the top of the component function,
before any existing refs:
  const touchStartY = useRef<number>(0)

Declare these two handler functions before the return
statement. Replace OPEN_FULLSCREEN_ACTION with the
exact action name found in Step 1:

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = touchStartY.current -
      e.changedTouches[0].clientY
    if (delta > 40) {
      OPEN_FULLSCREEN_ACTION()
    }
  }

On the outermost container div of PlayerBar, add
these two props. Do not remove any existing props:
  onTouchStart={handleTouchStart}
  onTouchEnd={handleTouchEnd}

Do not add any useEffect. These are inline React
synthetic event handlers, not addEventListener calls.
Do not change anything else.

Run: npm run build
Paste full output. Stop here.
```

---

## PHASE 6A — Read Audio + Queue Structure (No Changes)

```
Read the following files completely and paste the
exact sections listed. Make zero changes.

FILE 1: src/types/music.ts
Paste the complete Track type or interface.
Specifically identify:
  a) The field used for the public-facing audio URL
     (likely audio_url, public_audio_id, or stream_url)
  b) The field used for the vault/admin audio URL
     (likely vault_audio_id or similar)
  c) The price field name and its TypeScript type
  d) The id field name

FILE 2: src/lib/cloudinary.ts
Paste the complete file.
We need to understand how the public audio URL
is constructed from a track object so we can
replicate it for prefetching.

FILE 3: src/store/playerStore.ts
Paste:
  a) The complete state type (every field)
  b) Every action defined in the store
  c) Specifically how the queue is stored — is it
     an array of track objects, an array of IDs,
     or something else?
  d) How the "next track" or "current index" is
     tracked — paste those exact fields

FILE 4: src/context/PlayerContext.tsx
Paste:
  a) Every import statement
  b) How the audioRef HTMLAudioElement is declared
  c) Every useEffect in the file — each one
     completely with its dependency array
  d) How currentTrack is accessed in this file —
     is it from a Zustand selector, a prop, or
     a context value? Paste the exact line.

Stop here. Make zero changes.
```

> ⚠️ Wait for the full output. Then enter Phase 6B.

---

## PHASE 6B — Add Connection Status to Player Store

```
This phase adds the minimum fields needed to track
audio connection health. It only ADDS new fields.
It does not remove, rename, or restructure anything.

Open src/store/playerStore.ts.
Using the state type you pasted in Phase 6A,
add these items:

ADDITION 1 — Connection status type:
Add this type declaration at the top of the file,
before the store state type definition.
Do not place it inside the state type:

  export type ConnectionStatus =
    | 'ok'
    | 'reconnecting'
    | 'interference'

ADDITION 2 — State fields:
Inside the existing state type or interface,
add these two fields. Add them at the END of the
existing fields list, not at the top:

  connectionStatus: ConnectionStatus
  retryCount: number

ADDITION 3 — Initial values:
Inside the create() call where initial state is
set, add these two initial values at the END
of the existing initial values:

  connectionStatus: 'ok' as ConnectionStatus,
  retryCount: 0,

ADDITION 4 — Actions:
Inside the create() call where actions are defined,
add these three actions at the END of the existing
actions, before the closing brace:

  setConnectionStatus: (status: ConnectionStatus) =>
    set({ connectionStatus: status }),

  incrementRetryCount: () =>
    set((state) => ({ retryCount: state.retryCount + 1 })),

  resetConnectionState: () =>
    set({ connectionStatus: 'ok', retryCount: 0 }),

Match the exact Zustand 5 set() pattern already
used in this file for other actions. If the file
uses set(state => ({...})) for all actions, match
that pattern. If it uses set({...}) for simple
assignments, match that instead.

Do not add ConnectionStatus to the store type
import — it is already in this file as a local type.

Run: npm run build
Paste full output. Stop here.
```

---

## PHASE 6C — Pre-Stream Next Track (Warm SW Cache)

```
This phase adds background prefetching of the next
queued track's audio to eliminate buffering when
tracks change. It modifies only PlayerContext.tsx.

SECURITY RULES FOR THIS PHASE:
- Never prefetch vault audio URLs. Vault URLs require
  admin authentication. Prefetching them would send
  auth credentials to Cloudinary without user intent.
- Use credentials: 'omit' on ALL prefetch operations.
- Only prefetch when connection quality is sufficient.
- Always abort in-flight prefetch on track change or
  component unmount to prevent memory leaks.
- Errors in prefetch must never throw or surface to
  the user. Wrap everything in try/catch.

Open src/context/PlayerContext.tsx.
Using what you read in Phase 6A:

STEP 1 — Identify the next track:
From the queue structure in playerStore, determine
how to get the next track. It will be one of:
  PATTERN A: queue[currentIndex + 1]
  PATTERN B: a dedicated nextTrack field
  PATTERN C: a getNextTrack() selector
Confirm which pattern exists and use it exactly.

STEP 2 — Identify the public audio URL:
From the Track type in Phase 6A, identify the field
that holds the public Cloudinary audio URL (NOT the
vault URL). If the URL is constructed via a function
in lib/cloudinary.ts, use that same function.
Note: the vault URL field must NEVER be used here.

STEP 3 — Add imports:
Add these to the existing import block at the end,
only if not already present:

  import * as Sentry from '@sentry/nextjs'

STEP 4 — Add one ref inside the context provider
component function, after the existing refs:

  const preloadAbortRef = useRef<AbortController | null>(null)

STEP 5 — Add this useEffect after the last existing
useEffect. Replace NEXT_TRACK_EXPRESSION with the
exact expression from Step 1. Replace
GET_PUBLIC_AUDIO_URL(track) with the exact URL
field or function from Step 2:

  useEffect(() => {
    // Abort any in-flight prefetch from previous track
    preloadAbortRef.current?.abort()
    preloadAbortRef.current = null

    const nextTrack = NEXT_TRACK_EXPRESSION
    if (!nextTrack) return

    // SECURITY: Get public audio URL only.
    // Never use vault_audio_id here.
    const audioUrl = GET_PUBLIC_AUDIO_URL(nextTrack)
    if (!audioUrl || typeof audioUrl !== 'string') return
    if (audioUrl.trim() === '') return

    // SECURITY: Skip if URL looks like a vault/signed URL
    // Signed Cloudinary URLs contain 's--' in the path
    if (audioUrl.includes('s--')) return

    // CONNECTION AWARENESS: Skip prefetch on slow or
    // metered connections
    if (typeof window !== 'undefined') {
      const conn = (navigator as Navigator & {
        connection?: {
          saveData?: boolean
          effectiveType?: string
        }
      }).connection
      if (conn?.saveData === true) return
      const slowTypes = ['slow-2g', '2g']
      if (conn?.effectiveType &&
          slowTypes.includes(conn.effectiveType)) {
        return
      }
    }

    // Delay 5 seconds so current track stabilises
    // before using bandwidth on the next track
    const delay = setTimeout(() => {
      try {
        const controller = new AbortController()
        preloadAbortRef.current = controller

        // Fetch the audio URL to prime the SW cache.
        // The SW's CacheFirst strategy intercepts this
        // and stores the response so the next play
        // request is served from cache with no buffer.
        // credentials: 'omit' — public URL, no auth.
        fetch(audioUrl, {
          method: 'GET',
          credentials: 'omit',
          signal: controller.signal,
        })
          .catch((err) => {
            // AbortError is expected on track change.
            // Only report unexpected errors to Sentry.
            if (
              err instanceof Error &&
              err.name !== 'AbortError'
            ) {
              Sentry.addBreadcrumb({
                category: 'audio.prestream',
                message: 'Prefetch failed silently',
                level: 'debug',
                data: { trackId: nextTrack.id },
              })
            }
          })
      } catch {
        // Prefetch errors must never surface to UI
      }
    }, 5000)

    return () => {
      clearTimeout(delay)
      preloadAbortRef.current?.abort()
      preloadAbortRef.current = null
    }
  // Dependency: re-run when current track changes.
  // Use the current track's id field as identified
  // in Phase 6A Step 1d:
  }, [currentTrack?.id])

Do not change any other useEffect. Do not change
the dependency arrays of existing useEffects.

Run: npm run build
Paste full output. Stop here.
```

---

## PHASE 6D — Cosmic Interference (9-Second Recovery)

```
This phase has three steps. Complete them in order
and run npm run build after each one.

SECURITY RULES FOR THIS PHASE:
- Never expose audio URLs in user-facing error text.
- Cap retry attempts at 3. After 3 failures, stop
  calling audio.load() to avoid hammering the CDN.
- Use Sentry to log persistent failures (retryCount
  reaches 3) for monitoring — but do not block UI.
- Reset all error state when the track changes so
  errors from one track never affect the next.

--- STEP 1 — Add audio event listeners to
             PlayerContext.tsx ---

Open src/context/PlayerContext.tsx.
Add useRef import if not already imported.
Add this ref inside the component function after
existing refs:

  const hasPlayedRef = useRef<boolean>(false)

Add this useEffect after the prestream useEffect
added in Phase 6C. Replace SET_CONNECTION_STATUS,
INCREMENT_RETRY, RESET_CONNECTION with the exact
action names added to playerStore in Phase 6B.
Replace CURRENT_TRACK_ID with the exact field name
from Phase 6A:

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    let timer: ReturnType<typeof setTimeout> | null =
      null

    const clearTimer = () => {
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
    }

    const startTimer = (durationMs: number) => {
      clearTimer()
      timer = setTimeout(() => {
        SET_CONNECTION_STATUS('interference')
      }, durationMs)
    }

    const handleTimeUpdate = () => {
      if (audio.currentTime > 2) {
        hasPlayedRef.current = true
      }
    }

    const handleWaiting = () => {
      // Guard 1: ignore initial buffering
      if (!hasPlayedRef.current) return
      // Guard 2: ignore seeks — user is scrubbing
      if (audio.seeking) return
      // Guard 3: if already in interference, do nothing
      const status = usePlayerStore.getState()
        .connectionStatus
      if (status === 'interference') return

      // If device is offline, skip countdown entirely
      if (typeof window !== 'undefined' &&
          !navigator.onLine) {
        SET_CONNECTION_STATUS('interference')
        return
      }

      SET_CONNECTION_STATUS('reconnecting')
      startTimer(9000)
    }

    const handleStalled = () => {
      handleWaiting()
    }

    const handleCanPlay = () => {
      clearTimer()
      SET_CONNECTION_STATUS('ok')
    }

    const handlePlaying = () => {
      clearTimer()
      SET_CONNECTION_STATUS('ok')
    }

    const handleError = () => {
      if (!hasPlayedRef.current) return
      // Hard errors get a shorter 3-second window
      // before showing interference
      clearTimer()
      startTimer(3000)
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('waiting', handleWaiting)
    audio.addEventListener('stalled', handleStalled)
    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('playing', handlePlaying)
    audio.addEventListener('error', handleError)

    return () => {
      clearTimer()
      audio.removeEventListener(
        'timeupdate', handleTimeUpdate)
      audio.removeEventListener('waiting', handleWaiting)
      audio.removeEventListener('stalled', handleStalled)
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('playing', handlePlaying)
      audio.removeEventListener('error', handleError)
    }
  // Empty deps: audio element ref is stable.
  // This effect runs once and manages its own cleanup.
  }, [])

  // Reset connection state when track changes so
  // errors from one track never carry to the next:
  useEffect(() => {
    hasPlayedRef.current = false
    RESET_CONNECTION()
  }, [currentTrack?.CURRENT_TRACK_ID])

Replace usePlayerStore with the actual store hook
name used in this file.
Run: npm run build. Paste output. Fix errors. Continue.

--- STEP 2 — Create CosmicInterferenceBanner ---

Create src/components/layout/CosmicInterferenceBanner.tsx

The FIRST line must be exactly:
  'use client'

Then write these imports:
  import { useState, useEffect, useCallback } from 'react'
  import { motion, AnimatePresence } from 'framer-motion'
  import { WifiOff, RefreshCw } from 'lucide-react'
  import * as Sentry from '@sentry/nextjs'

Then write this type import using the exact store
hook name used in PlayerContext.tsx (replace
usePlayerStore with the actual name):
  import { usePlayerStore } from '@/store/playerStore'
  import type { ConnectionStatus } from
    '@/store/playerStore'

const MAX_RETRIES = 3

export default function CosmicInterferenceBanner() {
  const connectionStatus = usePlayerStore(
    (s) => s.connectionStatus)
  const retryCount = usePlayerStore(
    (s) => s.retryCount)
  const setConnectionStatus = usePlayerStore(
    (s) => s.setConnectionStatus)
  const incrementRetryCount = usePlayerStore(
    (s) => s.incrementRetryCount)
  const resetConnectionState = usePlayerStore(
    (s) => s.resetConnectionState)

  const [countdown, setCountdown] = useState(9)

  // Run countdown while reconnecting
  useEffect(() => {
    if (connectionStatus !== 'reconnecting') {
      setCountdown(9)
      return
    }
    setCountdown(9)
    const interval = setInterval(() => {
      setCountdown((n) => {
        if (n <= 1) {
          clearInterval(interval)
          return 0
        }
        return n - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [connectionStatus])

  const handleRetry = useCallback(() => {
    if (retryCount >= MAX_RETRIES) return

    incrementRetryCount()
    setConnectionStatus('reconnecting')

    // Attempt to resume the audio element.
    // Access via the DOM directly — PlayerContext
    // owns the ref and this component cannot access it.
    const audioEl = document.querySelector(
      'audio') as HTMLAudioElement | null
    if (!audioEl) return

    try {
      audioEl.load()
      audioEl.play().catch(() => {
        // play() rejection is handled by the
        // 'waiting'/'error' event listeners in
        // PlayerContext, not here.
      })
    } catch {
      // Never throw from retry handler
    }

    // Log persistent failures to Sentry for monitoring
    if (retryCount + 1 >= MAX_RETRIES) {
      Sentry.captureMessage(
        'Audio: cosmic interference — max retries', {
          level: 'warning',
          extra: {
            retryCount: retryCount + 1,
            online: typeof window !== 'undefined'
              ? navigator.onLine : 'unknown',
          },
        }
      )
    }
  }, [retryCount, incrementRetryCount,
      setConnectionStatus])

  const handleDismiss = () => {
    resetConnectionState()
  }

  const isVisible =
    connectionStatus === 'reconnecting' ||
    connectionStatus === 'interference'

  const exhausted = retryCount >= MAX_RETRIES

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed left-0 right-0 z-40
            bg-[#1a1a1a] border-t border-white/10
            px-4 py-2.5"
          style={{ bottom: '112px' }}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
          }}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center
            gap-3 max-w-sm mx-auto">
            <WifiOff
              size={16}
              className={
                connectionStatus === 'interference'
                  ? 'text-[#EB41DF] shrink-0'
                  : 'text-white/40 shrink-0'
              }
            />
            <div className="flex-1 min-w-0">
              {connectionStatus === 'reconnecting' && (
                <>
                  <p className="text-xs font-medium
                    text-white/80 truncate">
                    Reconnecting
                    <span className="text-white/40
                      ml-1">
                      ({countdown}s)
                    </span>
                  </p>
                  <p className="text-[10px]
                    text-white/40 truncate">
                    Holding the signal...
                  </p>
                </>
              )}
              {connectionStatus === 'interference' &&
               !exhausted && (
                <>
                  <p className="text-xs font-medium
                    text-white truncate">
                    🌌 Cosmic Interference
                  </p>
                  <p className="text-[10px]
                    text-white/40 truncate">
                    Something disrupted the signal
                  </p>
                </>
              )}
              {connectionStatus === 'interference' &&
               exhausted && (
                <>
                  <p className="text-xs font-medium
                    text-white/80 truncate">
                    Signal lost
                  </p>
                  <p className="text-[10px]
                    text-white/40 truncate">
                    Check your connection
                  </p>
                </>
              )}
            </div>

            {connectionStatus === 'interference' &&
             !exhausted && (
              <button
                onClick={handleRetry}
                className="shrink-0 flex items-center
                  gap-1.5 text-[10px] px-2.5 py-1
                  rounded-full border
                  border-[#3DD6C8]/40
                  text-[#3DD6C8]
                  hover:bg-[#3DD6C8]/10
                  transition-colors"
              >
                <RefreshCw size={11} />
                Retry
              </button>
            )}

            <button
              onClick={handleDismiss}
              className="shrink-0 text-[10px]
                text-white/30 hover:text-white/60
                transition-colors px-1 py-1"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

Save the file.
Run: npm run build. Paste output. Fix errors. Continue.

--- STEP 3 — Add banner to layout ---

Open src/app/layout.tsx.

Add this import at the end of the existing import
block:
  import CosmicInterferenceBanner from
    '@/components/layout/CosmicInterferenceBanner'

Find the line where InstallPromptBanner is rendered
(added in Phase 20). Add CosmicInterferenceBanner
on the line DIRECTLY ABOVE InstallPromptBanner:
  <CosmicInterferenceBanner />
  <InstallPromptBanner />

If Phase 20 has not been run yet, add
CosmicInterferenceBanner on the line directly above
PlayerBar instead.

Do not change any other line.

Run: npm run build
Paste full output. Stop here.
```

---

## PHASE 6E-A — Read Player and Album Color Data (No Changes)

```
Before building the waveform, I need to understand
exactly how the player tracks album data and whether
accent colors are already stored. Read these files
and paste the exact sections listed. Make zero changes.

FILE 1: src/store/playerStore.ts
Paste:
  a) The complete state type — every field
  b) The shape of the currentTrack object.
     Specifically:
     - Is there an `album` object nested inside
       the track, or just an `album_id`?
     - Is there an `album_type` field on the track
       or the album?
     - Is there any color field (accent_color,
       theme_color, color, palette)?

FILE 2: src/types/music.ts
Paste:
  a) The complete Track type or interface
  b) The complete Album type or interface
  c) Specifically: every field on Album —
     looking for any existing color, accent,
     or theme field

FILE 3: src/components/layout/PlayerBar.tsx
Paste:
  a) Every import statement
  b) The section of JSX that renders the track
     title and artist name — the exact elements
     and their surrounding container
  c) How isPlaying is accessed — from store,
     context, or local state? Paste the exact line.
  d) The full className of the outermost div
     that wraps track title and artist together

FILE 4: src/lib/queries.ts
Paste the function that fetches the current track
for playback. Specifically: does it JOIN or select
the album object alongside the track? Does it
include any color field from the album?

Stop here. Make zero changes.
```

> ⚠️ Wait for full output. Then enter Phase 6E-B.

---

## PHASE 6E-B — Check and Add Album Accent Color Field

```
Using the types and queries pasted in Phase 6E-A,
determine which case applies and follow ONLY that case.

CASE A — Album type already has accent_color
(or theme_color or similar color field):
  No changes needed in this phase.
  Note the exact field name — you will use it in
  Phase 6E-C.
  Run: npm run build. Paste output. Stop here.

CASE B — Album type has NO color field:

STEP 1 — TypeScript type:
In src/types/music.ts, add to the Album
interface/type:
  accent_color?: string | null
Make it optional so existing album objects without
this field do not break TypeScript anywhere.
Do not change any other field.

STEP 2 — Query:
In src/lib/queries.ts, find the track fetch
function identified in Phase 6E-A.
If the query selects specific columns with
.select('col1, col2, ...'), add accent_color
to the album portion of the select.
If it selects with .select('*'), no change needed.

STEP 3 — Database migration:
CREATE supabase/migrations/0012_album_accent_color.sql

Write exactly:

-- Add accent_color column to albums table
ALTER TABLE albums
  ADD COLUMN IF NOT EXISTS accent_color
  TEXT DEFAULT NULL
  CHECK (
    accent_color IS NULL OR
    accent_color ~ '^#([A-Fa-f0-9]{6})$'
  );

COMMENT ON COLUMN albums.accent_color IS
  'Hex color string e.g. #3DD6C8 used for
   waveform and UI theming on the album page.
   NULL means use the app default teal.';

The CHECK constraint enforces valid hex format
(# followed by exactly 6 hex characters) or NULL.
This prevents bad data from reaching the frontend.

Run: npm run build
Then run: npx supabase db push
Paste both outputs. Stop here.
```

---

## PHASE 6E-C — Create PlayerWaveform Component

```
Create src/components/layout/PlayerWaveform.tsx

The FIRST line must be exactly:
  'use client'

Then write these imports:
  import Image from 'next/image'

Then write this interface:
  interface PlayerWaveformProps {
    isPlaying: boolean
    accentColor: string | null | undefined
    isSingle: boolean
  }

Then write the component exactly as follows.
Replace nothing — this is the complete file:

const DEFAULT_COLOR = '#3DD6C8'

// Each bar has a unique height sequence and duration
// so the waveform looks organic, not mechanical.
const BAR_CONFIGS = [
  { duration: '0.9s', delay: '0.0s', minH: 25 },
  { duration: '0.7s', delay: '0.15s', minH: 40 },
  { duration: '1.1s', delay: '0.05s', minH: 20 },
  { duration: '0.8s', delay: '0.25s', minH: 35 },
  { duration: '1.0s', delay: '0.1s',  minH: 15 },
  { duration: '0.75s', delay: '0.2s', minH: 30 },
] as const

export default function PlayerWaveform({
  isPlaying,
  accentColor,
  isSingle,
}: PlayerWaveformProps) {
  const color = accentColor?.trim()
    ? accentColor
    : DEFAULT_COLOR

  // Validate hex color — fall back to default
  // if the stored value is malformed.
  const safeColor =
    /^#([A-Fa-f0-9]{6})$/.test(color)
      ? color
      : DEFAULT_COLOR

  // Singles show the default app icon with a
  // gentle pulse instead of waveform bars.
  if (isSingle) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <div
          style={{
            animationPlayState: isPlaying
              ? 'running' : 'paused',
          }}
          className="relative w-8 h-8 rounded-lg overflow-hidden ntv-pulse-anim"
        >
          <Image
            src="/icon-192.png"
            alt="NTV"
            fill
            className="object-cover"
          />
        </div>
      </div>
    )
  }

  // Album tracks show animated waveform bars
  // in the album accent color.
  return (
    <div
      className="flex items-end justify-center gap-[3px] w-full h-full px-1"
      aria-label="Now playing"
      role="img"
    >
      {BAR_CONFIGS.map((cfg, i) => (
        <div
          key={i}
          style={{
            backgroundColor: safeColor,
            animationDuration: cfg.duration,
            animationDelay: cfg.delay,
            animationPlayState: isPlaying
              ? 'running' : 'paused',
            minHeight: `${cfg.minH}%`,
          }}
          className="w-[3px] rounded-full ntv-wave-anim"
        />
      ))}
    </div>
  )
}

After writing the component, open
src/styles/globals.css and add these rules at the
END of the file, after all existing rules.

These use plain CSS class names (not Tailwind
arbitrary values) to avoid Tailwind v4 purging
dynamically-set animation names:

/* NTV Player — Waveform bars */
.ntv-wave-anim {
  animation-name: ntv-wave;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  animation-direction: alternate;
  transform-origin: bottom center;
}

/* NTV Player — Single icon pulse */
.ntv-pulse-anim {
  animation-name: ntv-pulse;
  animation-duration: 2s;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
}

@keyframes ntv-wave {
  from {
    transform: scaleY(0.3);
    opacity: 0.5;
  }
  to {
    transform: scaleY(1);
    opacity: 1;
  }
}

@keyframes ntv-pulse {
  0%, 100% {
    opacity: 0.7;
    transform: scale(0.95);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
}

Note: transform-origin: bottom center on
.ntv-wave-anim means bars grow upward from
the baseline, not from their center. The
container uses items-end (align-items: flex-end)
to keep all bars pinned to the same bottom line.

Run: npm run build
Paste full output. Stop here.
```

---

## PHASE 6E-D — Wire Waveform into PlayerBar

```
This phase adds visibility detection and route-change
detection to PlayerBar, then conditionally swaps the
track info area for the waveform when the user has
navigated away or their screen has timed out.

Open src/components/layout/PlayerBar.tsx.
Using the code pasted in Phase 6E-A, apply these
changes in order.

--- CHANGE 1 — Add imports ---

At the end of the existing import block, add these
lines. Only add lines whose imports do not already
exist in the file:

  import { useEffect, useState } from 'react'
  import { usePathname } from 'next/navigation'
  import PlayerWaveform from
    '@/components/layout/PlayerWaveform'

--- CHANGE 2 — Add state and detection logic ---

Inside the PlayerBar component function, after
the last existing variable declaration and before
the return statement, add these declarations.

Add the pathname hook:
  const pathname = usePathname()

Add visibility state:
  const [isHidden, setIsHidden] = useState(false)

Add the visibility change effect:
  useEffect(() => {
    if (typeof document === 'undefined') return

    const handleVisibility = () => {
      setIsHidden(
        document.visibilityState === 'hidden')
    }

    document.addEventListener(
      'visibilitychange', handleVisibility)
    return () =>
      document.removeEventListener(
        'visibilitychange', handleVisibility)
  }, [])

--- CHANGE 3 — Derive waveform trigger conditions ---

Add these derived values after the useEffect
from Change 2. Replace the placeholder values with
what you read in Phase 6E-A:

  // Determine if the user has navigated away from
  // the currently playing track's album page.
  // The album page is typically at /album/[slug]
  // or /album/[id]. Check what path format
  // the album page uses in this app.
  const albumPagePattern = /^\/album\//
  const isOnAlbumPage =
    albumPagePattern.test(pathname)
  const hasNavigatedAway =
    currentTrack != null && !isOnAlbumPage

  // Show waveform when screen is hidden OR
  // user has navigated away from album context.
  const showWaveform = isHidden || hasNavigatedAway

  // Determine if this is a single.
  // Check both the track's own album_type field
  // AND the nested album object's album_type,
  // using whichever pattern exists per Phase 6E-A.
  const isSingle =
    currentTrack?.album_type === 'single' ||
    currentTrack?.album?.album_type === 'single'

  // Get the accent color from the album.
  // Use the exact field name confirmed in
  // Phase 6E-A or Phase 6E-B.
  // If the track has a nested album object:
  const accentColor =
    currentTrack?.album?.accent_color ?? null
  // If accent_color is directly on the track object
  // instead, use: currentTrack?.accent_color ?? null

--- CHANGE 4 — Swap track info for waveform ---

Find the JSX container that wraps the track title
and artist name together (identified in Phase 6E-A
as the section with their surrounding wrapper div).

Replace that container with this conditional block.
Keep the EXACT same outer className and any existing
flex/width classes on the wrapper — only swap the
inner content:

  {showWaveform && currentTrack != null ? (
    <div className="[KEEP EXISTING WRAPPER CLASSES]
      h-8 overflow-hidden">
      <PlayerWaveform
        isPlaying={isPlaying}
        accentColor={accentColor}
        isSingle={isSingle}
      />
    </div>
  ) : (
    // PASTE THE ORIGINAL track title + artist
    // JSX here exactly as it was — do not change
    // a single character of the original markup
  )}

Replace [KEEP EXISTING WRAPPER CLASSES] with the
exact className string from the original wrapper.
Replace isPlaying with the exact variable or
selector name used in this file per Phase 6E-A.

Do NOT change: button layout, album thumbnail,
player controls, mute button, or any other part
of PlayerBar. Only the track info section changes.

Run: npm run build
Paste full output. Stop here.
```

---

## PHASE 7 — Read Album Components (No Changes)

```
Read these files and paste the sections listed.
Make zero changes.

FILE 1: src/components/music/AlbumHero.tsx
Paste:
  a) Every import statement
  b) The complete JSX return statement
  c) Specifically: the element that is the large
     circular play button — its full JSX including
     every className and all props

FILE 2: src/components/music/AlbumCard.tsx
Paste:
  a) Every import statement
  b) The complete JSX return statement
  c) The album cover <img> or <Image> element
     with every prop and className

FILE 3: src/components/music/AlbumDetail.tsx
Paste:
  a) Every import statement
  b) The last 20 lines of the JSX return, where
     the track list ends and the wrapper closes
  c) The TypeScript type or interface for the
     album prop — every field listed

FILE 4: src/components/music/TrackRow.tsx
Paste:
  a) Every import statement
  b) Any button element that triggers purchase
     or checkout — its full JSX and className

Stop here. Make zero changes.
```

---

## PHASE 8 — Slim Buttons Vertically

```
Using the exact code pasted in Phase 7, make only
these vertical padding reductions.

Rule: change ONLY py-* and h-* classes on button
elements. Do not touch px-*, text-*, font-*, rounded-*,
onClick, or any other prop.

IN src/components/music/AlbumDetail.tsx:
Find the button element used to purchase or buy the
album. On that button's className:
  If it has py-3, change to py-1.5
  If it has py-2, change to py-1
  If it has h-12, change to h-9
  If it has h-10, change to h-8
  If it uses a fixed height via style prop, reduce
  the pixel value by 12px.
Apply only the first matching rule above. Make no
other changes to this element.

IN src/components/music/TrackRow.tsx:
Find any button element that triggers checkout.
Apply the same single rule as above.

IN src/components/layout/TopBar.tsx:
Open the file. Find any button or link element
with text containing "Admin" or linking to /admin.
Apply the same single rule as above.
If not found in TopBar.tsx, open
src/components/layout/Sidebar.tsx and find it there.

Run: npm run build
Paste full output. Stop here.
```

---

## PHASE 9 — Move Play Button to the Right

```
Open src/components/music/AlbumHero.tsx.

Using the JSX you pasted in Phase 7, locate the
large circular play/pause button element.

Determine which case applies and apply only that case:

CASE A — Button has mx-auto or is inside a div with
mx-auto or justify-center:
  Remove mx-auto from the button.
  Add ml-auto to the button's className.

CASE B — Button is inside a flex container without
explicit alignment:
  Add ml-auto to the button's className only.

CASE C — Button uses absolute positioning with a
left-* or translate-x-* class:
  Remove the left-* class.
  Remove any -translate-x-* class.
  Add right-2 to the className.
  Keep the top-* and translate-y-* classes exactly
  as they are.

Apply exactly one case. Do not change: the button's
size, shape, icon, onClick, aria-label, animation
classes, or any vertical positioning class.

Run: npm run build
Paste full output. Stop here.
```

---

## PHASE 10 — Create AlbumCoverModal Component

```
Create a new file: src/components/music/AlbumCoverModal.tsx

The file must start with exactly this line first,
before any imports:
  'use client'

Then add these imports in this order:
  import { useEffect, useRef } from 'react'
  import { motion, AnimatePresence } from 'framer-motion'
  import { X } from 'lucide-react'

Then add this TypeScript interface:
  interface AlbumCoverModalProps {
    isOpen: boolean
    imageUrl: string
    altText: string
    onClose: () => void
  }

Then add the component with this exact structure:

export default function AlbumCoverModal({
  isOpen,
  imageUrl,
  altText,
  onClose,
}: AlbumCoverModalProps) {
  const touchStartY = useRef<number>(0)

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.changedTouches[0].clientY - touchStartY.current > 60) {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center
            justify-center bg-black/80"
          onClick={onClose}
        >
          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={imageUrl}
              alt={altText}
              className="max-w-[90vw] max-h-[90vh]
                object-contain rounded-lg"
            />
            <button
              onClick={onClose}
              className="absolute top-2 right-2
                p-1 rounded-full bg-black/50
                text-white hover:bg-black/70
                transition-colors"
              aria-label="Close"
            >
              <X size={24} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

Save this file exactly as written above.
Run: npm run build
Paste full output. Stop here.
```

---

## PHASE 11 — Wire AlbumCoverModal into Album Components

```
Using the code pasted in Phase 7, add the zoom modal
to AlbumCard.tsx and AlbumHero.tsx.

IN src/components/music/AlbumCard.tsx:

STEP 1 — Check if this file has "use client" at the top.
If it does not, add 'use client' as the literal first
line of the file before all imports.

STEP 2 — Add to the import block (at the end of
existing imports, do not reorganize):
  import { useState } from 'react'
  import AlbumCoverModal from
    '@/components/music/AlbumCoverModal'

STEP 3 — Add state inside the component function,
before the return statement:
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalImageUrl, setModalImageUrl] = useState('')

STEP 4 — On the album cover <img> or <Image> element:
  Add onClick={() => {
    setModalImageUrl(/* the same src/url already used */)
    setIsModalOpen(true)
  }}
  Add className addition: cursor-pointer md:cursor-zoom-in
  Keep every existing className.
  Change the size classes to w-[130px] h-[130px] on
  mobile only by replacing the existing mobile size
  with w-[130px] h-[130px]. Keep the md: and lg: size
  classes exactly as they are.

STEP 5 — At the very end of the JSX return, just
before the final closing tag, add:
  <AlbumCoverModal
    isOpen={isModalOpen}
    imageUrl={modalImageUrl}
    altText="Album cover"
    onClose={() => setIsModalOpen(false)}
  />

IN src/components/music/AlbumHero.tsx:

Apply the same 5 steps as above to AlbumHero.tsx.
For Step 4, find the hero album art <img> or <Image>
element specifically (not any other image).

Run: npm run build
Paste full output. Stop here.
```

---

## PHASE 12 — Streaming Links on Album Page

```
Open src/components/music/AlbumDetail.tsx.

STEP 1 — Verify the data is available:
Look at the TypeScript type for the album prop.
Find the streaming_links field. Paste its exact
type declaration. It is likely typed as:
  streaming_links: Json | null
or
  streaming_links: Record<string, string> | null
or similar.

STEP 2 — Add the streaming links section:
After the closing tag of the last TrackRow component
in the JSX, and before the closing tag of the
outermost wrapper div, add this block:

{album.streaming_links != null &&
 typeof album.streaming_links === 'object' &&
 !Array.isArray(album.streaming_links) &&
 Object.keys(album.streaming_links).length > 0 && (
  <section className="mt-8 pt-6 border-t
    border-white/10 px-2">
    <h3 className="text-sm font-medium
      text-white/50 mb-3">
      Stream on
    </h3>
    <div className="flex flex-wrap gap-3">
      {(Object.entries(
        album.streaming_links as Record<string, string>
      )).map(([platform, url]) => (
        <a
          key={platform}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2
            px-3 py-1.5 rounded-full border
            border-white/15 text-xs text-white/80
            hover:border-[#3DD6C8]
            hover:text-[#3DD6C8] transition-colors"
        >
          {platform}
        </a>
      ))}
    </div>
  </section>
)}

Note: the multi-line type guard
(typeof ... && !Array.isArray) handles the Supabase
Json type without a TypeScript error.

Run: npm run build
Paste full output. Stop here.
```

---

## PHASE 13 — Latest 3 Releases on Home Page

```
STEP 1 — Read the query:
Open src/lib/queries.ts.
Search for the function that fetches recent or latest
albums for the home page. It likely has a .limit()
call or a limit variable.
Paste that entire function.

STEP 2 — Read the component:
Open src/components/home/HomeClient.tsx.
Find the section that renders "Latest Release" or
"Latest Releases". Paste those lines including the
.map() call.

STEP 3 — Make the changes:

In queries.ts: on the function found in Step 1,
change the limit value to 3.
If it uses .limit(N), change N to 3.
If it uses a constant, change the constant to 3.
If it uses an env variable, hardcode 3 directly.
Also confirm the query uses .order('release_date',
{ ascending: false }). If it uses a different order,
add that order. If it already has descending
release_date order, do not change it.

In HomeClient.tsx: if the section heading says
"Latest Release" (singular) change it to
"Latest Releases". If it already says "Latest
Releases", make no change.
If the .map() call is on an array that could contain
more than 3 items, add .slice(0, 3) directly before
the .map() on that array. If the array is already
limited to 3 by the query, do not add .slice.

Run: npm run build
Paste full output. Stop here.
```

---

## PHASE 14 — EP Category (6 ordered steps, DB last)

```
Complete steps 1 through 5 and run npm run build
after each step before continuing.
Do NOT run the database migration until step 6
and only after steps 1–5 all build with zero errors.

--- STEP 1 — TypeScript type ---

Open src/types/music.ts.
Paste the current Album type or interface.
Then add this field to it:
  album_type?: 'album' | 'ep' | 'single'
Make it optional with ? so existing album objects
that do not have this field do not cause TypeScript
errors anywhere the Album type is used.
Do not change any existing field.
Run: npm run build. Paste output. Fix errors. Continue.

--- STEP 2 — Queries ---

Open src/lib/queries.ts.
Add album_type to the SELECT column list in every
query that fetches albums. Look for patterns like:
  .select('id, title, slug, ...')
Add album_type to each one.

Then add this new exported function at the end of
the file, after all existing functions:

export async function getEPs() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('albums')
    .select('*')
    .eq('album_type', 'ep')
    .eq('is_published', true)
    .order('release_date', { ascending: false })
  if (error) throw error
  return data ?? []
}

Replace createClient() with whatever the Supabase
client instantiation pattern already used in this
file looks like. Do not import a new client.
Run: npm run build. Paste output. Fix errors. Continue.

--- STEP 3 — API route ---

Open src/app/api/albums/route.ts.
Find the main GET handler. Find where the Supabase
query is built.
Add this block immediately before the .order() call
(or before .limit() if there is no .order()):

  const type = searchParams.get('type')
  if (type) {
    query = query.eq('album_type', type)
  }

If the query is built as a chained expression and
not stored in a variable called query, extract it
into a variable first:
  let query = supabase.from('albums').select(...)
Then add the conditional filter after.
Run: npm run build. Paste output. Fix errors. Continue.

--- STEP 4 — Admin form ---

Open src/components/admin/AlbumForm.tsx.
Find the section of the form that contains existing
select or input fields for album metadata.
After the last existing metadata field, add this
select field group using the same markup pattern
as surrounding fields in this form:

  A label element with text: "Release Type"
  A <select> element with:
    name="album_type"
    defaultValue={initialData?.album_type ?? 'album'}
    Three <option> elements:
      <option value="album">Album (full-length)</option>
      <option value="ep">EP (8 tracks or less)</option>
      <option value="single">Single</option>
  A helper text element with:
    "EPs have 8 tracks or fewer."

Wire album_type into the form submit handler using
the same pattern as other fields in this form.
Do not change how any existing field is submitted.
Run: npm run build. Paste output. Fix errors. Continue.

--- STEP 5 — Home page section and card badge ---

Open src/components/home/HomeClient.tsx.
Import getEPs at the top, using the same import
pattern used for other query functions in this file.
Add a new section after the existing Albums section:

  const eps = await getEPs()
  {eps.length > 0 && (
    <section>
      <h2 ...existing heading className...>EPs</h2>
      <div ...existing grid className...>
        {eps.map((ep) => (
          <AlbumCard key={ep.id} album={ep} />
        ))}
      </div>
    </section>
  )}

Copy the exact className strings from the Albums
section heading and grid — do not invent new ones.

Open src/components/music/AlbumCard.tsx.
Find where the album title or any existing badge
renders. Add this badge immediately before the
album title, inside the same parent element:

  {album.album_type === 'ep' && (
    <span className="text-[10px] font-medium
      px-1.5 py-0.5 rounded bg-[#3DD6C8]/15
      text-[#3DD6C8] border border-[#3DD6C8]/30
      mr-1">
      EP
    </span>
  )}

Run: npm run build. Paste output. Fix errors. Continue.

--- STEP 6 — Database migration (ONLY after 1–5 pass) ---

Create the file:
supabase/migrations/0011_ep_type.sql

Write exactly this content:

-- Add album_type column to albums table
ALTER TABLE albums
  ADD COLUMN IF NOT EXISTS album_type TEXT
  NOT NULL DEFAULT 'album'
  CHECK (album_type IN ('album', 'ep', 'single'));

-- Index for filtering by type
CREATE INDEX IF NOT EXISTS idx_albums_type
  ON albums(album_type);

-- Update any existing NULL values just in case
UPDATE albums SET album_type = 'album'
  WHERE album_type IS NULL;

Save the file. Then run:
  npx supabase db push

If that command is not available, run:
  npx supabase migration up

Paste the output. Stop here.
```

---

## PHASE 15 — Read Download System (No Changes)

```
Read the following files and paste the specific
sections listed. Make zero changes.

FILE 1: src/app/api/download/[token]/route.ts
Paste the complete file.

FILE 2: src/store/checkoutStore.ts
Paste:
  a) Every import
  b) The complete state type/interface
  c) Every action defined in the store
  d) Any field related to orders, tokens, or
     completed purchases

FILE 3: src/store/playerStore.ts
Paste the current track object shape — specifically
what fields exist on the track that is currently
playing (id, title, price, album_id, etc.)

FILE 4: src/components/layout/PlayerBar.tsx
Paste:
  a) The right side of the player controls area
     — everything rendered to the right of the
     track title, including volume and any
     extra buttons
  b) The full list of Zustand store values
     imported or selected in this component

Stop here. Make zero changes.
```

> ⚠️ Wait for the output. Then enter Phase 16.

---

## PHASE 16 — Download Button in Player

```
Using the code from Phase 15, add a download button
to the player. This app has no user login system —
download tokens are emailed after purchase. The
button must handle this honestly in the UI.

--- STEP 1 — Create download token utility ---

Create src/lib/downloadTokens.ts

'use client' is NOT needed — this is a plain utility.

Write exactly this:

const STORAGE_KEY = 'ntv_dl_tokens'

function getTokenMap(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as
      Record<string, string>) : {}
  } catch {
    return {}
  }
}

export function getDownloadToken(
  trackId: string
): string | null {
  return getTokenMap()[trackId] ?? null
}

export function saveDownloadToken(
  trackId: string,
  token: string
): void {
  if (typeof window === 'undefined') return
  const map = getTokenMap()
  map[trackId] = token
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

Run: npm run build after creating this file.

--- STEP 2 — Add the button to PlayerBar ---

Open src/components/layout/PlayerBar.tsx.

Add to the existing import block (do not reorganize):
  import { Download, X } from 'lucide-react'
  import { useState, useEffect } from 'react'
  (only add items from these lines that are not
  already imported — do not duplicate imports)
  import {
    getDownloadToken,
    saveDownloadToken,
  } from '@/lib/downloadTokens'

Add these state declarations inside the component
function, before the return statement:

  const [dlToken, setDlToken] =
    useState<string | null>(null)
  const [showDlInput, setShowDlInput] =
    useState(false)
  const [tokenInput, setTokenInput] = useState('')

Add this useEffect after the existing useEffects:

  useEffect(() => {
    if (!currentTrack?.id) return
    setDlToken(getDownloadToken(currentTrack.id))
    setShowDlInput(false)
    setTokenInput('')
  }, [currentTrack?.id])

Replace currentTrack with the exact variable name
used in this component for the currently playing
track, as seen in the Phase 15 output.

Add this handler function before the return:

  const handleSaveToken = () => {
    if (!currentTrack?.id || !tokenInput.trim()) return
    saveDownloadToken(currentTrack.id,
      tokenInput.trim())
    setDlToken(tokenInput.trim())
    setShowDlInput(false)
    setTokenInput('')
  }

In the JSX, find the rightmost area of the player
controls. Add this block after the last existing
button and before the closing tag of the controls
container. Use the currentTrack price field name
exactly as it appears in the Phase 15 output:

  {currentTrack?.price != null &&
   Number(currentTrack.price) > 0 && (
    <div className="relative">
      {dlToken ? (
        <a
          href={`/api/download/${dlToken}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded text-[#3DD6C8]
            hover:bg-white/[0.08] transition-colors
            block"
          aria-label="Download track"
        >
          <Download size={16} />
        </a>
      ) : (
        <button
          onClick={() =>
            setShowDlInput((v) => !v)}
          className="p-1.5 rounded
            text-white/40 hover:text-white/70
            hover:bg-white/[0.08] transition-colors"
          aria-label="Download track"
        >
          <Download size={16} />
        </button>
      )}

      {showDlInput && !dlToken && (
        <div className="absolute bottom-10 right-0
          w-64 bg-[#282828] border border-white/10
          rounded-lg p-3 shadow-xl z-50">
          <p className="text-xs text-white/60 mb-2
            leading-relaxed">
            Paste your download token from your
            purchase email:
          </p>
          <input
            type="text"
            value={tokenInput}
            onChange={(e) =>
              setTokenInput(e.target.value)}
            placeholder="Enter token..."
            className="w-full bg-white/[0.06]
              border border-white/10 rounded px-2
              py-1.5 text-xs text-white placeholder:
              text-white/30 mb-2 focus:outline-none
              focus:border-[#3DD6C8]/50"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSaveToken}
              className="flex-1 text-xs py-1
                bg-[#3DD6C8] text-black rounded
                font-medium hover:bg-[#3DD6C8]/90
                transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => setShowDlInput(false)}
              className="px-2 text-xs text-white/50
                hover:text-white/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )}

Run: npm run build
Paste full output. Stop here.
```

---

## PHASE 17 — Read PWA Config (No Changes)

```
Read the following files and paste them completely.
Make zero changes.

1. next.config.ts — the full file
2. src/app/sw.ts — the full file
   (if not found there try public/sw.js)
3. src/app/manifest.ts — the full file
   (if not found try public/manifest.json)
4. src/components/layout/TapToStartBanner.tsx
   — the full file (reference for styling)
5. src/app/layout.tsx
   — paste only the lines where TapToStartBanner,
     PlayerBar, and MobileTabBar are rendered,
     plus 3 lines of surrounding context each

Stop here. Make zero changes.
```

---

## PHASE 18 — Device Detection Utility

```
Create src/lib/detectDevice.ts

No 'use client' needed — this is a plain utility
with SSR guards built in.

Write exactly this:

export interface DeviceInfo {
  isIOS: boolean
  isAndroid: boolean
  isSafari: boolean
  isStandalone: boolean
  isMobile: boolean
}

export function isIOS(): boolean {
  if (typeof window === 'undefined') return false
  return /iphone|ipad|ipod/i.test(
    navigator.userAgent)
}

export function isAndroid(): boolean {
  if (typeof window === 'undefined') return false
  return /android/i.test(navigator.userAgent)
}

export function isSafari(): boolean {
  if (typeof window === 'undefined') return false
  return /^((?!chrome|android).)*safari/i.test(
    navigator.userAgent)
}

export function isInStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)')
      .matches ||
    ('standalone' in navigator &&
      (navigator as Navigator & {
        standalone: boolean
      }).standalone === true)
  )
}

export function getDeviceInfo(): DeviceInfo {
  return {
    isIOS: isIOS(),
    isAndroid: isAndroid(),
    isSafari: isSafari(),
    isStandalone: isInStandaloneMode(),
    isMobile: isIOS() || isAndroid(),
  }
}

Save the file.
Run: npm run build
Paste full output. Stop here.
```

---

## PHASE 19 — Install Prompt Banner with iOS Walkthrough

```
Create src/components/layout/InstallPromptBanner.tsx

The FIRST line of this file must be exactly:
  'use client'

Then write these imports:
  import { useState, useEffect, useRef } from 'react'
  import { motion, AnimatePresence } from 'framer-motion'
  import { X, PlusSquare } from 'lucide-react'
  import Image from 'next/image'
  import {
    isIOS,
    isSafari,
    isInStandaloneMode,
  } from '@/lib/detectDevice'

Then add this type declaration:
  interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>
    userChoice: Promise<{
      outcome: 'accepted' | 'dismissed'
    }>
  }

Then write the component:

const DISMISSED_KEY = 'ntv_install_dismissed'
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000

export default function InstallPromptBanner() {
  const [show, setShow] = useState(false)
  const [isIOSDevice, setIsIOSDevice] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)
  const deferredPrompt =
    useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (isInStandaloneMode()) return

    const dismissed = localStorage.getItem(DISMISSED_KEY)
    if (dismissed) {
      const age = Date.now() - Number(dismissed)
      if (age < DISMISS_TTL_MS) return
    }

    const iosDevice = isIOS() && isSafari()
    setIsIOSDevice(iosDevice)

    if (iosDevice) {
      const timer = setTimeout(() =>
        setShow(true), 3000)
      return () => clearTimeout(timer)
    }

    const handler = (e: Event) => {
      e.preventDefault()
      deferredPrompt.current =
        e as BeforeInstallPromptEvent
      setShow(true)
    }
    window.addEventListener(
      'beforeinstallprompt', handler)
    return () =>
      window.removeEventListener(
        'beforeinstallprompt', handler)
  }, [])

  const dismiss = () => {
    localStorage.setItem(
      DISMISSED_KEY, String(Date.now()))
    setShow(false)
    setShowIOSGuide(false)
  }

  const handleInstall = async () => {
    if (!deferredPrompt.current) return
    await deferredPrompt.current.prompt()
    const { outcome } =
      await deferredPrompt.current.userChoice
    if (outcome === 'accepted') dismiss()
  }

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* iOS step-by-step walkthrough sheet */}
          <AnimatePresence>
            {showIOSGuide && (
              <motion.div
                className="fixed left-0 right-0
                  z-[60] bg-[#1a1a1a] border-t
                  border-white/10 rounded-t-2xl
                  px-5 pt-5 pb-6"
                style={{ bottom: '120px' }}
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 320,
                  damping: 32,
                }}
              >
                {/* Guide header */}
                <div className="flex items-center
                  justify-between mb-4">
                  <p className="text-sm font-medium
                    text-white">
                    Add to your Home Screen
                  </p>
                  <button
                    onClick={() =>
                      setShowIOSGuide(false)}
                    className="p-1 text-white/40
                      hover:text-white/70
                      transition-colors"
                    aria-label="Close guide"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Steps */}
                <div className="relative
                  flex flex-col gap-5">
                  {/* Connecting line */}
                  <div className="absolute
                    left-[13px] top-7 bottom-7
                    w-px border-l border-dashed
                    border-white/10" />

                  {/* Step 1 */}
                  <div className="flex gap-3">
                    <div className="w-7 h-7 shrink-0
                      rounded-full bg-[#3DD6C8]
                      text-black text-xs font-bold
                      flex items-center
                      justify-center z-10">
                      1
                    </div>
                    <div>
                      <p className="text-sm
                        text-white leading-snug">
                        Tap the Share button
                      </p>
                      <p className="text-xs
                        text-white/50 mt-0.5">
                        The box with an arrow at
                        the bottom of Safari
                      </p>
                      <div className="inline-flex
                        items-center gap-1.5
                        bg-white/[0.06] px-2 py-1
                        rounded mt-1.5">
                        <svg
                          width="14" height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#3DD6C8"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M4 12v8a2 2 0
                            0 0 2 2h12a2 2 0 0
                            0 2-2v-8"/>
                          <polyline points=
                            "16 6 12 2 8 6"/>
                          <line x1="12" y1="2"
                            x2="12" y2="15"/>
                        </svg>
                        <span className="text-[10px]
                          text-white/60">
                          Share
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex gap-3">
                    <div className="w-7 h-7 shrink-0
                      rounded-full bg-[#3DD6C8]
                      text-black text-xs font-bold
                      flex items-center
                      justify-center z-10">
                      2
                    </div>
                    <div>
                      <p className="text-sm
                        text-white leading-snug">
                        Tap &#39;Add to Home
                        Screen&#39;
                      </p>
                      <p className="text-xs
                        text-white/50 mt-0.5">
                        Scroll down if you
                        don&#39;t see it
                      </p>
                      <div className="inline-flex
                        items-center gap-2
                        bg-white/[0.06] px-3
                        py-1.5 rounded mt-1.5">
                        <PlusSquare
                          size={14}
                          className="text-white/60"
                        />
                        <span className="text-xs
                          text-white/70">
                          Add to Home Screen
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex gap-3">
                    <div className="w-7 h-7 shrink-0
                      rounded-full bg-[#3DD6C8]
                      text-black text-xs font-bold
                      flex items-center
                      justify-center z-10">
                      3
                    </div>
                    <div>
                      <p className="text-sm
                        text-white leading-snug">
                        Tap &#39;Add&#39; to confirm
                      </p>
                      <p className="text-xs
                        text-white/50 mt-0.5">
                        Top right corner
                        of the prompt
                      </p>
                      <div className="inline-flex
                        mt-1.5 bg-[#3DD6C8]/15
                        border border-[#3DD6C8]/30
                        text-[#3DD6C8] text-xs
                        px-3 py-1 rounded">
                        Add
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() =>
                    setShowIOSGuide(false)}
                  className="mt-5 w-full py-2
                    rounded-xl bg-white/[0.06]
                    text-sm text-white/70
                    hover:bg-white/[0.10]
                    transition-colors"
                >
                  Got it
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main banner */}
          <motion.div
            className="fixed left-0 right-0 z-50
              bg-[#282828] border-t border-white/10
              px-4 py-3"
            style={{ bottom: '112px' }}
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
            }}
          >
            <div className="flex items-center
              gap-3 max-w-sm mx-auto">
              <Image
                src="/icon-192.png"
                alt="NTV"
                width={40}
                height={40}
                className="rounded-xl shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium
                  text-white truncate">
                  Add NTV to your home screen
                </p>
                <p className="text-xs
                  text-white/50 truncate">
                  Play music offline,
                  faster access
                </p>
              </div>
              {isIOSDevice ? (
                <button
                  onClick={() =>
                    setShowIOSGuide((v) => !v)}
                  className="shrink-0 text-xs
                    px-3 py-1 rounded-full border
                    border-[#3DD6C8]
                    text-[#3DD6C8] whitespace-nowrap
                    hover:bg-[#3DD6C8]/10
                    transition-colors"
                >
                  Show me how
                </button>
              ) : (
                <button
                  onClick={handleInstall}
                  className="shrink-0 text-xs
                    px-3 py-1 rounded-full
                    bg-[#3DD6C8] text-black
                    font-medium
                    hover:bg-[#3DD6C8]/90
                    transition-colors"
                >
                  Install
                </button>
              )}
              <button
                onClick={dismiss}
                className="shrink-0 p-1
                  text-white/40
                  hover:text-white/70
                  transition-colors"
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

Save the file.
Run: npm run build
Paste full output. Stop here.
```

---

## PHASE 20 — Add Install Banner to Layout

```
Open src/app/layout.tsx.

STEP 1 — Add the import:
Find the last import line in this file.
Add this import after it:
  import InstallPromptBanner from
    '@/components/layout/InstallPromptBanner'

STEP 2 — Render the component:
Find the line where PlayerBar is rendered.
Add <InstallPromptBanner /> on the line
DIRECTLY ABOVE the PlayerBar line.
Do not wrap it in any additional div.
Do not change any other line in this file.

Run: npm run build
Paste full output. Stop here.
```

---

## 2px Edge Rule — Run Anytime as a Cleanup Pass

```
Run this as a standalone pass if content appears
flush to screen edges on mobile.

Open src/styles/globals.css.
Add these rules at the end of the file, after all
existing rules:

  .px-safe {
    padding-left: max(8px,
      env(safe-area-inset-left));
    padding-right: max(8px,
      env(safe-area-inset-right));
  }

Then open these files and confirm the outermost
content wrapper has at least px-2 on mobile.
If it does not, add px-2 to the className.
Do not change any md: or lg: padding:

  src/components/layout/PlayerBar.tsx
  src/components/layout/MobileTabBar.tsx
  src/components/music/AlbumCard.tsx
  src/components/music/TrackRow.tsx

Run: npm run build. Paste output. Stop here.
```

---

*Generated for NTV Vault · nanotechvibe.com · May 2026*
