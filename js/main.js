// 구름 위 쉼터 — 화면 조작, 사람들, 채팅, 방명록, 판정소를 묶는 진입점
import * as THREE from 'three';
import { $, store, clip, num, hhmm, COLORS, HATS, HAIRS, HAIR_COLORS, EMOTES, CHAT_TTL } from './util.js';
import { createWorld } from './world.js';
import { createCharacters } from './character.js';
import { createNet } from './net.js';
import { playThrow, playHit, playHuff, soundOn, setSound } from './sound.js';
import { textCanvas, makeSprite, setSprite } from './sprites.js';
import { buildHeartFigure } from './statue.js';
import { createBand } from './band.js';
import { firebaseConfig } from './firebase-config.js';

// ======================================================================
//  3D 세계 준비
// ======================================================================
let W;
try { W = createWorld($('scene')); }
catch (e) { console.error(e); $('nowebgl').style.display = 'flex'; $('loading').classList.add('hide'); throw e; }
const { renderer, scene, camera, colliders, clickables, ZONES, boardFrames, gbFrames, ISLAND_R, SEATS, SPRING, SNOW, BAND, SPAWN, PLAY, XMAS, floorAt } = W;
const SNOW_ZONE = { id: 'sn', x: SNOW.x, z: SNOW.z, r: SNOW.range - 1 };
for (const s of SEATS) colliders.push({ x: s.x, z: s.z, r: 0.85 });
const C = createCharacters(scene, W.gold, W.shadowTex);

// ======================================================================
//  하트 동상 (캐릭터의 약 3배 크기, 하얀 정장에 손하트를 한 피규어)
// ======================================================================
const STATUE = W.STATUE;   // 광장 한가운데
{
  const g = new THREE.Group(); g.position.set(STATUE.x, 0, STATUE.z); g.scale.setScalar(0.72); scene.add(g);   // 아담한 광장에 맞춘 크기
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
  const plaque = makeSprite(textCanvas(['💜 구름 위의 하트 동상'], { font: 34 }), 0.8); plaque.position.y = 8.6; g.add(plaque);
  colliders.push({ x: STATUE.x, z: STATUE.z, r: 2.0 });
  ZONES.st = { id: 'st', name: '구름 위의 하트 동상', x: STATUE.x, z: STATUE.z, r: 4.6 };
  g.traverse(o => { if (o.isMesh) { o.userData.zone = 'st'; clickables.push(o); } });
  W.bake(g);   // 동상 조각들도 한 덩어리로
}

// ======================================================================
//  밴드 무대 합주
// ======================================================================
const BAND_IDS = new Set(BAND.parts.map(p => p.id));

// ======================================================================
//  유니콘 놀이터 (그네·시소): E로 타고 내려요
// ======================================================================
const RIDE_IDS = new Set(PLAY.rides.map(r => r.id));
const rideOf = id => PLAY.rides.find(r => r.id === id);
function nearRide(){ let best = null, bd = 1.9; for (const r of PLAY.rides) { const d = Math.hypot(ME.x - r.x, ME.z - r.z); if (d < bd) { bd = d; best = r; } } return best; }
const rideTaken = id => { for (const r of remotes.values()) if (r.ride === id) return r; return null; };
function setRide(id){
  if (id) {
    const r = rideOf(id); if (!r || rideTaken(id)) return;
    if (ME.sit) setSit(false); if (ME.wor) setWorship(false); if (ME.band) setBand(null);
    ME.x = r.x; ME.z = r.z; ME.y = 0; ME.vy = 0; target = null; pendingZone = null; marker.visible = false;
  } else if (ME.ride) { const r = rideOf(ME.ride); ME.x = r.x; ME.z = r.z; ME.y = 0; ME.vy = 2.5; }   // 폴짝 내려와요
  ME.ride = id || null; sync(); updatePrompt();
}
function tickPlay(){
  PLAY.now = (net ? net.serverNow() : Date.now()) / 1000;
  PLAY.occ.clear(); if (ME.ride) PLAY.occ.add(ME.ride);
  for (const r of remotes.values()) if (r.ride) PLAY.occ.add(r.ride);
}
const band = createBand();
// 무대 위나 악기 가까이에 오면 '연주하기' 버튼이 떠요 (가장 가까운 악기)
const BAND_KEYS = { guitar: 'G', bass: 'B', drums: 'R', keys: 'P' };   // D는 이동키라서 드럼은 R(리듬)
const nearStage = () => Math.hypot(ME.x - BAND.x, ME.z - BAND.z) < BAND.r + 1.8;
function nearInstrument(){
  const onStage = Math.hypot(ME.x - BAND.x, ME.z - BAND.z) < BAND.r + 1.2;
  let best = null, bd = onStage ? 99 : 2.2;
  for (const p of BAND.parts) { const d = Math.hypot(ME.x - p.x, ME.z - p.z); if (d < bd) { bd = d; best = p; } }
  return best;
}
const takenBy = id => { for (const r of remotes.values()) if (r.band === id && !r.mv) return r; return null; };
function setBand(id){
  if (id) {
    const p = BAND.parts.find(q => q.id === id); if (!p) return;
    if (ME.sit) setSit(false); if (ME.wor) setWorship(false);
    ME.x = p.x; ME.z = p.z; ME.y = 0; ME.vy = 0; ME.ry = p.ry; target = null; pendingZone = null; marker.visible = false;
  }
  ME.band = id || null;
  sync(); updatePrompt();
}
function tickBand(){
  const playing = new Set(); if (ME.band) playing.add(ME.band);
  for (const r of remotes.values()) if (r.band && !r.mv) playing.add(r.band);
  for (const p of BAND.parts) p.active = playing.has(p.id);
  const now = net ? net.serverNow() : Date.now();
  BAND.beat = playing.size ? band.beat(now) : 0;
  const d = Math.hypot(ME.x - BAND.x, ME.z - BAND.z);
  band.tick(now, playing, Math.max(0, Math.min(1, 1 - (d - 10) / 30)));
}

