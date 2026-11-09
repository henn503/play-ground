// 구름 위 쉼터 — 화면 조작, 사람들, 채팅, 방명록, 판정소를 묶는 진입점
import * as THREE from 'three';
import { $, store, clip, num, hhmm, COLORS, HATS, HAIRS, HAIR_COLORS, EMOTES } from './util.js';
import { createWorld } from './world.js';
import { createCharacters } from './character.js';
import { createNet } from './net.js';
import { textCanvas, makeSprite } from './sprites.js';
import { buildHeartFigure } from './statue.js';
import { firebaseConfig } from './firebase-config.js';

// ======================================================================
//  3D 세계 준비
// ======================================================================
let W;
try { W = createWorld($('scene')); }
catch (e) { console.error(e); $('nowebgl').style.display = 'flex'; $('loading').classList.add('hide'); throw e; }
const { renderer, scene, camera, colliders, clickables, ZONES, boardFrames, ISLAND_R, SEATS } = W;
for (const s of SEATS) colliders.push({ x: s.x, z: s.z, r: 0.85 });
const C = createCharacters(scene, W.gold, W.shadowTex);

// ======================================================================
//  하트 동상 (캐릭터의 약 3배 크기, 하얀 정장에 손하트를 한 피규어)
// ======================================================================
const STATUE = { x: 0, z: -31 };
{
  const g = new THREE.Group(); g.position.set(STATUE.x, 0, STATUE.z); scene.add(g);
  const marble = new THREE.MeshPhongMaterial({ color: 0xf3eee6, shininess: 45 });
  // 받침대
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.6, 1.2, 40), marble); base.position.y = 0.6; g.add(base);
  const step = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 3.1, 0.3, 40), marble); step.position.y = 0.15; g.add(step);
  for (const y of [0.05, 1.18]) { const r = new THREE.Mesh(new THREE.TorusGeometry(y > 1 ? 2.3 : 2.6, 0.08, 8, 60), W.gold); r.rotation.x = Math.PI / 2; r.position.y = y + 0.02; g.add(r); }
  // 동상 본체
  const fig = buildHeartFigure(); fig.position.y = 1.2; fig.scale.setScalar(2.8); g.add(fig);
  // 발밑의 은은한 보랏빛
  const aura = new THREE.Mesh(new THREE.CircleGeometry(2.1, 40), new THREE.MeshBasicMaterial({ color: 0xc9a8f0, transparent: true, opacity: 0.35, depthWrite: false }));
  aura.rotation.x = -Math.PI / 2; aura.position.y = 1.22; g.add(aura);
  // 빛과 이름표
  const glow = new THREE.PointLight(0xfff0e0, 0.55, 16); glow.position.set(0, 5, 5); g.add(glow);
  const plaque = makeSprite(textCanvas(['💜 구름 위의 하트 동상'], { font: 34 }), 0.8); plaque.position.y = 8.6; g.add(plaque);
    colliders.push({ x: STATUE.x, z: STATUE.z, r: 2.7 });
  ZONES.st = { id: 'st', name: '구름 위의 하트 동상', x: STATUE.x, z: STATUE.z, r: 6.2 };
  g.traverse(o => { if (o.isMesh) { o.userData.zone = 'st'; clickables.push(o); } });
}

// ======================================================================
//  나
// ======================================================================
const saved = store.get('heaven-me') || {};
const ME = {
  x: (Math.random() - 0.5) * 4, z: 27 + Math.random() * 2, y: 0, vy: 0, ry: Math.PI,
  col: COLORS.includes(saved.col) ? saved.col : COLORS[Math.floor(Math.random() * COLORS.length)],
  hat: HATS.some(h => h.id === saved.hat) ? saved.hat : 'halo',
  hair: HAIRS.some(h => h.id === saved.hair) ? saved.hair : HAIRS[Math.floor(Math.random() * HAIRS.length)].id,
  hc: HAIR_COLORS.includes(saved.hc) ? saved.hc : HAIR_COLORS[Math.floor(Math.random() * 3)],
  nick: clip(saved.nick, 12), emo: null, sit: false, wor: false, moving: false
};
const myName = () => ME.nick || '천사';
const meChar = C.makeCharacter(ME.col, ME.hat, ME.hair, ME.hc);
function renderMe(){ C.paintCharacter(meChar, ME.col, ME.hat, myName(), ME.hair, ME.hc); $('meName').textContent = myName(); $('meSw').style.background = ME.col; }
renderMe();
function saveMe(){ store.set('heaven-me', { col: ME.col, hat: ME.hat, hair: ME.hair, hc: ME.hc, nick: ME.nick }); }

// ======================================================================
//  연결 상태 표시
// ======================================================================
let net = null, peers = [], status = 'connecting';
const remotes = new Map();          // key(uid/tab) -> { ch, x, z, ... }
function setStatus(s){
  status = s;
  $('dot').classList.toggle('on', s === 'online');
  $('onlineTxt').textContent = s === 'connecting' ? '…' : `${peers.length + 1}명`;
}
function banner(text){ const b = $('banner'); b.textContent = text || ''; b.classList.toggle('show', !!text); }
const SOLO_REASON = {
  config: 'Firebase 설정값이 없어 다른 사람과 연결되지 않아요. README를 따라 js/firebase-config.js를 채워 주세요.',
  'auth/operation-not-allowed': 'Firebase에서 "익명 로그인"이 꺼져 있어요. Authentication → 로그인 방법에서 "익명"을 사용 설정해 주세요.',
  'auth/admin-restricted-operation': 'Firebase에서 "익명 로그인"이 꺼져 있어요. Authentication → 로그인 방법에서 "익명"을 사용 설정해 주세요.',
  'auth/api-key-not-valid': 'Firebase apiKey가 올바르지 않아요. js/firebase-config.js를 다시 확인해 주세요.',
  'auth/network-request-failed': '인터넷 연결 문제로 Firebase에 접속하지 못했어요.'
};
const permBanner = () => banner('데이터를 읽을 권한이 없어요. README의 "보안 규칙 게시" 단계를 확인해 주세요.');

