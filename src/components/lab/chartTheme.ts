import { useUi } from '../../store/ui'

/** Concrete colours for Recharts (SVG attributes cannot rely on CSS variables everywhere). */
export function useChartTheme() {
  const dark = useUi((s) => s.theme) === 'dark'
  return dark
    ? {
        grid: '#253048',
        axis: '#8a93a8',
        text: '#a1abc2',
        tooltipBg: '#161d2e',
        tooltipBorder: '#2d3953',
        physics: '#7b93ff',
        chemistry: '#2ccfb5',
        biology: '#9bd44f',
        accent2: '#f0a85c',
        accent3: '#d38cf0',
        marker: '#e8ecf5',
        band: 'rgba(123,147,255,0.12)',
      }
    : {
        grid: '#e5e8f0',
        axis: '#8a93a8',
        text: '#566078',
        tooltipBg: '#ffffff',
        tooltipBorder: '#dfe3ec',
        physics: '#3b5bdb',
        chemistry: '#0e9f8a',
        biology: '#5b8f12',
        accent2: '#d9731a',
        accent3: '#9b4fc4',
        marker: '#0e1525',
        band: 'rgba(59,91,219,0.08)',
      }
}

export type ChartTheme = ReturnType<typeof useChartTheme>

export const axisProps = (c: ChartTheme) => ({
  stroke: c.axis,
  tick: { fill: c.text, fontSize: 11 },
  tickLine: false,
})

export const tooltipProps = (c: ChartTheme) => ({
  contentStyle: {
    background: c.tooltipBg,
    border: `1px solid ${c.tooltipBorder}`,
    borderRadius: 10,
    fontSize: 12,
    color: c.text,
  },
  labelStyle: { color: c.text, fontWeight: 600 },
  isAnimationActive: false,
})
