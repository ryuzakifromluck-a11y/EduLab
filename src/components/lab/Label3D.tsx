import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

/**
 * Text label rendered to a canvas texture on a camera-facing sprite. Used
 * instead of DOM overlays so labels stay inside the WebGL scene (fullscreen,
 * screenshots) and unmount cleanly with the canvas.
 */
export function Label3D({
  lines,
  position,
  height = 0.3,
  color = '#7dffb2',
  background = '#0f1a14',
  border = 'rgba(0,0,0,0.5)',
  font = '600 44px ui-monospace, SFMono-Regular, Menlo, monospace',
  subFont = '500 22px ui-monospace, SFMono-Regular, Menlo, monospace',
}: {
  /** First line is a small caption when there are two lines. */
  lines: string[]
  position: [number, number, number]
  height?: number
  color?: string
  background?: string | null
  border?: string
  font?: string
  subFont?: string
}) {
  const key = lines.join('\n')
  const { texture, aspect } = useMemo(() => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const twoLines = lines.length > 1
    const main = lines[lines.length - 1]
    ctx.font = font
    let w = ctx.measureText(main).width
    if (twoLines) {
      ctx.font = subFont
      w = Math.max(w, ctx.measureText(lines[0]).width)
    }
    const padX = 22
    const h = twoLines ? 104 : 72
    canvas.width = Math.ceil(w + padX * 2)
    canvas.height = h
    if (background) {
      ctx.fillStyle = background
      ctx.strokeStyle = border
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.roundRect(2, 2, canvas.width - 4, h - 4, 12)
      ctx.fill()
      ctx.stroke()
    }
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    if (twoLines) {
      ctx.font = subFont
      ctx.fillStyle = color
      ctx.globalAlpha = 0.7
      ctx.fillText(lines[0].toUpperCase(), canvas.width / 2, 28)
      ctx.globalAlpha = 1
      ctx.font = font
      ctx.fillText(main, canvas.width / 2, 70)
    } else {
      ctx.font = font
      ctx.fillStyle = color
      ctx.fillText(main, canvas.width / 2, h / 2 + 2)
    }
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    return { texture: tex, aspect: canvas.width / canvas.height }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, color, background, border, font, subFont])

  useEffect(() => () => texture.dispose(), [texture])

  return (
    <sprite position={position} scale={[height * aspect, height, 1]} renderOrder={10}>
      <spriteMaterial map={texture} transparent depthTest={false} />
    </sprite>
  )
}
