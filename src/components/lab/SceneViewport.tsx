import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Box, Gauge, Maximize2, Minimize2, Pause, Play, RotateCcw, Scan, Square } from 'lucide-react'
import { Component, Suspense, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { announce } from '../../lib/announce'
import { useFullscreen, useReducedMotion } from '../../lib/hooks'
import { reportError } from '../../lib/monitoring'
import { hasWebGL } from '../../lib/webgl'
import { useUi } from '../../store/ui'
import { IconButton } from '../ui/primitives'
import { clsx } from 'clsx'

class SceneErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(err: unknown) {
    console.error('3D scene failed, showing 2D fallback', err)
    reportError(err, 'scene')
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export interface SimulationControls {
  running?: boolean
  onTogglePlay?: () => void
  onReset?: () => void
  speed?: number
  speeds?: number[]
  onSpeed?: (s: number) => void
}

export function SceneViewport({
  scene,
  fallback2D,
  camera,
  controls,
  className,
  overlay,
  large,
}: {
  scene: ReactNode
  fallback2D: ReactNode
  camera: { position: [number, number, number]; target: [number, number, number]; fov?: number }
  controls: SimulationControls
  className?: string
  overlay?: ReactNode
  large?: boolean
}) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  const orbit = useRef<OrbitControlsImpl>(null)
  const { isFullscreen, toggle, supported } = useFullscreen(ref)
  const webgl = hasWebGL()
  const [mode, setMode] = useState<'3d' | '2d'>(webgl ? '3d' : '2d')
  const dark = useUi((s) => s.theme) === 'dark'
  const reduced = useReducedMotion()
  const helpId = useId()

  // Announce play/pause changes, whichever control (button, presenter key) caused them.
  const prevRunning = useRef(controls.running)
  useEffect(() => {
    if (prevRunning.current !== undefined && prevRunning.current !== controls.running) {
      announce(controls.running ? t('lab.announceRunning') : t('lab.announcePaused'))
    }
    prevRunning.current = controls.running
  }, [controls.running, t])

  // Keyboard alternative to drag/scroll on the 3D view: arrows orbit, +/- zoom, 0 resets.
  const onViewKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const o = orbit.current
    if (mode !== '3d' || !o || e.target !== e.currentTarget || e.altKey || e.ctrlKey || e.metaKey) return
    const step = Math.PI / 24
    switch (e.key) {
      case 'ArrowLeft':
        o.setAzimuthalAngle(o.getAzimuthalAngle() - step)
        break
      case 'ArrowRight':
        o.setAzimuthalAngle(o.getAzimuthalAngle() + step)
        break
      case 'ArrowUp':
        o.setPolarAngle(o.getPolarAngle() - step)
        break
      case 'ArrowDown':
        o.setPolarAngle(o.getPolarAngle() + step)
        break
      case '+':
      case '=':
        o.dollyIn(1.15)
        o.update()
        break
      case '-':
      case '_':
        o.dollyOut(1.15)
        o.update()
        break
      case '0':
        o.reset()
        break
      default:
        return
    }
    e.preventDefault()
    e.stopPropagation()
  }

  const fallback = <div className="flex h-full w-full items-center justify-center">{fallback2D}</div>

  return (
    <div
      ref={ref}
      className={clsx(
        'relative flex flex-col overflow-hidden rounded-2xl border border-line bg-canvas',
        isFullscreen && 'rounded-none border-0',
        className,
      )}
    >
      <div
        className="relative min-h-0 flex-1 focus-visible:outline-offset-[-3px]"
        role="group"
        aria-label={t('lab.viewportLabel')}
        aria-describedby={mode === '3d' ? helpId : undefined}
        tabIndex={mode === '3d' ? 0 : undefined}
        onKeyDown={onViewKey}
      >
        <p id={helpId} className="sr-only">
          {t('lab.viewportKeys')}
        </p>
        {mode === '3d' ? (
          <SceneErrorBoundary fallback={fallback}>
            <Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-muted">{t('common.loading3d')}</div>}>
              <Canvas
                dpr={[1, 2]}
                shadows="percentage"
                camera={{ position: camera.position, fov: camera.fov ?? 40 }}
                gl={{ antialias: true, preserveDrawingBuffer: false }}
                className="touch-none"
              >
                <color attach="background" args={[dark ? '#0d1322' : '#eef1f7']} />
                {scene}
                <OrbitControls
                  ref={orbit}
                  target={camera.target}
                  enablePan={false}
                  minDistance={1.5}
                  maxDistance={14}
                  maxPolarAngle={Math.PI * 0.55}
                  enableDamping={!reduced}
                  makeDefault
                />
              </Canvas>
            </Suspense>
          </SceneErrorBoundary>
        ) : (
          fallback
        )}
        {overlay}
        {!webgl && (
          <p className="absolute bottom-3 left-3 rounded-lg bg-surface/90 px-3 py-1.5 text-xs text-muted ring-1 ring-line">
            {t('lab.noWebgl')}
          </p>
        )}
      </div>
      <div
        className={clsx(
          'flex flex-wrap items-center gap-1 border-t border-line bg-surface/90 px-2 py-1.5 backdrop-blur',
          large && 'gap-2 px-4 py-3',
        )}
        role="toolbar"
        aria-label={t('lab.simulationControls')}
      >
        {controls.onTogglePlay && (
          <IconButton label={controls.running ? t('lab.pause') : t('lab.play')} onClick={controls.onTogglePlay} className={large ? 'h-12 w-12' : ''}>
            {controls.running ? <Pause className="h-4.5 w-4.5" /> : <Play className="h-4.5 w-4.5" />}
          </IconButton>
        )}
        {controls.onReset && (
          <IconButton
            label={t('lab.reset')}
            onClick={() => {
              controls.onReset?.()
              announce(t('lab.announceReset'))
            }}
            className={large ? 'h-12 w-12' : ''}
          >
            <RotateCcw className="h-4.5 w-4.5" />
          </IconButton>
        )}
        {controls.onSpeed && controls.speeds && (
          <label className="ml-1 inline-flex items-center gap-1.5 text-xs text-muted">
            <Gauge className="h-4 w-4" aria-hidden />
            <span className="sr-only">{t('lab.speed')}</span>
            <select
              value={controls.speed}
              onChange={(e) => controls.onSpeed!(parseFloat(e.target.value))}
              className="h-8 rounded-md border border-line bg-surface px-2 text-xs text-ink"
            >
              {controls.speeds.map((s) => (
                <option key={s} value={s}>
                  {s}×
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="ml-auto flex items-center gap-1">
          {webgl && (
            <IconButton
              label={mode === '3d' ? t('lab.switchTo2d') : t('lab.switchTo3d')}
              onClick={() => setMode((m) => (m === '3d' ? '2d' : '3d'))}
            >
              {mode === '3d' ? <Square className="h-4 w-4" /> : <Box className="h-4 w-4" />}
            </IconButton>
          )}
          {mode === '3d' && (
            <IconButton label={t('lab.resetCamera')} onClick={() => orbit.current?.reset()}>
              <Scan className="h-4 w-4" />
            </IconButton>
          )}
          {supported && (
            <IconButton label={isFullscreen ? t('lab.exitFullscreen') : t('lab.fullscreen')} onClick={toggle}>
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </IconButton>
          )}
        </div>
      </div>
    </div>
  )
}
