import { mulberry32 } from './canvasSheet'

/**
 * Lab sound effects synthesised from noise and oscillators, so EduLab ships no audio files:
 * every sound is computed into a sample buffer the first time it is needed (a few ms each).
 * Recipes are deterministic (seeded noise), which also makes them testable in Node.
 */

export const SOUND_IDS = [
  'match',
  'whoosh',
  'fire',
  'fizz',
  'sizzle',
  'pop',
  'boom',
  'bubble',
  'drip',
  'swirl',
  'glass-clink',
  'beep',
  'click',
  'hum',
  'relight',
] as const

export type SoundId = (typeof SOUND_IDS)[number]

export interface SoundDef {
  id: SoundId
  /** Seconds. */
  duration: number
  /** Loops seamlessly (the buffer's tail is cross-faded into its head). */
  loop: boolean
  /** Default gain, 0–1. */
  volume: number
  /** Most copies that may play at once (drips, pops). */
  maxVoices: number
}

const D = (id: SoundId, duration: number, loop: boolean, volume: number, maxVoices = 4): SoundDef => ({ id, duration, loop, volume, maxVoices })

export const SOUNDS: Record<SoundId, SoundDef> = {
  match: D('match', 0.9, false, 0.7, 2),
  whoosh: D('whoosh', 0.8, false, 0.6, 2),
  fire: D('fire', 2.5, true, 0.45, 1),
  fizz: D('fizz', 2, true, 0.5, 1),
  sizzle: D('sizzle', 0.7, false, 0.5, 3),
  pop: D('pop', 0.35, false, 0.9, 3),
  boom: D('boom', 1.2, false, 0.9, 2),
  bubble: D('bubble', 2, true, 0.4, 1),
  drip: D('drip', 0.18, false, 0.5, 6),
  swirl: D('swirl', 1, false, 0.5, 2),
  'glass-clink': D('glass-clink', 0.5, false, 0.45, 3),
  beep: D('beep', 0.14, false, 0.35, 2),
  click: D('click', 0.05, false, 0.6, 2),
  hum: D('hum', 1, true, 0.18, 1),
  relight: D('relight', 0.9, false, 0.6, 2),
}

const TAU = Math.PI * 2

/** One-pole low-pass filter in place; `hz` is the cut-off. */
function lowpass(x: Float32Array, hz: number, sr: number) {
  const a = 1 - Math.exp((-TAU * hz) / sr)
  let y = 0
  for (let i = 0; i < x.length; i++) {
    y += a * (x[i] - y)
    x[i] = y
  }
  return x
}

function highpass(x: Float32Array, hz: number, sr: number) {
  const a = 1 - Math.exp((-TAU * hz) / sr)
  let lp = 0
  for (let i = 0; i < x.length; i++) {
    lp += a * (x[i] - lp)
    x[i] = x[i] - lp
  }
  return x
}

function noise(n: number, rand: () => number) {
  const x = new Float32Array(n)
  for (let i = 0; i < n; i++) x[i] = rand() * 2 - 1
  return x
}

/** Short random crackles (embers, sizzling). */
function crackles(out: Float32Array, sr: number, rand: () => number, perSecond: number, gain: number, from = 0, to = out.length) {
  const count = Math.round(((to - from) / sr) * perSecond)
  for (let c = 0; c < count; c++) {
    const start = from + Math.floor(rand() * (to - from))
    const len = Math.floor(sr * (0.002 + rand() * 0.006))
    const amp = gain * (0.3 + rand() * 0.7)
    for (let i = 0; i < len && start + i < out.length; i++) out[start + i] += amp * (rand() * 2 - 1) * (1 - i / len)
  }
}

const env = (t: number, attack: number, decay: number) => (t < attack ? t / attack : Math.exp(-(t - attack) / decay))

function normalize(x: Float32Array, peak = 0.9) {
  let m = 0
  for (let i = 0; i < x.length; i++) m = Math.max(m, Math.abs(x[i]))
  if (m > 0) for (let i = 0; i < x.length; i++) x[i] *= peak / m
  return x
}

/** Cross-fades the last `fade` seconds into the start so the buffer loops without a click. */
function makeLoop(x: Float32Array, sr: number, fade = 0.15) {
  const f = Math.min(Math.floor(fade * sr), Math.floor(x.length / 3))
  const out = x.slice(0, x.length - f)
  for (let i = 0; i < f; i++) {
    const k = i / f
    out[i] = x[i] * Math.sqrt(k) + x[x.length - f + i] * Math.sqrt(1 - k)
  }
  return out
}

