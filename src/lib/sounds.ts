import type { Sound } from '@/types'

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

export function parseSounds(input: unknown): Sound[] {
  if (!Array.isArray(input)) {
    throw new Error('sounds manifest: expected an array')
  }

  const sounds = input.map(parseSound)
  assertUnique(
    sounds.map((sound) => sound.id),
    'id',
  )
  assertUnique(
    sounds.map((sound) => sound.key),
    'key',
  )
  return sounds
}

export function buildKeyMap(sounds: readonly Sound[]): Map<string, string> {
  return new Map(sounds.map((sound) => [sound.key, sound.id]))
}

function parseSound(input: unknown, index: number): Sound {
  const at = `sounds manifest: entry ${index}`
  if (typeof input !== 'object' || input === null) {
    throw new Error(`${at}: expected an object`)
  }

  const entry = input as Record<string, unknown>
  const id = requireString(entry.id, `${at}.id`)
  const label = requireString(entry.label, `${at}.label`)
  const file = requireString(entry.file, `${at}.file`)
  const accent = requireString(entry.accent, `${at}.accent`)
  const rawKey = requireString(entry.key, `${at}.key`)

  if (file.startsWith('/')) {
    throw new Error(`${at}.file: must be relative to the site root, without a leading slash`)
  }
  if (!HEX_COLOR.test(accent)) {
    throw new Error(`${at}.accent: expected a 6-digit hex color, got "${accent}"`)
  }
  if (rawKey.length !== 1) {
    throw new Error(`${at}.key: expected a single character, got "${rawKey}"`)
  }
  if (
    typeof entry.duration !== 'number' ||
    !Number.isFinite(entry.duration) ||
    entry.duration <= 0
  ) {
    throw new Error(`${at}.duration: expected a positive number`)
  }

  return { id, label, file, duration: entry.duration, key: rawKey.toLowerCase(), accent }
}

function requireString(value: unknown, at: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${at}: expected a non-empty string`)
  }
  return value
}

function assertUnique(values: readonly string[], field: string): void {
  const seen = new Set<string>()
  for (const value of values) {
    if (seen.has(value)) {
      throw new Error(`sounds manifest: duplicate ${field} "${value}"`)
    }
    seen.add(value)
  }
}
