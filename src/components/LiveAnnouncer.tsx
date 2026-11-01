import { useEffect, useState } from 'react'
import { subscribeAnnouncements } from '../lib/announce'

/**
 * Always-mounted live regions (they must exist before content changes for screen
 * readers to pick the change up). A trailing zero-width space alternates so that
 * repeating the same message is still announced.
 */
export function LiveAnnouncer() {
  const [polite, setPolite] = useState('')
  const [assertive, setAssertive] = useState('')
  useEffect(() => {
    let flip = false
    return subscribeAnnouncements((message, politeness) => {
      flip = !flip
      const text = flip ? message : `${message}\u200b`
      if (politeness === 'assertive') setAssertive(text)
      else setPolite(text)
    })
  }, [])
  return (
    <div className="sr-only">
      <div role="status" aria-live="polite" aria-atomic="true">
        {polite}
      </div>
      <div role="alert" aria-live="assertive" aria-atomic="true">
        {assertive}
      </div>
    </div>
  )
}