// ======================================================================
//  접속자 위치 보내기 (초당 약 6번으로 제한)
// ======================================================================
let presTimer = null, presDirty = false, lastPres = 0;
function myPresence(){
  return { x: +ME.x.toFixed(2), z: +ME.z.toFixed(2), y: +ME.y.toFixed(2), ry: +ME.ry.toFixed(2),
           col: ME.col, hat: ME.hat, hair: ME.hair, hc: ME.hc, nick: ME.nick || '천사', mv: ME.moving, sit: ME.sit, wor: ME.wor, emo: ME.emo };
}
function sync(){
  if (!net || net.mode !== 'online' || !entered) return;
  presDirty = true; if (presTimer) return;
  presTimer = setTimeout(() => { presTimer = null; if (!presDirty) return; presDirty = false; lastPres = Date.now(); net.presence.set(myPresence()); },
    Math.max(0, 160 - (Date.now() - lastPres)));
}

// ======================================================================
//  다른 사람들
// ======================================================================
const pName = p => clip(p.nick, 12) || '천사';
const pCol = p => COLORS.includes(p.col) ? p.col : '#e6e0f0';
const pHat = p => HATS.some(h => h.id === p.hat) ? p.hat : 'halo';
const pHair = p => HAIRS.some(h => h.id === p.hair) ? p.hair : 'short';
const pHc = p => HAIR_COLORS.includes(p.hc) ? p.hc : '#6b4226';
const lastEmo = new Map();
let peersReadyAt = 0;
function onPeers(list){
  const now = Date.now();
  if (!peersReadyAt) peersReadyAt = now;
  const announce = now - peersReadyAt > 2500;
  const alive = new Set(list.map(e => e.key));
  for (const [k, r] of remotes) if (!alive.has(k)) {
    if (announce) sysMsg(`${pName(r.p)}님이 구름 아래로 내려갔어요.`);
    C.disposeCharacter(r.ch); remotes.delete(k);
  }
  for (const e of list) {
    const p = e.p;
    const tx = num(p.x, -50, 50, 0), tz = num(p.z, -50, 50, 28), ty = num(p.y, 0, 5, 0), tr = num(p.ry, -10, 10, 0);
    let r = remotes.get(e.key);
    if (!r) {
      r = { ch: C.makeCharacter(pCol(p), pHat(p), pHair(p), pHc(p)), x: tx, z: tz, y: ty, ry: tr, uid: e.uid };
      remotes.set(e.key, r);
      if (announce) sysMsg(e.mine ? '내 다른 창이 들어왔어요.' : `${pName(p)}님이 구름 위로 올라왔어요 ✨`);
    }
    Object.assign(r, { tx, tz, ty, tr, p, mv: !!p.mv, sit: !!p.sit, wor: !!p.wor });
    C.paintCharacter(r.ch, pCol(p), pHat(p), pName(p), pHair(p), pHc(p));
    if (p.emo && typeof p.emo === 'object') {
      const t = num(p.emo.t, 0, 1e15, 0), em = EMOTES.includes(p.emo.e) ? p.emo.e : null;
      if (em && lastEmo.get(e.key) !== t) { const first = !lastEmo.has(e.key); lastEmo.set(e.key, t); if (!first || now - t < 3000) C.emoteOn(r.ch, em); }
    }
  }
  peers = list;
  setStatus(status);
}

// ======================================================================
//  입력 / 카메라
// ======================================================================
const keys = {};
const KEYMAP = { KeyW:'f', ArrowUp:'f', KeyS:'b', ArrowDown:'b', KeyA:'l', ArrowLeft:'l', KeyD:'r', ArrowRight:'r' };
let camYaw = 0, camPitch = 0.38, camDist = 11, camYawCur = 0;
let target = null, pendingZone = null;
const typing = () => { const a = document.activeElement; return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA'); };
const anyModal = () => document.querySelector('.modal-bg.show');

const marker = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.5, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false }));
marker.rotation.x = -Math.PI / 2; marker.visible = false; scene.add(marker);

const cv = renderer.domElement;
const pointers = new Map(); let drag = null, pinch0 = 0;
cv.addEventListener('pointerdown', e => {
  cv.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false };
  else if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); drag = null; }
});
cv.addEventListener('pointermove', e => {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) { const [a, b] = [...pointers.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) camDist = Math.min(18, Math.max(5, camDist * pinch0 / d)); pinch0 = d; return; }
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
  if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) drag.moved = true;
  if (drag.moved) { camYaw -= dx * 0.006; camPitch = Math.min(1.25, Math.max(0.08, camPitch + dy * 0.004)); }
});
const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
cv.addEventListener('pointerup', e => {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinch0 = 0;
  if (!drag || drag.moved) { drag = null; return; }
  drag = null;
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hit = raycaster.intersectObjects(clickables, false)[0];
  if (hit && hit.object.userData.zone) { const z = ZONES[hit.object.userData.zone]; walkTo(z.x, z.z, z); return; }
  const ray = raycaster.ray; if (ray.direction.y >= -0.01) return;
  const t = -ray.origin.y / ray.direction.y, p = ray.origin.clone().addScaledVector(ray.direction, t);
  if (Math.hypot(p.x, p.z) > ISLAND_R + 2) return;
  walkTo(p.x, p.z, null);
});
cv.addEventListener('pointercancel', e => { pointers.delete(e.pointerId); drag = null; });
cv.addEventListener('wheel', e => { e.preventDefault(); camDist = Math.min(18, Math.max(5, camDist + e.deltaY * 0.01)); }, { passive: false });
function walkTo(x, z, zone){
  if (zone) {
    const d = Math.hypot(ME.x - zone.x, ME.z - zone.z);
    if (d < zone.r) { openZone(zone); return; }
    const k = (zone.r - 1.5) / d; x = zone.x + (ME.x - zone.x) * k; z = zone.z + (ME.z - zone.z) * k;
  }
  target = { x, z }; pendingZone = zone; marker.position.set(x, 0.05, z); marker.visible = true;
  if (ME.sit) setSit(false);
  if (ME.wor) setWorship(false);
}

