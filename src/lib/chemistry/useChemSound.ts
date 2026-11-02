import { useCallback, useEffect, useRef } from 'react'
import { playSound, preloadSounds, stopSound, useSoundSettings, type PlayOptions } from './soundManager'
import type { SoundId } from './soundSynth'

/**
 * Sound effects for one experiment. Preloads the given sounds after the first user interaction,
 * and stops any sound this component started (loops included) when it unmounts.
 */
export function useChemSound(preload: readonly SoundId[] = []) {
  const muted = useSoundSettings((s) => s.muted)
  const volume = useSoundSettings((s) => s.volume)
  const setMuted = useSoundSettings((s) => s.setMuted)
  const setVolume = useSoundSettings((s) => s.setVolume)
  const started = useRef(new Set<SoundId>())
  const key = preload.join(',')

  useEffect(() => {
    if (!key) return
    const ids = key.split(',') as SoundId[]
    const warm = () => preloadSounds(ids)
    window.addEventListener('pointerdown', warm, { once: true })
    window.addEventListener('keydown', warm, { once: true })
    return () => {
      window.removeEventListener('pointerdown', warm)
      window.removeEventListener('keydown', warm)
    }
  }, [key])

  useEffect(() => {
    const ids = started.current
    return () => {
      for (const id of ids) stopSound(id)
    }
  }, [])

  const play = useCallback((id: SoundId, opts?: number | PlayOptions) => {
    started.current.add(id)
    return playSound(id, opts)
  }, [])

  /** Starts or stops a looping sound to match `on`. */
  const loop = useCallback((id: SoundId, on: boolean, opts?: PlayOptions) => {
    started.current.add(id)
    stopSound(id)
    if (on) playSound(id, { ...opts, loop: true })
  }, [])

  return { play, loop, stop: stopSound, muted, volume, setMuted, setVolume }
}