// ======================================================================
//  나
// ======================================================================
const saved = store.get('heaven-me') || {};
const ME = {
  x: SPAWN.x + (Math.random() - 0.5) * 4, z: SPAWN.z + Math.random() * 2, y: 0, vy: 0, ry: Math.PI,
  col: COLORS.includes(saved.col) ? saved.col : COLORS[Math.floor(Math.random() * COLORS.length)],
  hat: HATS.some(h => h.id === saved.hat) ? saved.hat : 'halo',
  hair: HAIRS.some(h => h.id === saved.hair) ? saved.hair : HAIRS[Math.floor(Math.random() * HAIRS.length)].id,
  hc: HAIR_COLORS.includes(saved.hc) ? saved.hc : HAIR_COLORS[Math.floor(Math.random() * 3)],
  nick: clip(saved.nick, 12), emo: null, thr: null, sit: false, wor: false, bath: false, band: null, ride: null, moving: false
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
           col: ME.col, hat: ME.hat, hair: ME.hair, hc: ME.hc, nick: ME.nick || '천사', mv: ME.moving, sit: ME.sit, wor: ME.wor, bath: ME.bath, band: ME.band, ride: ME.ride, emo: ME.emo, thr: ME.thr };
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
const lastEmo = new Map(), lastThr = new Map();
let peersReadyAt = 0;
function onPeers(list){
  const now = Date.now();
  if (!peersReadyAt) peersReadyAt = now;
  const alive = new Set(list.map(e => e.key));
  for (const [k, r] of remotes) if (!alive.has(k)) {
    C.disposeCharacter(r.ch); remotes.delete(k);
  }
  for (const e of list) {
    const p = e.p;
    const tx = num(p.x, -50, 50, 0), tz = num(p.z, -50, 50, 28), ty = num(p.y, 0, 5, 0), tr = num(p.ry, -10, 10, 0);
    let r = remotes.get(e.key);
    if (!r) {
      r = { ch: C.makeCharacter(pCol(p), pHat(p), pHair(p), pHc(p)), x: tx, z: tz, y: ty, ry: tr, uid: e.uid };
      remotes.set(e.key, r);
    }
    Object.assign(r, { tx, tz, ty, tr, p, mv: !!p.mv, sit: !!p.sit, wor: !!p.wor, bath: !!p.bath, band: BAND_IDS.has(p.band) ? p.band : null, ride: RIDE_IDS.has(p.ride) ? p.ride : null });
    C.paintCharacter(r.ch, pCol(p), pHat(p), pName(p), pHair(p), pHc(p));
    if (p.thr && typeof p.thr === 'object') {
      const t = num(p.thr.t, 0, 1e15, 0);
      if (lastThr.get(e.key) !== t) {
        const first = !lastThr.has(e.key); lastThr.set(e.key, t);
        if (!first || now - t < 2000) {
          const to = new THREE.Vector3(num(p.thr.tx, -60, 60, SNOW.x), num(p.thr.ty, 0, 6, 2), num(p.thr.tz, -60, 60, SNOW.z));
          const vol = Math.max(0, 1 - Math.hypot(ME.x - r.x, ME.z - r.z) / 35);
          throwFrom(r.ch, r.x, r.z, to, vol);
        }
      }
    }
    if (p.emo && typeof p.emo === 'object') {
      const t = num(p.emo.t, 0, 1e15, 0), em = EMOTES.includes(p.emo.e) ? p.emo.e : null;
      if (em && lastEmo.get(e.key) !== t) { const first = !lastEmo.has(e.key); lastEmo.set(e.key, t); if (!first || now - t < 3000) C.emoteOn(r.ch, em); }
    }
  }
  peers = list;
  setStatus(status);
  if (nearStage() || ME.ride || nearRide()) updatePrompt();   // 친구가 악기·놀이기구를 잡거나 놓으면 버튼 상태도 바꿔요
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
  if (hit && hit.object.userData.zone) {
    // 동상·눈사람·악기는 클릭하면 가까이 걸어가기만 하고, 숭배·던지기·연주는 버튼(X)으로 해요
    const zid = hit.object.userData.zone;
    const approach = (x, z, d) => { const dx = ME.x - x, dz = ME.z - z, l = Math.hypot(dx, dz) || 1; if (l <= d + 0.3) { updatePrompt(); return; } walkTo(x + dx / l * d, z + dz / l * d, null); };
    if (zid.startsWith('bd:')) { const bp = BAND.parts.find(q => 'bd:' + q.id === zid); if (bp && ME.band !== bp.id) approach(bp.x, bp.z, 1.3); return; }
    if (zid === 'orn') { const o = ORN_SPR[hit.object.userData.slot]; if (o && o.wish) showOrnament(wishesShown().indexOf(o.wish)); return; }
    if (zid.startsWith('pl:')) { const r = zid === 'pl:ss' ? [rideOf('ss0'), rideOf('ss1')].sort((a, b) => Math.hypot(ME.x - a.x, ME.z - a.z) - Math.hypot(ME.x - b.x, ME.z - b.z))[0] : rideOf(zid.slice(3)); if (r && !ME.ride) approach(r.x, r.z, 0.6); return; }
    if (zid === 'sn') { approach(SNOW.x, SNOW.z, 4.5); return; }
    if (zid === 'st') { approach(STATUE.x, STATUE.z, 3.6); return; }
    const z = ZONES[zid]; walkTo(z.x, z.z, z); return;   // 게시판·판정소·소원 트리도 클릭하면 앞까지 가기만 해요 (열기는 E)
  }
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
    if (d < zone.r) { updatePrompt(); return; }   // 이미 앞이면 버튼만 보여줘요
    const k = (zone.r - 1.5) / d; x = zone.x + (ME.x - zone.x) * k; z = zone.z + (ME.z - zone.z) * k;
  }
  target = { x, z }; pendingZone = null;   // 도착해도 저절로 열지 않아요 (열기·타기 등은 버튼으로) marker.position.set(x, 0.05, z); marker.visible = true;
  if (ME.sit) setSit(false);
  if (ME.wor) setWorship(false);
}

document.addEventListener('keydown', e => {
  const m = anyModal();
  if (e.key === 'Escape' && m && m.id !== 'entryModal') { closeModal(m.id); return; }
  if (typing() || m) return;
  if (e.key === 'Enter') { e.preventDefault(); $('chatInput').focus(); return; }
  // 상호작용 키: 앉기 E · 숭배/던지기 X · 기타 G · 베이스 B · 드럼 R · 건반 P (화면 아래 버튼과 같아요)
  if (e.code.startsWith('Key') && !e.repeat) { const act = actions.find(a => a.key === e.code.slice(3) && !a.disabled); if (act) { e.preventDefault(); act.fn(); return; } }
  if (e.code === 'Space') { e.preventDefault(); if (ME.ride) { setRide(null); return; } if (ME.wor) setWorship(false); if (ME.sit) { setSit(false); return; } if (ME.y <= 0.001) ME.vy = 6.5; return; }
  const k = KEYMAP[e.code]; if (k) { keys[k] = true; e.preventDefault(); if (ME.sit) setSit(false); if (ME.wor) setWorship(false); }
});
document.addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) keys[k] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

