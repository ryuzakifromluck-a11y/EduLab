import { useEffect, useMemo, useRef } from 'react'
import type * as THREE from 'three'
import { AnimatedSprite, type AnimatedSpriteProps } from '../../lib/chemistry/animatedSprite'
import { EFFECTS, effectFrames, type EffectId } from '../../lib/chemistry/reactionCatalog'
import { playSound } from '../../lib/chemistry/soundManager'

/**
 * Plays a reaction animation (flame, smoke, bubbles, explosion…) as a frame-cycled sprite.
 * With `sound`, the effect's sound starts when it becomes active and loops for looping effects.
 */
export function ReactionEffect({
  effect,
  active = true,
  sound = false,
  height = 1,
  color,
  opacity = 1,
  speed = 1,
  restartKey,
  onComplete,
  additive = false,
  ...props
}: {
  effect: EffectId
  active?: boolean
  sound?: boolean
  height?: number
  color?: THREE.ColorRepresentation
  opacity?: number
  /** Multiplies the effect's frame rate. */
  speed?: number
  restartKey?: unknown
  onComplete?: () => void
  /** Additive blending suits dark scenes; on light backgrounds normal blending keeps colours visible. */
  additive?: boolean
} & Omit<AnimatedSpriteProps, 'sheet' | 'frames' | 'fps' | 'loop' | 'height' | 'color' | 'opacity' | 'restartKey' | 'onComplete' | 'additive'>) {
  const def = EFFECTS[effect]
  const { sheet, frames } = useMemo(() => effectFrames(effect), [effect])
  const stop = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!active || !sound || !def.sound) return
    stop.current = playSound(def.sound, { loop: def.loop })
    return () => {
      stop.current?.()
      stop.current = null
    }
  }, [active, sound, def, restartKey])

  if (!active) return null
  return (
    <AnimatedSprite
      sheet={sheet}
      frames={frames}
      fps={def.fps * speed}
      loop={def.loop}
      additive={additive && def.additive}
      height={height}
      color={color}
      opacity={opacity}
      restartKey={restartKey}
      onComplete={onComplete}
      {...props}
    />
  )
}
