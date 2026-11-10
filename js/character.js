// 날개 달린 꼬마 천사 캐릭터 (큰 머리 · 작은 몸 · 머리 스타일 5종)
import * as THREE from 'three';
import { textCanvas, makeSprite, setSprite, wrap, glowTexture } from './sprites.js';

const HEAD_Y = 1.22, HEAD_R = 0.52;

export function createCharacters(scene, gold, shadowTex){
  const skinMat  = new THREE.MeshLambertMaterial({ color: 0xffe6d2, emissive: 0x3a2418, emissiveIntensity: 0.35 });
  const eyeMat   = new THREE.MeshBasicMaterial({ color: 0x2b2238 });
  const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const blushMat = new THREE.MeshBasicMaterial({ color: 0xff8fa8, transparent: true, opacity: 0.55, depthWrite: false });
  const mouthMat = new THREE.MeshBasicMaterial({ color: 0xa34a5e });
  const wingMat  = new THREE.MeshLambertMaterial({ color: 0xfaf6ff, emissive: 0x302838, emissiveIntensity: 0.3 });
  const footMat  = new THREE.MeshLambertMaterial({ color: 0xfffbf6, emissive: 0x2a2420, emissiveIntensity: 0.3 });
  const sph = new THREE.SphereGeometry(1, 20, 14);
  // 화났을 때 머리에서 나는 김: 연보라 테두리를 두른 만화풍 구름 (밝은 배경에서도 잘 보이게)
  const puffTex = (() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
    const blobs = [[64, 76, 30], [40, 66, 22], [88, 64, 24], [60, 46, 24], [80, 86, 18], [44, 86, 16]];
    g.lineWidth = 9; g.strokeStyle = 'rgba(150,130,190,0.95)';
    for (const [x, y, r] of blobs) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke(); }
    g.fillStyle = '#ffffff';
    for (const [x, y, r] of blobs) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = 'rgba(220,210,240,0.9)';
    for (const [x, y, r] of blobs) { g.beginPath(); g.arc(x + r * 0.25, y + r * 0.3, r * 0.55, 0, Math.PI * 2); g.fill(); }
    const t = new THREE.CanvasTexture(cv); return t;
  })();
  const browMat = new THREE.MeshBasicMaterial({ color: 0x3a2a40 });

  const ball = (mat, r, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(sph, mat); m.scale.set(r * sx, r * sy, r * sz); m.position.set(x, y, z); return m; };

  // ── 머리카락 ──
  function makeHair(style, color){
    const g = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: new THREE.Color(color), emissive: 0x201820, emissiveIntensity: 0.25, side: THREE.DoubleSide });
    g.userData.mat = mat;
    const at = (o) => { o.position.y += HEAD_Y; g.add(o); return o; };
    // 정수리를 덮는 모자 모양 + 앞머리
    const cap = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R + 0.045, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), mat);
    cap.rotation.x = -0.3; at(cap);
    const bangs = style === 'perm' ? 7 : 5;
    for (let i = 0; i < bangs; i++) {
      const a = -0.75 + i * (1.5 / (bangs - 1));
      const r = style === 'perm' ? 0.12 : 0.15;
      at(ball(mat, r, Math.sin(a) * 0.43, 0.3 - Math.abs(a) * 0.08, Math.cos(a) * 0.36, 1, style === 'perm' ? 1 : 0.65, 0.7));
    }
    // 옆·뒤를 감싸는 껍데기 (얼굴 쪽은 비워 둠)
    const shell = (len) => {
      const s = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R + 0.07, 32, 16, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, 0, Math.PI * len), mat);
      return at(s);
    };
    if (style === 'short') {
      for (const s of [-1, 1]) at(ball(mat, 0.13, s * 0.5, -0.02, -0.06, 0.6, 1, 1));
      at(ball(mat, 0.1, 0.05, 0.56, -0.05, 1, 1.3, 1)).rotation.z = -0.4;   // 삐죽 머리 한 가닥
    } else if (style === 'bob') {
      shell(0.66);
    } else if (style === 'long') {
      shell(0.74);
      at(ball(mat, 1, 0, -0.42, -0.34, 0.47, 0.62, 0.2));
      for (const s of [-1, 1]) at(ball(mat, 1, s * 0.45, -0.38, 0.1, 0.11, 0.34, 0.11));
    } else if (style === 'perm') {
      for (let k = 0; k < 30; k++) {
        const th = 0.18 * Math.PI + (k % 5) * 0.11 * Math.PI;
        const ph = (k / 30) * Math.PI * 2;
        const x = Math.cos(ph) * Math.sin(th), z = Math.sin(ph) * Math.sin(th), y = Math.cos(th);
        if (z > 0.55 && y < 0.75) continue;                      // 얼굴 앞은 비우기
        at(ball(mat, 0.15, x * (HEAD_R + 0.06), y * (HEAD_R + 0.06), z * (HEAD_R + 0.06)));
      }
      for (const s of [-1, 1]) for (let j = 0; j < 3; j++) at(ball(mat, 0.13, s * 0.5, -0.15 - j * 0.17, -0.05 - j * 0.03));
    } else if (style === 'pony') {
      for (const s of [-1, 1]) at(ball(mat, 0.12, s * 0.49, -0.02, -0.08, 0.6, 1, 1));
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.035, 8, 16), new THREE.MeshLambertMaterial({ color: 0xff7aa8 }));
      tie.position.set(0, 0.36, -0.5); tie.rotation.x = 0.9; at(tie);
      const tail = ball(mat, 1, 0, 0.05, -0.68, 0.17, 0.38, 0.17); tail.rotation.x = 0.45; at(tail);
      at(ball(mat, 0.1, 0, -0.27, -0.78));
    }
    return g;
  }
  function setHair(ch, style, color){
    if (ch.hair === style && ch.hc === color) return;
    if (ch.hairG) { ch.body.remove(ch.hairG); ch.hairG.traverse(o => { if (o.geometry && o.geometry !== sph) o.geometry.dispose(); }); ch.hairG.userData.mat.dispose(); }
    ch.hairG = makeHair(style, color); ch.body.add(ch.hairG); ch.hair = style; ch.hc = color;
    if (ch.towel) ch.towel.position.y = style === 'perm' ? 2.0 : 1.86;   // 곱슬머리 위에선 수건을 조금 더 높이
  }

  // ── 머리 장식 ──
  function makeHat(id){
    const g = new THREE.Group();
    if (id === 'halo') { const h = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 10, 32), new THREE.MeshBasicMaterial({ color: 0xffe27a })); h.rotation.x = Math.PI / 2; h.position.y = 2.02; g.add(h); }
    else if (id === 'crown') { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.18, 16, 1, true), gold); b.position.y = 1.82; g.add(b); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, c = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 6), gold); c.position.set(Math.cos(a) * 0.24, 1.99, Math.sin(a) * 0.24); g.add(c); } }
    else if (id === 'flower') { const pm = new THREE.MeshLambertMaterial({ color: 0xff8fb8 }); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; g.add(ball(pm, 0.09, 0.36 + Math.cos(a) * 0.1, 1.64 + Math.sin(a) * 0.1, 0.3)); } g.add(ball(new THREE.MeshLambertMaterial({ color: 0xffe066 }), 0.065, 0.36, 1.64, 0.36)); }
    return g;
  }

  function makeCharacter(color, hat, hair = 'short', hc = '#6b4226'){
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const robeMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(color) });
    const faceMat = skinMat.clone(), cheekMat = blushMat.clone();   // 온천에서 빨개지도록 캐릭터마다 따로
    // 몸통 (짧고 동글한 원피스)
    const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.43, 0.62, 24), robeMat); robe.position.y = 0.42; body.add(robe);
    body.add(ball(robeMat, 0.43, 0, 0.12, 0, 1, 0.28, 1));
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.045, 8, 24), new THREE.MeshLambertMaterial({ color: 0xffffff })); collar.rotation.x = Math.PI / 2; collar.position.y = 0.72; body.add(collar);
    // 발
    for (const s of [-1, 1]) body.add(ball(footMat, 0.12, s * 0.14, 0.06, 0.08, 1, 0.6, 1.35));
    // 팔 (어깨에서 흔들림)
    const arms = [];
    for (const s of [-1, 1]) {
      const pv = new THREE.Group(); pv.position.set(s * 0.27, 0.66, 0);
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.26, 12), robeMat); sleeve.position.set(s * 0.05, -0.12, 0); sleeve.rotation.z = s * 0.35; pv.add(sleeve);
      pv.add(ball(faceMat, 0.09, s * 0.1, -0.27, 0.02));
      body.add(pv); arms.push(pv);
    }
    // 머리와 얼굴
    body.add(ball(faceMat, HEAD_R, 0, HEAD_Y, 0, 1, 0.95, 1));
    const eyes = new THREE.Group(); eyes.position.set(0, 1.19, 0);
    for (const s of [-1, 1]) {
      eyes.add(ball(eyeMat, 0.085, s * 0.19, 0, 0.47, 0.9, 1.2, 0.5));
      eyes.add(ball(shineMat, 0.03, s * 0.19 + 0.03, 0.045, 0.51));
      eyes.add(ball(shineMat, 0.015, s * 0.19 - 0.025, -0.035, 0.512));
    }
    body.add(eyes);
    const cheeks = [];
    for (const s of [-1, 1]) { const b = ball(cheekMat, 0.075, s * 0.31, 1.07, 0.4, 1.3, 0.75, 0.4); b.userData.base = b.scale.clone(); body.add(b); cheeks.push(b); }
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.014, 6, 14, Math.PI), mouthMat); mouth.rotation.z = Math.PI; mouth.position.set(0, 1.05, 0.5); body.add(mouth);
    // 화난 표정: 안쪽으로 찌푸린 눈썹 (평소엔 숨김)
    const brows = new THREE.Group(); brows.visible = false; body.add(brows);
    for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.04, 0.03), browMat); b.position.set(s * 0.19, 1.34, 0.485); b.rotation.z = s * 0.45; brows.add(b); }
    // 머리 위 김 (평소엔 숨김)
    const puffs = [];
    for (let i = 0; i < 4; i++) { const p = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, depthTest: false, opacity: 0, toneMapped: false })); p.renderOrder = 20; p.visible = false; root.add(p); puffs.push({ s: p, t: i * 0.3, side: i % 2 ? 1 : -1 }); }
    // 날개
    const wings = [];
    for (const s of [-1, 1]) {
      const pv = new THREE.Group(); pv.position.set(s * 0.12, 0.72, -0.24);
      const w = ball(wingMat, 1, s * 0.27, 0.1, 0, 0.32, 0.24, 0.06); w.rotation.z = s * 0.35; pv.add(w);
      const w2 = ball(wingMat, 1, s * 0.2, -0.06, 0, 0.2, 0.15, 0.05); w2.rotation.z = s * -0.2; pv.add(w2);
      body.add(pv); wings.push(pv);
    }
    const hatG = makeHat(hat); body.add(hatG);
    // 온천 수건 (머리 위에 접어서 올림)
    const towel = new THREE.Group(); towel.visible = false;
    const tw = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x2a2428, emissiveIntensity: 0.3 });
    const tb = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.13, 0.42), tw); towel.add(tb);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.625, 0.135, 0.06), new THREE.MeshLambertMaterial({ color: 0xff9fbf })); stripe.position.z = 0.12; towel.add(stripe);
    const stripe2 = stripe.clone(); stripe2.position.z = -0.12; towel.add(stripe2);
    towel.position.set(0.02, 1.8, -0.02); towel.rotation.set(-0.12, 0.25, 0.08); body.add(towel);
    // 그림자 · 이름표 · 말풍선
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.02; root.add(shadow);
    const label = makeSprite(textCanvas(['…'], { font: 30, bg: 'rgba(61,53,80,0.75)', color: '#fff', pad: 14 }), 0.42); label.position.y = 2.42; root.add(label);
    const bubble = makeSprite(textCanvas([' '], { font: 30, tail: true }), 0.6); bubble.position.y = 3.1; bubble.visible = false; root.add(bubble);
    scene.add(root);
    const ch = { root, body, wings, arms, eyes, mouth, brows, puffs, angry: 0, throwT: -1, robeMat, faceMat, cheekMat, cheeks, towel, heat: 0, bathT: 0, hatG, hat, color, label, bubble, labelText: '', bubbleTimer: 0, walk: Math.random() * 6, emos: [], blink: 1 + Math.random() * 3, hairG: null, hair: null, hc: null };
    setHair(ch, hair, hc);
    return ch;
  }

  function paintCharacter(ch, color, hat, name, hair, hc){
    if (ch.color !== color) { ch.robeMat.color.set(color); ch.color = color; }
    if (ch.hat !== hat) { ch.body.remove(ch.hatG); ch.hatG = makeHat(hat); ch.body.add(ch.hatG); ch.hat = hat; }
    if (hair && hc) setHair(ch, hair, hc);
    if (name != null && ch.labelText !== name) { ch.labelText = name; setSprite(ch.label, textCanvas([name], { font: 30, bg: 'rgba(61,53,80,0.75)', color: '#fff', pad: 14 }), 0.42); }
  }
  function sayBubble(ch, text){
    const lines = wrap(text, 14);
    setSprite(ch.bubble, textCanvas(lines, { font: 30, tail: true }), 0.3 * lines.length + 0.32);
    ch.bubble.position.y = 2.75 + 0.15 * lines.length;
    ch.bubble.visible = true; ch.bubbleTimer = 6;
  }
  function emoteOn(ch, e){
    const s = makeSprite(textCanvas([e], { font: 64, bg: null }), 0.9); s.position.set(0, 2.2, 0); ch.root.add(s);
    ch.emos.push({ s, t: 0 });
  }
  // 온천 열기(0~1)에 따라 얼굴이 연하게 붉어지고, 볼은 더 진하고 넓게 퍼져요
  const SKIN = new THREE.Color(0xffe6d2), HOT = new THREE.Color(0xffb0a4);
  function applyHeat(ch){
    const h = ch.heat;
    ch.faceMat.color.copy(SKIN).lerp(HOT, h * 0.8);
    ch.cheekMat.opacity = 0.55 + 0.4 * h;
    ch.cheekMat.color.setRGB(1, 0.56 - 0.14 * h, 0.66 - 0.2 * h);
    for (const b of ch.cheeks) b.scale.copy(b.userData.base).multiplyScalar(1 + 0.75 * h);
  }
  // 기타·베이스를 칠 때 손에 드는 작은 악기
  function heldInstrument(kind){
    const g = new THREE.Group(), bm = new THREE.MeshPhongMaterial({ color: kind === 'bass' ? 0x6aa8e8 : 0xf28bb5, shininess: 60 });
    const dark = new THREE.MeshLambertMaterial({ color: 0x8a5f45 });
    const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 16), bm); b1.rotation.x = Math.PI / 2; g.add(b1);
    const b2 = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.08, 16), bm); b2.rotation.x = Math.PI / 2; b2.position.y = 0.22; g.add(b2);
    const nl = kind === 'bass' ? 0.75 : 0.55;
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.06, nl, 0.04), dark); neck.position.y = 0.28 + nl / 2; g.add(neck);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.04), new THREE.MeshLambertMaterial({ color: 0x3a3346 })); head.position.y = 0.32 + nl; g.add(head);
    g.position.set(-0.02, 0.42, 0.36); g.rotation.set(0.15, 0, 1.05);
    return g;
  }
  function setHeld(ch, kind){
    if (ch.heldKind === kind) return;
    if (ch.held) { ch.body.remove(ch.held); ch.held = null; }
    ch.heldKind = kind;
    if (kind) { ch.held = heldInstrument(kind); ch.body.add(ch.held); }
  }
  function animateCharacter(ch, dt, moving, sitting, t, worship, bath, play){
    // 온천: 들어가고 5초쯤 지나면 서서히 달아오르고(약 25초에 걸쳐), 나오면 천천히 식어요
    ch.bathT = bath ? ch.bathT + dt : 0;
    const want = bath ? Math.min(1, Math.max(0, (ch.bathT - 5) / 25)) : 0;
    const prevHeat = ch.heat;
    ch.heat += (want - ch.heat) * Math.min(1, dt * (bath ? 0.9 : 0.2));
    if (Math.abs(ch.heat - prevHeat) > 1e-4 || (ch.heat > 0 && !ch._heatOn)) { applyHeat(ch); ch._heatOn = ch.heat > 0.001; }
    ch.towel.visible = !!bath; ch.hatG.visible = !bath;
    const playing = play && !moving && !bath && !worship && !sitting;
    setHeld(ch, playing && (play === 'guitar' || play === 'bass') ? play : null);
    if (playing) {                                   // 밴드 연주: 박자(100BPM)에 맞춰 들썩들썩
      ch.playT = (ch.playT || 0) + dt; const k = ch.playT;
      const bounce = Math.abs(Math.sin(k * 5.236));
      ch.body.position.y = 0.03 + bounce * 0.07;
      ch.body.rotation.x = 0.06; ch.body.rotation.z = Math.sin(k * 5.236) * 0.05;
      if (play === 'drums') ch.arms.forEach((a, i) => { const s = i ? 1 : -1; a.rotation.z = s * 0.35; a.rotation.x = -0.9 + Math.sin(k * 10.47 * 2 + i * Math.PI) * 0.5; });
      else if (play === 'keys') ch.arms.forEach((a, i) => { const s = i ? 1 : -1; a.rotation.z = s * 0.2; a.rotation.x = -1.05 + Math.abs(Math.sin(k * 10.47 + i * 1.6)) * 0.18; });
      else { ch.arms[0].rotation.z = -0.5; ch.arms[0].rotation.x = -1.3; ch.arms[1].rotation.z = 0.25; ch.arms[1].rotation.x = -0.6 + Math.sin(k * 20.94) * 0.35; }
      ch.wings.forEach((w, i) => { w.rotation.y = (i ? -1 : 1) * (0.3 + bounce * 0.3); });
      ch.playFx = (ch.playFx || 0) - dt;
      if (ch.playFx <= 0) { ch.playFx = 2.4 + Math.random() * 1.5; emoteOn(ch, ['🎵', '🎶', '✨'][Math.floor(Math.random() * 3)]); }
      tickCommon(ch, dt);
      return;
    }
    ch.playT = 0;
    if (bath) {
      ch.walk += dt * (moving ? 5 : 1.5);
      ch.body.position.y = -0.5 + Math.sin(t * 1.4 + ch.walk) * 0.025;   // 어깨까지 물에 잠김
      ch.body.rotation.x = 0; ch.body.rotation.z = moving ? Math.sin(ch.walk) * 0.04 : 0;
      ch.arms.forEach((a, i) => { const s = i ? 1 : -1; a.rotation.z = s * 0.55; a.rotation.x = moving ? Math.sin(ch.walk + i * Math.PI) * 0.3 : 0; });
      ch.wings.forEach((w, i) => { w.rotation.y = (i ? -1 : 1) * (0.2 + Math.sin(t * 0.8) * 0.08); });
      ch.steamFx = (ch.steamFx || 0) - dt;
      if (ch.heat > 0.55 && ch.steamFx <= 0) { ch.steamFx = 4 + Math.random() * 2; emoteOn(ch, '♨️'); }
      tickCommon(ch, dt);
      return;
    }
    if (worship && !moving) {                        // 숭배: 두 팔을 활짝 들고 꾸벅꾸벅 절하기
      ch.wor = (ch.wor || 0) + dt;
      const k = Math.sin(ch.wor * 3.2);
      ch.arms.forEach((a, i) => { const s = i ? 1 : -1; a.rotation.z = s * (2.3 + k * 0.25); a.rotation.x = -0.25 - Math.max(0, k) * 0.5; });
      ch.body.rotation.x = 0.12 + Math.max(0, k) * 0.45;
      ch.body.rotation.z = 0;
      ch.body.position.y = 0.03;
      ch.wings.forEach((w, i) => { w.rotation.y = (i ? -1 : 1) * (0.35 + Math.sin(ch.wor * 6) * 0.5); });
      ch.worFx = (ch.worFx || 0) - dt;
      if (ch.worFx <= 0) { ch.worFx = 1.4; emoteOn(ch, Math.random() < 0.5 ? '✨' : '🙏'); }
      tickCommon(ch, dt);
      return;
    }
    ch.wor = 0; ch.worFx = 0;
    ch.walk += dt * (moving ? 9 : 2);
    const flap = moving ? 0.55 : 0.18;
    ch.wings.forEach((w, i) => { w.rotation.y = (i ? -1 : 1) * (0.25 + Math.sin(ch.walk * (moving ? 1.6 : 1)) * flap); });
    ch.arms.forEach(a => { a.rotation.z = 0; });
    ch.arms.forEach((a, i) => { a.rotation.x = moving ? Math.sin(ch.walk + (i ? Math.PI : 0)) * 0.7 : (sitting ? -0.6 : Math.sin(t * 1.5 + i) * 0.05); });
    const bob = moving ? Math.abs(Math.sin(ch.walk)) * 0.12 : Math.sin(t * 2 + ch.walk) * 0.03;
    ch.body.position.y = sitting ? -0.28 : bob + 0.03;
    ch.body.rotation.x = sitting ? -0.1 : 0;
    ch.body.rotation.z = moving ? Math.sin(ch.walk) * 0.06 : 0;
    tickCommon(ch, dt);
  }
  // 화내기(초)와 던지기 동작 시작
  function angry(ch, sec = 2.6){ ch.angry = sec; }
  function throwAnim(ch){ ch.throwT = 0; }
  function tickCommon(ch, dt){
    // 던지기: 오른팔을 뒤로 젖혔다가 앞으로 휙
    if (ch.throwT >= 0) {
      ch.throwT += dt;
      const k = ch.throwT;
      const arm = ch.arms[1];
      arm.rotation.z = 0.2;
      arm.rotation.x = k < 0.18 ? -2.7 * (k / 0.18) : k < 0.34 ? -2.7 + 3.4 * ((k - 0.18) / 0.16) : 0.7 * Math.max(0, 1 - (k - 0.34) / 0.3);
      if (k > 0.7) ch.throwT = -1;
    }
    // 화난 표정 + 머리에서 김
    const mad = ch.angry > 0;
    if (mad) ch.angry -= dt;
    ch.brows.visible = mad;
    ch.mouth.rotation.z = mad ? 0 : Math.PI;            // 웃는 입 ↔ 뾰로통한 입
    ch.mouth.position.y = mad ? 1.0 : 1.05;
    for (const p of ch.puffs) {
      p.s.visible = mad || p.s.material.opacity > 0.01;
      if (!p.s.visible) continue;
      p.t += dt * 1.4; if (p.t > 1) { p.t = 0; p.side = -p.side; }
      const k = p.t, pop = Math.min(1, k * 5);                       // 칙! 하고 빠르게 부풀었다가 위로 흩어짐
      p.s.position.set(p.side * (0.42 + k * 0.45), ch.body.position.y + 1.75 + k * 0.85, 0);
      p.s.scale.setScalar(0.25 + pop * 0.3 + k * 0.35);
      p.s.material.opacity = mad ? (k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3) : Math.max(0, p.s.material.opacity - dt * 3);
    }
    // 눈 깜빡임
    ch.blink -= dt;
    if (ch.blink < 0) { ch.eyes.scale.y = 0.12; if (ch.blink < -0.12) { ch.blink = 2 + Math.random() * 3.5; ch.eyes.scale.y = 1; } }
    if (ch.bubble.visible) { ch.bubbleTimer -= dt; if (ch.bubbleTimer <= 0) ch.bubble.visible = false; }
    for (let i = ch.emos.length - 1; i >= 0; i--) {
      const e = ch.emos[i]; e.t += dt; e.s.position.y = 2.3 + e.t * 0.9; e.s.material.opacity = Math.max(0, 1 - Math.max(0, e.t - 1.2) / 0.8);
      if (e.t > 2) { ch.root.remove(e.s); e.s.material.map.dispose(); e.s.material.dispose(); ch.emos.splice(i, 1); }
    }
  }
  function disposeCharacter(ch){
    scene.remove(ch.root);
    ch.root.traverse(o => { if (o.geometry && o.geometry !== sph) o.geometry.dispose(); if (o.material && o.material.map) o.material.map.dispose(); });
  }

  return { makeCharacter, paintCharacter, sayBubble, emoteOn, animateCharacter, disposeCharacter, angry, throwAnim };
}