/** Renders one sound into mono samples in [-1, 1]. */
export function renderSound(id: SoundId, sampleRate = 44100, seed = 7): Float32Array {
  const def = SOUNDS[id]
  const sr = sampleRate
  const rand = mulberry32(seed + id.length * 101)
  const n = Math.max(1, Math.round(def.duration * sr))
  let x: Float32Array
  switch (id) {
    case 'match': {
      // Scratch on the striker, then the head flares and burns down.
      x = highpass(noise(n, rand), 1800, sr)
      const flare = lowpass(noise(n, rand), 900, sr)
      for (let i = 0; i < n; i++) {
        const t = i / sr
        x[i] = x[i] * (t < 0.12 ? 1 : 0) * 0.8 + flare[i] * (t < 0.1 ? 0 : 1.6 * env(t - 0.1, 0.05, 0.25))
      }
      crackles(x, sr, rand, 40, 0.5, Math.floor(0.1 * sr))
      break
    }
    case 'whoosh': {
      x = lowpass(noise(n, rand), 600, sr)
      for (let i = 0; i < n; i++) x[i] *= env(i / sr, 0.15, 0.25)
      break
    }
    case 'relight': {
      // A glowing splint bursts back into flame in oxygen.
      x = lowpass(noise(n, rand), 1200, sr)
      for (let i = 0; i < n; i++) x[i] *= env(i / sr, 0.08, 0.35)
      crackles(x, sr, rand, 30, 0.6)
      break
    }
    case 'fire': {
      x = lowpass(lowpass(noise(n, rand), 500, sr), 900, sr)
      normalize(x, 0.6)
      crackles(x, sr, rand, 14, 0.5)
      x = makeLoop(x, sr)
      break
    }
    case 'fizz': {
      // Hydrogen streaming from a metal on water: hiss with a fast, uneven flutter.
      x = highpass(noise(n, rand), 2500, sr)
      let flutter = 0.6
      for (let i = 0; i < n; i++) {
        if (i % 300 === 0) flutter = 0.4 + rand() * 0.6
        x[i] *= flutter
      }
      crackles(x, sr, rand, 60, 0.8)
      x = makeLoop(x, sr)
      break
    }
    case 'sizzle': {
      x = highpass(noise(n, rand), 3000, sr)
      for (let i = 0; i < n; i++) x[i] *= env(i / sr, 0.02, 0.25)
      crackles(x, sr, rand, 50, 0.7)
      break
    }
    case 'pop': {
      // The "squeaky pop" of hydrogen igniting at the mouth of a test tube.
      x = new Float32Array(n)
      let phase = 0
      for (let i = 0; i < n; i++) {
        const t = i / sr
        const f = 300 + 900 * Math.exp(-t / 0.04)
        phase += (TAU * f) / sr
        x[i] = Math.sin(phase) * env(t, 0.003, 0.06)
      }
      const click = lowpass(noise(n, rand), 2500, sr)
      for (let i = 0; i < n; i++) x[i] += click[i] * env(i / sr, 0.001, 0.02) * 1.5
      break
    }
    case 'boom': {
      x = lowpass(noise(n, rand), 400, sr)
      for (let i = 0; i < n; i++) {
        const t = i / sr
        x[i] = x[i] * 2.5 * env(t, 0.005, 0.3) + Math.sin(TAU * (55 + 40 * Math.exp(-t / 0.1)) * t) * env(t, 0.005, 0.35)
      }
      break
    }
    case 'bubble': {
      x = new Float32Array(n)
      const count = Math.round(def.duration * 9)
      for (let b = 0; b < count; b++) {
        const start = Math.floor(rand() * (n - 0.05 * sr))
        const f0 = 350 + rand() * 500
        const len = Math.floor(sr * (0.03 + rand() * 0.03))
        let phase = 0
        for (let i = 0; i < len; i++) {
          const k = i / len
          phase += (TAU * f0 * (1 + 1.2 * k)) / sr
          x[start + i] += Math.sin(phase) * Math.sin(Math.PI * k) * (0.4 + rand() * 0.1)
        }
      }
      x = makeLoop(x, sr, 0.05)
      break
    }
    case 'drip': {
      x = new Float32Array(n)
      let phase = 0
      for (let i = 0; i < n; i++) {
        const t = i / sr
        phase += (TAU * (700 + 900 * (1 - Math.exp(-t / 0.03)))) / sr
        x[i] = Math.sin(phase) * env(t, 0.002, 0.035)
      }
      break
    }
    case 'swirl': {
      x = lowpass(highpass(noise(n, rand), 250, sr), 1400, sr)
      for (let i = 0; i < n; i++) {
        const t = i / sr
        x[i] *= (0.5 + 0.5 * Math.sin(TAU * 3 * t)) * env(t, 0.15, 0.4)
      }
      break
    }
    case 'glass-clink': {
      x = new Float32Array(n)
      for (const [f, a, d] of [
        [2300, 1, 0.12],
        [3710, 0.6, 0.08],
        [5140, 0.35, 0.05],
      ] as const) {
        for (let i = 0; i < n; i++) x[i] += a * Math.sin((TAU * f * i) / sr) * env(i / sr, 0.001, d)
      }
      break
    }
    case 'beep': {
      x = new Float32Array(n)
      for (let i = 0; i < n; i++) {
        const t = i / sr
        x[i] = (Math.sin(TAU * 2000 * t) > 0 ? 0.5 : -0.5) * (t < 0.12 ? 1 : 0)
      }
      lowpass(x, 6000, sr)
      break
    }
    case 'click': {
      x = highpass(noise(n, rand), 1000, sr)
      for (let i = 0; i < n; i++) x[i] *= env(i / sr, 0.0005, 0.006)
      break
    }
    case 'hum': {
      // A whole number of 100 Hz cycles in the buffer, so it loops cleanly.
      x = new Float32Array(n)
      for (let i = 0; i < n; i++) {
        const t = i / sr
        x[i] = 0.6 * Math.sin(TAU * 100 * t) + 0.25 * Math.sin(TAU * 200 * t) + 0.1 * Math.sin(TAU * 300 * t)
      }
      break
    }
  }
  return normalize(x, 0.9)
}
