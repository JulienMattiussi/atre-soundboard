import type { CSSProperties, KeyboardEvent } from 'react'
import { formatDuration } from '@/lib/format'
import type { Sound } from '@/types'

type PadProps = {
  sound: Sound
  isPlaying: boolean
  triggerId: number
  onTrigger: (id: string) => void
}

export function Pad({ sound, isPlaying, triggerId, onTrigger }: PadProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    onTrigger(sound.id)
  }

  return (
    <button
      type="button"
      className="pad"
      style={{ '--accent': sound.accent } as CSSProperties}
      data-playing={isPlaying || undefined}
      aria-pressed={isPlaying}
      onPointerDown={() => onTrigger(sound.id)}
      onKeyDown={handleKeyDown}
      aria-label={`Jouer ${sound.label}, touche ${sound.key.toUpperCase()}`}
    >
      {isPlaying && (
        <span
          key={`progress-${triggerId}`}
          className="pad__progress"
          style={{ '--duration': `${sound.duration}s` } as CSSProperties}
          aria-hidden="true"
        />
      )}

      {triggerId > 0 && (
        <span key={`flash-${triggerId}`} className="pad__flash" aria-hidden="true" />
      )}

      <span className="keycap pad__keycap" aria-hidden="true">
        {sound.key.toUpperCase()}
      </span>

      <span className="pad__label">{sound.label}</span>
      <span className="pad__duration" aria-hidden="true">
        {formatDuration(sound.duration)}
      </span>

      {isPlaying && (
        <svg
          className="pad__mute"
          viewBox="0 0 32 32"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path
            d="M10.4 12.9h2.8l4.1-3.5v13.2l-4.1-3.5h-2.8z"
            fill="currentColor"
            strokeWidth="1.6"
          />
          <circle cx="16" cy="16" r="12.6" />
          <path d="M7.1 24.9 24.9 7.1" />
        </svg>
      )}
    </button>
  )
}
