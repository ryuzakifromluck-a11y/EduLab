/**
 * Projectile motion engine.
 *
 * Model: a point mass launched from height h₀ with speed v₀ at angle θ above
 * the horizontal, in uniform gravity g. Optionally with quadratic air drag:
 *
 *   without drag:  x'' = 0,             y'' = −g
 *   with drag:     x'' = −k |v| vₓ,     y'' = −g − k |v| v_y
 *
 * where k = ½ ρ C_d A / m (1/m). The drag-free case has closed-form answers
 * (used for the formulas and to verify the integrator); the general case is
 * integrated with classic 4th-order Runge–Kutta at a fixed step.
 */

export interface ProjectileParams {
  /** Launch speed in m/s. */
  speed: number
  /** Launch angle above the horizontal, in degrees. */
  angleDeg: number
  /** Launch height above the ground, in metres. */
  height: number
  /** Gravitational acceleration in m/s². */
  gravity: number
  /** Quadratic drag constant k = ½ρC_dA/m in 1/m; 0 disables air resistance. */
  drag: number
}

export interface ProjectileState {
  x: number
  y: number
  vx: number
  vy: number
}

/** Drag constant for a tennis ball in sea-level air: ½ · 1.2 kg/m³ · 0.55 · π(0.0335 m)² / 0.057 kg. */
export const TENNIS_BALL_DRAG = (0.5 * 1.2 * 0.55 * Math.PI * 0.0335 ** 2) / 0.057

export const degToRad = (deg: number) => (deg * Math.PI) / 180

export function initialState(p: ProjectileParams): ProjectileState {
  const a = degToRad(p.angleDeg)
  return { x: 0, y: p.height, vx: p.speed * Math.cos(a), vy: p.speed * Math.sin(a) }
}

/** Time of flight without drag: positive root of h₀ + v₀ sinθ · t − ½gt² = 0. */
export function flightTime(p: ProjectileParams): number {
  const vy = p.speed * Math.sin(degToRad(p.angleDeg))
  return (vy + Math.sqrt(vy * vy + 2 * p.gravity * Math.max(0, p.height))) / p.gravity
}

/** Horizontal range without drag. For h₀ = 0 this reduces to v₀² sin 2θ / g. */
export function range(p: ProjectileParams): number {
  return p.speed * Math.cos(degToRad(p.angleDeg)) * flightTime(p)
}

/** Maximum height above the ground without drag: h₀ + (v₀ sinθ)² / 2g (h₀ if launched downwards). */
export function maxHeight(p: ProjectileParams): number {
  const vy = p.speed * Math.sin(degToRad(p.angleDeg))
  return p.height + (vy > 0 ? (vy * vy) / (2 * p.gravity) : 0)
}

/** Time to reach the top of the arc without drag. */
export function apexTime(p: ProjectileParams): number {
  return Math.max(0, (p.speed * Math.sin(degToRad(p.angleDeg))) / p.gravity)
}

/** Exact drag-free position and velocity at time t. */
export function stateAt(p: ProjectileParams, t: number): ProjectileState {
  const s = initialState(p)
  return { x: s.vx * t, y: s.y + s.vy * t - 0.5 * p.gravity * t * t, vx: s.vx, vy: s.vy - p.gravity * t }
}

/** Launch angle (degrees) that gives the greatest drag-free range from height h₀. */
export function optimalAngleDeg(p: Pick<ProjectileParams, 'speed' | 'height' | 'gravity'>): number {
  const v2 = p.speed * p.speed
  return (Math.atan(p.speed / Math.sqrt(v2 + 2 * p.gravity * Math.max(0, p.height))) * 180) / Math.PI
}

/** Mechanical energy per unit mass (J/kg), ground as the zero of potential energy. */
export function energyPerMass(s: ProjectileState, gravity: number): number {
  return 0.5 * (s.vx * s.vx + s.vy * s.vy) + gravity * s.y
}

function derivative(s: ProjectileState, p: ProjectileParams): ProjectileState {
  const v = Math.hypot(s.vx, s.vy)
  return { x: s.vx, y: s.vy, vx: -p.drag * v * s.vx, vy: -p.gravity - p.drag * v * s.vy }
}

/** Advance the state by dt seconds with one RK4 step. */
export function rk4Step(s: ProjectileState, p: ProjectileParams, dt: number): ProjectileState {
  const add = (a: ProjectileState, b: ProjectileState, h: number): ProjectileState => ({
    x: a.x + b.x * h,
    y: a.y + b.y * h,
    vx: a.vx + b.vx * h,
    vy: a.vy + b.vy * h,
  })
  const k1 = derivative(s, p)
  const k2 = derivative(add(s, k1, dt / 2), p)
  const k3 = derivative(add(s, k2, dt / 2), p)
  const k4 = derivative(add(s, k3, dt), p)
  return {
    x: s.x + (dt / 6) * (k1.x + 2 * k2.x + 2 * k3.x + k4.x),
    y: s.y + (dt / 6) * (k1.y + 2 * k2.y + 2 * k3.y + k4.y),
    vx: s.vx + (dt / 6) * (k1.vx + 2 * k2.vx + 2 * k3.vx + k4.vx),
    vy: s.vy + (dt / 6) * (k1.vy + 2 * k2.vy + 2 * k3.vy + k4.vy),
  }
}