// ======================================================================
//  장소 안내
// ======================================================================
let curZone = null, curSeat = null, curInst = null, promptKey = '', actions = [];
function nearSeat(){ let best = null, bd = 2.1; for (const s of SEATS) { const d = Math.hypot(ME.x - s.x, ME.z - s.z); if (d < bd) { bd = d; best = s; } } return best; }
function updatePrompt(){
  let z = null;
  for (const k in ZONES) { const q = ZONES[k]; if (Math.hypot(ME.x - q.x, ME.z - q.z) < q.r) z = q; }
  curZone = z; curSeat = nearSeat(); curInst = null;
  const A = []; let txt = '';
  const instButtons = () => { for (const p of BAND.parts) { const by = p.id === ME.band ? null : takenBy(p.id); A.push({ label: p.id === ME.band ? '그만하기' : `${p.emo} ${p.name}`, key: BAND_KEYS[p.id], fn: () => setBand(p.id === ME.band ? null : p.id), disabled: !!by, title: by ? `${pName(by.p)}님이 연주 중` : '' }); } };
  if (ME.bath) txt = '♨️ 따끈한 구름 온천… 얼굴이 점점 발그레해져요';
  else if (ME.ride) {
    const r = rideOf(ME.ride);
    txt = r.kind === 'swing' ? '🦄 슝~ 유니콘 그네를 타는 중!' : (rideTaken(ME.ride === 'ss0' ? 'ss1' : 'ss0') ? '🦄 콩닥콩닥 오르락내리락!' : '🦄 반대편에 친구가 타면 오르락내리락해요');
    A.push({ label: '내리기', key: 'E', fn: () => setRide(null) });
  }
  else if (ME.band) { const bp = BAND.parts.find(q => q.id === ME.band); txt = `${bp.emo} ${bp.name} 연주 중! 친구가 다른 악기를 잡으면 합주가 돼요`; instButtons(); }
  else if (ME.wor) { txt = '하트 동상을 향해 마음을 다해 숭배하는 중…'; A.push({ label: '그만하기', key: 'X', fn: () => setWorship(false) }); }
  else if (ME.sit) { txt = '잠깐 앉아서 쉬는 중이에요'; A.push({ label: '일어나기', key: 'E', fn: () => setSit(false) }); }
  else {
    if (nearStage()) { txt = '🎵 연주할 악기를 골라요'; instButtons(); }
    if (z && z.id === 'st') { txt = txt || '구름 위의 하트 동상 앞이에요'; A.push({ label: '숭배하기', key: 'X', fn: () => setWorship(true) }); }
    else if (z) { txt = txt || ({ gb: '📌 방명록 게시판 앞이에요', gs: '그뤠잇·스튜핏 판정소 앞이에요', xm: '🎄 소원 트리 앞이에요' })[z.id]; A.push({ label: '열기', key: 'E', fn: () => openZone(z) }); }
    if (curSeat && !(z && z.id !== 'st')) { txt = txt || '잠깐 앉았다 갈까요?'; A.push({ label: '앉기', key: 'E', fn: () => setSit(true) }); }
    if (nearSnow()) { txt = txt || '☃️ 눈사람에게 눈덩이를 던져 봐요'; A.push({ label: '던지기', key: 'X', fn: doThrow }); }
    const nr = !curSeat && !z && nearRide();
    if (nr) { const by = rideTaken(nr.id); txt = txt || (by ? `🦄 ${pName(by.p)}님이 타고 있어요` : `🦄 ${nr.name}예요`); A.push({ label: nr.kind === 'swing' ? '그네 타기' : '시소 타기', key: 'E', fn: () => setRide(nr.id), disabled: !!by }); }
  }
  actions = A;
  const key = txt + '|' + A.map(a => a.label + a.key + (a.disabled ? 1 : 0)).join(',');
  if (key === promptKey) return;
  promptKey = key; $('prompt').classList.toggle('show', !!txt);
  $('promptTxt').textContent = txt;
  const box = $('promptBtns'); box.innerHTML = '';
  for (const a of A) {
    const b = document.createElement('button'); b.className = 'btn primary'; b.disabled = !!a.disabled; if (a.title) b.title = a.title;
    b.append(a.disabled ? a.label.replace(/^\p{Extended_Pictographic}\s*/u, '') + ' 🔒' : a.label); const k = document.createElement('kbd'); k.textContent = a.key; b.appendChild(k);
    b.onclick = () => { if (!a.disabled) a.fn(); };
    box.appendChild(b);
  }
}

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
function arrive(){ target = null; marker.visible = false; updatePrompt(); }
// 움직일 때는 초당 30번, 아무도 안 움직이고 가만히 있을 때는 초당 12번만 다시 그려요
const FRAME_MS = 1000 / 30, IDLE_MS = 1000 / 12;
let lastDraw = 0, lastActive = 0;
const wake = () => { lastActive = performance.now(); };
for (const ev of ['keydown', 'pointerdown', 'pointermove', 'wheel', 'touchmove']) addEventListener(ev, wake, { passive: true });
function busy(){
  if (ME.moving || ME.y > 0 || target || shots.length || W.busy() || performance.now() - lastActive < 1500) return true;
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
    const sp = ME.bath ? SPEED * 0.5 : SPEED;   // 물속에서는 천천히
    const [nx, nz] = collide(ME.x + mx * sp * dt, ME.z + mz * sp * dt);
    if (Math.hypot(nx - ME.x, nz - ME.z) > 0.002) { ME.x = nx; ME.z = nz; moving = true; }
    else if (target) arrive();
    let diff = Math.atan2(mx, mz) - ME.ry; while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2;
    ME.ry += diff * Math.min(1, dt * 12);
  }
  if (!ME.sit && (ME.y > 0 || ME.vy > 0)) { ME.vy -= 18 * dt; ME.y = Math.max(0, ME.y + ME.vy * dt); if (ME.y === 0) ME.vy = 0; sync(); }
  if (moving !== wasMoving) { wasMoving = moving; ME.moving = moving; sync(); }
  if (moving) {
    const inBath = Math.hypot(ME.x - SPRING.x, ME.z - SPRING.z) < SPRING.r - 0.3 && ME.y < 0.05;
    if (inBath !== ME.bath) { ME.bath = inBath; if (inBath && ME.sit) setSit(false); }
    sync(); updatePrompt();
  }
  const myFloor = floorAt(ME.x, ME.z);   // 무대·정자 위에선 그만큼 올라서요
  meChar.root.position.set(ME.x, myFloor + ME.y, ME.z); meChar.root.rotation.y = ME.ry;
  if (ME.wor) { let diff = Math.atan2(STATUE.x - ME.x, STATUE.z - ME.z) - ME.ry; while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2; ME.ry += diff * Math.min(1, dt * 6); if (Math.abs(diff) > 0.02) sync(); }
  // 밴드: 악기 자리 동그라미 위에 서 있으면 연주해요
  if (ME.band && (ix || iz || target || ME.y > 0.05)) setBand(null);
  if (ME.ride && (ix || iz || target)) setRide(null);   // 걸어가면 내려요
  tickPlay();
  if (ME.ride) { const ps = rideOf(ME.ride).pose(); meChar.root.position.set(ps.x, ps.y, ps.z); meChar.root.rotation.y = ME.ry = ps.ry; }   // 다른 데로 걸어가거나 점프하면 연주를 멈춰요
  if (ME.band && !moving) { const bp = BAND.parts.find(q => q.id === ME.band); let diff = bp.ry - ME.ry; while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2; ME.ry += diff * Math.min(1, dt * 6); }
  C.animateCharacter(meChar, dt, moving, ME.sit || !!ME.ride, t, ME.wor, ME.bath, ME.band);

  const k = Math.min(1, dt * 7);
  for (const r of remotes.values()) {
    r.x += (r.tx - r.x) * k; r.z += (r.tz - r.z) * k; r.y += (r.ty - r.y) * Math.min(1, dt * 12);
    let diff = r.tr - r.ry; while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2; r.ry += diff * k;
    if (r.ride) { const ps = rideOf(r.ride).pose(); r.ch.root.position.set(ps.x, ps.y, ps.z); r.ch.root.rotation.y = r.ry = ps.ry; }
    else { r.ch.root.position.set(r.x, floorAt(r.x, r.z) + r.y, r.z); r.ch.root.rotation.y = r.ry; }
    C.animateCharacter(r.ch, dt, r.mv, r.sit || !!r.ride, t, r.wor, r.bath, r.band);
  }

  camYawCur += (camYaw - camYawCur) * Math.min(1, dt * 10);
  const cx = ME.x + Math.sin(camYawCur) * Math.cos(camPitch) * camDist, cz = ME.z + Math.cos(camYawCur) * Math.cos(camPitch) * camDist;
  const camY = myFloor + ME.y * 0.5;
  const cy = Math.max(0.6, camY + 1.4 + Math.sin(camPitch) * camDist);
  camera.position.lerp(tmpV.set(cx, cy, cz), firstFrame ? 1 : Math.min(1, dt * 8));
  camera.lookAt(ME.x, camY + 1.5, ME.z);

  tickBand();
  W.tick(dt, t);
  tickShots(dt);
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
// 30분 지난 대화는 대화창에서도 지워요
setInterval(() => {
  const cut = (net ? net.serverNow() : Date.now()) - CHAT_TTL;
  const keep = chatLog.filter(m => m.t >= cut);
  if (keep.length !== chatLog.length) { chatLog.length = 0; chatLog.push(...keep); renderLog(); }
}, 30000);
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
//  눈덩이 던지기
// ======================================================================
const shots = [];
const ballGeo = new THREE.SphereGeometry(0.16, 14, 10), ballMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x3a3848, emissiveIntensity: 0.35 });
function nearSnow(){ return Math.hypot(ME.x - SNOW.x, ME.z - SNOW.z) < SNOW.range; }
// 캐릭터가 팔을 휘두르고, 화난 얼굴로 김을 뿜으며 눈덩이를 던져요
function throwFrom(ch, x, z, to, vol){
  C.throwAnim(ch); C.angry(ch);
  playThrow(vol); playHuff(vol * 0.8);
  setTimeout(() => {
    const yaw = ch.root.rotation.y;
    const from = new THREE.Vector3(x + Math.cos(yaw) * 0.32, ch.root.position.y + 1.25, z - Math.sin(yaw) * 0.32);
    const m = new THREE.Mesh(ballGeo, ballMat); m.position.copy(from); scene.add(m);
    const dist = from.distanceTo(to);
    shots.push({ m, from, to, t: 0, dur: 0.35 + dist * 0.045, arc: 0.6 + dist * 0.12, vol });
  }, 230);
}
function tickShots(dt){
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i]; s.t += dt;
    const k = Math.min(1, s.t / s.dur);
    s.m.position.lerpVectors(s.from, s.to, k); s.m.position.y += Math.sin(k * Math.PI) * s.arc;
    if (k >= 1) { scene.remove(s.m); shots.splice(i, 1); SNOW.hit(s.to); playHit(s.vol); }
  }
}
let thrN = 0, lastThrow = 0;
function doThrow(){
  if (!nearSnow()) return;
  const now = performance.now(); if (now - lastThrow < 650) return; lastThrow = now;
  if (ME.sit) setSit(false);
  ME.ry = Math.atan2(SNOW.x - ME.x, SNOW.z - ME.z); meChar.root.rotation.y = ME.ry;
  const to = SNOW.target();
  ME.thr = { n: ++thrN, t: Date.now(), tx: +to.x.toFixed(2), ty: +to.y.toFixed(2), tz: +to.z.toFixed(2) };
  sync();
  throwFrom(meChar, ME.x, ME.z, to, 1);
}
// 소리 켜기/끄기
{
  const b = $('soundBtn');
  const paint = () => { b.textContent = soundOn() ? '🔊' : '🔇'; b.title = soundOn() ? '소리 끄기' : '소리 켜기'; };
  b.onclick = () => { setSound(!soundOn()); paint(); };
  paint();
}

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
function openZone(z){ if (z.id === 'bd') { if (!takenBy(z.part.id)) setBand(z.part.id); else updatePrompt(); return; } if (z.id === 'sn') { doThrow(); return; } if (z.id === 'st') { setWorship(true); return; } if (z.id === 'gb') { openModal('gbModal'); renderGb(); } else if (z.id === 'xm') { openModal('wishModal'); $('wishNote').textContent = net ? `${myName()} 이름으로 달려요.` : '연결 중…'; renderWishes(); setTimeout(() => $('wishText').focus(), 50); } else { openModal('gsModal'); renderGs(); } }

