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
    return Promise.resolve({})
  }
  resume() {
    return Promise.resolve()
  }
  close() {
    return Promise.resolve()
  }
}

beforeEach(() => {
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
  it('renders one pad per sound, with its keyboard shortcut', () => {
    render(<App />)
    expect(padFor('Mami')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Jouer Mami, touche A/ })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Jouer / })).toHaveLength(11)
  })

  it('marks a pad as playing when clicked', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(padFor('Mami'))

    await waitFor(() => expect(padFor('Mami')).toHaveAttribute('data-playing'))
    expect(padFor('Sort')).not.toHaveAttribute('data-playing')
  })

  it('triggers a pad from its keyboard shortcut', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.keyboard('z')

    await waitFor(() => expect(padFor('Sort')).toHaveAttribute('data-playing'))
  })

  it('stacks a sound on itself and counts the voices', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(padFor('Mami'))
    await waitFor(() => expect(padFor('Mami')).toHaveAttribute('data-playing'))
    await user.click(padFor('Mami'))

    await waitFor(() => expect(padFor('Mami')).toHaveTextContent('×2'))
  })

  it('cuts every voice with the stop button', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(padFor('Mami'))
    await user.click(padFor('Sort'))
    const stop = screen.getByRole('button', { name: /stop/i })
    await waitFor(() => expect(stop).toBeEnabled())

    await user.click(stop)

    await waitFor(() => {
      expect(padFor('Mami')).not.toHaveAttribute('data-playing')
      expect(padFor('Sort')).not.toHaveAttribute('data-playing')
    })
    expect(stop).toBeDisabled()
  })

  it('cuts every voice with the space bar', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(padFor('Mami'))
    await waitFor(() => expect(padFor('Mami')).toHaveAttribute('data-playing'))

    await user.keyboard('[Space]')

    await waitFor(() => expect(padFor('Mami')).not.toHaveAttribute('data-playing'))
  })
})
