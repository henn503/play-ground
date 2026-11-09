// 3D 세계: 하늘, 구름섬, 천국의 문, 신전, 방명록, 판정소 게시판
import * as THREE from 'three';
import { glowTexture, textCanvas, makeSprite } from './sprites.js';

export function createWorld(container){
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });   // 가장자리 다듬기 끄고 절전 모드로
  renderer.setPixelRatio(1);   // 해상도를 너무 높이지 않아 그래픽 부담을 줄여요
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xe9c9e0, 90, 320);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1200);
  function resize(){ const w = innerWidth, h = innerHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();

  // 하늘
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), new THREE.ShaderMaterial({
    uniforms: { top:{ value:new THREE.Color('#4f86d9') }, mid:{ value:new THREE.Color('#e9b9d6') }, bot:{ value:new THREE.Color('#d9b7d8') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = (modelMatrix * vec4(position,1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vP,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.02, 0.55, h)) : mix(mid, bot, smoothstep(0.0, -0.25, h)); gl_FragColor = vec4(c, 1.0); }',
    side: THREE.BackSide, depthWrite: false, fog: false
  })));

  // 빛
  scene.add(new THREE.HemisphereLight(0xf2f4ff, 0xe0bfd8, 0.8));
  scene.add(new THREE.AmbientLight(0xfff4f8, 0.18));
  const sunLight = new THREE.DirectionalLight(0xffefd8, 0.85); sunLight.position.set(40, 60, 25); scene.add(sunLight);

  // 공용 텍스처
  const sparkTex = glowTexture('rgba(255,250,220,1)', 'rgba(255,240,200,0)');
  const shadowTex = glowTexture('rgba(150,120,200,0.45)', 'rgba(150,120,200,0)');

  // 해
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,252,235,1)', 'rgba(255,235,210,0)'), depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  sun.material.opacity = 0.55; sun.scale.set(90, 90, 1); sun.position.set(180, 150, -380); scene.add(sun);

  // ======================================================================
  //  구름
  // ======================================================================
  const puffGeo = new THREE.SphereGeometry(1, 14, 10);
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xfdfbff, emissive: 0x4a3f55, emissiveIntensity: 0.3 });
  function puffs(list, mat){
    const m = new THREE.InstancedMesh(puffGeo, mat || cloudMat, list.length);
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    list.forEach((p, i) => { o.position.set(p[0], p[1], p[2]); o.scale.set(p[3], p[4] || p[3], p[5] || p[3]); o.updateMatrix(); m.setMatrixAt(i, o.matrix); const v = 0.92 + rnd() * 0.08; col.setRGB(v, v * 0.97, v); m.setColorAt(i, col); });
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.instanceMatrix.needsUpdate = true; return m;
  }
  let rs = 12345; const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647;
  const ISLAND_R = 38;

  // 바닥 구름섬
  const ground = new THREE.Mesh(new THREE.CylinderGeometry(41, 34, 4, 72), cloudMat);
  ground.position.y = -2; scene.add(ground);
  {
    const L = [];
    for (let i = 0; i < 110; i++) { const a = rnd() * Math.PI * 2, r = 38 + rnd() * 7, s = 2.4 + rnd() * 3.5; L.push([Math.cos(a) * r, -1.2 + rnd() * 1.4, Math.sin(a) * r, s, s * 0.75, s]); }
    for (let i = 0; i < 60; i++) { const a = rnd() * Math.PI * 2, r = 30 + rnd() * 10, s = 3 + rnd() * 5; L.push([Math.cos(a) * r, -4 - rnd() * 3, Math.sin(a) * r, s, s * 0.8, s]); }
    for (let i = 0; i < 70; i++) { const a = rnd() * Math.PI * 2, r = 9 + rnd() * 27, s = 1.2 + rnd() * 2.2, x = Math.cos(a) * r, z = Math.sin(a) * r; if (Math.hypot(x, z + 31) < 12) continue; L.push([x, -0.55, z, s, s * 0.32, s]); }   // 동상 앞마당은 비워 둠
    scene.add(puffs(L));
  }
  // 아래 구름 바다
  const sea = new THREE.Group(); scene.add(sea);
  {
    const L = [];
    for (let i = 0; i < 150; i++) { const a = rnd() * Math.PI * 2, r = 55 + rnd() * 240, s = 9 + rnd() * 16; L.push([Math.cos(a) * r, -26 - rnd() * 14, Math.sin(a) * r, s, s * 0.55, s]); }
    sea.add(puffs(L, new THREE.MeshLambertMaterial({ color: 0xf1e2f0, emissive: 0x3a2440, emissiveIntensity: 0.2 })));
  }
  // 떠다니는 작은 섬
  const floaters = [];
  for (let k = 0; k < 6; k++) {
    const g = new THREE.Group(), a = k / 6 * Math.PI * 2 + 0.4, r = 75 + rnd() * 40;
    g.position.set(Math.cos(a) * r, 4 + rnd() * 22, Math.sin(a) * r);
    const L = []; for (let i = 0; i < 9; i++) { const s = 2 + rnd() * 3; L.push([(rnd() - .5) * 8, (rnd() - .5) * 2, (rnd() - .5) * 8, s, s * .7, s]); }
    g.add(puffs(L));
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(1.6), new THREE.MeshPhongMaterial({ color: [0xffd27a, 0xc9b2ff, 0xa8e3ff][k % 3], emissive: [0x8a5a00, 0x4d2f99, 0x1d5b80][k % 3], shininess: 90, transparent: true, opacity: .92 }));
    crystal.position.y = 4; g.add(crystal);
    scene.add(g); floaters.push({ g, crystal, base: g.position.y, ph: rnd() * 6 });
  }
  // 무지개
  {
    const cols = [0xff6b6b, 0xffa94d, 0xffe066, 0x8ce99a, 0x74c0fc, 0x9775fa, 0xda77f2];
    const rb = new THREE.Group();
    cols.forEach((c, i) => {
      const t = new THREE.Mesh(new THREE.TorusGeometry(150 - i * 3.2, 1.6, 8, 90, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.32, depthWrite: false, fog: false }));
      rb.add(t);
    });
    rb.position.set(-60, -40, -260); rb.rotation.y = 0.35; scene.add(rb);
  }
  // 빛기둥
  const rays = [];
  for (const [x, z, h] of [[-24, -18, 0.1], [26, -22, -0.12], [0, 0, 0]]) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(1.5, x === 0 ? 4.5 : 6, 140, 28, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff6d5, transparent: true, opacity: 0.035, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide, fog: false }));
    m.position.set(x, 70, z); m.rotation.z = h; scene.add(m); rays.push(m);
  }
  // 반짝이
  const SPARK_N = 200;
  const sparkGeo = new THREE.BufferGeometry(), sparkPos = new Float32Array(SPARK_N * 3);
  for (let i = 0; i < SPARK_N; i++) { const a = rnd() * Math.PI * 2, r = rnd() * 60; sparkPos[i*3] = Math.cos(a) * r; sparkPos[i*3+1] = rnd() * 30; sparkPos[i*3+2] = Math.sin(a) * r; }
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  scene.add(new THREE.Points(sparkGeo, new THREE.PointsMaterial({ size: 0.28, map: sparkTex, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffe08a })));

  // ======================================================================
  //  건축물
  // ======================================================================
  const marble = new THREE.MeshPhongMaterial({ color: 0xf6f0e8, shininess: 30 });
  const gold = new THREE.MeshPhongMaterial({ color: 0xd9a632, emissive: 0x3a2400, specular: 0xffe7a0, shininess: 80 });
  const colliders = [];   // {x,z,r}
  const clickables = [];  // meshes with userData.zone
  const ZONES = {};


  // 천국의 문
  {
    const g = new THREE.Group(); g.position.set(0, 0, 33);
    for (const x of [-4.6, 4.6]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, 10, 20), marble); p.position.set(x, 5, 0); g.add(p);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 0.8, 0.6, 20), gold); cap.position.set(x, 10.2, 0); g.add(cap);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.3, 0.6, 20), gold); base.position.set(x, 0.3, 0); g.add(base);
      colliders.push({ x, z: 33, r: 1.3 });
    }
    const arch = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.45, 14, 48, Math.PI), gold); arch.position.y = 10.3; g.add(arch);
    for (let i = 0; i < 7; i++) { const a = i / 6 * Math.PI, b = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 8), marble); b.position.set(Math.cos(a) * 4.6, 10.3 + Math.sin(a) * 4.6, 0); g.add(b); }
    const lbl = makeSprite(textCanvas(['구름 위 쉼터'], { font: 44, bg: null, color: '#b98a12', family: '"Gowun Batang", serif', bold: true }), 1.5); lbl.position.y = 13.2; g.add(lbl);
    scene.add(g);
  }
  // 중앙 신전
  const temple = new THREE.Group(); scene.add(temple);
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.9, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
  {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(8, 8.4, 0.3, 64), marble); base.position.y = 0.0; temple.add(base);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(8.1, 0.12, 8, 80), gold); rim.rotation.x = Math.PI / 2; rim.position.y = 0.16; temple.add(rim);
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2, x = Math.cos(a) * 6.6, z = Math.sin(a) * 6.6;
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 6.2, 16), marble); c.position.set(x, 3.25, z); temple.add(c);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.3, 0.95), gold); cap.position.set(x, 6.4, z); temple.add(cap);
      colliders.push({ x, z, r: 0.6 });
    }
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(7.3, 7.3, 0.6, 64, 1, true), marble); ring.position.y = 6.85; ring.material = marble; temple.add(ring);
    const ringTop = new THREE.Mesh(new THREE.TorusGeometry(7.3, 0.18, 8, 80), gold); ringTop.rotation.x = Math.PI / 2; ringTop.position.y = 7.15; temple.add(ringTop);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(7.1, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhongMaterial({ color: 0xf8f3fa, shininess: 25, side: THREE.DoubleSide })); dome.position.y = 7.15; temple.add(dome);
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.6, 16), gold); fin.position.y = 14.9; temple.add(fin);
    const fb = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12), gold); fb.position.y = 14.2; temple.add(fb);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.0, 1.0, 24), marble); ped.position.y = 0.5; temple.add(ped);
    const pedTop = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.1, 8, 32), gold); pedTop.rotation.x = Math.PI / 2; pedTop.position.y = 1.0; temple.add(pedTop);
    orb.position.y = 2.2; temple.add(orb);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff1b0 })); halo.material.opacity = 0.6; halo.scale.set(4, 4, 1); halo.position.y = 2.2; temple.add(halo);
    const pl = new THREE.PointLight(0xffd88a, 0.6, 16); pl.position.y = 2.6; temple.add(pl);
    colliders.push({ x: 0, z: 0, r: 1.3 });
  }
  // 방명록 (빛나는 책)
  const book = new THREE.Group(); book.position.set(-16, 0, 9); scene.add(book);
  {
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.8, 1.2, 20), marble); ped.position.y = 0.6; book.add(ped);
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 1.3), gold); top.position.y = 1.25; top.rotation.x = -0.25; book.add(top);
    const pageMat = new THREE.MeshPhongMaterial({ color: 0xf7f0e2, emissive: 0x1a1408 });
    for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.06, 1.15), pageMat); p.position.set(s * 0.42, 1.36, 0); p.rotation.set(-0.25, 0, s * -0.12); book.add(p); }
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff1b0 })); glow.material.opacity = 0.55; glow.scale.set(2.6, 2.6, 1); glow.position.y = 1.6; book.add(glow);
    const lbl = makeSprite(textCanvas(['📖 방명록'], { font: 34 }), 0.75); lbl.position.y = 3.1; book.add(lbl);
    ZONES.gb = { id: 'gb', name: '방명록', x: -16, z: 9, r: 4.2, label: lbl };
    book.traverse(o => { if (o.isMesh) { o.userData.zone = 'gb'; clickables.push(o); } });
    colliders.push({ x: -16, z: 9, r: 1.2 });
  }
  // 그뤠잇·스튜핏 판정소 (게시판)
  const board = new THREE.Group(); board.position.set(16, 0, 8); scene.add(board);
  const boardFrames = [];
  {
    board.lookAt(0, 0, 0);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(10, 6.4, 0.35), marble); panel.position.y = 4.1; board.add(panel);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.35, 0.5), gold); trim.position.y = 7.4; board.add(trim);
    const trim2 = trim.clone(); trim2.position.y = 0.85; board.add(trim2);
    for (const x of [-5, 5]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 7.6, 14), gold); p.position.set(x, 3.8, 0); board.add(p); }
    const titleC = textCanvas(['⚖️ 그뤠잇 · 스튜핏 판정소'], { font: 46, bg: null, color: '#6b4fb8', family: '"Gowun Batang", serif', bold: true });
    const title = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 7.6 * titleC.height / titleC.width), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(titleC), transparent: true, toneMapped: false }));
    title.position.set(0, 6.75, 0.19); board.add(title);
    for (let i = 0; i < 6; i++) {
      const c = document.createElement('canvas'); c.width = 320; c.height = 260;
      const tex = new THREE.CanvasTexture(c);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.275), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
      m.position.set(-3.1 + (i % 3) * 3.1, 5.0 - Math.floor(i / 3) * 2.5, 0.19); board.add(m);   // 제목 바로 아래로 붙임
      boardFrames.push({ c, tex, key: null });
    }
    const lbl = makeSprite(textCanvas(['⚖️ 판정소 · 사진 올리고 판정 받기'], { font: 30 }), 0.7); lbl.position.y = 8.6; board.add(lbl);
    ZONES.gs = { id: 'gs', name: '그뤠잇·스튜핏 판정소', x: 16, z: 8, r: 5.5, label: lbl };
    board.traverse(o => { if (o.isMesh) { o.userData.zone = 'gs'; clickables.push(o); } });
    const dir = new THREE.Vector3(-16, 0, -8).normalize(), side = new THREE.Vector3(-dir.z, 0, dir.x);
    for (let k = -4; k <= 4; k += 2) colliders.push({ x: 16 + side.x * k, z: 8 + side.z * k, r: 1.0 });
  }
  // 구름 의자: 가까이 가면 앉을 수 있어요 (등받이는 바깥쪽, 앉으면 신전을 바라봄)
  const SEATS = [];
  {
    const L = [];
    for (const [x, z] of [[-10, -14], [10, -14], [-21, -3], [21, -3], [-8, 22], [8, 22]]) {
      const d = Math.hypot(x, z), dx = x / d, dz = z / d;
      L.push([x, 0, z, 1.15, 0.5, 1.15]);                                  // 앉는 자리 (윗면 높이 약 0.5)
      L.push([x + dx * 1.0, 0.55, z + dz * 1.0, 0.95, 0.85, 0.75]);         // 등받이
      L.push([x - dz * 1.0, 0.25, z + dx * 1.0, 0.55, 0.45, 0.55]);         // 팔걸이
      L.push([x + dz * 1.0, 0.25, z - dx * 1.0, 0.55, 0.45, 0.55]);
      SEATS.push({ x, z, y: 0.42, ry: Math.atan2(-dx, -dz) });
    }
    scene.add(puffs(L));
  }


  // 매 프레임 환경 애니메이션
  function tick(dt, t){
    sea.rotation.y += dt * 0.004;
    for (const f of floaters) { f.g.position.y = f.base + Math.sin(t * 0.5 + f.ph) * 1.5; f.crystal.rotation.y += dt * 0.6; }
    rays.forEach((m, i) => m.material.opacity = 0.03 + Math.sin(t * 0.6 + i) * 0.012);
    orb.scale.setScalar(1 + Math.sin(t * 2) * 0.06);
    const pa = sparkGeo.attributes.position.array;
    for (let i = 0; i < SPARK_N; i++) { pa[i*3+1] += dt * (0.4 + (i % 5) * 0.08); if (pa[i*3+1] > 30) pa[i*3+1] = 0; }
    sparkGeo.attributes.position.needsUpdate = true;
  }

  return { renderer, scene, camera, gold, shadowTex, colliders, clickables, ZONES, boardFrames, ISLAND_R, SEATS, tick };
}