document.addEventListener('keydown', e => {
  const m = anyModal();
  if (e.key === 'Escape' && m && m.id !== 'entryModal') { closeModal(m.id); return; }
  if (typing() || m) return;
  if (e.key === 'Enter') { e.preventDefault(); $('chatInput').focus(); return; }
  if (e.code === 'KeyE' && curZone) { openZone(curZone); return; }
  if (e.code === 'Space') { e.preventDefault(); if (ME.wor) setWorship(false); if (ME.sit) { setSit(false); return; } if (ME.y <= 0.001) ME.vy = 6.5; return; }
  if (e.code === 'KeyX') { if (ME.wor || (curZone && curZone.id === 'st')) setWorship(!ME.wor); else setSit(!ME.sit); return; }
  const k = KEYMAP[e.code]; if (k) { keys[k] = true; e.preventDefault(); if (ME.sit) setSit(false); if (ME.wor) setWorship(false); }
});
document.addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) keys[k] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

// ======================================================================
//  장소 안내
// ======================================================================
let curZone = null, curSeat = null, promptKey = '';
function nearSeat(){ let best = null, bd = 2.1; for (const s of SEATS) { const d = Math.hypot(ME.x - s.x, ME.z - s.z); if (d < bd) { bd = d; best = s; } } return best; }
function updatePrompt(){
  let z = null;
  for (const k in ZONES) { const q = ZONES[k]; if (Math.hypot(ME.x - q.x, ME.z - q.z) < q.r) z = q; }
  curZone = z; curSeat = z ? null : nearSeat();
  const key = ME.wor ? 'worship' : ME.sit ? 'sitting' : z ? 'zone:' + z.id : curSeat ? 'seat' : '';
  if (key === promptKey) return;
  promptKey = key; $('prompt').classList.toggle('show', !!key);
  if (!key) return;
  if (ME.wor) { $('promptTxt').textContent = '하트 동상을 향해 마음을 다해 숭배하는 중…'; $('promptBtn').innerHTML = '그만하기<kbd>X</kbd>'; }
  else if (ME.sit) { $('promptTxt').textContent = '구름 의자에 폭신하게 앉아 있어요'; $('promptBtn').innerHTML = '일어나기<kbd>X</kbd>'; }
  else if (z && z.id === 'st') { $('promptTxt').textContent = '구름 위의 하트 동상 앞이에요'; $('promptBtn').innerHTML = '숭배하기<kbd>X</kbd>'; }
  else if (z) { $('promptTxt').textContent = z.id === 'gb' ? '빛나는 방명록 앞이에요' : '그뤠잇·스튜핏 판정소 앞이에요'; $('promptBtn').innerHTML = '열기<kbd>E</kbd>'; }
  else { $('promptTxt').textContent = '폭신한 구름 의자예요'; $('promptBtn').innerHTML = '앉기<kbd>X</kbd>'; }
}
$('promptBtn').onclick = () => { if (ME.wor || (curZone && curZone.id === 'st')) setWorship(!ME.wor); else if (ME.sit || (!curZone && curSeat)) setSit(!ME.sit); else if (curZone) openZone(curZone); };

// ======================================================================
//  루프
// ======================================================================
const clock = new THREE.Clock();
const SPEED = 6.2;
let firstFrame = true, wasMoving = false;
const tmpV = new THREE.Vector3();
function collide(x, z){
  for (const c of colliders) { const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), r = c.r + 0.45; if (d < r && d > 0.0001) { x = c.x + dx / d * r; z = c.z + dz / d * r; } }
  const d = Math.hypot(x, z); if (d > ISLAND_R) { x *= ISLAND_R / d; z *= ISLAND_R / d; }
  return [x, z];
}
function arrive(){ target = null; marker.visible = false; if (pendingZone) { const z = pendingZone; pendingZone = null; openZone(z); } }
// 움직일 때는 초당 30번, 아무도 안 움직이고 가만히 있을 때는 초당 12번만 다시 그려요
const FRAME_MS = 1000 / 30, IDLE_MS = 1000 / 12;
let lastDraw = 0, lastActive = 0;
const wake = () => { lastActive = performance.now(); };
for (const ev of ['keydown', 'pointerdown', 'pointermove', 'wheel', 'touchmove']) addEventListener(ev, wake, { passive: true });
function busy(){
  if (ME.moving || ME.y > 0 || target || performance.now() - lastActive < 1500) return true;
  for (const r of remotes.values()) if (r.mv || Math.abs(r.tx - r.x) + Math.abs(r.tz - r.z) > 0.02) return true;
  return false;
}
function frame(now){
  requestAnimationFrame(frame);
  if (document.hidden || now - lastDraw < (busy() ? FRAME_MS : IDLE_MS) - 2) return;
  lastDraw = now;
  const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;
  let ix = 0, iz = 0;
  if (!anyModal() && !typing()) { if (keys.f) iz += 1; if (keys.b) iz -= 1; if (keys.l) ix -= 1; if (keys.r) ix += 1; }
  let mx = 0, mz = 0;
  if (ix || iz) {
    target = null; pendingZone = null; marker.visible = false;
    const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = -fz, rz = fx;
    mx = fx * iz + rx * ix; mz = fz * iz + rz * ix;
  } else if (target) {
    const dx = target.x - ME.x, dz = target.z - ME.z, d = Math.hypot(dx, dz);
    if (d < 0.25) arrive(); else { mx = dx; mz = dz; }
  }
  let moving = false;
  if (mx || mz) {
    const l = Math.hypot(mx, mz); mx /= l; mz /= l;
    const [nx, nz] = collide(ME.x + mx * SPEED * dt, ME.z + mz * SPEED * dt);
    if (Math.hypot(nx - ME.x, nz - ME.z) > 0.002) { ME.x = nx; ME.z = nz; moving = true; }
    else if (target) arrive();
    let diff = Math.atan2(mx, mz) - ME.ry; while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2;
    ME.ry += diff * Math.min(1, dt * 12);
  }
  if (!ME.sit && (ME.y > 0 || ME.vy > 0)) { ME.vy -= 18 * dt; ME.y = Math.max(0, ME.y + ME.vy * dt); if (ME.y === 0) ME.vy = 0; sync(); }
  if (moving !== wasMoving) { wasMoving = moving; ME.moving = moving; sync(); }
  if (moving) { sync(); updatePrompt(); }
  meChar.root.position.set(ME.x, ME.y, ME.z); meChar.root.rotation.y = ME.ry;
  if (ME.wor) { let diff = Math.atan2(STATUE.x - ME.x, STATUE.z - ME.z) - ME.ry; while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2; ME.ry += diff * Math.min(1, dt * 6); if (Math.abs(diff) > 0.02) sync(); }
  C.animateCharacter(meChar, dt, moving, ME.sit, t, ME.wor);

  const k = Math.min(1, dt * 7);
  for (const r of remotes.values()) {
    r.x += (r.tx - r.x) * k; r.z += (r.tz - r.z) * k; r.y += (r.ty - r.y) * Math.min(1, dt * 12);
    let diff = r.tr - r.ry; while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2; r.ry += diff * k;
    r.ch.root.position.set(r.x, r.y, r.z); r.ch.root.rotation.y = r.ry;
    C.animateCharacter(r.ch, dt, r.mv, r.sit, t, r.wor);
  }

  camYawCur += (camYaw - camYawCur) * Math.min(1, dt * 10);
  const cx = ME.x + Math.sin(camYawCur) * Math.cos(camPitch) * camDist, cz = ME.z + Math.cos(camYawCur) * Math.cos(camPitch) * camDist;
  const cy = Math.max(0.6, ME.y * 0.5 + 1.4 + Math.sin(camPitch) * camDist);
  camera.position.lerp(tmpV.set(cx, cy, cz), firstFrame ? 1 : Math.min(1, dt * 8));
  camera.lookAt(ME.x, ME.y * 0.5 + 1.5, ME.z);

  W.tick(dt, t);
  marker.scale.setScalar(1 + Math.sin(t * 6) * 0.12);
  renderer.render(scene, camera);
  if (firstFrame) { firstFrame = false; setTimeout(() => $('loading').classList.add('hide'), 300); }
}
requestAnimationFrame(frame);

