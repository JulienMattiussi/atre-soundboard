type ToolbarProps = {
  volume: number
  onVolumeChange: (value: number) => void
  playingCount: number
  onStopAll: () => void
}

export function Toolbar({ volume, onVolumeChange, playingCount, onStopAll }: ToolbarProps) {
  return (
    <div className="flex shrink-0 items-center gap-3 sm:gap-4">
      <label className="flex items-center gap-2">
        <span className="sr-only">Volume général</span>
        <svg
          viewBox="0 0 16 16"
          className="size-4 shrink-0 text-muted sm:size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M2 6.2h2.2L7.4 3.4v9.2L4.2 9.8H2z" />
          <path d="M10.2 6.1a2.6 2.6 0 0 1 0 3.8" />
          <path d="M12.2 4.2a5 5 0 0 1 0 7.6" />
        </svg>
        <input
          type="range"
          className="volume"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(event) => onVolumeChange(Number(event.target.value))}
        />
      </label>

      <button
        type="button"
        className="stop"
        onClick={onStopAll}
        disabled={playingCount === 0}
        aria-label="Tout couper, touche Espace"
      >
        <span className="stop__word">Stop</span>
        {playingCount > 0 && (
          <span className="stop__count" aria-hidden="true">
            {playingCount}
          </span>
        )}
        <span className="keycap" aria-hidden="true">
          Espace
        </span>
      </button>
    </div>
  )
}
