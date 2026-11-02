import { useEffect, useRef } from 'react'
import type { Experiment } from '../../data/experiments'
import type { ProgressSettings } from '../../lib/progressModel'
import { useRemoteSession } from '../../store/remoteSession'

/**
 * Keeps an experiment page in step with the student's room. A member (not the
 * controller) on the room's experiment gets the controller's parameters applied
 * whenever they change, and `following` is true so the page can disable its own
 * sliders. Experiments without `applySettings` still show the controller's values.
 */
export function useRoomFollow(experiment: Experiment, applySettings?: (s: ProgressSettings) => void) {
  const room = useRemoteSession((s) => s.room)
  const me = useRemoteSession((s) => s.ticket?.studentId)
  const shared = room?.shared
  const following = !!room && room.controllerId !== me && shared?.experimentId === experiment.id && !!applySettings
  const apply = useRef(applySettings)
  useEffect(() => {
    apply.current = applySettings
  })
  const applied = useRef(-1)
  useEffect(() => {
    if (!following || !shared || shared.version === applied.current) return
    applied.current = shared.version
    apply.current?.(shared.settings)
  }, [following, shared])
  useEffect(() => {
    if (!following) applied.current = -1
  }, [following])
  return { following }
}
