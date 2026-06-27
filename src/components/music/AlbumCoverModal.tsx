'use client'
import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface AlbumCoverModalProps {
  isOpen: boolean
  imageUrl: string
  altText: string
  onClose: () => void
}

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
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#121212]/80"
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
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            />
            <button
              onClick={onClose}
              className="absolute top-2 right-2 p-1 rounded-full bg-[#121212]/50 text-white hover:bg-[#121212]/70 transition-colors"
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
