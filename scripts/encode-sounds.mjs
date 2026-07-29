import { execFile } from 'node:child_process'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)

const SOURCE_DIR = 'sounds/src'
const OUTPUT_DIR = 'public/sounds'
const MANIFEST = 'src/sounds.json'
const AUDIO_EXTENSIONS = new Set([
  '.mp3',
  '.ogg',
  '.wav',
  '.opus',
  '.m4a',
  '.flac',
  '.aac',
  '.webm',
])
const ACCENTS = [
  '#f5a524',
  '#22d3ee',
  '#fb7185',
  '#84cc16',
  '#a78bfa',
  '#fb923c',
  '#2dd4bf',
  '#e879f9',
  '#38bdf8',
  '#facc15',
  '#34d399',
]
const FALLBACK_KEYS = [...'azerqsdfwxcvghbnjkluiopmt']

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true })

  const entries = (await readdir(SOURCE_DIR))
    .filter((name) => AUDIO_EXTENSIONS.has(extname(name).toLowerCase()))
    .sort()

  if (entries.length === 0) {
    console.error(`Aucun fichier audio dans ${SOURCE_DIR}/`)
    process.exit(1)
  }
  if (entries.length > FALLBACK_KEYS.length) {
    console.error(
      `${entries.length} sons pour seulement ${FALLBACK_KEYS.length} touches disponibles.`,
    )
    process.exit(1)
  }

  const existing = await readManifest()
  const encoded = new Map()

  for (const entry of entries) {
    const id = slugify(stripExtensions(entry))
    const output = join(OUTPUT_DIR, `${id}.mp3`)

    await run('ffmpeg', [
      '-y',
      '-v',
      'error',
      '-i',
      join(SOURCE_DIR, entry),
      '-codec:a',
      'libmp3lame',
      '-q:a',
      '5',
      '-ar',
      '44100',
      '-ac',
      '1',
      output,
    ])

    const duration = await probeDuration(output)
    encoded.set(id, Math.round(duration * 100) / 100)
    console.log(`${entry} -> ${output} (${duration.toFixed(2)}s)`)
  }

  const ordered = [
    ...[...existing.keys()].filter((id) => encoded.has(id)),
    ...[...encoded.keys()].filter((id) => !existing.has(id)),
  ]
  const takenKeys = new Set(
    ordered.map((id) => existing.get(id)?.key).filter((key) => key !== undefined),
  )
  const takenAccents = ordered.map((id) => existing.get(id)?.accent)
  const freeAccents = ACCENTS.filter((accent) => !takenAccents.includes(accent))

  const sounds = ordered.map((id, index) => {
    const previous = existing.get(id)
    const label = previous?.label ?? titleize(id)
    return {
      id,
      label,
      file: `sounds/${id}.mp3`,
      duration: encoded.get(id),
      key: previous?.key ?? claimKey(label, takenKeys),
      accent: previous?.accent ?? freeAccents[index % freeAccents.length] ?? ACCENTS[0],
    }
  })

  const missingKey = sounds.find((sound) => sound.key === undefined)
  if (missingKey) {
    console.error(`Plus de touche disponible pour "${missingKey.id}".`)
    process.exit(1)
  }

  await writeFile(MANIFEST, formatManifest(sounds))
  const added = sounds.length - existing.size
  console.log(
    `\n${sounds.length} sons encodés, ${MANIFEST} mis à jour${added > 0 ? ` (${added} nouveau(x))` : ''}.`,
  )
}

function claimKey(label, taken) {
  for (const key of [slugify(label).charAt(0), ...FALLBACK_KEYS]) {
    if (/^[a-z0-9]$/.test(key) && !taken.has(key)) {
      taken.add(key)
      return key
    }
  }
  return undefined
}

function formatManifest(sounds) {
  const entries = sounds.map((sound) => {
    const fields = Object.entries(sound)
      .map(([field, value]) => `"${field}": ${JSON.stringify(value)}`)
      .join(', ')
    return `  { ${fields} }`
  })
  return `[\n${entries.join(',\n')}\n]\n`
}

async function readManifest() {
  try {
    const parsed = JSON.parse(await readFile(MANIFEST, 'utf8'))
    return new Map(parsed.map((sound) => [sound.id, sound]))
  } catch {
    return new Map()
  }
}

async function probeDuration(file) {
  const { stdout } = await run('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'csv=p=0',
    file,
  ])
  return Number.parseFloat(stdout.trim())
}

function stripExtensions(name) {
  let result = basename(name)
  while (AUDIO_EXTENSIONS.has(extname(result).toLowerCase())) {
    result = basename(result, extname(result))
  }
  return result
}

function slugify(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function titleize(slug) {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

await main()
