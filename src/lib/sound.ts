let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

const on = (key: string) => localStorage.getItem(key) === 'true'
const num = (key: string, fallback: number) => Number(localStorage.getItem(key) ?? fallback)

export function playTick() {
  if (!on('nivra-ui-sounds')) return
  try {
    const c = getCtx()
    const volume = num('nivra-ui-volume', 15) / 100
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'sine'
    osc.frequency.value = 720
    gain.gain.setValueAtTime(0, c.currentTime)
    gain.gain.linearRampToValueAtTime(volume * 0.5, c.currentTime + 0.006)
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.1)
    osc.connect(gain).connect(c.destination)
    osc.start()
    osc.stop(c.currentTime + 0.11)
  } catch {
    // Web Audio unavailable or blocked; silently skip.
  }
}

export function playPop() {
  if (!on('nivra-ui-sounds')) return
  try {
    const c = getCtx()
    const volume = num('nivra-ui-volume', 15) / 100
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(520, c.currentTime)
    osc.frequency.exponentialRampToValueAtTime(920, c.currentTime + 0.09)
    gain.gain.setValueAtTime(0, c.currentTime)
    gain.gain.linearRampToValueAtTime(volume * 0.55, c.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.16)
    osc.connect(gain).connect(c.destination)
    osc.start()
    osc.stop(c.currentTime + 0.17)
  } catch {
    // Web Audio unavailable or blocked; silently skip.
  }
}

export function playDrop() {
  if (!on('nivra-ui-sounds')) return
  try {
    const c = getCtx()
    const volume = num('nivra-ui-volume', 15) / 100
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(420, c.currentTime)
    osc.frequency.exponentialRampToValueAtTime(180, c.currentTime + 0.14)
    gain.gain.setValueAtTime(0, c.currentTime)
    gain.gain.linearRampToValueAtTime(volume * 0.4, c.currentTime + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.15)
    osc.connect(gain).connect(c.destination)
    osc.start()
    osc.stop(c.currentTime + 0.16)
  } catch {
    // Web Audio unavailable or blocked; silently skip.
  }
}

function whiteNoiseBuffer(c: AudioContext): AudioBuffer {
  const size = c.sampleRate * 2
  const buffer = c.createBuffer(1, size, c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1
  return buffer
}

export type AmbientPreset = 'lluvia' | 'olas' | 'estatico' | 'naturaleza' | 'espacio'

type AmbientNodes = {
  source: AudioBufferSourceNode
  gain: GainNode
  extraOscillators: OscillatorNode[]
}

let ambient: AmbientNodes | null = null

export function stopAmbient() {
  if (!ambient) return
  try {
    ambient.source.stop()
    for (const o of ambient.extraOscillators) o.stop()
  } catch {
    // already stopped
  }
  ambient = null
}

export function startAmbient(preset: AmbientPreset, volume: number) {
  stopAmbient()
  try {
    const c = getCtx()
    const source = c.createBufferSource()
    source.buffer = whiteNoiseBuffer(c)
    source.loop = true
    const gain = c.createGain()
    const extraOscillators: OscillatorNode[] = []

    if (preset === 'lluvia') {
      // Rain: a bright, hissy band of noise with a wandering high-pass edge,
      // like water breaking into countless tiny droplets.
      const highpass = c.createBiquadFilter()
      highpass.type = 'highpass'
      highpass.frequency.value = 1200
      const bandpass = c.createBiquadFilter()
      bandpass.type = 'bandpass'
      bandpass.frequency.value = 3200
      bandpass.Q.value = 0.5
      const wander = c.createOscillator()
      wander.frequency.value = 0.4
      const wanderGain = c.createGain()
      wanderGain.gain.value = 500
      wander.connect(wanderGain).connect(bandpass.frequency)
      wander.start()
      extraOscillators.push(wander)
      gain.gain.value = volume
      source.connect(highpass).connect(bandpass).connect(gain).connect(c.destination)
    } else if (preset === 'olas') {
      // Waves: low rumble whose volume and brightness swell and fade in a
      // slow cycle, like surf rolling onto a shore.
      const lowpass = c.createBiquadFilter()
      lowpass.type = 'lowpass'
      lowpass.frequency.value = 500
      const swell = c.createOscillator()
      swell.frequency.value = 0.11
      const swellGain = c.createGain()
      swellGain.gain.value = volume * 0.85
      swell.connect(swellGain).connect(gain.gain)
      swell.start()
      extraOscillators.push(swell)
      const brighten = c.createOscillator()
      brighten.frequency.value = 0.11
      const brightenGain = c.createGain()
      brightenGain.gain.value = 350
      brighten.connect(brightenGain).connect(lowpass.frequency)
      brighten.start()
      extraOscillators.push(brighten)
      gain.gain.value = volume * 0.5
      source.connect(lowpass).connect(gain).connect(c.destination)
    } else if (preset === 'estatico') {
      // TV static: raw broadband noise, no shaping.
      gain.gain.value = volume
      source.connect(gain).connect(c.destination)
    } else if (preset === 'naturaleza') {
      // Nature: soft mid-range noise like wind through leaves, with an
      // irregular slow drift so it never feels perfectly looped.
      const bandpass = c.createBiquadFilter()
      bandpass.type = 'bandpass'
      bandpass.frequency.value = 900
      bandpass.Q.value = 0.7
      const drift = c.createOscillator()
      drift.type = 'sine'
      drift.frequency.value = 0.07
      const driftGain = c.createGain()
      driftGain.gain.value = 300
      drift.connect(driftGain).connect(bandpass.frequency)
      drift.start()
      extraOscillators.push(drift)
      const breeze = c.createOscillator()
      breeze.frequency.value = 0.05
      const breezeGain = c.createGain()
      breezeGain.gain.value = volume * 0.35
      breeze.connect(breezeGain).connect(gain.gain)
      breeze.start()
      extraOscillators.push(breeze)
      gain.gain.value = volume * 0.7
      source.connect(bandpass).connect(gain).connect(c.destination)
    } else {
      // Space: a deep, slowly shifting drone, like the hum of a distant ship.
      const lowpass = c.createBiquadFilter()
      lowpass.type = 'lowpass'
      lowpass.frequency.value = 220
      gain.gain.value = volume * 0.3
      source.connect(lowpass).connect(gain).connect(c.destination)

      const drone1 = c.createOscillator()
      drone1.type = 'sine'
      drone1.frequency.value = 55
      const drone2 = c.createOscillator()
      drone2.type = 'sine'
      drone2.frequency.value = 55 * 1.5
      const droneGain = c.createGain()
      droneGain.gain.value = 1.6
      const wobble = c.createOscillator()
      wobble.frequency.value = 0.06
      const wobbleGain = c.createGain()
      wobbleGain.gain.value = 4
      wobble.connect(wobbleGain).connect(drone2.frequency)
      drone1.connect(droneGain)
      drone2.connect(droneGain)
      droneGain.connect(gain)
      drone1.start()
      drone2.start()
      wobble.start()
      extraOscillators.push(drone1, drone2, wobble)
    }

    source.start()
    ambient = { source, gain, extraOscillators }
  } catch {
    // Web Audio unavailable or blocked; silently skip.
  }
}

export function setAmbientVolume(volume: number) {
  if (ambient) ambient.gain.gain.value = volume
}
