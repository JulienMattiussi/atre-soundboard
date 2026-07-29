import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'

class FakeBufferSource {
  buffer: unknown = null
  onended: (() => void) | null = null
  connect() {}
  disconnect() {}
  start() {}
  stop() {
    this.onended?.()
  }
}

let decodeDelay = 0

class FakeAudioContext {
  state = 'running'
  currentTime = 0
  destination = {}
  createGain() {
    return { gain: { value: 0, setTargetAtTime() {} }, connect() {} }
  }
  createBufferSource() {
    return new FakeBufferSource()
  }
  decodeAudioData() {
    if (decodeDelay === 0) return Promise.resolve({})
    return new Promise((resolve) => setTimeout(() => resolve({}), decodeDelay))
  }
  resume() {
    return Promise.resolve()
  }
  close() {
    return Promise.resolve()
  }
}

beforeEach(() => {
  decodeDelay = 0
  vi.stubGlobal('AudioContext', FakeAudioContext)
  vi.stubGlobal('fetch', () =>
    Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function padFor(label: string) {
  return screen.getByRole('button', { name: new RegExp(`^Jouer ${label},`) })
}

describe('App', () => {
  it('renders one pad per sound, keyed on the first letter of its label', () => {
    render(<App />)
    expect(screen.getAllByRole('button', { name: /^Jouer / })).toHaveLength(8)
    for (const [label, key] of [
      ['MAMI', 'M'],
      ['EMADOR', 'D'],
      ['OPA', 'O'],
      ['AFED', 'A'],
      ['EMAC', 'E'],
      ['Projet', 'J'],
      ['Predator', 'P'],
      ['Replay', 'R'],
    ]) {
      expect(padFor(label as string)).toHaveAccessibleName(`Jouer ${label}, touche ${key}`)
    }
  })

  it('marks a pad as playing when clicked', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(padFor('MAMI'))

    await waitFor(() => expect(padFor('MAMI')).toHaveAttribute('data-playing'))
    expect(padFor('MAMI')).toHaveAttribute('aria-pressed', 'true')
    expect(padFor('OPA')).not.toHaveAttribute('data-playing')
  })

  it('triggers a pad from its keyboard shortcut', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.keyboard('o')

    await waitFor(() => expect(padFor('OPA')).toHaveAttribute('data-playing'))
  })

  it('stops the sound on a second press instead of stacking a second voice', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(padFor('MAMI'))
    await waitFor(() => expect(padFor('MAMI')).toHaveAttribute('data-playing'))

    await user.click(padFor('MAMI'))

    await waitFor(() => expect(padFor('MAMI')).not.toHaveAttribute('data-playing'))
    expect(screen.getByRole('button', { name: /tout couper/i })).toBeDisabled()
  })

  it('keeps a trigger fired while the sounds are still decoding', async () => {
    decodeDelay = 60
    const user = userEvent.setup()
    render(<App />)

    await user.click(padFor('Projet'))
    await user.click(padFor('MAMI'))

    await waitFor(() => {
      expect(padFor('Projet')).toHaveAttribute('data-playing')
      expect(padFor('MAMI')).toHaveAttribute('data-playing')
    })
  })

  it('toggles each pad independently', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(padFor('MAMI'))
    await user.click(padFor('OPA'))
    await waitFor(() => {
      expect(padFor('MAMI')).toHaveAttribute('data-playing')
      expect(padFor('OPA')).toHaveAttribute('data-playing')
    })

    await user.click(padFor('MAMI'))

    await waitFor(() => expect(padFor('MAMI')).not.toHaveAttribute('data-playing'))
    expect(padFor('OPA')).toHaveAttribute('data-playing')
  })

  it('cuts every voice with the stop button', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(padFor('MAMI'))
    await user.click(padFor('AFED'))
    const stop = screen.getByRole('button', { name: /tout couper/i })
    await waitFor(() => expect(stop).toBeEnabled())

    await user.click(stop)

    await waitFor(() => {
      expect(padFor('MAMI')).not.toHaveAttribute('data-playing')
      expect(padFor('AFED')).not.toHaveAttribute('data-playing')
    })
    expect(stop).toBeDisabled()
  })

  it('cuts every voice with the space bar', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(padFor('MAMI'))
    await waitFor(() => expect(padFor('MAMI')).toHaveAttribute('data-playing'))

    await user.keyboard('[Space]')

    await waitFor(() => expect(padFor('MAMI')).not.toHaveAttribute('data-playing'))
  })
})