// ======================================================================
//  방명록
// ======================================================================
const GB = { docs: [], loaded: false, err: null };
const validDraw = s => typeof s === 'string' && /^data:image\/(png|webp|jpeg);base64,[A-Za-z0-9+/=]+$/.test(s) && s.length < 160000;
const gbImg = d => (d.draw && net && net.guestbook.image) ? net.guestbook.image(d.id).then(v => validDraw(v) ? v : null).catch(() => null) : Promise.resolve(null);
const gbWhen = t => { const dt = new Date(t); return `${dt.getMonth() + 1}/${dt.getDate()} ${hhmm(t)}`; };
function renderGb(){
  const list = $('gbList'); list.innerHTML = '';
  $('gbNote').textContent = net ? `${myName()} 이름으로 붙여져요.` : '연결 중…';
  if (GB.err && !GB.docs.length) { list.innerHTML = `<div class="empty">${GB.err}</div>`; return; }
  const docs = GB.docs.filter(d => clip(d.text, 200) || d.draw);
  if (!docs.length) { list.innerHTML = `<div class="empty">${GB.loaded ? '아직 아무도 쪽지를 붙이지 않았어요. 첫 번째 주인공이 되어 보세요!' : '불러오는 중…'}</div>`; return; }
  for (const d of docs) {
    const it = document.createElement('div'); it.className = 'gb-item';
    if (d.draw) { const im = document.createElement('img'); im.alt = '그림'; im.loading = 'lazy'; it.appendChild(im); gbImg(d).then(v => { if (v) im.src = v; else im.remove(); }); }
    const text = clip(d.text, 200);
    if (text) { const body = document.createElement('div'); body.textContent = text; it.appendChild(body); }
    const by = document.createElement('div'); by.className = 'by';
    const sw = document.createElement('i'); sw.style.background = COLORS.includes(d.col) ? d.col : '#ddd';
    const nm = document.createElement('span'); nm.textContent = `${clip(d.nick, 12) || '천사'} · ${gbWhen(num(d.t, 0, 1e15, 0))}`;
    by.append(sw, nm);
    if (net && d.uid === net.uid && net.guestbook.remove) {
      const del = document.createElement('button'); del.className = 'del'; del.type = 'button'; del.textContent = '떼기';
      del.onclick = () => tapConfirm(del, '정말 뗄까요?', async () => { try { await net.guestbook.remove(d.id); } catch (e) { console.warn(e); $('gbNote').textContent = '떼지 못했어요.'; } });
      by.appendChild(del);
    }
    it.appendChild(by); list.appendChild(it);
  }
}
// 광장 게시판에 최근 쪽지 6장을 그려요
const NOTE_BG = ['#fff8c9', '#ffe1ec', '#dff1ff', '#e6f7df', '#f0e6ff', '#ffead6'];
function paintGbBoard(){
  const docs = GB.docs.filter(d => clip(d.text, 200) || d.draw).slice(0, 6);
  gbFrames.forEach((f, i) => {
    const d = docs[i], key = d ? d.id : 'empty' + i;
    if (f.key === key) return; f.key = key;
    const g = f.c.getContext('2d'), w = f.c.width, h = f.c.height;
    const draw = img => {
      if (f.key !== key) return;
      g.clearRect(0, 0, w, h);
      g.fillStyle = d ? NOTE_BG[i % NOTE_BG.length] : 'rgba(255,255,255,0.55)'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#e86a92'; g.beginPath(); g.arc(w / 2, 14, 8, 0, Math.PI * 2); g.fill();
      g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      if (!d) { g.fillStyle = '#b9aed0'; g.font = '22px "Gowun Dodum", sans-serif'; g.fillText('빈 자리', w / 2, h / 2); g.font = '17px "Gowun Dodum", sans-serif'; g.fillText('쪽지를 붙여 주세요', w / 2, h / 2 + 26); f.tex.needsUpdate = true; return; }
      const text = clip(d.text, 200);
      let y = 34;
      if (img) {
        const box = text ? 150 : 186, s = Math.min(box / img.width, box / img.height), iw = img.width * s, ih = img.height * s;
        g.fillStyle = '#fff'; g.fillRect((w - box) / 2 - 4, y - 4, box + 8, box + 8);
        g.drawImage(img, (w - iw) / 2, y + (box - ih) / 2, iw, ih); y += box + 26;
      } else y = 58;
      g.fillStyle = '#3d3550'; g.font = '19px "Gowun Dodum", sans-serif';
      const lines = wrapLines(g, text, w - 28, img ? 1 : 6);
      lines.forEach((l, k) => g.fillText(l, w / 2, y + k * 25));
      g.fillStyle = '#8a7fa6'; g.font = '15px "Gowun Dodum", sans-serif'; g.fillText(`— ${clip(d.nick, 12) || '천사'}`, w / 2, h - 12);
      f.tex.needsUpdate = true;
    };
    draw(null);
    if (d && d.draw) gbImg(d).then(v => { if (!v || f.key !== key) return; const im = new Image(); im.onload = () => draw(im); im.src = v; });
  });
}
function wrapLines(g, text, maxW, maxLines){
  const out = []; let cur = '';
  for (const ch of [...(text || '')]) {
    if (ch === '\n') { out.push(cur); cur = ''; continue; }
    if (g.measureText(cur + ch).width > maxW) { out.push(cur); cur = ch; } else cur += ch;
  }
  if (cur) out.push(cur);
  if (out.length > maxLines) { out.length = maxLines; out[maxLines - 1] = out[maxLines - 1].slice(0, -1) + '…'; }
  return out;
}

