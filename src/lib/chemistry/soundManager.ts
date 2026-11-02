import { create } from 'zustand'
import { renderSound, SOUNDS, type SoundId } from './soundSynth'

/**
 * Plays the synthesised lab sounds through the Web Audio API.
 *
 * The AudioContext is created on the first play (browsers only allow audio after a user
 * gesture anyway); buffers are rendered once per sound and reused. Volume and mute are kept in
 * a small store, saved in localStorage, so every chemistry experiment shares the same setting.
 */

const KEY = 'edulab-lab-sound'

interface SoundSettings {
  muted: boolean
  volume: number
  setMuted: (m: boolean) => void
  setVolume: (v: number) => void
}

function initial(): { muted: boolean; volume: number } {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const v = JSON.parse(raw) as { muted?: unknown; volume?: unknown }
      return { muted: v.muted === true, volume: typeof v.volume === 'number' ? Math.min(1, Math.max(0, v.volume)) : 0.7 }
    }
  } catch {
    /* storage unavailable */
  }
  return { muted: false, volume: 0.7 }
}

function save(s: { muted: boolean; volume: number }) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ muted: s.muted, volume: s.volume }))
  } catch {
    /* ignore */
  }
}

export const useSoundSettings = create<SoundSettings>((set, get) => ({
  ...initial(),
  setMuted: (muted) => {
    set({ muted })
    save(get())
    applyMaster()
    if (muted) stopAllSounds()
  },
  setVolume: (volume) => {
    set({ volume: Math.min(1, Math.max(0, volume)) })
    save(get())
    applyMaster()
  },
}))

type Voice = { src: AudioBufferSourceNode; gain: GainNode }

let ctx: AudioContext | null = null
let master: GainNode | null = null
const buffers = new Map<SoundId, AudioBuffer>()
const voices = new Map<SoundId, Set<Voice>>()

function audioContext(): AudioContext | null {
  if (ctx) return ctx
  const AC = typeof window !== 'undefined' ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) : undefined
  if (!AC) return null
  try {
    ctx = new AC()
    master = ctx.createGain()
    master.connect(ctx.destination)
    applyMaster()
  } catch {
    ctx = null
  }
  return ctx
}

function applyMaster() {
  if (!master || !ctx) return
  const { muted, volume } = useSoundSettings.getState()
  master.gain.setTargetAtTime(muted ? 0 : volume, ctx.currentTime, 0.02)
}

function buffer(id: SoundId): AudioBuffer | null {
  const ac = audioContext()
  if (!ac) return null
  let b = buffers.get(id)
  if (!b) {
    const data = renderSound(id, ac.sampleRate)
    b = ac.createBuffer(1, data.length, ac.sampleRate)
    b.copyToChannel(data as Float32Array<ArrayBuffer>, 0)
    buffers.set(id, b)
  }
  return b
}

/** Renders the buffers ahead of time so the first play has no delay. */
export function preloadSounds(ids: readonly SoundId[]) {
  for (const id of ids) buffer(id)
}

export interface PlayOptions {
  /** 0–1, multiplied with the sound's default and the master volume. */
  volume?: number
  /** Overrides the sound's own loop setting. */
  loop?: boolean
  /** Playback rate (pitch), 1 = normal. */
  rate?: number
}

/**
 * Plays a sound and returns a function that stops this copy. Does nothing (and returns a no-op)
 * when muted, outside a browser, or when the sound already has its maximum number of voices.
 */
export function playSound(id: SoundId, volumeOrOptions: number | PlayOptions = {}): () => void {
  const opts = typeof volumeOrOptions === 'number' ? { volume: volumeOrOptions } : volumeOrOptions
  if (useSoundSettings.getState().muted) return () => {}
  const ac = audioContext()
  const b = buffer(id)
  if (!ac || !b || !master) return () => {}
  if (ac.state === 'suspended') void ac.resume()
  const def = SOUNDS[id]
  const set = voices.get(id) ?? new Set<Voice>()
  voices.set(id, set)
  if (set.size >= def.maxVoices) return () => {}
  const src = ac.createBufferSource()
  src.buffer = b
  src.loop = opts.loop ?? def.loop
  src.playbackRate.value = opts.rate ?? 1
  const gain = ac.createGain()
  gain.gain.value = def.volume * (opts.volume ?? 1)
  src.connect(gain).connect(master)
  const voice = { src, gain }
  set.add(voice)
  src.onended = () => {
    set.delete(voice)
    gain.disconnect()
  }
  src.start()
  return () => stopVoice(voice)
}

function stopVoice(v: Voice) {
  if (!ctx) return
  try {
    // Short fade avoids a click.
    v.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.02)
    v.src.stop(ctx.currentTime + 0.1)
  } catch {
    /* already stopped */
  }
}

/** Stops every playing copy of a sound. */
export function stopSound(id: SoundId) {
  for (const v of voices.get(id) ?? []) stopVoice(v)
}

export function stopAllSounds() {
  for (const id of voices.keys()) stopSound(id)
}

export const isPlaying = (id: SoundId) => (voices.get(id)?.size ?? 0) > 0
