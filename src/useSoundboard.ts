import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { SoundboardEngine } from '@/audio/engine'
import { buildKeyMap } from '@/lib/sounds'
import type { Sound } from '@/types'

export function useSoundboard(sounds: readonly Sound[]) {
  const engine = useMemo(() => new SoundboardEngine(sounds), [sounds])
  const state = useSyncExternalStore(engine.subscribe, engine.getState)
  const [volume, setVolumeState] = useState(engine.getVolume)

  useEffect(() => {
    void engine.prefetch()
    return () => engine.dispose()
  }, [engine])

  const trigger = useCallback(
    async (id: string) => {
      if (engine.getState().status !== 'ready') await engine.unlock()
      engine.play(id)
    },
    [engine],
  )

  const stopAll = useCallback(() => engine.stopAll(), [engine])

  const setVolume = useCallback(
    (value: number) => {
      setVolumeState(value)
      engine.setVolume(value)
    },
    [engine],
  )

  const keyMap = useMemo(() => buildKeyMap(sounds), [sounds])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return
      if (event.ctrlKey || event.metaKey || event.altKey) return

      if (event.key === ' ') {
        event.preventDefault()
        stopAll()
        return
      }

      const id = keyMap.get(event.key.toLowerCase())
      if (id) {
        event.preventDefault()
        void trigger(id)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [keyMap, stopAll, trigger])

  const activeVoices = useMemo(
    () => Object.values(state.voices).reduce((total, count) => total + count, 0),
    [state.voices],
  )

  return { state, trigger, stopAll, volume, setVolume, activeVoices }
}
