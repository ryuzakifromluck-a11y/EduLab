import { clsx } from 'clsx'
import { useEffect, useRef, useState } from 'react'
import type { ChemistryItem } from '../../data/chemistryItems'
import { useReducedMotion } from '../../lib/hooks'

/**
 * An item's picture. Uses the item's `image` file when one is set, and otherwise (or if the file
 * fails to load) the code-drawn artwork. With `animate`, reaction effects play their frames.
 */
export function ItemPicture({ item, className, animate = false }: { item: ChemistryItem; className?: string; animate?: boolean }) {
  const [failed, setFailed] = useState<string | null>(null)
  if (item.image && failed !== item.image) {
    return (
      <img
        src={item.image}
        alt=""
        draggable={false}
        loading="lazy"
        onError={() => setFailed(item.image!)}
        className={clsx('object-contain', className)}
      />
    )
  }
  return <ArtCanvas item={item} className={className} animate={animate} />
}

function ArtCanvas({ item, className, animate }: { item: ChemistryItem; className?: string; animate: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()
  const { art } = item

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const paint = (frame?: number) => {
      ctx.save()
      ctx.globalCompositeOperation = 'source-over'
      ctx.clearRect(0, 0, art.w, art.h)
      if (frame === undefined || !art.frames) art.draw(ctx, art.w, art.h)
      else art.frames.draw(ctx, art.w, art.h, frame, art.frames.count)
      ctx.restore()
    }
    const frames = art.frames
    if (!animate || reduced || !frames) {
      paint()
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      paint(Math.floor(((now - start) / 1000) * frames.fps) % frames.count)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [art, animate, reduced])

  return <canvas ref={ref} width={art.w} height={art.h} aria-hidden className={clsx('object-contain', className)} />
}
