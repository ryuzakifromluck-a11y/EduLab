/** Standard atomic weights (IUPAC, abridged) for the elements used in EduLab's chemistry labs. */
export const ATOMIC_MASS: Record<string, number> = {
  H: 1.008,
  Li: 6.94,
  C: 12.011,
  N: 14.007,
  O: 15.999,
  Na: 22.99,
  Mg: 24.305,
  Al: 26.982,
  P: 30.974,
  S: 32.06,
  Cl: 35.45,
  K: 39.098,
  Ca: 40.078,
  Mn: 54.938,
  Fe: 55.845,
  Cu: 63.546,
  Zn: 65.38,
  Sr: 87.62,
  I: 126.904,
  Ba: 137.327,
}

/**
 * Counts atoms in a formula such as "CuSO4·5H2O", "Ca(OH)2" or "(C6H10O5)n" (a trailing n is
 * ignored, giving one repeat unit). Throws on unknown elements or unbalanced brackets.
 */
export function parseFormula(formula: string): Record<string, number> {
  const total: Record<string, number> = {}
  for (const part of formula.replace(/\)n$/, ')').split(/[·.*]/)) {
    const m = /^(\d*)(.*)$/.exec(part)!
    const mult = m[1] ? Number(m[1]) : 1
    const counts = parseGroup(m[2])
    for (const [el, n] of Object.entries(counts)) total[el] = (total[el] ?? 0) + n * mult
  }
  return total
}

function parseGroup(s: string): Record<string, number> {
  const stack: Record<string, number>[] = [{}]
  let i = 0
  const num = () => {
    const m = /^\d+/.exec(s.slice(i))
    if (!m) return 1
    i += m[0].length
    return Number(m[0])
  }
  while (i < s.length) {
    const ch = s[i]
    if (ch === '(') {
      stack.push({})
      i++
    } else if (ch === ')') {
      i++
      const n = num()
      const inner = stack.pop()
      if (!inner || stack.length === 0) throw new Error(`Unbalanced ")" in ${s}`)
      const top = stack[stack.length - 1]
      for (const [el, c] of Object.entries(inner)) top[el] = (top[el] ?? 0) + c * n
    } else {
      const m = /^[A-Z][a-z]?/.exec(s.slice(i))
      if (!m) throw new Error(`Unexpected "${ch}" in ${s}`)
      if (!(m[0] in ATOMIC_MASS)) throw new Error(`Unknown element ${m[0]} in ${s}`)
      i += m[0].length
      const n = num()
      const top = stack[stack.length - 1]
      top[m[0]] = (top[m[0]] ?? 0) + n
    }
  }
  if (stack.length !== 1) throw new Error(`Unbalanced "(" in ${s}`)
  return stack[0]
}

/** Molar mass in g/mol. */
export function molarMass(formula: string): number {
  return Object.entries(parseFormula(formula)).reduce((sum, [el, n]) => sum + ATOMIC_MASS[el] * n, 0)
}

const SUB = '₀₁₂₃₄₅₆₇₈₉'

/** "CuSO4·5H2O" → "CuSO₄·5H₂O": digits after a letter or bracket become subscripts. */
export function prettyFormula(formula: string): string {
  return formula.replace(/([A-Za-z)])(\d+)/g, (_, a: string, d: string) => a + [...d].map((c) => SUB[Number(c)]).join(''))
}
