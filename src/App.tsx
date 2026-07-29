import { Pad } from '@/components/Pad'
import { Toolbar } from '@/components/Toolbar'
import { parseSounds } from '@/lib/sounds'
import manifest from '@/sounds.json'
import { useSoundboard } from '@/useSoundboard'

const SOUNDS = parseSounds(manifest)

export default function App() {
  const { state, trigger, stopAll, volume, setVolume, playingCount } = useSoundboard(SOUNDS)

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-7 sm:px-6 sm:py-12">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-5 sm:mb-8">
        <div className="flex items-center gap-3 sm:gap-5">
          <img src="favicon.svg" alt="" width={48} height={48} className="brand-mark" />
          <h1>
            <img
              src="atre.png"
              alt="atre, la ptalforme de la clutrue"
              width={314}
              height={221}
              className="brand-logo"
            />
          </h1>
        </div>

        <Toolbar
          volume={volume}
          onVolumeChange={setVolume}
          playingCount={playingCount}
          onStopAll={stopAll}
        />
      </header>

      <main className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
        {SOUNDS.map((sound) => (
          <Pad
            key={sound.id}
            sound={sound}
            isPlaying={(state.voices[sound.id] ?? 0) > 0}
            triggerId={state.triggers[sound.id] ?? 0}
            onTrigger={trigger}
          />
        ))}
      </main>

      <footer className="mt-8 sm:mt-10">
        <p
          className="font-mono text-[0.6875rem] text-danger empty:hidden"
          role="status"
          aria-live="polite"
        >
          {state.status === 'error' ? (state.error ?? 'Erreur audio') : null}
        </p>
        <p className="mt-4 text-center font-mono text-[0.6875rem] text-muted">
          with{' '}
          <span role="img" aria-label="coeur">
            ❤️
          </span>{' '}
          by YavaDeus
        </p>
      </footer>
    </div>
  )
}
