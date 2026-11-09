// 캔버스로 글자·빛 텍스처를 만드는 도우미
import * as THREE from 'three';

export function glowTexture(inner, outer){
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, inner); gr.addColorStop(0.35, inner.replace(/[\d.]+\)$/, '0.55)')); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); return t;
}

export function textCanvas(lines, o){
  o = Object.assign({ font: 32, pad: 18, bg: 'rgba(255,255,255,0.88)', color: '#3d3550', radius: 22, bold: false, family: '"Gowun Dodum", sans-serif' }, o || {});
  const c = document.createElement('canvas'), g = c.getContext('2d');
  const font = `${o.bold ? '700 ' : ''}${o.font}px ${o.family}`;
  g.font = font; const w = Math.ceil(Math.max(...lines.map(l => g.measureText(l).width))) + o.pad * 2;
  const lh = o.font * 1.3, h = Math.ceil(lh * lines.length + o.pad * 1.4);
  c.width = w; c.height = h + (o.tail ? 16 : 0);
  g.font = font;
  if (o.bg) {
    g.fillStyle = o.bg; g.beginPath();
    const r = Math.min(o.radius, h / 2);
    g.moveTo(r, 0); g.arcTo(w, 0, w, h, r); g.arcTo(w, h, 0, h, r); g.arcTo(0, h, 0, 0, r); g.arcTo(0, 0, w, 0, r); g.fill();
    if (o.tail) { g.beginPath(); g.moveTo(w / 2 - 12, h - 1); g.lineTo(w / 2, h + 15); g.lineTo(w / 2 + 12, h - 1); g.fill(); }
  }
  g.fillStyle = o.color; g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach((l, i) => g.fillText(l, w / 2, o.pad * 0.7 + lh * (i + 0.5)));
  return c;
}
export function makeSprite(canvas, worldH){
  const t = new THREE.CanvasTexture(canvas); t.minFilter = THREE.LinearFilter;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false, transparent: true, toneMapped: false }));
  s.scale.set(worldH * canvas.width / canvas.height, worldH, 1); s.renderOrder = 10; return s;
}
export function setSprite(s, canvas, worldH){
  s.material.map.dispose(); const t = new THREE.CanvasTexture(canvas); t.minFilter = THREE.LinearFilter;
  s.material.map = t; s.material.needsUpdate = true; s.scale.set(worldH * canvas.width / canvas.height, worldH, 1);
}
export function wrap(text, n){ const out = []; let cur = ''; for (const ch of [...text]) { cur += ch; if (cur.length >= n) { out.push(cur); cur = ''; } } if (cur) out.push(cur); return out.slice(0, 4); }