// ======================================================================
//  채팅 / 감정표현 / 앉기
// ======================================================================
const chatLog = [], seenChat = new Set(), logEl = $('log');
const CHAT_MAX = 15;   // 대화창에는 최근 15개만 남기고 이전 대화는 지워요
function addChat(m){ chatLog.push(m); chatLog.sort((a, b) => a.t - b.t); if (chatLog.length > CHAT_MAX) chatLog.splice(0, chatLog.length - CHAT_MAX); renderLog(m.mine); }
function sysMsg(text){ addChat({ sys: true, text, t: Date.now() }); }
function shade(hex){ const c = new THREE.Color(hex); const hsl = {}; c.getHSL(hsl); c.setHSL(hsl.h, Math.min(1, hsl.s * 0.9 + 0.2), 0.38); return '#' + c.getHexString(); }
function renderLog(force){
  const atBottom = logEl.scrollHeight - logEl.scrollTop - logEl.clientHeight < 40;
  logEl.innerHTML = '';
  for (const m of chatLog) {
    const d = document.createElement('div');
    if (m.sys) { d.className = 'sys'; d.textContent = m.text; }
    else {
      const b = document.createElement('b'); b.textContent = m.name; b.style.color = shade(m.col);
      const s = document.createElement('span'); s.textContent = m.text;
      const tm = document.createElement('time'); tm.textContent = hhmm(m.t);
      d.append(b, s, tm);
    }
    logEl.appendChild(d);
  }
  if (atBottom || force) logEl.scrollTop = logEl.scrollHeight;
  logEl.classList.toggle('fade', logEl.scrollTop > 2);
}
logEl.addEventListener('scroll', () => logEl.classList.toggle('fade', logEl.scrollTop > 2));
function onChatMsg(m){
  if (!m || seenChat.has(m.id)) return; seenChat.add(m.id);
  const text = clip(m.text, 100); if (!text) return;
  const t = num(m.t, 0, 1e15, Date.now()), mine = m.uid === net.uid;
  const col = COLORS.includes(m.col) ? m.col : '#b9a8d8';
  addChat({ name: clip(m.nick, 12) || '천사', col, text, t: Math.min(t, net.serverNow()), mine });
  if (net.serverNow() - t < 8000) {
    if (mine) C.sayBubble(meChar, text);
    for (const r of remotes.values()) if (r.uid === m.uid) C.sayBubble(r.ch, text);
  }
}
$('chatForm').addEventListener('submit', e => {
  e.preventDefault();
  const text = clip($('chatInput').value, 100); if (!text) { $('chatInput').blur(); return; }
  if (!net) return;
  $('chatInput').value = '';
  net.chat.send({ nick: myName(), col: ME.col, text }).catch(() => sysMsg('메시지를 보내지 못했어요.'));
});
$('chatInput').addEventListener('keydown', e => { if (e.key === 'Escape') $('chatInput').blur(); });
for (const em of EMOTES) {
  const b = document.createElement('button'); b.textContent = em;
  b.onclick = () => { ME.emo = { e: em, t: Date.now() }; sync(); C.emoteOn(meChar, em); };
  $('emotes').appendChild(b);
}
// 구름 의자 가까이에서만 앉을 수 있어요
function setSit(v){
  if (v) {
    const s = nearSeat(); if (!s) { updatePrompt(); return; }
    ME.x = s.x; ME.z = s.z; ME.y = s.y; ME.vy = 0; ME.ry = s.ry; target = null; pendingZone = null; marker.visible = false;
  } else if (ME.sit) { ME.vy = 3; }
  ME.sit = v;
  sync(); updatePrompt();
}
// 동상 앞에서만 숭배할 수 있어요
function setWorship(v){
  if (v && Math.hypot(ME.x - STATUE.x, ME.z - STATUE.z) > ZONES.st.r) { updatePrompt(); return; }
  if (v && ME.sit) setSit(false);
  ME.wor = v; if (v) { target = null; pendingZone = null; marker.visible = false; }
  sync(); updatePrompt();
}
updatePrompt();

