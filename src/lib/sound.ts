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
  } catch {}
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
  } catch {}
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
  } catch {}
}

function whiteNoiseBuffer(c: AudioContext): AudioBuffer {
  const size = c.sampleRate * 2
  const buffer = c.createBuffer(1, size, c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1
  return buffer
}

type AmbientNodes = {
  source: AudioBufferSourceNode
  gain: GainNode
}

let ambient: AmbientNodes | null = null

export function stopAmbient() {
  if (!ambient) return
  try {
    ambient.source.stop()
  } catch {}
  ambient = null
}

export function startAmbient(volume: number) {
  stopAmbient()
  try {
    const c = getCtx()
    const source = c.createBufferSource()
    source.buffer = whiteNoiseBuffer(c)
    source.loop = true
    const gain = c.createGain()
    gain.gain.value = volume
    source.connect(gain).connect(c.destination)
    source.start()
    ambient = { source, gain }
  } catch {}
}

export function setAmbientVolume(volume: number) {
  if (ambient) ambient.gain.gain.value = volume
}
