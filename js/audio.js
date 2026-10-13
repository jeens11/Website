/**
 * Synthesized audio — no sound files. Engine hum, drift squeal, boost whoosh,
 * and UI blips (no background music), all built with the Web Audio API.
 * Browsers only allow audio after a user gesture, so everything starts on the
 * first key press or click.
 */
const STORAGE_KEY = 'portfolio-sound';

export function createAudio() {
  let ctx = null;
  let master;
  let sfxBus;
  let engine = null;
  let drift = null;
  let enabled = true;
  let drivingActive = true;
  let lastHover = 0;
  const listeners = new Set();

  try {
    enabled = localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    /* storage unavailable */
  }

  function noiseBuffer() {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }

    return buffer;
  }

  function buildGraph() {
    master = ctx.createGain();
    master.gain.value = enabled ? 0.9 : 0;

    const compressor = ctx.createDynamicsCompressor();
    master.connect(compressor).connect(ctx.destination);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.7;
    sfxBus.connect(master);

    // Engine: two detuned oscillators through a low-pass filter.
    const engineGain = ctx.createGain();
    engineGain.gain.value = 0;

    const engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 400;

    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();

    oscA.type = 'sawtooth';
    oscB.type = 'square';
    oscA.connect(engineFilter);
    oscB.connect(engineFilter);
    engineFilter.connect(engineGain).connect(sfxBus);

    oscA.start();
    oscB.start();

    engine = {
      oscA,
      oscB,
      gain: engineGain,
      filter: engineFilter,
    };

    // Drift squeal: band-passed noise.
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer();
    noise.loop = true;

    const driftFilter = ctx.createBiquadFilter();
    driftFilter.type = 'bandpass';
    driftFilter.frequency.value = 1700;
    driftFilter.Q.value = 6;

    const driftGain = ctx.createGain();
    driftGain.gain.value = 0;

    noise.connect(driftFilter).connect(driftGain).connect(sfxBus);
    noise.start();

    drift = {
      gain: driftGain,
      filter: driftFilter,
    };
  }

  function unlock() {
    if (!ctx) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;

      ctx = new Context();
      buildGraph();
    }

    if (ctx.state === 'suspended') {
      ctx.resume();
    }
  }

  function tone({
    freq,
    to = freq,
    duration = 0.15,
    type = 'sine',
    volume = 0.2,
    delay = 0,
    bus = sfxBus,
    attack = 0.005,
  }) {
    if (!ctx) return;

    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);

    if (to !== freq) {
      osc.frequency.exponentialRampToValueAtTime(to, start + duration);
    }

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(gain).connect(bus);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  function whoosh({ from, to, duration, volume }) {
    if (!ctx) return;

    const start = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer();

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.2;
    filter.frequency.setValueAtTime(from, start);
    filter.frequency.exponentialRampToValueAtTime(to, start + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(
      volume,
      start + duration * 0.3,
    );
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      start + duration,
    );

    source.connect(filter).connect(gain).connect(sfxBus);
    source.start(start);
    source.stop(start + duration + 0.05);
  }

  const sounds = {
    hover() {
      const now = performance.now();
      if (now - lastHover < 70) return;

      lastHover = now;
      tone({
        freq: 880,
        to: 1320,
        duration: 0.06,
        type: 'triangle',
        volume: 0.05,
      });
    },

    click() {
      tone({
        freq: 520,
        to: 780,
        duration: 0.09,
        type: 'square',
        volume: 0.06,
      });
    },

    open() {
      [392, 523, 659, 784].forEach((freq, index) => {
        tone({
          freq,
          duration: 0.32,
          type: 'triangle',
          volume: 0.12,
          delay: index * 0.06,
        });
      });

      whoosh({
        from: 300,
        to: 3200,
        duration: 0.45,
        volume: 0.07,
      });
    },

    switch() {
      tone({
        freq: 660,
        to: 990,
        duration: 0.14,
        type: 'triangle',
        volume: 0.1,
      });
    },

    close() {
      [784, 587, 440].forEach((freq, index) => {
        tone({
          freq,
          duration: 0.22,
          type: 'triangle',
          volume: 0.09,
          delay: index * 0.05,
        });
      });
    },

    near() {
      tone({
        freq: 784,
        duration: 0.18,
        type: 'sine',
        volume: 0.12,
      });
      tone({
        freq: 1175,
        duration: 0.3,
        type: 'sine',
        volume: 0.1,
        delay: 0.1,
      });
    },

    boost() {
      whoosh({
        from: 400,
        to: 5200,
        duration: 0.7,
        volume: 0.22,
      });
      tone({
        freq: 140,
        to: 620,
        duration: 0.5,
        type: 'sawtooth',
        volume: 0.1,
      });
    },

    reset() {
      tone({
        freq: 700,
        to: 140,
        duration: 0.35,
        type: 'sawtooth',
        volume: 0.09,
      });
    },

    toggleOn() {
      tone({
        freq: 523,
        duration: 0.12,
        type: 'triangle',
        volume: 0.12,
      });
      tone({
        freq: 784,
        duration: 0.2,
        type: 'triangle',
        volume: 0.12,
        delay: 0.09,
      });
    },
  };

  function play(name) {
    if (!enabled || !ctx) return;
    sounds[name]?.();
  }

  function update({
    speed = 0,
    slip = 0,
    boosting = false,
    drifting = false,
  }) {
    if (!ctx || !engine) return;

    const t = ctx.currentTime;
    const speedAbs = Math.abs(speed);
    const norm = Math.min(1, speedAbs / 20);
    const base = 48 + speedAbs * 6.5 + (boosting ? 38 : 0);

    engine.oscA.frequency.setTargetAtTime(base, t, 0.08);
    engine.oscB.frequency.setTargetAtTime(base * 1.505, t, 0.08);
    engine.filter.frequency.setTargetAtTime(
      260 + norm * 1300 + (boosting ? 700 : 0),
      t,
      0.1,
    );
    engine.gain.gain.setTargetAtTime(
      drivingActive ? 0.012 + norm * 0.085 : 0,
      t,
      0.1,
    );

    const squeal =
      drivingActive && drifting && speedAbs > 4
        ? Math.min(1, Math.abs(slip) / 3) * 0.1
        : 0;

    drift.gain.gain.setTargetAtTime(squeal, t, 0.08);
    drift.filter.frequency.setTargetAtTime(1300 + speedAbs * 45, t, 0.1);
  }

  function setEnabled(value) {
    enabled = value;

    try {
      localStorage.setItem(STORAGE_KEY, value ? 'on' : 'off');
    } catch {
      /* ignore */
    }

    if (ctx) {
      master.gain.setTargetAtTime(
        value ? 0.9 : 0,
        ctx.currentTime,
        0.05,
      );

      if (value) sounds.toggleOn();
    }

    listeners.forEach((listener) => listener(value));
  }

  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;

    if (document.hidden) {
      ctx.suspend();
    } else if (enabled) {
      ctx.resume();
    }
  });

  return {
    unlock,
    play,
    update,
    isEnabled: () => enabled,

    setDrivingActive(value) {
      drivingActive = value;

      if (!value && ctx && engine && drift) {
        const t = ctx.currentTime;
        engine.gain.gain.setTargetAtTime(0, t, 0.05);
        drift.gain.gain.setTargetAtTime(0, t, 0.05);
      }
    },

    setEnabled,
    toggle() {
      unlock();
      setEnabled(!enabled);
    },
    onChange(listener) {
      listeners.add(listener);
    },
    dispose() {
      ctx?.close();
    },
  };
}