// ======================================================================
//  모달
// ======================================================================
function openModal(id){ document.querySelectorAll('.modal-bg.show').forEach(m => m.classList.remove('show')); if (id !== 'meModal' && id !== 'entryModal' && PV) PV.hide(); $(id).classList.add('show'); for (const k in keys) keys[k] = false; }
function closeModal(id){ $(id).classList.remove('show'); if ((id === 'meModal' || id === 'entryModal') && PV) PV.hide(); }
document.querySelectorAll('.modal-bg').forEach(m => {
  if (m.id === 'entryModal') return;
  m.addEventListener('pointerdown', e => { if (e.target === m) closeModal(m.id); });
  m.querySelector('[data-close]').onclick = () => closeModal(m.id);
});
function openZone(z){ if (z.id === 'st') { setWorship(true); return; } if (z.id === 'gb') { openModal('gbModal'); renderGb(); } else { openModal('gsModal'); renderGs(); } }

// ======================================================================
//  방명록
// ======================================================================
const GB = { docs: [], loaded: false, err: null };
function renderGb(){
  const list = $('gbList'); list.innerHTML = '';
  $('gbNote').textContent = net ? `${myName()} 이름으로 남겨져요.` : '연결 중…';
  if (GB.err && !GB.docs.length) { list.innerHTML = `<div class="empty">${GB.err}</div>`; return; }
  if (!GB.docs.length) { list.innerHTML = `<div class="empty">${GB.loaded ? '아직 아무도 흔적을 남기지 않았어요. 첫 번째 주인공이 되어 보세요!' : '불러오는 중…'}</div>`; return; }
  for (const d of GB.docs) {
    const text = clip(d.text, 200); if (!text) continue;
    const it = document.createElement('div'); it.className = 'gb-item';
    const body = document.createElement('div'); body.textContent = text;
    const by = document.createElement('div'); by.className = 'by';
    const sw = document.createElement('i'); sw.style.background = COLORS.includes(d.col) ? d.col : '#ddd';
    const nm = document.createElement('span'); const t = num(d.t, 0, 1e15, 0), dt = new Date(t);
    nm.textContent = `${clip(d.nick, 12) || '천사'} · ${dt.getMonth() + 1}/${dt.getDate()} ${hhmm(t)}`;
    by.append(sw, nm); it.append(body, by); list.appendChild(it);
  }
}
let gbBusy = false;
$('gbForm').addEventListener('submit', async e => {
  e.preventDefault(); if (!net || gbBusy) return;
  const text = clip($('gbText').value, 200); if (!text) return;
  gbBusy = true; $('gbSubmit').disabled = true;
  try { await net.guestbook.add({ nick: myName(), col: ME.col, text }); $('gbText').value = ''; sysMsg('방명록에 흔적을 남겼어요 📖'); }
  catch (err) { console.warn(err); $('gbNote').textContent = '저장하지 못했어요. 잠시 후 다시 시도해 주세요.'; }
  gbBusy = false; $('gbSubmit').disabled = false;
});

// ======================================================================
//  그뤠잇·스튜핏 판정소
// ======================================================================
const GS = { items: [], votes: {}, comments: {}, loaded: false, err: null };
const openCmts = new Set(), cmtDrafts = {};
let gsPending = false;
let pickedImg = null, gsBusy = false;
const validImg = s => typeof s === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s) && s.length < 260000;
const myVotes = () => (net && GS.votes[net.uid]) || {};

