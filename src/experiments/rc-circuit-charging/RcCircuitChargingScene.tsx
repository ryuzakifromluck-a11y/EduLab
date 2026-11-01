import { RcBoard, type RcLive } from './RcBoard'

/** Battery, knife switch, resistor, capacitor, ammeter and voltmeter on a board. */
export function RcCircuitChargingScene({
  live,
  labels,
}: {
  live: () => RcLive
  labels: { volts: string; voltmeter: string; vReading: string; ammeter: string; aReading: string; switchState: string }
}) {
  return <RcBoard variant="charging" live={live} labels={labels} />
}
