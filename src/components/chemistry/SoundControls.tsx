import { Volume2, VolumeX } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { useSoundSettings } from '../../lib/chemistry/soundManager'

/** Mute button and volume slider for experiment sound effects (shared by all experiments). */
export function SoundControls() {
  const { t } = useTranslation()
  const id = useId()
  const muted = useSoundSettings((s) => s.muted)
  const volume = useSoundSettings((s) => s.volume)
  const setMuted = useSoundSettings((s) => s.setMuted)
  const setVolume = useSoundSettings((s) => s.setVolume)
  return (
    <div className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2">
      <button
        type="button"
        onClick={() => setMuted(!muted)}
        aria-pressed={muted}
        aria-label={muted ? t('lab.sound.unmute') : t('lab.sound.mute')}
        title={muted ? t('lab.sound.unmute') : t('lab.sound.mute')}
        className="grid h-8 w-8 place-items-center rounded-lg text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand"
      >
        {muted ? <VolumeX className="h-4 w-4" aria-hidden /> : <Volume2 className="h-4 w-4" aria-hidden />}
      </button>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {t('lab.sound.label')}
      </label>
      <input
        id={id}
        type="range"
        className="slider flex-1"
        min={0}
        max={1}
        step={0.05}
        value={volume}
        disabled={muted}
        style={{ ['--fill' as string]: `${volume * 100}%`, ['--track' as string]: 'var(--brand)' }}
        aria-valuetext={`${Math.round(volume * 100)} %`}
        onChange={(e) => setVolume(parseFloat(e.target.value))}
      />
    </div>
  )
}
