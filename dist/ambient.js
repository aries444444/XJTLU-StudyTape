// All sound is synthesized locally from noise and oscillators; no recordings or samples.
export class AmbientEngine {
  constructor(Context = globalThis.AudioContext || globalThis.webkitAudioContext) {
    this.Context = Context;
    this.context = null;
    this.voice = null;
    this.request = 0;
    this.volume = 0.25;
  }
  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.voice) this.voice.output.gain.setTargetAtTime(this.volume * 0.5, this.context.currentTime, 0.12);
  }
  stop() {
    this.request++;
    const voice = this.voice;
    this.voice = null;
    if (!voice) return;
    const now = this.context.currentTime;
    voice.output.gain.cancelScheduledValues(now);
    voice.output.gain.setTargetAtTime(0, now, 0.12);
    for (const source of voice.sources) source.stop(now + 0.8);
    setTimeout(() => voice.nodes.forEach(node => node.disconnect()), 1000);
  }
  async play(kind) {
    this.stop();
    const request = this.request;
    if (!this.Context) throw new Error('Audio unavailable');
    this.context ||= new this.Context();
    const ctx = this.context;
    await ctx.resume();
    if (request !== this.request) return false;
    if (ctx.state !== 'running') throw new Error('Audio blocked');
    const voice = { nodes: [], sources: [], output: ctx.createGain() };
    this.voice = voice;
    const node = n => { voice.nodes.push(n); return n; };
    const source = n => { node(n); voice.sources.push(n); return n; };
    node(voice.output).connect(ctx.destination);
    voice.output.gain.setValueAtTime(0, ctx.currentTime);
    voice.output.gain.setTargetAtTime(this.volume * 0.5, ctx.currentTime, 0.65);
    const modulate = (param, rate, depth) => {
      const lfo = source(ctx.createOscillator());
      const gain = node(ctx.createGain());
      lfo.frequency.value = rate;
      gain.gain.value = depth;
      lfo.connect(gain).connect(param);
      lfo.start();
    };
    if (kind === 'pad') {
      // A static open harmony, with slow independent swells and no melody or beat.
      [130.8128, 196, 261.6256, 293.6648].forEach((frequency, i) => {
        const tone = source(ctx.createOscillator());
        const gain = node(ctx.createGain());
        tone.type = 'sine';
        tone.frequency.value = frequency;
        tone.detune.value = i % 2 ? 3 : -3;
        gain.gain.value = 0.075;
        tone.connect(gain).connect(voice.output);
        modulate(gain.gain, 0.025 + i * 0.009, 0.025);
        tone.start();
      });
    } else {
      const buffer = ctx.createBuffer(2, ctx.sampleRate * 12, ctx.sampleRate);
      for (let channel = 0; channel < 2; channel++) {
        const data = buffer.getChannelData(channel);
        let smooth = 0;
        for (let i = 0; i < data.length; i++) {
          const white = Math.random() * 2 - 1;
          smooth = (smooth + 0.035 * white) / 1.035;
          data[i] = kind === 'rain' ? white * 0.7 + smooth : smooth * 3.5;
        }
        // Blend the loop boundary to prevent periodic clicks.
        const fade = Math.min(2048, data.length / 2);
        for (let i = 0; i < fade; i++) {
          const t = i / fade;
          data[data.length - fade + i] = data[data.length - fade + i] * (1 - t) + data[i] * t;
        }
      }
      const noise = source(ctx.createBufferSource());
      noise.buffer = buffer;
      noise.loop = true;
      noise.loopStart = 2048 / ctx.sampleRate;
      const highpass = node(ctx.createBiquadFilter());
      highpass.type = 'highpass';
      highpass.frequency.value = kind === 'rain' ? 220 : 180;
      const lowpass = node(ctx.createBiquadFilter());
      lowpass.type = 'lowpass';
      lowpass.frequency.value = kind === 'rain' ? 2200 : 1300;
      lowpass.Q.value = 0.4;
      const swell = node(ctx.createGain());
      swell.gain.value = kind === 'rain' ? 0.7 : 1.2;
      modulate(swell.gain, kind === 'rain' ? 0.08 : 0.19, 0.12);
      modulate(lowpass.frequency, 0.11, kind === 'rain' ? 180 : 450);
      noise.connect(highpass).connect(lowpass).connect(swell).connect(voice.output);
      noise.start();
    }
    return true;
  }
}

export function initAmbient() {
  const $ = selector => document.querySelector(selector);
  const engine = new AmbientEngine();
  const key = 'study-tape-audio-v1';
  let prefs = { track: 'rain', volume: 25, follow: false };
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved && ['rain', 'brook', 'pad'].includes(saved.track)) prefs.track = saved.track;
    if (Number.isFinite(saved?.volume)) prefs.volume = Math.max(0, Math.min(100, saved.volume));
    prefs.follow = saved?.follow === true;
  } catch { /* Optional preferences must not block the timer. */ }
  let enabled = false, running = false, version = 0;
  const names = { rain: '窗边细雨', brook: '林间溪流', pad: '柔和氛围' };
  const save = () => {
    try { localStorage.setItem(key, JSON.stringify(prefs)); } catch { /* Keep working without storage. */ }
  };
  const render = (status) => {
    $('#sound-toggle').textContent = enabled ? '关闭声音' : '开启声音';
    $('#sound-toggle').setAttribute('aria-pressed', String(enabled));
    $('#sound-status').textContent = status;
    $('#sound-panel').classList.toggle('sound-active', enabled && (!prefs.follow || running));
  };
  async function update() {
    const current = ++version;
    if (!enabled || (prefs.follow && !running)) {
      engine.stop();
      render(enabled ? '等待开始专注' : '声音已关闭');
      return;
    }
    render('正在开启…');
    try {
      const playing = await engine.play(prefs.track);
      if (current !== version || !playing) return;
      render(`正在播放 · ${names[prefs.track]}`);
    } catch {
      if (current !== version) return;
      engine.stop();
      enabled = false;
      render('暂时无法播放，请再点击开启声音');
    }
  }
  $('#sound-track').value = prefs.track;
  $('#sound-volume').value = prefs.volume;
  $('#sound-volume-value').textContent = `${prefs.volume}%`;
  $('#sound-follow').checked = prefs.follow;
  engine.setVolume(prefs.volume / 100);
  $('#sound-toggle').addEventListener('click', () => { enabled = !enabled; update(); });
  $('#sound-track').addEventListener('change', e => { prefs.track = e.target.value; save(); update(); });
  $('#sound-volume').addEventListener('input', e => {
    prefs.volume = Number(e.target.value);
    engine.setVolume(prefs.volume / 100);
    $('#sound-volume-value').textContent = `${prefs.volume}%`;
    save();
  });
  $('#sound-follow').addEventListener('change', e => { prefs.follow = e.target.checked; save(); update(); });
  window.addEventListener('pagehide', () => { enabled = false; version++; engine.stop(); render('声音已关闭'); });
  render('声音已关闭');
  return {
    setRunning(value) {
      if (value === running) return;
      running = value;
      if (prefs.follow) update();
    },
  };
}
