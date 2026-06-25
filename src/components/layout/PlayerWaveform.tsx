'use client'
import Image from 'next/image'

interface PlayerWaveformProps {
  isPlaying: boolean
  accentColor: string | null | undefined
  isSingle: boolean
}

const DEFAULT_COLOR = '#62f3e4'

const BAR_CONFIGS = [
  { duration: '0.9s', delay: '0.0s', minH: 25 },
  { duration: '0.7s', delay: '0.15s', minH: 40 },
  { duration: '1.1s', delay: '0.05s', minH: 20 },
  { duration: '0.8s', delay: '0.25s', minH: 35 },
  { duration: '1.0s', delay: '0.1s', minH: 15 },
  { duration: '0.75s', delay: '0.2s', minH: 30 },
] as const

export default function PlayerWaveform({ isPlaying, accentColor, isSingle }: PlayerWaveformProps) {
  const color = accentColor?.trim() ? accentColor : DEFAULT_COLOR
  const safeColor = /^#([A-Fa-f0-9]{6})$/.test(color) ? color : DEFAULT_COLOR

  if (isSingle) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <div
          style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
          className="relative w-8 h-8 rounded-lg overflow-hidden ntv-pulse-anim"
        >
          <Image src="/icon-192.png" alt="NTV" fill className="object-cover" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-end justify-center gap-[3px] w-full h-full px-1" aria-label="Now playing" role="img">
      {BAR_CONFIGS.map((cfg, i) => (
        <div
          key={i}
          style={{
            backgroundColor: safeColor,
            animationDuration: cfg.duration,
            animationDelay: cfg.delay,
            animationPlayState: isPlaying ? 'running' : 'paused',
            minHeight: `${cfg.minH}%`,
          }}
          className="w-[3px] rounded-full ntv-wave-anim"
        />
      ))}
    </div>
  )
}
