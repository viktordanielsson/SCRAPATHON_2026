/**
 * Web Audio plumbing for the in-browser voice loop. Gemini Live wants raw,
 * little-endian 16-bit PCM @16 kHz in, and streams 16-bit PCM @24 kHz out — so we
 * run two AudioContexts at those native rates and let the browser resample.
 */

const WORKLET_NAME = 'sentinel-pcm16'

// Captures Float32 frames at the context rate (16 kHz), converts to Int16 PCM,
// and posts ~128 ms buffers to the main thread. Kept as a string so it loads as a
// module via a Blob URL — no separate asset file or Vite config needed.
const WORKLET_SOURCE = `
class PCM16Processor extends AudioWorkletProcessor {
  constructor() {
    super()
    this._buf = []
    this._len = 0
    this._target = 2048 // ~128 ms @ 16 kHz
  }
  process(inputs) {
    const input = inputs[0]
    if (input && input[0]) {
      const ch = input[0]
      const pcm = new Int16Array(ch.length)
      for (let i = 0; i < ch.length; i++) {
        const s = Math.max(-1, Math.min(1, ch[i]))
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff
      }
      this._buf.push(pcm)
      this._len += pcm.length
      if (this._len >= this._target) {
        const out = new Int16Array(this._len)
        let o = 0
        for (const b of this._buf) { out.set(b, o); o += b.length }
        this._buf = []
        this._len = 0
        this.port.postMessage(out, [out.buffer])
      }
    }
    return true
  }
}
registerProcessor('${WORKLET_NAME}', PCM16Processor)
`

let workletUrl: string | null = null
function getWorkletUrl(): string {
  if (!workletUrl) {
    workletUrl = URL.createObjectURL(new Blob([WORKLET_SOURCE], { type: 'application/javascript' }))
  }
  return workletUrl
}

/** Int16 PCM → base64 (the wire format Gemini Live expects for `audio.data`). */
export function int16ToBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength)
  let bin = ''
  const CHUNK = 0x8000 // stay under the String.fromCharCode arg limit
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(bin)
}

/** base64 → Int16 PCM (the model's 24 kHz audio output). */
export function base64ToInt16(b64: string): Int16Array {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Int16Array(bytes.buffer, 0, bytes.length >> 1) // 16-bit LE; drop odd tail byte
}

/** Mic → Int16 PCM @16 kHz, delivered to `onChunk` in ~128 ms buffers. */
export class MicCapture {
  private ctx: AudioContext | null = null
  private node: AudioWorkletNode | null = null
  private stream: MediaStream | null = null

  async start(onChunk: (pcm: Int16Array) => void): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
    })
    this.ctx = new AudioContext({ sampleRate: 16000 })
    await this.ctx.audioWorklet.addModule(getWorkletUrl())
    const src = this.ctx.createMediaStreamSource(this.stream)
    this.node = new AudioWorkletNode(this.ctx, WORKLET_NAME)
    this.node.port.onmessage = (e) => onChunk(e.data as Int16Array)
    src.connect(this.node)
    // Intentionally NOT connected to destination — we don't monitor the mic.
  }

  stop(): void {
    if (this.node) {
      this.node.port.onmessage = null
      this.node.disconnect()
      this.node = null
    }
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
    void this.ctx?.close()
    this.ctx = null
  }
}

/** Gapless playback of the model's Int16 PCM @24 kHz chunks. */
export class PcmPlayer {
  private readonly ctx = new AudioContext({ sampleRate: 24000 })
  private nextTime = 0
  private readonly active = new Set<AudioBufferSourceNode>()

  async resume(): Promise<void> {
    if (this.ctx.state === 'suspended') await this.ctx.resume()
  }

  enqueue(pcm: Int16Array): void {
    if (pcm.length === 0) return
    const f32 = new Float32Array(pcm.length)
    for (let i = 0; i < pcm.length; i++) f32[i] = pcm[i] / 0x8000
    const buf = this.ctx.createBuffer(1, f32.length, 24000)
    buf.copyToChannel(f32, 0)
    const src = this.ctx.createBufferSource()
    src.buffer = buf
    src.connect(this.ctx.destination)
    const start = Math.max(this.ctx.currentTime, this.nextTime)
    src.start(start)
    this.nextTime = start + buf.duration
    this.active.add(src)
    src.onended = () => this.active.delete(src)
  }

  /** Barge-in: the model was interrupted — drop everything still scheduled. */
  interrupt(): void {
    for (const s of this.active) {
      try {
        s.stop()
      } catch {
        /* already stopped */
      }
    }
    this.active.clear()
    this.nextTime = 0
  }

  close(): void {
    this.interrupt()
    void this.ctx.close()
  }
}
