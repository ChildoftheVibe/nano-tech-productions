'use client'
import { useState, useEffect, useRef } from 'react'
import { isIOS, isSafari, isInStandaloneMode } from '@/lib/detectDevice'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
  }>
}

const DISMISSED_KEY = 'ntv_install_dismissed'
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000

export function useInstallPrompt() {
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

  return {
    show,
    isIOSDevice,
    showIOSGuide,
    setShowIOSGuide,
    dismiss,
    handleInstall,
  }
}
