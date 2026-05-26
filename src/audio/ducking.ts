// Side-chain compressor in JS: watch RMS on a TTS AnalyserNode, then push
// musicGain.gain down whenever Claudio is speaking.
//
// Owns no MediaElementSource — PlayerContext already created those for the
// BGM <audio> and TTS <audio> elements, and Web Audio only allows one
// MediaElementSource per element. This helper takes the context and the
// existing TTS analyser, returns a GainNode the caller splices into the
// music chain.

export type DuckingHandle = {
  musicGain: GainNode
  stop: () => void
}

export type DuckingOptions = {
  duckTo?: number       // BGM volume while speaking. Default 0.18.
  threshold?: number    // TTS RMS that counts as "speaking". Default 0.02.
  attackMs?: number     // Time constant for ducking down. Default 40.
  releaseMs?: number    // Time constant for releasing back up. Default 450.
  holdMs?: number       // Stay ducked this long after last spike, to avoid
                        // pumping during inter-word silences. Default 220.
}

export function installDucking(
  ctx: AudioContext,
  ttsAnalyser: AnalyserNode,
  opts: DuckingOptions = {},
): DuckingHandle {
  const duckTo = opts.duckTo ?? 0.18
  const threshold = opts.threshold ?? 0.02
  const tauAttack = (opts.attackMs ?? 40) / 1000
  const tauRelease = (opts.releaseMs ?? 450) / 1000
  const holdMs = opts.holdMs ?? 220

  const musicGain = ctx.createGain()
  musicGain.gain.value = 1

  const buf = new Uint8Array(ttsAnalyser.fftSize)
  let raf = 0
  let lastSpoken = 0
  let stopped = false

  const tick = () => {
    if (stopped) return
    ttsAnalyser.getByteTimeDomainData(buf)
    let sum = 0
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i] - 128) / 128
      sum += v * v
    }
    const rms = Math.sqrt(sum / buf.length)
    const now = performance.now()
    if (rms > threshold) lastSpoken = now

    const speaking = now - lastSpoken < holdMs
    const target = speaking ? duckTo : 1
    const tau = speaking ? tauAttack : tauRelease
    musicGain.gain.setTargetAtTime(target, ctx.currentTime, tau)

    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)

  return {
    musicGain,
    stop: () => {
      stopped = true
      if (raf) cancelAnimationFrame(raf)
      musicGain.gain.cancelScheduledValues(ctx.currentTime)
      musicGain.gain.value = 1
    },
  }
}