function downscale(file){
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const M = 560, s = Math.min(1, M / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * s)), h = Math.max(1, Math.round(img.height * s));
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      let q = 0.8, d = c.toDataURL('image/jpeg', q);
      while (d.length > 170000 && q > 0.35) { q -= 0.1; d = c.toDataURL('image/jpeg', q); }
      d.length > 200000 ? rej(new Error('big')) : res(d);
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('decode')); };
    img.src = url;
  });
}
const DROP_HTML = '📷 물건 사진 고르기<br><small>탭하거나 사진을 끌어다 놓으세요</small>';
async function pickFile(f){
  if (!f) return;
  if (!/^image\//.test(f.type)) { $('gsMsg').textContent = '사진 파일만 올릴 수 있어요.'; return; }
  $('dropTxt').textContent = '사진 준비 중…';
  try {
    pickedImg = await downscale(f);
    const drop = $('drop'); [...drop.querySelectorAll('img')].forEach(x => x.remove());
    const im = document.createElement('img'); im.src = pickedImg; drop.appendChild(im); $('dropTxt').style.display = 'none';
    $('gsMsg').textContent = '';
  } catch (e) { pickedImg = null; $('dropTxt').textContent = '이 사진은 열 수 없어요. 다른 사진(JPG/PNG)을 골라 주세요.'; }
}
$('gsFile').addEventListener('change', e => pickFile(e.target.files[0]));
$('drop').addEventListener('dragover', e => e.preventDefault());
$('drop').addEventListener('drop', e => { e.preventDefault(); pickFile(e.dataTransfer.files[0]); });
$('gsForm').addEventListener('submit', async e => {
  e.preventDefault(); if (!net || gsBusy) return;
  const title = clip($('gsTitle').value, 30), price = clip($('gsPrice').value, 20), note = clip($('gsNote').value, 120);
  if (!pickedImg) { $('gsMsg').textContent = '사진을 먼저 골라 주세요.'; return; }
  if (!title) { $('gsMsg').textContent = '물건 이름을 적어 주세요.'; return; }
  gsBusy = true; $('gsSubmit').disabled = true; $('gsMsg').textContent = '올리는 중…';
  try {
    await net.items.add({ title, price, note, nick: myName(), col: ME.col }, pickedImg);
    pickedImg = null; $('gsTitle').value = ''; $('gsPrice').value = ''; $('gsNote').value = ''; $('gsFile').value = '';
    [...$('drop').querySelectorAll('img')].forEach(x => x.remove()); $('dropTxt').style.display = ''; $('dropTxt').innerHTML = DROP_HTML;
    $('gsMsg').textContent = '올렸어요! 친구들의 판정을 기다려 봐요.';
    net.chat.send({ nick: myName(), col: ME.col, text: `⚖️ 판정소에 "${title}" 올렸어요! 그뤠잇? 스튜핏?` }).catch(() => {});
  } catch (err) { console.warn(err); $('gsMsg').textContent = '올리지 못했어요. 잠시 후 다시 시도해 주세요.'; }
  gsBusy = false; $('gsSubmit').disabled = false;
});
function tally(id){
  let g = 0, s = 0;
  for (const u in GS.votes) { const m = GS.votes[u]; const v = m && m[id]; if (v === 'g') g++; else if (v === 's') s++; }
  return { g, s, n: g + s };
}
function verdict(t){ if (t.n < 2) return null; const r = t.g / t.n; return r >= 0.6 ? 'g' : r <= 0.4 ? 's' : 'e'; }
function vote(id, v){
  if (!net) return;
  const cur = myVotes()[id], next = cur === v ? null : v;
  // 화면 먼저 바꾸기
  GS.votes = { ...GS.votes, [net.uid]: { ...myVotes() } };
  if (next) GS.votes[net.uid][id] = next; else delete GS.votes[net.uid][id];
  renderGs(); paintBoard();
  net.votes.set(id, next).catch(err => { console.warn(err); $('gsMsg').textContent = '판정을 저장하지 못했어요.'; });
}
function renderGs(){
  const grid = $('gsGrid'); if (!$('gsModal').classList.contains('show')) return;
  // 코멘트를 입력하는 중이면 다 쓸 때까지 화면 갱신을 미뤄요
  const ae = document.activeElement;
  if (ae && ae.tagName === 'INPUT' && grid.contains(ae)) { gsPending = true; return; }
  gsPending = false;
  grid.innerHTML = '';
  if (GS.err && !GS.items.length) { grid.innerHTML = `<div class="empty">${GS.err}</div>`; return; }
  if (!GS.items.length) { grid.innerHTML = `<div class="empty">${GS.loaded ? '아직 올라온 물건이 없어요. 고민 중인 물건을 첫 번째로 올려 보세요!' : '불러오는 중…'}</div>`; return; }
  for (const it of GS.items) {
    const title = clip(it.title, 30); if (!title) continue;
    const t = tally(it.id), vd = verdict(t), mv = myVotes()[it.id];
    const card = document.createElement('div'); card.className = 'card';
    const ph = document.createElement('div'); ph.className = 'ph';
    const im = document.createElement('img'); im.alt = title; ph.appendChild(im);
    net.items.image(it.id).then(src => { if (validImg(src)) im.src = src; });
    if (vd) { const st = document.createElement('div'); st.className = 'stamp ' + vd; st.textContent = vd === 'g' ? '그뤠잇!' : vd === 's' ? '스튜핏!' : '팽팽'; ph.appendChild(st); }
    const bd = document.createElement('div'); bd.className = 'bd';
    const tt = document.createElement('div'); tt.className = 'tt';
    const tn = document.createElement('span'); tn.textContent = title;
    const pr = document.createElement('span'); pr.className = 'pr'; pr.textContent = clip(it.price, 20);
    tt.append(tn, pr); bd.appendChild(tt);
    const nt = clip(it.note, 120); if (nt) { const n = document.createElement('div'); n.className = 'nt'; n.textContent = nt; bd.appendChild(n); }
    const bar = document.createElement('div'); bar.className = 'bar'; const bi = document.createElement('i');
    bi.style.width = t.n ? (t.g / t.n * 100) + '%' : '50%'; if (!t.n) { bar.style.background = '#eee'; bi.style.background = '#ddd'; }
    bar.appendChild(bi); bd.appendChild(bar);
    const vt = document.createElement('div'); vt.className = 'vote';
    const bg = document.createElement('button'); bg.className = 'g' + (mv === 'g' ? ' on' : ''); bg.textContent = `👍 그뤠잇 ${t.g}`; bg.onclick = () => vote(it.id, 'g');
    const bs = document.createElement('button'); bs.className = 's' + (mv === 's' ? ' on' : ''); bs.textContent = `👎 스튜핏 ${t.s}`; bs.onclick = () => vote(it.id, 's');
    vt.append(bg, bs); bd.appendChild(vt);
    const who = document.createElement('div'); who.className = 'who';
    const wn = document.createElement('span'); wn.textContent = `${clip(it.nick, 12) || '천사'} · ${hhmm(num(it.t, 0, 1e15, 0))}`; who.appendChild(wn);
    if (it.uid === net.uid) { const del = document.createElement('button'); del.textContent = '지우기'; del.onclick = () => delItem(it.id, del); who.appendChild(del); }
    bd.appendChild(who);
    bd.appendChild(commentBox(it));
    card.append(ph, bd); grid.appendChild(card);
  }
}
// ── 익명 코멘트 ──
function commentBox(it){
  const list = GS.comments[it.id] || [];
  const box = document.createElement('div'); box.className = 'cmts';
  const tog = document.createElement('button'); tog.className = 'cmt-tog';
  const open = openCmts.has(it.id);
  tog.textContent = `💬 익명 코멘트 ${list.length}${open ? ' ▲' : ' ▼'}`;
  tog.onclick = () => { if (open) openCmts.delete(it.id); else openCmts.add(it.id); renderGs(); };
  box.appendChild(tog);
  if (!open) return box;
  const ul = document.createElement('div'); ul.className = 'cmt-list';
  if (!list.length) { const e = document.createElement('div'); e.className = 'cmt-empty'; e.textContent = '첫 코멘트를 남겨 보세요.'; ul.appendChild(e); }
  for (const c of list) {
    const text = clip(c.text, 100); if (!text) continue;
    const row = document.createElement('div'); row.className = 'cmt';
    const who = document.createElement('div'); who.className = 'cmt-who';
    const nm = document.createElement('span'); nm.textContent = `😇 익명의 천사 · ${hhmm(num(c.t, 0, 1e15, 0))}`; who.appendChild(nm);
    if (it.uid === net.uid) {                                  // 물건 주인은 자기 물건의 코멘트를 지울 수 있어요
      const del = document.createElement('button'); del.textContent = '지우기';
      del.onclick = () => net.comments.remove(it.id, c.id).catch(() => { $('gsMsg').textContent = '코멘트를 지우지 못했어요.'; });
      who.appendChild(del);
    }
    const tx = document.createElement('div'); tx.className = 'cmt-text'; tx.textContent = text;
    row.append(who, tx); ul.appendChild(row);
  }
  box.appendChild(ul);
  const f = document.createElement('form'); f.className = 'cmt-form';
  const inp = document.createElement('input'); inp.maxLength = 100; inp.placeholder = '이름 없이 한마디 (100자)'; inp.value = cmtDrafts[it.id] || '';
  inp.oninput = () => { cmtDrafts[it.id] = inp.value; };
  inp.onblur = () => setTimeout(() => { if (gsPending) renderGs(); }, 0);
  const btn = document.createElement('button'); btn.type = 'submit'; btn.textContent = '등록';
  f.append(inp, btn);
  f.onsubmit = async e => {
    e.preventDefault();
    const text = clip(inp.value, 100); if (!text) return;
    btn.disabled = true;
    try { await net.comments.add(it.id, text); cmtDrafts[it.id] = ''; inp.value = ''; }
    catch (err) { console.warn(err); $('gsMsg').textContent = '코멘트를 남기지 못했어요.'; }
    btn.disabled = false; inp.blur(); renderGs();
  };
  box.appendChild(f);
  return box;
}
async function delItem(id, btn){
  if (btn.dataset.confirm !== '1') { btn.dataset.confirm = '1'; btn.textContent = '정말 지울까요?'; setTimeout(() => { btn.dataset.confirm = ''; btn.textContent = '지우기'; }, 3000); return; }
  try { await net.items.remove(id); } catch (e) { $('gsMsg').textContent = '지우지 못했어요.'; }
}
// 광장 게시판에 최근 물건 6개
function paintBoard(){
  const items = GS.items.filter(it => clip(it.title, 30)).slice(0, 6);
  boardFrames.forEach((f, i) => {
    const it = items[i];
    const t = it ? tally(it.id) : null, vd = t ? verdict(t) : null;
    const key = it ? `${it.id}|${t.g}|${t.s}` : 'empty';
    if (f.key === key) return; f.key = key;
    const g = f.c.getContext('2d'), w = f.c.width, h = f.c.height;
    const draw = img => {
      if (f.key !== key) return;
      g.fillStyle = '#f4f0fb'; g.fillRect(0, 0, w, h);
      if (!it) {
        g.fillStyle = '#b9aed0'; g.textAlign = 'center';
        g.font = '26px "Gowun Dodum", sans-serif'; g.fillText('비어 있는 자리', w / 2, h / 2 - 8);
        g.font = '20px "Gowun Dodum", sans-serif'; g.fillText('고민템을 올려 주세요', w / 2, h / 2 + 24);
        f.tex.needsUpdate = true; return;
      }
      if (img) { const s = Math.max(w / img.width, (h - 56) / img.height), iw = img.width * s, ih = img.height * s; g.save(); g.beginPath(); g.rect(0, 0, w, h - 56); g.clip(); g.drawImage(img, (w - iw) / 2, (h - 56 - ih) / 2, iw, ih); g.restore(); }
      g.fillStyle = '#fff'; g.fillRect(0, h - 56, w, 56);
      g.fillStyle = '#3d3550'; g.font = '700 24px "Gowun Dodum", sans-serif'; g.textAlign = 'left'; g.fillText(clip(it.title, 30).slice(0, 11), 12, h - 22);
      g.textAlign = 'right'; g.font = '20px "Gowun Dodum", sans-serif';
      g.fillStyle = '#2fa36b'; g.fillText(`👍${t.g}`, w - 62, h - 22); g.fillStyle = '#e0574b'; g.fillText(`👎${t.s}`, w - 10, h - 22);
      if (vd) {
        const col = vd === 'g' ? '#2fa36b' : vd === 's' ? '#e0574b' : '#c49a20';
        g.save(); g.translate(w - 70, 44); g.rotate(0.14);
        g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(-62, -22, 124, 44); g.strokeStyle = col; g.lineWidth = 4; g.strokeRect(-62, -22, 124, 44);
        g.fillStyle = col; g.font = '700 26px "Gowun Batang", serif'; g.textAlign = 'center'; g.fillText(vd === 'g' ? '그뤠잇!' : vd === 's' ? '스튜핏!' : '팽팽', 0, 9);
        g.restore();
      }
      f.tex.needsUpdate = true;
    };
    if (!it) return draw(null);
    net.items.image(it.id).then(src => {
      if (!validImg(src)) return draw(null);
      const im = new Image(); im.onload = () => draw(im); im.onerror = () => draw(null); im.src = src;
    });
  });
}
paintBoard();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => {
  meChar.labelText = ''; renderMe();
  for (const r of remotes.values()) { r.ch.labelText = ''; C.paintCharacter(r.ch, pCol(r.p), pHat(r.p), pName(r.p), pHair(r.p), pHc(r.p)); }
  boardFrames.forEach(f => f.key = null); paintBoard();
});

