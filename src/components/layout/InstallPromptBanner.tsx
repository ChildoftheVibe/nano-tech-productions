'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, PlusSquare } from 'lucide-react'
import Image from 'next/image'
import {
  isIOS,
  isSafari,
  isInStandaloneMode,
} from '@/lib/detectDevice'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
  }>
}

const DISMISSED_KEY = 'ntv_install_dismissed'
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000

export default function InstallPromptBanner() {
  const [show, setShow] = useState(false)
  // Lazy initializer: banner markup is hidden until `show` flips, so no hydration risk
  const [isIOSDevice] = useState(
    () => typeof window !== 'undefined' && isIOS() && isSafari(),
  )
  const [showIOSGuide, setShowIOSGuide] = useState(false)
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (isInStandaloneMode()) return

    const dismissed = localStorage.getItem(DISMISSED_KEY)
    if (dismissed) {
      const age = Date.now() - Number(dismissed)
      if (age < DISMISS_TTL_MS) return
    }

    if (isIOSDevice) {
      const timer = setTimeout(() => setShow(true), 3000)
      return () => clearTimeout(timer)
    }

    const handler = (e: Event) => {
      e.preventDefault()
      deferredPrompt.current = e as BeforeInstallPromptEvent
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [isIOSDevice])

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()))
    setShow(false)
    setShowIOSGuide(false)
  }

  const handleInstall = async () => {
    if (!deferredPrompt.current) return
    await deferredPrompt.current.prompt()
    const { outcome } = await deferredPrompt.current.userChoice
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
                className="fixed left-0 right-0 z-[60] bg-[#1a1a1a] border-t border-white/10 rounded-t-2xl px-5 pt-5 pb-6"
                style={{ bottom: '120px' }}
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-medium text-white">Add to your Home Screen</p>
                  <button
                    onClick={() => setShowIOSGuide(false)}
                    className="p-1 text-white/40 hover:text-white/70 transition-colors"
                    aria-label="Close guide"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="relative flex flex-col gap-5">
                  <div className="absolute left-[13px] top-7 bottom-7 w-px border-l border-dashed border-white/10" />

                  <div className="flex gap-3">
                    <div className="w-7 h-7 shrink-0 rounded-full bg-[#62f3e4] text-[#003733] text-xs font-bold flex items-center justify-center z-10">1</div>
                    <div>
                      <p className="text-sm text-white leading-snug">Tap the Share button</p>
                      <p className="text-xs text-white/50 mt-0.5">The box with an arrow at the bottom of Safari</p>
                      <div className="inline-flex items-center gap-1.5 bg-white/[0.06] px-2 py-1 rounded mt-1.5">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#62f3e4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                          <polyline points="16 6 12 2 8 6"/>
                          <line x1="12" y1="2" x2="12" y2="15"/>
                        </svg>
                        <span className="text-[10px] text-white/60">Share</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-7 h-7 shrink-0 rounded-full bg-[#62f3e4] text-[#003733] text-xs font-bold flex items-center justify-center z-10">2</div>
                    <div>
                      <p className="text-sm text-white leading-snug">Tap &#39;Add to Home Screen&#39;</p>
                      <p className="text-xs text-white/50 mt-0.5">Scroll down if you don&#39;t see it</p>
                      <div className="inline-flex items-center gap-2 bg-white/[0.06] px-3 py-1.5 rounded mt-1.5">
                        <PlusSquare size={14} className="text-white/60" />
                        <span className="text-xs text-white/70">Add to Home Screen</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-7 h-7 shrink-0 rounded-full bg-[#62f3e4] text-[#003733] text-xs font-bold flex items-center justify-center z-10">3</div>
                    <div>
                      <p className="text-sm text-white leading-snug">Tap &#39;Add&#39; to confirm</p>
                      <p className="text-xs text-white/50 mt-0.5">Top right corner of the prompt</p>
                      <div className="inline-flex mt-1.5 bg-[#62f3e4]/15 border border-[#62f3e4]/30 text-[#62f3e4] text-xs px-3 py-1 rounded">Add</div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="mt-5 w-full py-2 rounded-xl bg-white/[0.06] text-sm text-white/70 hover:bg-white/[0.10] transition-colors"
                >
                  Got it
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main banner */}
          <motion.div
            className="fixed left-0 right-0 z-50 bg-[#282828] border-t border-white/10 px-4 py-3"
            style={{ bottom: '112px' }}
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="flex items-center gap-3 max-w-sm mx-auto">
              <Image src="/icons/icon-192.png" alt="NTV" width={40} height={40} className="rounded-xl shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">Add NTV to your home screen</p>
                <p className="text-xs text-white/50 truncate">Play music offline, faster access</p>
              </div>
              {isIOSDevice ? (
                <button
                  onClick={() => setShowIOSGuide((v) => !v)}
                  className="shrink-0 text-xs px-3 py-1 rounded-full border border-[#62f3e4] text-[#62f3e4] whitespace-nowrap hover:bg-[#62f3e4]/10 transition-colors"
                >
                  Show me how
                </button>
              ) : (
                <button
                  onClick={handleInstall}
                  className="shrink-0 text-xs px-3 py-1 rounded-full bg-[#62f3e4] text-[#003733] font-medium hover:bg-[#62f3e4]/90 transition-colors"
                >
                  Install
                </button>
              )}
              <button
                onClick={dismiss}
                className="shrink-0 p-1 text-white/40 hover:text-white/70 transition-colors"
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