// 그림판: 사진(바탕) + 펜·지우개·글자(덧그림) 두 겹으로 그려요
//   - 지우개는 덧그림만 지워서 사진은 그대로 남아요
const PAD = { c: $('gbCanvas'), color: '#3d3550', size: 6, tool: 'pen', drawn: false, undo: [] };
{
  const W0 = PAD.c.width, H0 = PAD.c.height, g = PAD.c.getContext('2d');
  const layer = () => { const c = document.createElement('canvas'); c.width = W0; c.height = H0; return c; };
  const bg = layer(), ink = layer(), bgx = bg.getContext('2d'), inkx = ink.getContext('2d');
  const render = () => { g.clearRect(0, 0, W0, H0); g.drawImage(bg, 0, 0); g.drawImage(ink, 0, 0); };
  const reset = () => { bgx.fillStyle = '#ffffff'; bgx.fillRect(0, 0, W0, H0); inkx.clearRect(0, 0, W0, H0); PAD.drawn = false; PAD.undo = []; render(); };
  const snap = () => { PAD.undo.push({ bg: bgx.getImageData(0, 0, W0, H0), ink: inkx.getImageData(0, 0, W0, H0), drawn: PAD.drawn }); if (PAD.undo.length > 12) PAD.undo.shift(); };
  reset(); PAD.reset = reset;
  const openPad = () => { $('gbDraw').hidden = false; $('gbDrawToggle').textContent = '🎨 그림 접기'; };
  const setTool = t => {
    PAD.tool = t;
    for (const [id, k] of [['gbPen', 'pen'], ['gbEraser', 'eraser'], ['gbTextTool', 'text']]) $(id).classList.toggle('on', k === t);
    $('gbStamp').hidden = t !== 'text'; if (t === 'text') $('gbStamp').focus();
    PAD.c.style.cursor = t === 'text' ? 'text' : 'crosshair';
  };
  const PCOLS = ['#3d3550', '#e8566b', '#ff9a3c', '#f5c518', '#4cb36a', '#4a90e2', '#8a6ad6', '#f28bb5', '#8b5e3c', '#ffffff'];
  for (const c of PCOLS) {
    const b = document.createElement('button'); b.type = 'button'; b.style.background = c; b.title = c;
    b.onclick = () => { PAD.color = c; if (PAD.tool === 'eraser') setTool('pen'); for (const x of $('gbColors').children) x.classList.toggle('on', x === b); };
    if (c === PAD.color) b.classList.add('on');
    $('gbColors').appendChild(b);
  }
  for (const sz of [3, 6, 12, 20]) {
    const b = document.createElement('button'); b.type = 'button'; b.title = `${sz}px`;
    const i = document.createElement('i'); i.style.width = i.style.height = Math.max(4, sz * 0.9) + 'px'; b.appendChild(i);
    b.onclick = () => { PAD.size = sz; for (const x of $('gbSizes').children) x.classList.toggle('on', x === b); };
    if (sz === PAD.size) b.classList.add('on');
    $('gbSizes').appendChild(b);
  }
  PAD.reset = () => { reset(); setTool('pen'); $('gbStamp').value = ''; };   // 붙이고 나면 깨끗하게
  $('gbPen').onclick = () => setTool('pen');
  $('gbEraser').onclick = () => setTool(PAD.tool === 'eraser' ? 'pen' : 'eraser');
  $('gbTextTool').onclick = () => setTool(PAD.tool === 'text' ? 'pen' : 'text');
  $('gbClear').onclick = () => { if (PAD.drawn) tapConfirm($('gbClear'), '🗑️ 한 번 더', () => reset()); else reset(); };
  $('gbUndo').onclick = () => { const u = PAD.undo.pop(); if (!u) return; bgx.putImageData(u.bg, 0, 0); inkx.putImageData(u.ink, 0, 0); PAD.drawn = u.drawn; render(); };
  $('gbDrawToggle').onclick = () => { const open = $('gbDraw').hidden; $('gbDraw').hidden = !open; $('gbDrawToggle').textContent = open ? '🎨 그림 접기' : '🎨 그림도 그리기'; };
  // 사진 넣기: 정사각형으로 가운데를 잘라 바탕에 깔아요 (그 위에 그리거나 글자를 쓸 수 있어요)
  $('gbPhotoBtn').onclick = () => $('gbPhoto').click();
  $('gbPhoto').onchange = () => {
    const f = $('gbPhoto').files[0]; $('gbPhoto').value = '';
    if (!f || !/^image\//.test(f.type)) return;
    const url = URL.createObjectURL(f), im = new Image();
    im.onload = () => {
      snap();
      const s = Math.max(W0 / im.width, H0 / im.height), w = im.width * s, h = im.height * s;
      bgx.fillStyle = '#ffffff'; bgx.fillRect(0, 0, W0, H0);
      bgx.drawImage(im, (W0 - w) / 2, (H0 - h) / 2, w, h);
      URL.revokeObjectURL(url); PAD.drawn = true; render(); openPad();
      $('gbNote').textContent = '사진 위에 그림을 그리거나 🔤 글자를 써 보세요.';
    };
    im.onerror = () => { URL.revokeObjectURL(url); $('gbNote').textContent = '이 사진은 열 수 없어요. 다른 사진을 골라 주세요.'; };
    im.src = url;
  };
  let last = null;
  const pos = e => { const r = PAD.c.getBoundingClientRect(); return [(e.clientX - r.left) * W0 / r.width, (e.clientY - r.top) * H0 / r.height]; };
  const stroke = (a, b) => {
    inkx.globalCompositeOperation = PAD.tool === 'eraser' ? 'destination-out' : 'source-over';
    inkx.strokeStyle = PAD.color; inkx.lineWidth = PAD.tool === 'eraser' ? PAD.size * 2.2 : PAD.size; inkx.lineCap = inkx.lineJoin = 'round';
    inkx.beginPath(); inkx.moveTo(a[0], a[1]); inkx.lineTo(b[0], b[1]); inkx.stroke();
    inkx.globalCompositeOperation = 'source-over'; render();
  };
  PAD.c.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (PAD.tool === 'text') {
      const text = $('gbStamp').value.trim(); if (!text) { $('gbStamp').focus(); $('gbNote').textContent = '먼저 쓸 글자를 적어 주세요.'; return; }
      snap(); const [x, y] = pos(e), fs = 12 + PAD.size * 1.6;
      inkx.font = `bold ${fs}px "Gowun Dodum", sans-serif`; inkx.textAlign = 'center'; inkx.textBaseline = 'middle';
      inkx.lineWidth = Math.max(3, fs / 5); inkx.strokeStyle = PAD.color === '#ffffff' ? '#3d3550' : '#ffffff'; inkx.lineJoin = 'round';
      inkx.strokeText(text, x, y); inkx.fillStyle = PAD.color; inkx.fillText(text, x, y);   // 사진 위에서도 잘 보이게 테두리
      PAD.drawn = true; render(); return;
    }
    PAD.c.setPointerCapture(e.pointerId); snap();
    last = pos(e); stroke(last, [last[0] + 0.01, last[1]]); if (PAD.tool !== 'eraser') PAD.drawn = true;
  });
  PAD.c.addEventListener('pointermove', e => { if (!last) return; const p = pos(e); stroke(last, p); last = p; });
  for (const ev of ['pointerup', 'pointercancel']) PAD.c.addEventListener(ev, () => { last = null; });
}
$('gbStamp').addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault(); });   // 엔터로 쪽지가 붙지 않게
function exportDrawing(){
  if (!PAD.drawn || $('gbDraw').hidden) return null;
  // 사진이 들어가면 용량이 커져서, 저장 한도(약 117KB)에 맞을 때까지 화질을 낮춰 봐요
  for (const [type, q] of [['image/webp', 0.85], ['image/webp', 0.7], ['image/webp', 0.55], ['image/jpeg', 0.8], ['image/jpeg', 0.65], ['image/jpeg', 0.5], ['image/png']]) {
    const v = PAD.c.toDataURL(type, q);
    if (v.startsWith('data:' + type) && validDraw(v)) return v;
  }
  return 'too-big';
}