// ======================================================================
//  꾸미기 / 입장
// ======================================================================
// 캐릭터 미리보기 (꾸미기·입장 화면에서 빙글빙글)
const PV = (() => {
  let r = null;
  try { r = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return null; }
  r.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1)); r.setSize(190, 190);
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.25;
  const sc = new THREE.Scene();
  sc.add(new THREE.HemisphereLight(0xf2f4ff, 0xe0bfd8, 0.85));
  const dl = new THREE.DirectionalLight(0xffefd8, 0.8); dl.position.set(2, 4, 3); sc.add(dl);
  const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 50); cam.position.set(0, 1.35, 4.4); cam.lookAt(0, 1.0, 0);
  const PC = createCharacters(sc, W.gold, W.shadowTex);
  const ch = PC.makeCharacter(ME.col, ME.hat, ME.hair, ME.hc); ch.label.visible = false;
  let on = false, last = 0;
  const loop = now => {
    if (!on) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    ch.root.rotation.y += dt * 0.9;
    PC.animateCharacter(ch, dt, false, false, now / 1000);
    r.render(sc, cam); requestAnimationFrame(loop);
  };
  return {
    show(slotId, d){ $(slotId).appendChild(r.domElement); PC.paintCharacter(ch, d.col, d.hat, null, d.hair, d.hc); if (!on) { on = true; ch.root.rotation.y = -0.4; requestAnimationFrame(loop); } },
    update(d){ PC.paintCharacter(ch, d.col, d.hat, null, d.hair, d.hc); },
    hide(){ on = false; }
  };
})();

