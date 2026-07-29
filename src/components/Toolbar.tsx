type ToolbarProps = {
  volume: number
  onVolumeChange: (value: number) => void
  activeVoices: number
  onStopAll: () => void
}

export function Toolbar({ volume, onVolumeChange, activeVoices, onStopAll }: ToolbarProps) {
  return (
    <div className="flex shrink-0 items-center gap-3 sm:gap-4">
      <label className="flex items-center gap-2">
        <span className="sr-only">Volume général</span>
        <svg
          viewBox="0 0 16 16"
          className="size-3.5 shrink-0 text-muted"
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

      <button type="button" className="stop" onClick={onStopAll} disabled={activeVoices === 0}>
        Stop
        {activeVoices > 0 && <span className="text-ink">{activeVoices}</span>}
      </button>
    </div>
  )
}