// ======================================================================
//  🎄 소원 트리
// ======================================================================
const WISH = { list: [], loaded: false, orn: 0, busy: false };
const ORN_HEX = XMAS.ORN_HEX;
const validWishImg = s => typeof s === 'string' && /^data:image\/(png|webp);base64,[A-Za-z0-9+/=]+$/.test(s) && s.length < 60000;
const wishImg = w => (w.draw && net && net.wishes.image) ? net.wishes.image(w.id).then(v => validWishImg(v) ? v : null).catch(() => null) : Promise.resolve(null);
const wishesShown = () => WISH.list.filter(w => clip(w.text, 40) || w.draw);
const imgCache = new Map();   // dataURL → 불러온 그림
function loadImg(src){ if (!src) return Promise.resolve(null); if (imgCache.has(src)) return imgCache.get(src); const p = new Promise(r => { const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = src; }); imgCache.set(src, p); return p; }
function lighten(hex, k){ const n = parseInt(hex.slice(1), 16), f = v => Math.round(v + (255 - v) * k).toString(16).padStart(2, '0'); return '#' + f(n >> 16 & 255) + f(n >> 8 & 255) + f(n & 255); }
// 오너먼트 한 개 그리기: 반짝이는 공 + 금색 고리 + 안에 그림(또는 반짝이 무늬)
function drawOrnament(g, W, H, w, img){
  const hex = ORN_HEX[(w.orn | 0) % ORN_HEX.length], cx = W / 2, R = Math.min(W, H) * 0.4, cy = H - R - H * 0.04;
  g.clearRect(0, 0, W, H);
  g.strokeStyle = '#d9a632'; g.lineWidth = R * 0.07; g.beginPath(); g.arc(cx, cy - R - R * 0.28, R * 0.13, 0, Math.PI * 2); g.stroke();
  const capG = g.createLinearGradient(0, cy - R - R * 0.22, 0, cy - R + R * 0.06); capG.addColorStop(0, '#ffe7a3'); capG.addColorStop(1, '#c99522');
  g.fillStyle = capG; g.fillRect(cx - R * 0.2, cy - R - R * 0.2, R * 0.4, R * 0.26);
  const ball = g.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
  ball.addColorStop(0, lighten(hex, 0.55)); ball.addColorStop(0.55, hex); ball.addColorStop(1, hex);
  g.fillStyle = ball; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
  g.save(); g.beginPath(); g.arc(cx, cy, R * 0.98, 0, Math.PI * 2); g.clip();
  if (img) g.drawImage(img, cx - R, cy - R, R * 2, R * 2);
  else {   // 그림이 없으면 하얀 띠와 반짝이 점
    g.fillStyle = 'rgba(255,255,255,0.75)'; g.fillRect(cx - R, cy - R * 0.14, R * 2, R * 0.28);
    g.fillStyle = hex; for (let k = -3; k <= 3; k++) { g.beginPath(); g.arc(cx + k * R * 0.28, cy, R * 0.06, 0, Math.PI * 2); g.fill(); }
  }
  g.restore();
  g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(cx - R * 0.42, cy - R * 0.45, R * 0.22, R * 0.12, -0.7, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = Math.max(2, R * 0.05); g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
}
// 트리에 다는 오너먼트 카드 (늘 카메라를 바라봐서 잘 보여요, 클릭하면 크게 보기)
const ORN_SPR = XMAS.slots.map((pos, i) => {
  const c = document.createElement('canvas'); c.width = 96; c.height = 112;
  const tex = new THREE.CanvasTexture(c);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, alphaTest: 0.35 }));
  sp.scale.set(0.62, 0.72, 1); sp.position.copy(pos); sp.visible = false; sp.userData.zone = 'orn'; sp.userData.slot = i;
  scene.add(sp); clickables.push(sp);
  return { sp, c, tex, key: null, wish: null };
});
function paintOrnaments(){
  const ws = wishesShown();
  ORN_SPR.forEach((o, i) => {
    const w = ws[i]; o.wish = w || null; o.sp.visible = !!w;
    const key = w ? w.id + ':' + w.orn : null;
    if (!w || o.key === key) return; o.key = key;
    const g = o.c.getContext('2d');
    drawOrnament(g, o.c.width, o.c.height, w, null); o.tex.needsUpdate = true;
    if (w.draw) wishImg(w).then(loadImg).then(im => { if (im && o.key === key) { drawOrnament(g, o.c.width, o.c.height, w, im); o.tex.needsUpdate = true; } });
  });
}
// 크게 보기
let ornIdx = 0;
function showOrnament(idx){
  const ws = wishesShown(); if (!ws.length) return;
  ornIdx = (idx + ws.length) % ws.length; const w = ws[ornIdx];
  const c = $('ornBig'), g = c.getContext('2d');
  drawOrnament(g, c.width, c.height, w, null);
  if (w.draw) wishImg(w).then(loadImg).then(im => { if (im && ws[ornIdx] === w) drawOrnament(g, c.width, c.height, w, im); });
  $('ornText').textContent = clip(w.text, 40) || '🎨';
  $('ornBy').textContent = `— ${clip(w.nick, 12) || '천사'} · ${ornIdx + 1} / ${ws.length}`;
  $('ornDel').hidden = !(net && w.uid === net.uid);
  $('ornDel').textContent = '떼기'; $('ornDel').dataset.confirm = '';
  $('ornDel').onclick = () => tapConfirm($('ornDel'), '정말 뗄까요?', async () => { try { await net.wishes.remove(w.id); closeModal('ornModal'); } catch (e) { console.warn(e); $('ornBy').textContent = '떼지 못했어요. 잠시 후 다시 해 주세요.'; } });
  if (!$('ornModal').classList.contains('show')) openModal('ornModal');
}
$('ornPrev').onclick = () => showOrnament(ornIdx - 1);
$('ornNext').onclick = () => showOrnament(ornIdx + 1);
{
  ORN_HEX.forEach((hex, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.style.background = hex; b.title = `오너먼트 ${i + 1}`;
    b.onclick = () => { WISH.orn = i; $('wishBall').style.background = `radial-gradient(circle at 32% 30%, ${lighten(hex, 0.55)}, ${hex} 60%)`; for (const x of $('wishOrns').children) x.classList.toggle('on', x === b); };
    if (i === 0) { b.classList.add('on'); setTimeout(() => b.onclick(), 0); }
    $('wishOrns').appendChild(b);
  });
}
// 오너먼트 그림판 (투명 바탕에 그려서 오너먼트 색과 겹쳐 보여요)
const WPAD = { c: $('wishCanvas'), color: '#ffffff', size: 7, eraser: false, drawn: false };
{
  const g = WPAD.c.getContext('2d');
  for (const c of ['#ffffff', '#3d3550', '#e8566b', '#f5c518', '#4cb36a', '#4a90e2', '#8a6ad6', '#f28bb5']) {
    const b = document.createElement('button'); b.type = 'button'; b.style.background = c;
    b.onclick = () => { WPAD.color = c; WPAD.eraser = false; $('wishEraser').classList.remove('on'); for (const x of $('wishPens').children) x.classList.toggle('on', x === b); };
    if (c === WPAD.color) b.classList.add('on');
    $('wishPens').appendChild(b);
  }
  $('wishThin').onclick = () => { WPAD.size = WPAD.size === 7 ? 3 : 7; $('wishThin').classList.toggle('on', WPAD.size === 3); };
  $('wishEraser').onclick = () => { WPAD.eraser = !WPAD.eraser; $('wishEraser').classList.toggle('on', WPAD.eraser); };
  $('wishClear').onclick = () => { g.clearRect(0, 0, 200, 200); WPAD.drawn = false; };
  WPAD.reset = () => $('wishClear').onclick();
  let last = null;
  const pos = e => { const r = WPAD.c.getBoundingClientRect(); return [(e.clientX - r.left) * 200 / r.width, (e.clientY - r.top) * 200 / r.height]; };
  const stroke = (a, b) => {
    g.globalCompositeOperation = WPAD.eraser ? 'destination-out' : 'source-over';
    g.strokeStyle = WPAD.color; g.lineWidth = WPAD.eraser ? WPAD.size * 2.5 : WPAD.size; g.lineCap = g.lineJoin = 'round';
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.globalCompositeOperation = 'source-over';
  };
  WPAD.c.addEventListener('pointerdown', e => { e.preventDefault(); WPAD.c.setPointerCapture(e.pointerId); last = pos(e); stroke(last, [last[0] + 0.01, last[1]]); if (!WPAD.eraser) WPAD.drawn = true; });
  WPAD.c.addEventListener('pointermove', e => { if (!last) return; const p = pos(e); stroke(last, p); last = p; });
  for (const ev of ['pointerup', 'pointercancel']) WPAD.c.addEventListener(ev, () => { last = null; });
}
function exportWishDrawing(){
  if (!WPAD.drawn) return null;
  for (const [type, q] of [['image/webp', 0.9], ['image/webp', 0.7], ['image/png']]) { const v = WPAD.c.toDataURL(type, q); if (v.startsWith('data:' + type) && validWishImg(v)) return v; }
  return null;
}
function renderWishes(){
  const list = $('wishList'); list.innerHTML = '';
  const ws = wishesShown();
  if (!ws.length) { list.innerHTML = `<div class="empty">${WISH.loaded ? '아직 달린 소원이 없어요. 첫 오너먼트를 달아 주세요!' : '불러오는 중…'}</div>`; return; }
  ws.forEach((w, idx) => {
    const it = document.createElement('div'); it.className = 'wish-item'; it.title = '눌러서 크게 보기';
    const o = document.createElement('canvas'); o.className = 'orn'; o.width = 48; o.height = 56; o.style.width = '26px'; o.style.height = '30px'; o.style.boxShadow = 'none'; o.style.borderRadius = '0';
    const og = o.getContext('2d'); drawOrnament(og, 48, 56, w, null);
    if (w.draw) wishImg(w).then(loadImg).then(im => { if (im) drawOrnament(og, 48, 56, w, im); });
    const tx = document.createElement('span'); tx.className = 'tx'; tx.textContent = clip(w.text, 40) || '🎨 그림 소원';
    const by = document.createElement('span'); by.className = 'by'; by.textContent = clip(w.nick, 12) || '천사';
    it.append(o, tx, by);
    it.onclick = () => showOrnament(idx);
    if (net && w.uid === net.uid) {
      const del = document.createElement('button'); del.className = 'del'; del.type = 'button'; del.textContent = '떼기';
      del.onclick = ev => { ev.stopPropagation(); tapConfirm(del, '정말 뗄까요?', async () => { try { await net.wishes.remove(w.id); } catch (e) { console.warn(e); $('wishNote').textContent = '떼지 못했어요. 잠시 후 다시 해 주세요.'; } }); };
      it.appendChild(del);
    }
    list.appendChild(it);
  });
}
$('wishForm').addEventListener('submit', async e => {
  e.preventDefault(); if (!net || WISH.busy) return;
  const text = clip($('wishText').value, 40), drawing = exportWishDrawing();
  if (!text && !drawing) { $('wishNote').textContent = '소원을 적거나 오너먼트에 그림을 그려 주세요.'; return; }
  WISH.busy = true; $('wishSubmit').disabled = true;
  try { await net.wishes.add({ nick: myName(), col: ME.col, text, orn: WISH.orn }, drawing); $('wishText').value = ''; WPAD.reset(); $('wishNote').textContent = '트리에 소원을 달았어요 ✨'; ME.emo = { e: '🎄', t: Date.now() }; sync(); C.emoteOn(meChar, '🎄'); }
  catch (err) { console.warn(err); $('wishNote').textContent = '달지 못했어요. 잠시 후 다시 시도해 주세요.'; }
  WISH.busy = false; $('wishSubmit').disabled = false;
});
function onWishes(list){ WISH.list = list; WISH.loaded = true; paintOrnaments(); if ($('wishModal').classList.contains('show')) renderWishes(); }

