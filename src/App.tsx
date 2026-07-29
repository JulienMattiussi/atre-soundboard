import type { EngineState } from '@/audio/engine'
import { Pad } from '@/components/Pad'
import { Toolbar } from '@/components/Toolbar'
import { parseSounds } from '@/lib/sounds'
import manifest from '@/sounds.json'
import { useSoundboard } from '@/useSoundboard'

const SOUNDS = parseSounds(manifest)

export default function App() {
  const { state, trigger, stopAll, volume, setVolume, activeVoices } = useSoundboard(SOUNDS)

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-7 sm:px-6 sm:py-12">
      <header className="mb-6 flex items-start justify-between gap-4 sm:mb-8">
        <div className="min-w-0">
          <h1 className="font-mono text-xs tracking-[0.22em] uppercase sm:text-sm">
            Atre <span className="text-muted">// Soundboard</span>
          </h1>
          <p
            className="mt-2 font-mono text-[0.6875rem] text-muted"
            role="status"
            aria-live="polite"
          >
            {describeStatus(state, SOUNDS.length)}
          </p>
        </div>

        <Toolbar
          volume={volume}
          onVolumeChange={setVolume}
          activeVoices={activeVoices}
          onStopAll={stopAll}
        />
      </header>

      <main className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
        {SOUNDS.map((sound) => (
          <Pad
            key={sound.id}
            sound={sound}
            voices={state.voices[sound.id] ?? 0}
            triggerId={state.triggers[sound.id] ?? 0}
            onTrigger={trigger}
          />
        ))}
      </main>

      <footer className="mt-7 font-mono text-[0.6875rem] leading-relaxed text-muted sm:mt-9">
        Clique un pad ou tape sa touche. Un même son peut se superposer à lui-même.
        <br />
        <kbd className="text-ink">Espace</kbd> coupe tout.
      </footer>
    </div>
  )
}

function describeStatus(state: EngineState, total: number): string {
  switch (state.status) {
    case 'idle':
      return `${total} sons - le son s’active au premier appui`
    case 'decoding':
      return 'Chargement des sons...'
    case 'error':
      return state.error ?? 'Erreur audio'
    case 'ready':
      return `${total} sons prêts`
  }
}
