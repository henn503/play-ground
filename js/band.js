// 밴드 무대 합주: 드럼·베이스·기타·건반이 같은 박자로 함께 연주돼요
//   - 파일 없이 Web Audio로 직접 만든 소리
//   - 모두가 서버 시계를 기준으로 같은 마디를 연주해서, 여러 명이 서면 자동으로 합주가 돼요
//   - 곡: 100 BPM, C → Am → F → G 네 마디를 계속 반복하는 직접 만든 루프
import { audio } from './sound.js';

const BPM = 100, STEP = 60 / BPM / 4;   // 16분음표 하나 = 0.15초
const CHORDS = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];   // C, Am, F, G
const ROOTS = [36, 33, 29, 31];
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

export function createBand(){
  let bus = null, nextStep = null, noiseBuf = null;

  function env(g, t, peak, a, d){ g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function noise(ctx){
    if (!noiseBuf) { const n = ctx.sampleRate * 0.5; noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; }
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; return s;
  }
  function tone(ctx, type, freq, t, peak, a, d, filt){
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = freq;
    let node = o;
    if (filt) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filt; o.connect(f); node = f; }
    node.connect(g).connect(bus); env(g, t, peak, a, d); o.start(t); o.stop(t + a + d + 0.05);
    return o;
  }

  // 각 악기의 한 박(16분음표) 연주
  const PLAY = {
    drums(ctx, s, bar, t){
      if (s === 0 || s === 8 || s === 10) {               // 쿵
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine';
        o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.18);
        o.connect(g).connect(bus); env(g, t, 0.9, 0.004, 0.28); o.start(t); o.stop(t + 0.35);
      }
      if (s === 4 || s === 12) {                          // 짝
        const n = noise(ctx), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'highpass'; f.frequency.value = 1300;
        n.connect(f).connect(g).connect(bus); env(g, t, 0.45, 0.002, 0.16); n.start(t); n.stop(t + 0.2);
        tone(ctx, 'triangle', 190, t, 0.25, 0.002, 0.08);
      }
      if (s % 2 === 0 || (bar === 3 && s > 11)) {         // 치키치키 (마지막 마디 끝은 촘촘하게)
        const n = noise(ctx), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'highpass'; f.frequency.value = 7500;
        n.connect(f).connect(g).connect(bus); env(g, t, s % 4 === 2 ? 0.16 : 0.09, 0.001, 0.045); n.start(t); n.stop(t + 0.07);
      }
    },
    bass(ctx, s, bar, t){
      const pat = { 0: 0, 3: 0, 6: 12, 8: 0, 11: 7, 14: 12 };
      if (!(s in pat)) return;
      tone(ctx, 'sawtooth', mtof(ROOTS[bar] + pat[s]), t, 0.32, 0.008, 0.26, 520);
    },
    guitar(ctx, s, bar, t){
      if (![0, 3, 6, 8, 11, 14].includes(s)) return;
      const up = s === 3 || s === 11, len = s === 6 || s === 14 ? 0.22 : 0.34;
      CHORDS[bar].forEach((m, i) => {                     // 줄을 살짝씩 어긋나게 긁어요
        const k = up ? 2 - i : i, tt = t + k * 0.012;
        tone(ctx, 'sawtooth', mtof(m), tt, 0.07, 0.004, len, 2300);
        tone(ctx, 'triangle', mtof(m) * 1.003, tt, 0.06, 0.004, len, 3000);
      });
    },
    keys(ctx, s, bar, t){
      const ch = CHORDS[bar];
      if (s === 0) ch.forEach(m => tone(ctx, 'sine', mtof(m), t, 0.07, 0.08, 2.1));   // 은은한 화음
      if (s % 2 === 0) {                                  // 반짝이는 아르페지오
        const seq = [0, 1, 2, 1, 0, 1, 2, 1], m = ch[seq[s / 2]] + 12;
        tone(ctx, 'triangle', mtof(m), t, 0.11, 0.004, 0.3);
        tone(ctx, 'sine', mtof(m) * 2, t, 0.03, 0.002, 0.12);
      }
    }
  };

  // 박자에 맞춘 0~1 반짝임 (무대 조명용)
  function beat(nowMs){ const ph = (nowMs / 1000 / (STEP * 4)) % 1; return Math.pow(1 - ph, 3); }

  // 매 프레임: 지금부터 0.25초 앞까지의 음을 미리 예약해요
  function tick(nowMs, parts, volume){
    if (!parts.size || volume < 0.02) {   // 아무도 연주하지 않으면 소리 장치는 건드리지 않아요
      if (bus && nextStep !== null) { const a = audio(); if (a) bus.gain.setTargetAtTime(0, a.ctx.currentTime, 0.1); }
      nextStep = null; return;
    }
    const a = audio();
    if (!a) {
      nextStep = null;
      if (bus && a) bus.gain.setTargetAtTime(0, a.ctx.currentTime, 0.1);
      return;
    }
    const { ctx, master } = a;
    if (!bus) { bus = ctx.createGain(); bus.gain.value = 0; bus.connect(master); }
    bus.gain.setTargetAtTime(volume * 0.55, ctx.currentTime, 0.15);
    const now = nowMs / 1000, horizon = now + 0.25;
    if (nextStep === null || nextStep * STEP < now - 0.3 || nextStep * STEP > now + 1) nextStep = Math.floor(now / STEP) + 1;
    while (nextStep * STEP < horizon) {
      const at = ctx.currentTime + (nextStep * STEP - now);
      if (at >= ctx.currentTime) {
        const s = nextStep % 16, bar = Math.floor(nextStep / 16) % 4;
        for (const p of parts) if (PLAY[p]) PLAY[p](ctx, s, bar, at);
      }
      nextStep++;
    }
  }

  return { tick, beat };
}