let gbBusy = false;
$('gbForm').addEventListener('submit', async e => {
  e.preventDefault(); if (!net || gbBusy) return;
  const text = clip($('gbText').value, 200), drawing = exportDrawing();
  if (drawing === 'too-big') { $('gbNote').textContent = '사진·그림이 너무 커서 저장할 수 없어요. 조금 덜어 내 주세요.'; return; }
  if (!text && !drawing) { $('gbNote').textContent = '글을 쓰거나 그림·사진을 넣어 주세요.'; return; }
  gbBusy = true; $('gbSubmit').disabled = true;
  try {
    await net.guestbook.add({ nick: myName(), col: ME.col, text }, drawing);
    $('gbText').value = ''; PAD.reset();
  }
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
// 한 번 더 눌러 확인하기 (claude.ai 안에서는 브라우저 확인창이 막혀서 직접 만들었어요)
function tapConfirm(btn, ask, fn){
  if (btn.dataset.confirm !== '1') {
    const orig = btn.textContent; btn.dataset.confirm = '1'; btn.textContent = ask; btn.classList.add('ask');
    setTimeout(() => { if (btn.dataset.confirm === '1') { btn.dataset.confirm = ''; btn.textContent = orig; btn.classList.remove('ask'); } }, 3000);
    return;
  }
  btn.dataset.confirm = ''; btn.classList.remove('ask'); fn();
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
paintBoard(); paintGbBoard();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => {
  meChar.labelText = ''; renderMe();
  for (const r of remotes.values()) { r.ch.labelText = ''; C.paintCharacter(r.ch, pCol(r.p), pHat(r.p), pName(r.p), pHair(r.p), pHc(r.p)); }
  boardFrames.forEach(f => f.key = null); paintBoard();
  gbFrames.forEach(f => f.key = null); paintGbBoard();
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
  net.wishes.subscribe(onWishes, e => { WISH.loaded = true; onErr(e); });
  net.guestbook.subscribe(list => { GB.docs = list; GB.loaded = true; GB.err = null; renderGb(); paintGbBoard(); }, e => { GB.err = '방명록을 불러올 수 없어요.'; renderGb(); onErr(e); });
  net.items.subscribe(list => { GS.items = list; GS.loaded = true; GS.err = null; renderGs(); paintBoard(); }, e => { GS.err = '판정소를 불러올 수 없어요.'; renderGs(); onErr(e); });
  net.comments.subscribe(c => { GS.comments = (c && typeof c === 'object') ? c : {}; renderGs(); }, onErr);
  net.votes.subscribe(v => { GS.votes = (v && typeof v === 'object') ? v : {}; renderGs(); paintBoard(); }, onErr);
  sync();
}
