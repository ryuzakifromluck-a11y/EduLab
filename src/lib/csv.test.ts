import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'

describe('toCsv', () => {
  it('writes headers and rows and quotes special characters', () => {
    expect(toCsv(['a', 'b'], [[1, 'x,y'], [0.1 + 0.2, 'say "hi"']])).toBe('a,b\n1,"x,y"\n0.3,"say ""hi"""')
  })
})