/** Smallest τ in [0, maxDt] with y + v_y τ + ½ a_y τ² = 0 (falls back to linear when a_y ≈ 0). */
function landingTime(s: ProjectileState, ay: number, maxDt: number): number {
  let tau: number
  if (Math.abs(ay) < 1e-12) tau = -s.y / s.vy
  else {
    const disc = Math.max(0, s.vy * s.vy - 2 * ay * s.y)
    tau = (-s.vy - Math.sqrt(disc)) / ay
  }
  return Math.min(maxDt, Math.max(0, tau))
}

export interface ProjectileSample {
  t: number
  x: number
  y: number
  vx: number
  vy: number
}

export interface FlightResult {
  range: number
  maxHeight: number
  flightTime: number
  path: ProjectileSample[]
}

/**
 * Stateful simulation used by the UI: fixed-step RK4 integration from launch
 * until the projectile reaches the ground (y = 0), where the landing point is
 * found by linear interpolation inside the last step.
 */
export class ProjectileSimulation {
  params: ProjectileParams
  state: ProjectileState
  time = 0
  landed = false
  peak: number
  private accumulator = 0
  readonly fixedDt: number

  constructor(params: ProjectileParams, fixedDt = 1 / 480) {
    this.params = { ...params }
    this.state = initialState(params)
    this.peak = this.state.y
    this.fixedDt = fixedDt
  }

  reset(params: Partial<ProjectileParams> = {}) {
    this.params = { ...this.params, ...params }
    this.state = initialState(this.params)
    this.time = 0
    this.landed = false
    this.peak = this.state.y
    this.accumulator = 0
  }

  /** Advance simulated time by `elapsed` seconds; calls onStep after each fixed step. */
  advance(elapsed: number, onStep?: (t: number, s: ProjectileState) => void) {
    if (this.landed) return
    this.accumulator += elapsed
    while (this.accumulator >= this.fixedDt && !this.landed) {
      const prev = this.state
      let next = rk4Step(prev, this.params, this.fixedDt)
      let dt = this.fixedDt
      if (next.y <= 0 && (prev.y > 0 || next.vy < 0)) {
        // Landing inside this step: solve y + v_y τ + ½ a_y τ² = 0 for the
        // partial step τ (exact without drag), then take one RK4 step of τ.
        dt = prev.y > 0 ? landingTime(prev, derivative(prev, this.params).vy, this.fixedDt) : 0
        next = { ...rk4Step(prev, this.params, dt), y: 0 }
        this.landed = true
      }
      this.state = next
      this.time += dt
      this.peak = Math.max(this.peak, next.y)
      this.accumulator -= this.fixedDt
      onStep?.(this.time, this.state)
    }
    if (this.landed) this.accumulator = 0
  }
}

/** Integrate a whole flight (with or without drag) and sample the path every `sampleDt` seconds. */
export function simulateFlight(p: ProjectileParams, dt = 1 / 480, sampleDt = 1 / 30, maxTime = 600): FlightResult {
  const sim = new ProjectileSimulation(p, dt)
  const s0 = sim.state
  const path: ProjectileSample[] = [{ t: 0, ...s0 }]
  let next = sampleDt
  while (!sim.landed && sim.time < maxTime) {
    sim.advance(dt, (t, s) => {
      if (t >= next || sim.landed) {
        next += sampleDt
        path.push({ t, ...s })
      }
    })
  }
  return { range: sim.state.x, maxHeight: sim.peak, flightTime: sim.time, path }
}

/** Drag-free trajectory sampled at `points` evenly spaced times. */
export function analyticPath(p: ProjectileParams, points = 80): ProjectileSample[] {
  const T = flightTime(p)
  return Array.from({ length: points }, (_, i) => {
    const t = (T * i) / (points - 1)
    return { t, ...stateAt(p, t) }
  })
}

/** Range for each launch angle (0–90°), with the current speed, height, gravity and drag. */
export function rangeVsAngle(p: ProjectileParams, step = 2) {
  const out: { angle: number; range: number }[] = []
  for (let a = 0; a <= 90; a += step) {
    const q = { ...p, angleDeg: a }
    out.push({ angle: a, range: p.drag > 0 ? simulateFlight(q, 1 / 240, 1000).range : range(q) })
  }
  return out
}