function picker(ids, draft){
  const redraw = () => picker(ids, draft);
  const sw = $(ids.col); sw.innerHTML = '';
  for (const c of COLORS) { const b = document.createElement('button'); b.style.background = c; b.className = c === draft.col ? 'on' : ''; b.title = '옷 색깔'; b.onclick = () => { draft.col = c; redraw(); }; sw.appendChild(b); }
  const hs = $(ids.hat); hs.innerHTML = '';
  for (const h of HATS) { const b = document.createElement('button'); b.className = h.id === draft.hat ? 'on' : ''; b.innerHTML = `<span>${h.ic}</span>${h.name}`; b.onclick = () => { draft.hat = h.id; redraw(); }; hs.appendChild(b); }
  const hr = $(ids.hair); hr.innerHTML = '';
  for (const h of HAIRS) { const b = document.createElement('button'); b.className = h.id === draft.hair ? 'on' : ''; b.innerHTML = `<span>${h.ic}</span>${h.name}`; b.onclick = () => { draft.hair = h.id; redraw(); }; hr.appendChild(b); }
  const hc = $(ids.hc); hc.innerHTML = '';
  for (const c of HAIR_COLORS) { const b = document.createElement('button'); b.style.background = c; b.className = c === draft.hc ? 'on' : ''; b.title = '머리 색'; b.onclick = () => { draft.hc = c; redraw(); }; hc.appendChild(b); }
  if (PV) PV.update(draft);
}
const draftOfMe = () => ({ col: ME.col, hat: ME.hat, hair: ME.hair, hc: ME.hc });
const applyDraft = d => { ME.col = d.col; ME.hat = d.hat; ME.hair = d.hair; ME.hc = d.hc; };

let meDraft = {};
const ME_IDS = { col: 'swatches', hat: 'hats', hair: 'meHairs', hc: 'meHairColors' };
$('meBtn').onclick = () => {
  meDraft = draftOfMe(); $('nickInput').value = ME.nick;
  openModal('meModal'); if (PV) PV.show('mePreviewSlot', meDraft); picker(ME_IDS, meDraft);
};
$('meSave').onclick = () => {
  applyDraft(meDraft); ME.nick = clip($('nickInput').value, 12) || ME.nick;
  saveMe(); renderMe(); sync(); closeModal('meModal');
};

let entered = false;
const entryDraft = draftOfMe();
function enter(){
  entered = true;
  closeModal('entryModal');
  startNet();
}
if (ME.nick) enter();
else {
  openModal('entryModal');
  if (PV) PV.show('entryPreviewSlot', entryDraft);
  picker({ col: 'entrySwatches', hat: 'entryHats', hair: 'entryHairs', hc: 'entryHairColors' }, entryDraft);
  setTimeout(() => $('entryNick').focus(), 100);
  $('entryNick').addEventListener('keydown', e => { if (e.key === 'Enter') $('entryGo').click(); });
  $('entryGo').onclick = () => {
    const nick = clip($('entryNick').value, 12);
    if (!nick) { $('entryMsg').textContent = '닉네임을 정해 주세요.'; return; }
    ME.nick = nick; applyDraft(entryDraft);
    saveMe(); renderMe(); enter();
  };
}

// ======================================================================
//  연결 시작
// ======================================================================
async function startNet(){
  setStatus('connecting');
  net = await createNet(firebaseConfig, setStatus);
  // 연결이 안 될 때 화면에 따로 안내하지 않고, 원인은 개발자 도구 콘솔에만 남겨요
  if (net.mode === 'solo') { setStatus('solo'); console.warn('[cloud-heaven]', SOLO_REASON[net.reason] || net.reason); }
  let warned = false; const onErr = () => { if (!warned) { warned = true; permBanner(); } };
  net.presence.subscribe(onPeers, onErr);
  net.chat.subscribe(onChatMsg, onErr);
  net.guestbook.subscribe(list => { GB.docs = list; GB.loaded = true; GB.err = null; renderGb(); }, e => { GB.err = '방명록을 불러올 수 없어요.'; renderGb(); onErr(e); });
  net.items.subscribe(list => { GS.items = list; GS.loaded = true; GS.err = null; renderGs(); paintBoard(); }, e => { GS.err = '판정소를 불러올 수 없어요.'; renderGs(); onErr(e); });
  net.comments.subscribe(c => { GS.comments = (c && typeof c === 'object') ? c : {}; renderGs(); }, onErr);
  net.votes.subscribe(v => { GS.votes = (v && typeof v === 'object') ? v : {}; renderGs(); paintBoard(); }, onErr);
  sync();
}
