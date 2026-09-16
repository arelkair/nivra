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

function noiseBuffer(c: AudioContext): AudioBuffer {
  const size = c.sampleRate * 2
  const buffer = c.createBuffer(1, size, c.sampleRate)
  const data = buffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < size; i++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    data[i] = last * 3.5
  }
  return buffer
}

type AmbientNodes = {
  source: AudioBufferSourceNode
  gain: GainNode
  lfo?: OscillatorNode
}

let ambient: AmbientNodes | null = null

export function stopAmbient() {
  if (!ambient) return
  try {
    ambient.source.stop()
    ambient.lfo?.stop()
  } catch {
    // already stopped
  }
  ambient = null
}

export function startAmbient(preset: 'lluvia' | 'olas', volume: number) {
  stopAmbient()
  try {
    const c = getCtx()
    const source = c.createBufferSource()
    source.buffer = noiseBuffer(c)
    source.loop = true
    const filter = c.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = preset === 'lluvia' ? 1800 : 900
    const gain = c.createGain()
    gain.gain.value = volume
    source.connect(filter).connect(gain).connect(c.destination)
    let lfo: OscillatorNode | undefined
    if (preset === 'olas') {
      lfo = c.createOscillator()
      lfo.frequency.value = 0.12
      const lfoGain = c.createGain()
      lfoGain.gain.value = volume * 0.6
      lfo.connect(lfoGain).connect(gain.gain)
      lfo.start()
    }
    source.start()
    ambient = { source, gain, lfo }
  } catch {
    // Web Audio unavailable or blocked; silently skip.
  }
}

export function setAmbientVolume(volume: number) {
  if (ambient) ambient.gain.gain.value = volume
}
