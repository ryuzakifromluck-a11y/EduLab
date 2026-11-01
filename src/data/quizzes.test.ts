import { describe, expect, it } from 'vitest'
import { EXPERIMENTS } from './experiments'
import { getQuiz, hasQuiz, QUIZ_LANGUAGES, QUIZZES } from './quizzes'

describe('quiz content', () => {
  const ids = Object.keys(QUIZZES)

  it('covers every available experiment and only known experiments', () => {
    for (const e of EXPERIMENTS.filter((x) => x.status === 'available')) expect(hasQuiz(e.id), e.id).toBe(true)
    for (const id of ids) expect(EXPERIMENTS.some((e) => e.id === id), id).toBe(true)
  })

  it.each(ids)('%s: every question is complete in every language', (id) => {
    const qs = QUIZZES[id]
    expect(new Set(qs.map((q) => q.id)).size).toBe(qs.length)
    for (const q of qs) {
      const counts = QUIZ_LANGUAGES.map((l) => q.options[l].length)
      expect(new Set(counts).size, `${id}/${q.id} option counts`).toBe(1)
      expect(counts[0]).toBeGreaterThanOrEqual(2)
      expect(q.correctIndex).toBeGreaterThanOrEqual(0)
      expect(q.correctIndex).toBeLessThan(counts[0])
      for (const l of QUIZ_LANGUAGES) {
        expect(q.question[l].trim(), `${id}/${q.id} question ${l}`).not.toBe('')
        expect(q.explanation[l].trim(), `${id}/${q.id} explanation ${l}`).not.toBe('')
        expect(q.options[l].every((o) => o.trim() !== ''), `${id}/${q.id} options ${l}`).toBe(true)
        expect(new Set(q.options[l]).size, `${id}/${q.id} duplicate options ${l}`).toBe(q.options[l].length)
      }
    }
  })

  it('resolves a language and falls back to English', () => {
    const ru = getQuiz('pendulum', 'ru')!
    expect(ru[0].question).toBe(QUIZZES.pendulum[0].question.ru)
    expect(getQuiz('pendulum', 'en-GB')![0].question).toBe(QUIZZES.pendulum[0].question.en)
    expect(getQuiz('pendulum', 'fr')![0].question).toBe(QUIZZES.pendulum[0].question.en)
    expect(getQuiz('not-an-experiment', 'en')).toBeNull()
  })
})
