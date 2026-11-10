// 효과음: 파일 없이 브라우저에서 직접 만들어요 (Web Audio)
import { store } from './util.js';

let ctx = null, master = null;
let enabled = store.get('heaven-sound') !== false;

// 브라우저는 사용자가 한 번 클릭·키 입력을 해야 소리를 낼 수 있어요
let gestured = false;   // 클릭·키 입력 전에는 소리 장치를 만들지 않아요 (브라우저 경고가 쌓이지 않게)
function ensure(){
  if (!enabled || !gestured) return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.6; master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch (e) { return null; }
}
for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, () => { gestured = true; ensure(); }, { passive: true });

function noise(sec){
  const n = Math.floor(ctx.sampleRate * sec), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf; return src;
}

// 휙: 높아지는 바람 소리
export function playThrow(vol = 1){
  if (!ensure() || vol <= 0.02) return;
  const t = ctx.currentTime, src = noise(0.3), f = ctx.createBiquadFilter(), g = ctx.createGain();
  f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(2600, t + 0.22);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5 * vol, t + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
  src.connect(f).connect(g).connect(master); src.start(t); src.stop(t + 0.3);
}

// 퍽: 낮고 부드러운 눈 터지는 소리
export function playHit(vol = 1){
  if (!ensure() || vol <= 0.02) return;
  const t = ctx.currentTime, src = noise(0.35), f = ctx.createBiquadFilter(), g = ctx.createGain();
  f.type = 'lowpass'; f.frequency.setValueAtTime(1800, t); f.frequency.exponentialRampToValueAtTime(260, t + 0.25);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.9 * vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
  src.connect(f).connect(g).connect(master); src.start(t); src.stop(t + 0.35);
  const o = ctx.createOscillator(), og = ctx.createGain();           // 쿵 하는 울림
  o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.18);
  og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.45 * vol, t + 0.01); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  o.connect(og).connect(master); o.start(t); o.stop(t + 0.22);
}

// 화났을 때 "흥!" 하는 짧은 소리
export function playHuff(vol = 1){
  if (!ensure() || vol <= 0.02) return;
  const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'triangle'; o.frequency.setValueAtTime(420, t); o.frequency.exponentialRampToValueAtTime(240, t + 0.16);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18 * vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  o.connect(g).connect(master); o.start(t); o.stop(t + 0.2);
}

export const soundOn = () => enabled;
export function setSound(v){ enabled = v; store.set('heaven-sound', v); if (v) ensure(); }

// 밴드 연주처럼 다른 모듈이 소리를 만들 때 쓰는 입구 (소리가 꺼져 있으면 null)
export function audio(){ return ensure() ? { ctx, master } : null; }
