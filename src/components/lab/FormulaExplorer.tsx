import { Sigma } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Panel, Segmented } from './controls'

export interface FormulaVariable {
  symbol: ReactNode
  name: string
  unit: string
  value: string
  effect?: string
}

export interface Formula {
  id: string
  title: string
  /** The general formula, e.g. T = 2π√(L/g). */
  expression: ReactNode
  /** The same formula with the current values substituted. */
  substituted: ReactNode
  variables: FormulaVariable[]
  explanation: ReactNode
}

/** Math-styled inline helpers. */
export const V = ({ children }: { children: ReactNode }) => <i className="font-serif">{children}</i>
export const Sub = ({ children }: { children: ReactNode }) => <sub className="text-[0.7em]">{children}</sub>
export const Sup = ({ children }: { children: ReactNode }) => <sup className="text-[0.7em]">{children}</sup>
export const Frac = ({ n, d }: { n: ReactNode; d: ReactNode }) => (
  <span className="mx-0.5 inline-flex flex-col items-center align-middle text-[0.85em] leading-tight">
    <span className="border-b border-current px-1">{n}</span>
    <span className="px-1">{d}</span>
  </span>
)
export const Sqrt = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex items-stretch">
    <span className="text-[1.2em] leading-none">√</span>
    <span className="border-t border-current pt-0.5">{children}</span>
  </span>
)

export function FormulaExplorer({ formulas, large }: { formulas: Formula[]; large?: boolean }) {
  const { t } = useTranslation()
  const [active, setActive] = useState(formulas[0].id)
  const f = formulas.find((x) => x.id === active) ?? formulas[0]
  return (
    <Panel
      title={t('lab.formulaExplorer')}
      icon={<Sigma className="h-4 w-4" />}
      actions={
        formulas.length > 1 && (
          <Segmented label={t('lab.formulaExplorer')} value={active} onChange={setActive} options={formulas.map((x) => ({ value: x.id, label: x.title }))} />
        )
      }
    >
      <div className="flex flex-col gap-5">
        <div className="rounded-xl bg-surface-2 px-5 py-4">
          <div className={large ? 'text-3xl' : 'text-2xl'} aria-label={t('lab.formula')}>
            <span className="text-ink">{f.expression}</span>
          </div>
          <div className="mt-3 text-sm text-muted">
            <span className="mr-2 text-xs font-semibold tracking-wide uppercase">{t('lab.withCurrentValues')}</span>
            <span className="tabular text-base text-ink">{f.substituted}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-faint">
                <th className="pb-2 font-medium">{t('lab.symbol')}</th>
                <th className="pb-2 font-medium">{t('lab.meaning')}</th>
                <th className="pb-2 font-medium">{t('lab.unit')}</th>
                <th className="pb-2 text-right font-medium">{t('lab.current')}</th>
              </tr>
            </thead>
            <tbody>
              {f.variables.map((v, i) => (
                <tr key={i} className="border-t border-line align-top">
                  <td className="py-2 pr-3 text-base text-ink">{v.symbol}</td>
                  <td className="py-2 pr-3 text-ink">
                    {v.name}
                    {v.effect && <div className="text-xs text-muted">{v.effect}</div>}
                  </td>
                  <td className="py-2 pr-3 text-muted">{v.unit}</td>
                  <td className="tabular py-2 text-right font-medium text-ink">{v.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-sm leading-relaxed text-muted">{f.explanation}</div>
      </div>
    </Panel>
  )
}
