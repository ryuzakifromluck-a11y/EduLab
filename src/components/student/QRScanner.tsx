import { Camera, CameraOff, KeyRound } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { CODE_LENGTH, codeFromScan, formatCode } from '../../lib/remoteCode'
import { Button } from '../ui/primitives'

/** The Shape Detection API (Chrome, Edge, Android, Safari 17+ behind a flag); not in TypeScript's DOM lib yet. */
interface DetectedBarcode {
  rawValue: string
}
interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>
}
type BarcodeDetectorCtor = new (options: { formats: string[] }) => BarcodeDetectorLike

const detectorCtor = (): BarcodeDetectorCtor | null =>
  typeof window !== 'undefined' && 'BarcodeDetector' in window ? ((window as unknown as { BarcodeDetector: BarcodeDetectorCtor }).BarcodeDetector) : null

type CameraState = 'off' | 'starting' | 'on' | 'denied' | 'unsupported'

/**
 * Scans the teacher's QR code with the device camera where the browser can
 * decode QR codes, and always offers typing the code instead. (A phone's own
 * camera app also opens the join link directly.)
 */
export function QRScanner({ onCode }: { onCode: (code: string) => void }) {
  const { t } = useTranslation()
  const video = useRef<HTMLVideoElement>(null)
  const [camera, setCamera] = useState<CameraState>(() => (detectorCtor() && typeof navigator.mediaDevices?.getUserMedia === 'function' ? 'off' : 'unsupported'))
  const [manual, setManual] = useState('')
  const [manualError, setManualError] = useState(false)
  const inputId = useId()
  const errorId = useId()

  useEffect(() => {
    if (camera !== 'starting' && camera !== 'on') return
    const Ctor = detectorCtor()
    if (!Ctor) return
    let stream: MediaStream | null = null
    let timer: ReturnType<typeof setTimeout> | null = null
    let stopped = false
    const detector = new Ctor({ formats: ['qr_code'] })

    const scan = async () => {
      if (stopped || !video.current) return
      try {
        for (const b of await detector.detect(video.current)) {
          const code = codeFromScan(b.rawValue)
          if (code) {
            stopped = true
            onCode(code)
            return
          }
        }
      } catch {
        /* frame not ready yet */
      }
      timer = setTimeout(scan, 250)
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(async (s) => {
        if (stopped) return s.getTracks().forEach((tr) => tr.stop())
        stream = s
        if (video.current) {
          video.current.srcObject = s
          await video.current.play().catch(() => {})
        }
        setCamera('on')
        void scan()
      })
      .catch(() => setCamera('denied'))

    return () => {
      stopped = true
      if (timer) clearTimeout(timer)
      stream?.getTracks().forEach((tr) => tr.stop())
    }
    // Only start/stop with the camera toggle; `on` keeps the same stream running.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera === 'off' || camera === 'denied' || camera === 'unsupported'])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const code = codeFromScan(manual)
    if (code) onCode(code)
    else setManualError(true)
  }

  const scanning = camera === 'starting' || camera === 'on'
  return (
    <div className="flex flex-col gap-6">
      {camera !== 'unsupported' && (
        <div className="flex flex-col items-center gap-3">
          <div className="relative aspect-square w-full max-w-xs overflow-hidden rounded-2xl border border-line bg-surface-2">
            <video ref={video} className={scanning ? 'h-full w-full object-cover' : 'hidden'} playsInline muted aria-label={t('remote.student.cameraPreview')} />
            {scanning && <div className="pointer-events-none absolute inset-8 rounded-xl border-2 border-white/80 shadow-[0_0_0_9999px_rgb(0_0_0/0.25)]" aria-hidden />}
            {!scanning && (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted">
                {camera === 'denied' ? <CameraOff className="h-8 w-8" aria-hidden /> : <Camera className="h-8 w-8" aria-hidden />}
                {camera === 'denied' ? t('remote.student.cameraDenied') : t('remote.student.cameraIdle')}
              </div>
            )}
          </div>
          <Button variant={scanning ? 'secondary' : 'primary'} onClick={() => setCamera(scanning ? 'off' : 'starting')}>
            {scanning ? <CameraOff className="h-4 w-4" aria-hidden /> : <Camera className="h-4 w-4" aria-hidden />}
            {scanning ? t('remote.student.stopCamera') : t('remote.student.scan')}
          </Button>
        </div>
      )}
      {camera === 'unsupported' && <p className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">{t('remote.student.useCameraApp')}</p>}

      <form onSubmit={submit} className="flex flex-col gap-2" noValidate>
        <label htmlFor={inputId} className="flex items-center gap-2 text-sm font-medium text-ink">
          <KeyRound className="h-4 w-4 text-muted" aria-hidden />
          {t('remote.student.enterCode')}
        </label>
        <div className="flex gap-2">
          <input
            id={inputId}
            value={manual}
            onChange={(e) => {
              setManual(e.target.value.toUpperCase())
              setManualError(false)
            }}
            placeholder={formatCode('ABC234')}
            maxLength={CODE_LENGTH + 2}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={manualError}
            aria-describedby={manualError ? errorId : undefined}
            className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 font-mono text-lg tracking-widest text-ink uppercase placeholder:text-faint focus:border-brand"
          />
          <Button type="submit" variant="primary" className="h-11">
            {t('remote.student.continue')}
          </Button>
        </div>
        {manualError && (
          <p id={errorId} role="alert" className="text-sm text-danger">
            {t('remote.errors.invalidCode')}
          </p>
        )}
      </form>
    </div>
  )
}
