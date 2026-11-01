import type { RayResult } from '../../engines/optics'

const O = { x: 210, y: 150 }
const LEN = 130
const rad = (d: number) => (d * Math.PI) / 180

/** Ray diagram in SVG. */
export function Optics2D({ ray, label, top, bottom }: { ray: RayResult; label: string; top: string; bottom: string }) {
  const t1 = rad(ray.incidence)
  const S = { x: O.x - LEN * Math.sin(t1), y: O.y - LEN * Math.cos(t1) }
  const R = { x: O.x + LEN * Math.sin(t1), y: O.y - LEN * Math.cos(t1) }
  const T = ray.refraction === null ? null : { x: O.x + LEN * Math.sin(rad(ray.refraction)), y: O.y + LEN * Math.cos(rad(ray.refraction)) }
  return (
    <svg viewBox="0 0 420 300" className="h-full max-h-[460px] w-full" role="img" aria-label={label}>
      <rect x="10" y={O.y} width="400" height="140" fill="#5ab0e8" opacity="0.18" />
      <line x1="10" x2="410" y1={O.y} y2={O.y} stroke="var(--muted)" />
      <line x1={O.x} x2={O.x} y1="10" y2="290" stroke="var(--muted)" strokeDasharray="5 5" />
      <text x="20" y={O.y - 10} fontSize="12" fill="var(--muted)">{top}</text>
      <text x="20" y={O.y + 22} fontSize="12" fill="var(--muted)">{bottom}</text>
      <line x1={S.x} y1={S.y} x2={O.x} y2={O.y} stroke="#e5484d" strokeWidth="3" />
      <line x1={O.x} y1={O.y} x2={R.x} y2={R.y} stroke="#e5484d" strokeWidth="3" opacity={Math.max(0.15, ray.reflected)} />
      {T && <line x1={O.x} y1={O.y} x2={T.x} y2={T.y} stroke="#e5484d" strokeWidth="3" opacity={Math.max(0.15, ray.transmitted)} />}
      <text x={S.x - 6} y={S.y - 6} fontSize="12" textAnchor="end" fill="var(--text)">θ₁ = {ray.incidence.toFixed(0)}°</text>
      {T && <text x={T.x + 6} y={T.y} fontSize="12" fill="var(--text)">θ₂ = {ray.refraction!.toFixed(1)}°</text>}
    </svg>
  )
}
