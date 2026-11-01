import { describe, expect, it } from 'vitest'
import { codeFromScan, formatCode, isValidCode, joinUrl, normalizeCode } from './remoteCode'
import { toRemoteReadings } from './remoteReport'

describe('codeFromScan', () => {
  it('reads a join link from the QR code', () => {
    expect(codeFromScan('https://edulab.example/student/remote/ABC-234')).toBe('ABC234')
    expect(codeFromScan('http://192.168.0.5:5173/student/remote/abc234/?x=1')).toBe('ABC234')
  })
  it('reads the link the teacher’s QR code encodes', () => {
    expect(codeFromScan(joinUrl('QWE789', 'https://edulab.example/'))).toBe('QWE789')
  })
  it('reads a bare code', () => {
    expect(codeFromScan(' abc 234 ')).toBe('ABC234')
  })
  it('rejects anything else', () => {
    expect(codeFromScan('https://example.com/hello')).toBeNull()
    expect(codeFromScan('ABC-1O0')).toBeNull()
    expect(codeFromScan('')).toBeNull()
  })
})

describe('code helpers', () => {
  it('round-trip between display and canonical form', () => {
    const code = 'XYZ789'
    expect(normalizeCode(formatCode(code))).toBe(code)
    expect(isValidCode(code)).toBe(true)
  })
})

describe('toRemoteReadings', () => {
  it('keeps text labels only and caps the list', () => {
    const items = [
      { label: 'Period', value: '2.006', unit: 's' },
      { label: { jsx: true }, value: '1' },
      ...Array.from({ length: 10 }, (_, i) => ({ label: `m${i}`, value: String(i) })),
    ]
    const out = toRemoteReadings(items, 4)
    expect(out).toHaveLength(4)
    expect(out[0]).toEqual({ label: 'Period', value: '2.006', unit: 's' })
    expect(out[1]).toEqual({ label: 'm0', value: '0' })
  })
})
