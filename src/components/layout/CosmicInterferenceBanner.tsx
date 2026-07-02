'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, RefreshCw } from 'lucide-react'
import * as Sentry from '@sentry/nextjs'
import { usePlayerStore } from '@/store/playerStore'
import type { ConnectionStatus } from '@/store/playerStore'

const MAX_RETRIES = 3

export default function CosmicInterferenceBanner() {
  const connectionStatus = usePlayerStore((s) => s.connectionStatus)
  const retryCount = usePlayerStore((s) => s.retryCount)
  const setConnectionStatus = usePlayerStore((s) => s.setConnectionStatus)
  const incrementRetryCount = usePlayerStore((s) => s.incrementRetryCount)
  const resetConnectionState = usePlayerStore((s) => s.resetConnectionState)

  const [countdown, setCountdown] = useState(9)

  // Reset the countdown at render time whenever connection status changes
  const [prevStatus, setPrevStatus] = useState(connectionStatus)
  if (prevStatus !== connectionStatus) {
    setPrevStatus(connectionStatus)
    setCountdown(9)
  }

  useEffect(() => {
    if (connectionStatus !== 'reconnecting') return
    const interval = setInterval(() => {
      setCountdown((n) => { if (n <= 1) { clearInterval(interval); return 0 } return n - 1 })
    }, 1000)
    return () => clearInterval(interval)
  }, [connectionStatus])

  const handleRetry = useCallback(() => {
    if (retryCount >= MAX_RETRIES) return
    incrementRetryCount()
    setConnectionStatus('reconnecting')
    const audioEl = document.querySelector('audio') as HTMLAudioElement | null
    if (!audioEl) return
    try {
      audioEl.load()
      audioEl.play().catch(() => {})
    } catch {}
    if (retryCount + 1 >= MAX_RETRIES) {
      Sentry.captureMessage('Audio: cosmic interference — max retries', {
        level: 'warning',
        extra: { retryCount: retryCount + 1, online: typeof window !== 'undefined' ? navigator.onLine : 'unknown' },
      })
    }
  }, [retryCount, incrementRetryCount, setConnectionStatus])

  const handleDismiss = () => { resetConnectionState() }

  const isVisible = connectionStatus === 'reconnecting' || connectionStatus === 'interference'
  const exhausted = retryCount >= MAX_RETRIES

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed left-0 right-0 z-40 bg-[#1a1a1a] border-t border-white/10 px-4 py-2.5"
          style={{ bottom: '112px' }}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3 max-w-sm mx-auto">
            <WifiOff size={16} className={connectionStatus === 'interference' ? 'text-[#ffabef] shrink-0' : 'text-white/40 shrink-0'} />
            <div className="flex-1 min-w-0">
              {connectionStatus === 'reconnecting' && (
                <>
                  <p className="text-xs font-medium text-white/80 truncate">
                    Reconnecting<span className="text-white/40 ml-1">({countdown}s)</span>
                  </p>
                  <p className="text-[10px] text-white/40 truncate">Holding the signal...</p>
                </>
              )}
              {connectionStatus === 'interference' && !exhausted && (
                <>
                  <p className="text-xs font-medium text-white truncate">🌌 Cosmic Interference</p>
                  <p className="text-[10px] text-white/40 truncate">Something disrupted the signal</p>
                </>
              )}
              {connectionStatus === 'interference' && exhausted && (
                <>
                  <p className="text-xs font-medium text-white/80 truncate">Signal lost</p>
                  <p className="text-[10px] text-white/40 truncate">Check your connection</p>
                </>
              )}
            </div>
            {connectionStatus === 'interference' && !exhausted && (
              <button onClick={handleRetry} className="shrink-0 flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full border border-[#62f3e4]/40 text-[#62f3e4] hover:bg-[#62f3e4]/10 transition-colors">
                <RefreshCw size={11} />
                Retry
              </button>
            )}
            <button onClick={handleDismiss} className="shrink-0 text-[10px] text-white/30 hover:text-white/60 transition-colors px-1 py-1" aria-label="Dismiss">✕</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
