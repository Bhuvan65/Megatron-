const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

export const deriveStatus = ({ reactorTemp, coreLoad, integrity }) => {
  if (reactorTemp > 3480 || integrity < 60 || coreLoad > 95) return 'CRITICAL'
  if (reactorTemp > 3300 || integrity < 80 || coreLoad > 82) return 'CAUTION'
  return 'NOMINAL'
}

export function createTelemetrySim() {
  let phase = Math.random() * 100
  let temp = 3100, load = 55, integrity = 97
  let vTemp = 0, vLoad = 0
  return function next() {
    phase += 0.5
    // damped random walk + slow sine drift gives smooth, bounded noise
    vTemp = vTemp * 0.85 + (Math.random() - 0.5) * 24
    vLoad = vLoad * 0.8 + (Math.random() - 0.5) * 5
    temp = clamp(temp + vTemp + (3200 + Math.sin(phase * 0.05) * 260 - temp) * 0.04, 2800, 3600)
    load = clamp(load + vLoad + (55 + Math.sin(phase * 0.07 + 1) * 30 - load) * 0.05, 0, 100)
    integrity = clamp(integrity + (Math.random() - 0.52) * 0.6 + (temp > 3450 ? -0.4 : 0.08), 40, 100)
    const sample = {
      reactorTemp: Math.round(temp),
      coreLoad: Math.round(load * 10) / 10,
      outputGw: Math.round((1.21 + (load / 100) * 3.4 * (temp / 3200)) * 100) / 100,
      integrity: Math.round(integrity * 10) / 10,
      ts: Date.now()
    }
    sample.status = deriveStatus(sample)
    return sample
  }
}
