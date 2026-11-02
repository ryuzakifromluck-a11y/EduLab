import { useFrame, type ThreeElements } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { frameIndexAt, showFrame, type SpriteFrame, type SpriteSheet } from './spriteLoader'

export interface AnimatedSpriteProps extends Omit<ThreeElements['sprite'], 'ref' | 'scale'> {
  sheet: SpriteSheet
  frames: SpriteFrame[]
  fps?: number
  loop?: boolean
  /** Paused sprites hold their current frame. */
  playing?: boolean
  /** Called once when a non-looping animation shows its last frame. */
  onComplete?: () => void
  /** World height of the sprite; width follows the frame's aspect ratio. */
  height?: number
  opacity?: number
  color?: THREE.ColorRepresentation
  /** Additive blending for light-emitting effects (fire, sparks). */
  additive?: boolean
  /** Restart from frame 0 whenever this value changes. */
  restartKey?: unknown
}

/**
 * A camera-facing sprite that cycles through the frames of a sprite sheet. Each instance clones
 * the atlas texture once (clones share the GPU image) and moves its UV window every frame.
 */
export function AnimatedSprite({
  sheet,
  frames,
  fps = 12,
  loop = true,
  playing = true,
  onComplete,
  height = 1,
  opacity = 1,
  color = '#ffffff',
  additive = false,
  restartKey,
  ...props
}: AnimatedSpriteProps) {
  const sprite = useRef<THREE.Sprite>(null)
  const texture = useMemo(() => {
    const t = sheet.texture.clone()
    t.needsUpdate = true
    return t
  }, [sheet])
  useEffect(() => () => texture.dispose(), [texture])
  const state = useRef({ elapsed: 0, index: -1, done: false })
  const onCompleteRef = useRef(onComplete)
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    state.current = { elapsed: 0, index: -1, done: false }
  }, [restartKey, frames])

  useFrame((_, dt) => {
    const s = state.current
    if (playing) s.elapsed += Math.min(dt, 0.1)
    const i = frameIndexAt(s.elapsed, fps, frames.length, loop)
    if (i !== s.index && frames[i]) {
      s.index = i
      const f = frames[i]
      showFrame(texture, f, sheet.meta)
      sprite.current?.scale.set((height * f.w) / f.h, height, 1)
    }
    if (!loop && !s.done && i === frames.length - 1 && s.elapsed * fps >= frames.length) {
      s.done = true
      onCompleteRef.current?.()
    }
  })

  return (
    <sprite ref={sprite} {...props}>
      <spriteMaterial
        map={texture}
        transparent
        depthWrite={false}
        opacity={opacity}
        color={color}
        blending={additive ? THREE.AdditiveBlending : THREE.NormalBlending}
        toneMapped={false}
      />
    </sprite>
  )
}
