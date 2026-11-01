import { RcBoard, type RcLive } from '../rc-circuit-charging/RcBoard'

/** Charged capacitor, two-way switch, discharge resistor, ammeter and voltmeter. */
export function RcCircuitDischargingScene({
  live,
  labels,
}: {
  live: () => RcLive
  labels: { volts: string; voltmeter: string; vReading: string; ammeter: string; aReading: string; switchState: string }
}) {
  return <RcBoard variant="discharging" live={live} labels={labels} />
}
