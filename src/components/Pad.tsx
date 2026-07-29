import type { CSSProperties, KeyboardEvent } from 'react'
import { formatDuration } from '@/lib/format'
import type { Sound } from '@/types'

type PadProps = {
  sound: Sound
  voices: number
  triggerId: number
  onTrigger: (id: string) => void
}

export function Pad({ sound, voices, triggerId, onTrigger }: PadProps) {
  const isPlaying = voices > 0

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
      onPointerDown={() => onTrigger(sound.id)}
      onKeyDown={handleKeyDown}
      aria-label={`Jouer ${sound.label}, touche ${sound.key.toUpperCase()}`}
    >
      {triggerId > 0 && (
        <span key={`flash-${triggerId}`} className="pad__flash" aria-hidden="true" />
      )}

      <span className="pad__keycap" aria-hidden="true">
        {sound.key.toUpperCase()}
      </span>

      {voices > 1 && (
        <span className="pad__voices" aria-hidden="true">
          &times;{voices}
        </span>
      )}

      <span className="pad__label">{sound.label}</span>
      <span className="pad__duration" aria-hidden="true">
        {formatDuration(sound.duration)}
      </span>

      {isPlaying && (
        <span
          key={`progress-${triggerId}`}
          className="pad__progress"
          style={{ '--duration': `${sound.duration}s` } as CSSProperties}
          aria-hidden="true"
        />
      )}
    </button>
  )
}
