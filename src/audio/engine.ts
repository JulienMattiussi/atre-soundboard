import type { Sound } from '@/types'

type EngineStatus = 'idle' | 'decoding' | 'ready' | 'error'

type EngineState = {
  status: EngineStatus
  voices: Readonly<Record<string, number>>
  triggers: Readonly<Record<string, number>>
  error: string | null
}

type Listener = () => void

const IDLE_STATE: EngineState = { status: 'idle', voices: {}, triggers: {}, error: null }

export class SoundboardEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private readonly sounds: readonly Sound[]
  private bytes = new Map<string, ArrayBuffer>()
  private buffers = new Map<string, AudioBuffer>()
  private playing = new Map<string, Set<AudioBufferSourceNode>>()
  private listeners = new Set<Listener>()
  private prefetching: Promise<void> | null = null
  private unlocking: Promise<void> | null = null
  private volume = 0.8
  private state: EngineState = IDLE_STATE

  constructor(sounds: readonly Sound[]) {
    this.sounds = sounds
  }

  getState = (): EngineState => this.state

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getVolume = (): number => this.volume

  prefetch = (): Promise<void> => {
    this.prefetching ??= Promise.all(this.sounds.map((sound) => this.fetchBytes(sound))).then(
      () => undefined,
    )
    return this.prefetching
  }

  unlock = async (): Promise<void> => {
    this.unlocking ??= this.initialise()
    await this.unlocking
    if (this.ctx?.state === 'suspended') await this.ctx.resume()
  }

  private async initialise(): Promise<void> {
    try {
      this.ctx = new AudioContext()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.volume
      this.master.connect(this.ctx.destination)
      if (this.ctx.state === 'suspended') await this.ctx.resume()
    } catch (error) {
      this.setState({ status: 'error', error: describe(error) })
      return
    }

    this.setState({ status: 'decoding', error: null })
    await this.decodeAll()
  }

  toggle = (id: string): void => {
    if (this.playing.get(id)?.size) {
      this.stop(id)
      return
    }
    this.play(id)
  }

  private stop(id: string): void {
    const voices = this.playing.get(id)
    if (!voices) return
    for (const source of [...voices]) source.stop()
  }

  private play(id: string): void {
    const ctx = this.ctx
    const buffer = this.buffers.get(id)
    if (!ctx || !this.master || !buffer) return

    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(this.master)

    let voices = this.playing.get(id)
    if (!voices) {
      voices = new Set()
      this.playing.set(id, voices)
    }
    voices.add(source)

    source.onended = () => {
      voices.delete(source)
      source.disconnect()
      this.publishVoices()
    }

    source.start()

    this.setState({
      voices: { ...this.state.voices, [id]: voices.size },
      triggers: { ...this.state.triggers, [id]: (this.state.triggers[id] ?? 0) + 1 },
    })
  }

  stopAll = (): void => {
    for (const voices of this.playing.values()) {
      for (const source of [...voices]) source.stop()
    }
  }

  setVolume = (value: number): void => {
    this.volume = Math.min(1, Math.max(0, value))
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.01)
    }
  }

  dispose = (): void => {
    this.stopAll()
    void this.ctx?.close()
    this.ctx = null
    this.master = null
    this.unlocking = null
    this.buffers.clear()
    this.playing.clear()
    this.state = IDLE_STATE
  }

  private setState(patch: Partial<EngineState>): void {
    this.state = { ...this.state, ...patch }
    for (const listener of this.listeners) listener()
  }

  private async fetchBytes(sound: Sound): Promise<void> {
    if (this.bytes.has(sound.id) || this.buffers.has(sound.id)) return
    try {
      const response = await fetch(sound.file)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      this.bytes.set(sound.id, await response.arrayBuffer())
    } catch {
      return
    }
  }

  private async decodeAll(): Promise<void> {
    const ctx = this.ctx
    if (!ctx) return

    await Promise.all(
      this.sounds.map(async (sound) => {
        if (this.buffers.has(sound.id)) return
        await this.fetchBytes(sound)
        const bytes = this.bytes.get(sound.id)
        if (!bytes) return
        try {
          this.buffers.set(sound.id, await ctx.decodeAudioData(bytes.slice(0)))
        } catch {
          return
        }
      }),
    )

    if (this.ctx !== ctx) return

    this.setState(
      this.buffers.size === 0
        ? { status: 'error', error: 'Aucun son n’a pu être chargé.' }
        : { status: 'ready', error: null },
    )
  }

  private publishVoices(): void {
    const voices: Record<string, number> = {}
    for (const [id, sources] of this.playing) {
      if (sources.size > 0) voices[id] = sources.size
    }
    this.setState({ voices })
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
