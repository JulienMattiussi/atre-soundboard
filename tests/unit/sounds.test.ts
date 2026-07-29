import { describe, expect, it } from 'vitest'
import { buildKeyMap, parseSounds } from '@/lib/sounds'
import manifest from '@/sounds.json'

const VALID = {
  id: 'mami',
  label: 'Mami',
  file: 'sounds/mami.mp3',
  duration: 7.18,
  key: 'a',
  accent: '#f5a524',
}

describe('parseSounds', () => {
  it('accepts the shipped manifest', () => {
    const sounds = parseSounds(manifest)
    expect(sounds.length).toBeGreaterThan(0)
    for (const sound of sounds) {
      expect(sound.file.startsWith('sounds/')).toBe(true)
      expect(sound.duration).toBeGreaterThan(0)
    }
  })

  it('lowercases keys', () => {
    const [sound] = parseSounds([{ ...VALID, key: 'A' }])
    expect(sound?.key).toBe('a')
  })

  it('rejects a non-array manifest', () => {
    expect(() => parseSounds({})).toThrow(/expected an array/)
  })

  it('rejects a missing label', () => {
    expect(() => parseSounds([{ ...VALID, label: '' }])).toThrow(/label/)
  })

  it('rejects an absolute file path', () => {
    expect(() => parseSounds([{ ...VALID, file: '/sounds/mami.mp3' }])).toThrow(/leading slash/)
  })

  it('rejects a malformed accent', () => {
    expect(() => parseSounds([{ ...VALID, accent: 'amber' }])).toThrow(/hex color/)
    expect(() => parseSounds([{ ...VALID, accent: '#fff' }])).toThrow(/hex color/)
  })

  it('rejects a multi-character key', () => {
    expect(() => parseSounds([{ ...VALID, key: 'ab' }])).toThrow(/single character/)
  })

  it('rejects a non-positive duration', () => {
    expect(() => parseSounds([{ ...VALID, duration: 0 }])).toThrow(/positive number/)
    expect(() => parseSounds([{ ...VALID, duration: 'long' }])).toThrow(/positive number/)
  })

  it('rejects duplicate ids', () => {
    expect(() => parseSounds([VALID, { ...VALID, key: 'z' }])).toThrow(/duplicate id/)
  })

  it('rejects duplicate keys', () => {
    expect(() => parseSounds([VALID, { ...VALID, id: 'sort' }])).toThrow(/duplicate key/)
  })
})

describe('buildKeyMap', () => {
  it('maps every key to its sound id', () => {
    const sounds = parseSounds(manifest)
    const keyMap = buildKeyMap(sounds)
    expect(keyMap.size).toBe(sounds.length)
    for (const sound of sounds) {
      expect(keyMap.get(sound.key)).toBe(sound.id)
    }
  })
})
