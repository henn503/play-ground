// 3D 세계: 라벤더 하늘 아래 동그란 구름섬 디오라마
//   가운데 광장(하트 동상) · 위 게시판(방명록) · 왼쪽 위 판정소 · 왼쪽 눈놀이터
//   오른쪽 구름 온천 · 오른쪽 위 밴드 무대와 천국의 문 · 정자 · 매달린 별
import * as THREE from 'three';
import { glowTexture, textCanvas, makeSprite } from './sprites.js';

export function createWorld(container){
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });   // 가장자리 다듬기 끄고 절전 모드로
  renderer.setPixelRatio(1);   // 해상도를 너무 높이지 않아 그래픽 부담을 줄여요
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xead2ec, 95, 330);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1200);
  function resize(){ const w = innerWidth, h = innerHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();

  // 라벤더 하늘
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), new THREE.ShaderMaterial({
    uniforms: { top:{ value:new THREE.Color('#9d97e6') }, mid:{ value:new THREE.Color('#f2cde6') }, bot:{ value:new THREE.Color('#dcc3ea') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = (modelMatrix * vec4(position,1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vP,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.02, 0.6, h)) : mix(mid, bot, smoothstep(0.0, -0.25, h)); gl_FragColor = vec4(c, 1.0); }',
    side: THREE.BackSide, depthWrite: false, fog: false
  })));

  // 빛
  scene.add(new THREE.HemisphereLight(0xf4f0ff, 0xe2c4e0, 0.8));
  scene.add(new THREE.AmbientLight(0xfff4f8, 0.18));
  const sunLight = new THREE.DirectionalLight(0xffefd8, 0.85); sunLight.position.set(40, 60, 25); scene.add(sunLight);

  // 공용 텍스처
  const sparkTex = glowTexture('rgba(255,250,220,1)', 'rgba(255,240,200,0)');
  const shadowTex = glowTexture('rgba(150,120,200,0.45)', 'rgba(150,120,200,0)');
  const lampTex = glowTexture('rgba(255,236,190,1)', 'rgba(255,220,170,0)');

  // 해
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,252,235,1)', 'rgba(255,235,210,0)'), depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  sun.material.opacity = 0.55; sun.scale.set(90, 90, 1); sun.position.set(180, 150, -380); scene.add(sun);

  // ======================================================================
  //  배치도 (위에서 본 좌표, 화면 앞쪽이 +z)
  // ======================================================================
  let rs = 12345; const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647;
  // 아담한 섬: 광장 둘레에 장소들이 옹기종기 모여 있어요
  const ISLAND_R = 23;
  const STATUE = { x: 0, z: 0 };                    // 광장 한가운데
  const PLAZA_R = 7.6;
  const BOARD = { x: 0, z: -12 };                   // 게시판(방명록) - 위
  const JUDGE = { x: -10.5, z: -8.5 };              // 판정소 - 왼쪽 위
  const SNOW = { x: -14.5, z: 4, range: 8.5 };      // 눈놀이터의 눈사람 - 왼쪽
  const SPRING = { x: 13.5, z: 4, r: 3.3 };         // 구름 온천 - 오른쪽
  const BAND = { x: 10, z: -10, r: 4.2, h: 0.4 };   // 밴드 무대 - 오른쪽 위
  const GAZEBO = { x: 17.5, z: -5.5 };              // 정자 - 무대와 온천 사이
  const SPAWN = { x: 0, z: 12 };
  const SWING = { x: 7.5, z: 14.5 };               // 유니콘 그네 - 앞 오른쪽
  const SAW = { x: -7.5, z: 14.5 };                 // 유니콘 시소 - 앞 왼쪽
  const XMAS = { x: -19, z: -3 };                   // 소원 트리 - 눈놀이터 옆
  const angleOf = p => Math.atan2(p.z, p.x);
  const PATHS = [BOARD, JUDGE, SNOW, SPRING, BAND, SPAWN];
  const nearPath = (a, tol) => PATHS.some(p => { let d = Math.abs(a - angleOf(p)); if (d > Math.PI) d = Math.PI * 2 - d; return d < tol; });
  const facing = (x, z, tx = 0, tz = 0) => Math.atan2(tx - x, tz - z);   // +z가 그 지점을 보도록 돌리는 각도

  // ======================================================================
  //  구름
  // ======================================================================
  const puffGeo = new THREE.SphereGeometry(1, 14, 10);
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xfdfbff, emissive: 0x4a3f55, emissiveIntensity: 0.3 });
  function puffs(list, mat, tint = 0.08){
    const m = new THREE.InstancedMesh(puffGeo, mat || cloudMat, list.length);
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    list.forEach((p, i) => { o.position.set(p[0], p[1], p[2]); o.scale.set(p[3], p[4] || p[3], p[5] || p[3]); o.updateMatrix(); m.setMatrixAt(i, o.matrix); const v = 1 - tint + rnd() * tint; col.setRGB(v, v * 0.97, v); m.setColorAt(i, col); });
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.instanceMatrix.needsUpdate = true; return m;
  }

  // 바닥 구름섬
  const ground = new THREE.Mesh(new THREE.CylinderGeometry(26, 20.5, 4, 64), cloudMat);
  ground.position.y = -2; scene.add(ground);
  {
    const L = [];
    for (let i = 0; i < 80; i++) { const a = i / 80 * Math.PI * 2 + rnd() * 0.05, r = 25 + rnd() * 2.3, s = 1.9 + rnd() * 1.6; L.push([Math.cos(a) * r, -0.9 + rnd() * 0.9, Math.sin(a) * r, s, s * 0.8, s]); }   // 폭신한 테두리
    for (let i = 0; i < 45; i++) { const a = rnd() * Math.PI * 2, r = 15 + rnd() * 9, s = 2.6 + rnd() * 3.2; L.push([Math.cos(a) * r, -4 - rnd() * 2.5, Math.sin(a) * r, s, s * 0.8, s]); }
    scene.add(puffs(L));
  }

  // 섬 윗면 그림: 잔디, 광장 돌바닥, 길, 눈밭 (한 장의 그림으로 그려서 가볍게)
  {
    const N = 1024, R = 25.8, c = document.createElement('canvas'); c.width = c.height = N;
    const g = c.getContext('2d'), S = N / (R * 2);
    const P = (x, z) => [(x + R) * S, (z + R) * S];
    // 잔디 (연한 라벤더빛 민트) → 가장자리는 구름색
    const gr = g.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
    gr.addColorStop(0, '#f6eef2'); gr.addColorStop(0.75, '#f1ebf4'); gr.addColorStop(0.92, '#f6f1fa'); gr.addColorStop(1, '#fbf8fd');
    g.fillStyle = gr; g.fillRect(0, 0, N, N);
    for (let i = 0; i < 1800; i++) { const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 23, [px, py] = P(Math.cos(a) * r, Math.sin(a) * r); g.fillStyle = rnd() < 0.5 ? 'rgba(200,170,210,0.16)' : 'rgba(255,255,255,0.4)'; g.fillRect(px, py, 2 + rnd() * 3, 1 + rnd() * 2); }
    // 눈밭
    { const [px, py] = P(SNOW.x - 1, SNOW.z); const sg = g.createRadialGradient(px, py, 0, px, py, 6.5 * S); sg.addColorStop(0, '#ffffff'); sg.addColorStop(0.8, '#f7f8ff'); sg.addColorStop(1, 'rgba(247,248,255,0)'); g.fillStyle = sg; g.beginPath(); g.arc(px, py, 6.5 * S, 0, Math.PI * 2); g.fill(); }
    // 길: 광장 가장자리에서 각 장소까지 납작한 돌길
    const stone = ['#efe5d8', '#e8dccd', '#f3ebe1', '#e4d6c6'];
    for (const p of PATHS) {
      const a = angleOf(p), d = Math.hypot(p.x, p.z), ux = Math.cos(a), uz = Math.sin(a);
      g.strokeStyle = '#e6d9cc'; g.lineWidth = 2.4 * S; g.lineCap = 'round';
      const [x0, y0] = P(ux * (PLAZA_R - 1), uz * (PLAZA_R - 1)), [x1, y1] = P(ux * (d - 2.2), uz * (d - 2.2));
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      for (let s = PLAZA_R - 0.3; s < d - 2.2; s += 0.95) for (const off of [-0.55, 0.55]) {
        const jx = (rnd() - 0.5) * 0.2, [px, py] = P(ux * s - uz * off + jx, uz * s + ux * off + jx);
        g.fillStyle = stone[Math.floor(rnd() * 4)]; g.beginPath(); g.ellipse(px, py, 0.5 * S, 0.36 * S, a, 0, Math.PI * 2); g.fill();
      }
    }
    // 놀이터 바닥: 폭신한 분홍 매트
    for (const q of [SWING, SAW]) { const [px, py] = P(q.x, q.z); g.fillStyle = '#f8dbe9'; g.beginPath(); g.ellipse(px, py, 3.9 * S, 2.9 * S, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#efc3d8'; g.lineWidth = 3; g.stroke(); }
    // 광장 돌바닥: 동심원 줄마다 돌판
    { const [cx, cy] = P(0, 0); g.fillStyle = '#d9cbbb'; g.beginPath(); g.arc(cx, cy, PLAZA_R * S, 0, Math.PI * 2); g.fill(); }
    for (let ring = 0; 3.0 + ring * 0.9 + 0.82 <= PLAZA_R; ring++) {
      const r0 = 3.0 + ring * 0.9, r1 = r0 + 0.82, n = Math.round(r0 * 3.8);
      for (let k = 0; k < n; k++) {
        const a0 = (k + (ring % 2) * 0.5) / n * Math.PI * 2, a1 = a0 + Math.PI * 2 / n - 0.035 / (r0 / 4);
        const [cx, cy] = P(0, 0);
        g.fillStyle = stone[(k + ring) % 4]; g.beginPath();
        g.arc(cx, cy, r1 * S, a0, a1); g.arc(cx, cy, r0 * S, a1, a0, true); g.closePath(); g.fill();
      }
    }
    // 가운데 하트 무늬
    { const [cx, cy] = P(0, 0); g.fillStyle = '#e9d6ee'; g.beginPath(); g.arc(cx, cy, 2.9 * S, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#cdb3e0'; g.lineWidth = 3; g.stroke(); }
    const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4;
    const top = new THREE.Mesh(new THREE.CircleGeometry(R, 96), new THREE.MeshLambertMaterial({ map: tex }));
    top.rotation.x = -Math.PI / 2; top.position.y = 0.02; scene.add(top);
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
    g.userData.keep = true; scene.add(g); floaters.push({ g, crystal, base: g.position.y, ph: rnd() * 6 });
  }
  // 무지개
  {
    const cols = [0xff6b6b, 0xffa94d, 0xffe066, 0x8ce99a, 0x74c0fc, 0x9775fa, 0xda77f2];
    const rb = new THREE.Group();
    cols.forEach((c, i) => rb.add(new THREE.Mesh(new THREE.TorusGeometry(150 - i * 3.2, 1.6, 8, 90, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.3, depthWrite: false, fog: false }))));
    rb.position.set(-60, -40, -260); rb.rotation.y = 0.35; scene.add(rb);
  }
  // 동상 위로 내리는 빛기둥
  const ray = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 4.5, 140, 28, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff6d5, transparent: true, opacity: 0.035, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  ray.position.set(0, 70, 0); ray.userData.keep = true; scene.add(ray);
  // 반짝이
  const SPARK_N = 200;
  const sparkGeo = new THREE.BufferGeometry(), sparkPos = new Float32Array(SPARK_N * 3);
  for (let i = 0; i < SPARK_N; i++) { const a = rnd() * Math.PI * 2, r = rnd() * 40; sparkPos[i*3] = Math.cos(a) * r; sparkPos[i*3+1] = rnd() * 30; sparkPos[i*3+2] = Math.sin(a) * r; }
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  scene.add(new THREE.Points(sparkGeo, new THREE.PointsMaterial({ size: 0.28, map: sparkTex, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffe08a })));

  // ======================================================================
  //  재료
  // ======================================================================
  const marble = new THREE.MeshPhongMaterial({ color: 0xf6f0e8, shininess: 30 });
  const gold = new THREE.MeshPhongMaterial({ color: 0xd9a632, emissive: 0x3a2400, specular: 0xffe7a0, shininess: 80 });
  const wood = new THREE.MeshLambertMaterial({ color: 0xc69a74 });
  const woodDark = new THREE.MeshLambertMaterial({ color: 0x9c7154 });
  const lilac = new THREE.MeshLambertMaterial({ color: 0xc8b4ee });
  const lilacDeep = new THREE.MeshLambertMaterial({ color: 0x9d86d6 });
  const metal = new THREE.MeshLambertMaterial({ color: 0x7d6f9a });
  const colliders = [];   // {x,z,r}
  const clickables = [];  // meshes with userData.zone
  const ZONES = {};
  const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  const cyl = (rt, rb, h, m, seg = 14) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };
  const zoneOf = (g, id) => g.traverse(o => { if (o.isMesh) { o.userData.zone = id; clickables.push(o); } });

  // ======================================================================
  //  광장: 가로등, 벤치, 꽃밭
  // ======================================================================
  const lamps = [];
  {
    const head = new THREE.MeshPhongMaterial({ color: 0xfff3d6, emissive: 0xffd99a, emissiveIntensity: 0.9 });
    for (const deg of [112, -18, -118]) {   // 동상 둘레에 딱 세 개
      const a = deg * Math.PI / 180, x = Math.cos(a) * (PLAZA_R + 0.2), z = Math.sin(a) * (PLAZA_R + 0.2);
      const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
      g.scale.setScalar(0.8);
      g.add(at(cyl(0.12, 0.16, 3.4, metal, 10), 0, 1.7, 0));
      g.add(at(cyl(0.3, 0.38, 0.25, metal, 10), 0, 0.12, 0));
      g.add(at(cyl(0.34, 0.12, 0.18, metal, 10), 0, 3.95, 0));
      g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 10), head), 0, 3.7, 0));
      const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: lampTex, depthWrite: false, blending: THREE.AdditiveBlending, transparent: true })); gl.material.opacity = 0.6; gl.scale.set(2.2, 2.2, 1); gl.position.y = 3.7; g.add(gl);
      lamps.push(gl);
      colliders.push({ x, z, r: 0.3 });
    }
  }
  // 나무 벤치 (한 벤치에 두 자리, 동상을 바라봐요)
  const SEATS = [];
  for (const deg of [62, 118, -14, 194]) {
    const a = deg * Math.PI / 180, r = 5.6, x = Math.cos(a) * r, z = Math.sin(a) * r;
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = facing(x, z); scene.add(g);
    g.add(at(box(2.6, 0.12, 0.7, wood), 0, 0.46, 0));
    for (let i = 0; i < 3; i++) g.add(at(box(2.6, 0.16, 0.06, wood), 0, 0.75 + i * 0.22, -0.36));
    for (const sx of [-1.1, 1.1]) {
      g.add(at(box(0.1, 0.46, 0.6, woodDark), sx, 0.23, 0));
      g.add(at(box(0.1, 0.8, 0.08, woodDark), sx, 0.9, -0.38));
      g.add(at(box(0.1, 0.08, 0.7, woodDark), sx * 1.08, 0.68, 0));
    }
    const fx = -x / r, fz = -z / r, sx = -fz, sz = fx;   // 앞(동상 쪽)과 옆
    for (const o of [-0.6, 0.6]) SEATS.push({ x: x + sx * o + fx * 0.05, z: z + sz * o + fz * 0.05, y: 0.42, ry: facing(x, z) });
    colliders.push({ x: x - fx * 0.5, z: z - fz * 0.5, r: 0.5 });
  }
  // 꽃밭: 광장 둘레와 나무 아래 (꽃송이와 잎을 한 묶음으로 그려요)
  const flowerSpots = [];
  {
    for (let i = 0; i < 130; i++) {
      const a = rnd() * Math.PI * 2; if (nearPath(a, 0.24)) continue;
      const r = PLAZA_R + 0.7 + rnd() * 1.4; flowerSpots.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }
  // 분홍 나무
  const TREES = [[-5.5, -16.5], [4.8, -17.5], [-17.5, 13], [17.5, 13], [-15, -15.5], [0, -19.5], [-3.5, 19.5], [4.5, 19.5], [20.5, 4.5]];
  {
    const trunks = [], blossom = [];
    for (const [x, z] of TREES) {
      const h = 1.9 + rnd() * 0.6; trunks.push([x, h / 2, z, h]);
      for (let i = 0; i < 6; i++) { const s = 0.9 + rnd() * 0.5, a = rnd() * Math.PI * 2, rr = i ? 0.7 + rnd() * 0.4 : 0; blossom.push([x + Math.cos(a) * rr, h + 0.5 + (i ? rnd() * 0.7 : 0.6), z + Math.sin(a) * rr, s, s * 0.9, s]); }
      for (let i = 0; i < 6; i++) { const a = rnd() * Math.PI * 2, r = 1.0 + rnd() * 1.1; flowerSpots.push([x + Math.cos(a) * r, z + Math.sin(a) * r]); }
      colliders.push({ x, z, r: 0.5 });
    }
    const tm = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.32, 1, 8), woodDark, trunks.length), o = new THREE.Object3D();
    trunks.forEach((t, i) => { o.position.set(t[0], t[1], t[2]); o.scale.set(1, t[3], 1); o.updateMatrix(); tm.setMatrixAt(i, o.matrix); });
    tm.instanceMatrix.needsUpdate = true; scene.add(tm);
    scene.add(puffs(blossom, new THREE.MeshLambertMaterial({ color: 0xffbfdc, emissive: 0x5a2a44, emissiveIntensity: 0.28 }), 0.14));
  }
  {
    const cols = [0xff9cc2, 0xffd166, 0xffffff, 0xc7a8ff, 0xff8fa3, 0xa8d8ff].map(c => new THREE.Color(c));
    const leaf = new THREE.Color(0x9cc98a);
    const n = flowerSpots.length;
    const m = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x2a2030, emissiveIntensity: 0.25 }), n * 2);
    const o = new THREE.Object3D();
    flowerSpots.forEach(([x, z], i) => {
      o.position.set(x, 0.12, z); o.scale.set(0.32, 0.16, 0.32); o.updateMatrix(); m.setMatrixAt(i * 2, o.matrix); m.setColorAt(i * 2, leaf);
      o.position.set(x + (rnd() - 0.5) * 0.15, 0.3, z + (rnd() - 0.5) * 0.15); o.scale.setScalar(0.14 + rnd() * 0.06); o.updateMatrix(); m.setMatrixAt(i * 2 + 1, o.matrix); m.setColorAt(i * 2 + 1, cols[Math.floor(rnd() * cols.length)]);
    });
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; scene.add(m);
  }

  // 아기자기한 소품: 길가의 동글동글 덤불, 나무 밑 버섯
  {
    const bush = [], bush2 = [];
    for (const p of PATHS) {
      const a = angleOf(p), d = Math.hypot(p.x, p.z), ux = Math.cos(a), uz = Math.sin(a);
      for (let t = PLAZA_R + 1.6; t < d - 3.4; t += 1.8 + rnd() * 0.8) for (const side of [-1, 1]) {
        if (rnd() < 0.3) continue;
        const off = side * (1.6 + rnd() * 0.3), x = ux * t - uz * off, z = uz * t + ux * off, sz = 0.35 + rnd() * 0.25;
        (rnd() < 0.5 ? bush : bush2).push([x, sz * 0.5, z, sz, sz * 0.85, sz]);
      }
    }
    scene.add(puffs(bush, new THREE.MeshLambertMaterial({ color: 0xbfe3c4, emissive: 0x1a3020, emissiveIntensity: 0.25 }), 0.12));
    scene.add(puffs(bush2, new THREE.MeshLambertMaterial({ color: 0xdcc9f5, emissive: 0x2a2040, emissiveIntensity: 0.25 }), 0.12));
    const stems = [], caps = [];
    for (const [x, z] of TREES) for (let i = 0; i < 2; i++) {
      if (rnd() < 0.35) continue;
      const a = rnd() * Math.PI * 2, r = 0.9 + rnd() * 0.6, mx = x + Math.cos(a) * r, mz = z + Math.sin(a) * r, k = 0.7 + rnd() * 0.5;
      stems.push([mx, 0.12 * k, mz, 0.07 * k, 0.12 * k, 0.07 * k]); caps.push([mx, 0.24 * k, mz, 0.17 * k, 0.12 * k, 0.17 * k]);
    }
    scene.add(puffs(stems, new THREE.MeshLambertMaterial({ color: 0xfff6ea }), 0.05));
    scene.add(puffs(caps, new THREE.MeshLambertMaterial({ color: 0xf47d95, emissive: 0x401020, emissiveIntensity: 0.2 }), 0.1));
  }

  // ======================================================================
  //  게시판 (방명록): 지붕 달린 나무 게시판, 최근 쪽지 6장이 핀으로 꽂혀요
  // ======================================================================
  const gbFrames = [];
  {
    const g0 = new THREE.Group(); g0.position.set(BOARD.x, 0, BOARD.z); g0.rotation.y = facing(BOARD.x, BOARD.z); scene.add(g0);
    const g = new THREE.Group(); g.scale.setScalar(0.5); g0.add(g);   // 아담한 크기 (예전의 절반)
    const cork = new THREE.MeshLambertMaterial({ color: 0xe9d9f2 });
    g.add(at(box(9.4, 5.4, 0.3, cork), 0, 3.7, 0));
    for (const [w, h, x, y] of [[9.9, 0.3, 0, 6.5], [9.9, 0.3, 0, 0.9], [0.3, 5.8, -4.85, 3.7], [0.3, 5.8, 4.85, 3.7]]) g.add(at(box(w, h, 0.45, wood), x, y, 0.05));
    for (const x of [-4.85, 4.85]) g.add(at(box(0.32, 7.4, 0.32, woodDark), x, 3.7, -0.15));
    // 지붕
    for (const s of [-1, 1]) { const r = box(10.8, 0.16, 1.3, lilacDeep); r.position.set(0, 7.55, s * 0.5); r.rotation.x = s * 0.5; g.add(r); }
    const titleC = textCanvas(['📌 방명록 게시판'], { font: 46, bg: null, color: '#6b4fb8', family: '"Gowun Batang", serif', bold: true });
    const title = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.6 * titleC.height / titleC.width), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(titleC), transparent: true, toneMapped: false }));
    title.position.set(0, 5.95, 0.17); g.add(title);
    for (let i = 0; i < 6; i++) {
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const tex = new THREE.CanvasTexture(c);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.95, 1.95), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
      m.position.set(-2.9 + (i % 3) * 2.9, 4.4 - Math.floor(i / 3) * 2.2, 0.17 + i * 0.002); m.rotation.z = (rnd() - 0.5) * 0.08; g.add(m);   // 틀(높이 1.05~6.35) 안쪽에 쏙
      gbFrames.push({ c, tex, key: null, mesh: m });
    }
    const lbl = makeSprite(textCanvas(['📌 방명록 · 글과 그림 남기기'], { font: 30 }), 0.6); lbl.position.y = 4.9; g0.add(lbl);
    ZONES.gb = { id: 'gb', name: '방명록 게시판', x: BOARD.x, z: BOARD.z + 1.6, r: 4.2, label: lbl };
    zoneOf(g, 'gb');
    for (let k = -2; k <= 2; k += 2) colliders.push({ x: BOARD.x + k, z: BOARD.z, r: 0.75 });
  }

  // ======================================================================
  //  그뤠잇·스튜핏 판정소
  // ======================================================================
  const boardFrames = [];
  {
    const b0 = new THREE.Group(); b0.position.set(JUDGE.x, 0, JUDGE.z); b0.rotation.y = facing(JUDGE.x, JUDGE.z); scene.add(b0);
    const board = new THREE.Group(); board.scale.setScalar(0.5); b0.add(board);   // 방명록 게시판과 같은 아담한 크기
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
      m.position.set(-3.1 + (i % 3) * 3.1, 5.0 - Math.floor(i / 3) * 2.5, 0.19); board.add(m);
      boardFrames.push({ c, tex, key: null });
    }
    const lbl = makeSprite(textCanvas(['⚖️ 판정소 · 사진 올리고 판정 받기'], { font: 30 }), 0.6); lbl.position.y = 4.9; b0.add(lbl);
    const d = Math.hypot(JUDGE.x, JUDGE.z), fx = -JUDGE.x / d, fz = -JUDGE.z / d;
    ZONES.gs = { id: 'gs', name: '그뤠잇·스튜핏 판정소', x: JUDGE.x + fx * 1.6, z: JUDGE.z + fz * 1.6, r: 4.2, label: lbl };
    zoneOf(board, 'gs');
    for (let k = -2; k <= 2; k += 2) colliders.push({ x: JUDGE.x - fz * k, z: JUDGE.z + fx * k, r: 0.75 });
  }

  // ======================================================================
  //  정자: 라벤더 지붕의 작은 쉼터 (안에 구름 의자 두 개)
  // ======================================================================
  {
    // 동그란 돔 지붕의 작은 정자 (기둥 8개)
    const g = new THREE.Group(); g.position.set(GAZEBO.x, 0, GAZEBO.z); g.rotation.y = facing(GAZEBO.x, GAZEBO.z); scene.add(g);
    g.add(at(cyl(2.5, 2.65, 0.25, marble, 32), 0, 0.125, 0));
    for (let i = 0; i < 8; i++) {
      if (i === 2) continue;   // 광장 쪽은 입구로 비워 둬요
      const a = i / 8 * Math.PI * 2 + Math.PI / 8, x = Math.cos(a) * 2.15, z = Math.sin(a) * 2.15;
      g.add(at(cyl(0.13, 0.16, 2.8, marble, 10), x, 1.65, z));
      const wx = GAZEBO.x + (Math.cos(g.rotation.y) * x + Math.sin(g.rotation.y) * z), wz = GAZEBO.z + (-Math.sin(g.rotation.y) * x + Math.cos(g.rotation.y) * z);
      colliders.push({ x: wx, z: wz, r: 0.25 });
    }
    g.add(at(cyl(2.45, 2.45, 0.28, marble, 32), 0, 3.15, 0));
    g.add(at(new THREE.Mesh(new THREE.SphereGeometry(2.3, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), lilac), 0, 3.28, 0));
    g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), gold), 0, 5.65, 0));
    const lbl = makeSprite(textCanvas(['🌸 정자'], { font: 30 }), 0.55); lbl.position.y = 6.6; g.add(lbl);
    // 구름 의자 두 개 (서로 마주봐요)
    const L = [];
    for (const s of [-1, 1]) {
      const x = GAZEBO.x + Math.cos(g.rotation.y) * s * 1.05, z = GAZEBO.z - Math.sin(g.rotation.y) * s * 1.05;
      L.push([x, 0.28, z, 0.7, 0.38, 0.7]);
      SEATS.push({ x, z, y: 0.32, ry: facing(x, z, GAZEBO.x, GAZEBO.z) });   // 정자 바닥(0.25) 기준 높이
    }
    scene.add(puffs(L));
  }

  // ======================================================================
  //  구름 온천: 바위 테두리, 하늘빛 물, 떠다니는 꽃잎, 모락모락 김
  // ======================================================================
  const steam = [], petals = [];
  {
    const g = new THREE.Group(); g.position.set(SPRING.x, 0, SPRING.z); scene.add(g);
    const water = new THREE.Mesh(new THREE.CircleGeometry(SPRING.r + 0.15, 56), new THREE.MeshPhongMaterial({ color: 0x8edfe2, emissive: 0x1d4f55, emissiveIntensity: 0.5, specular: 0xffffff, shininess: 90, transparent: true, opacity: 0.9 }));
    water.rotation.x = -Math.PI / 2; water.position.y = 0.2; g.add(water);
    const glow = new THREE.Mesh(new THREE.RingGeometry(SPRING.r - 0.6, SPRING.r + 0.1, 56), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, depthWrite: false }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = 0.21; g.add(glow);
    // 바위 테두리: 둥근 돌 + 뒤쪽엔 큰 바위
    const rocks = [], rockMat = new THREE.MeshLambertMaterial({ color: 0xc9bccb, emissive: 0x2a2030, emissiveIntensity: 0.25 });
    for (let i = 0; i < 24; i++) {
      const a = i / 28 * Math.PI * 2 + rnd() * 0.08, rr = SPRING.r + 0.4 + rnd() * 0.15, s = 0.45 + rnd() * 0.2;
      rocks.push([Math.cos(a) * rr, 0.2, Math.sin(a) * rr, s, s * 0.6, s * 0.85]);
    }
    for (let i = 0; i < 7; i++) {   // 섬 바깥쪽(뒤) 반원에 큰 바위
      const a = -0.9 + i * 0.3 + rnd() * 0.1, rr = SPRING.r + 1.1 + rnd() * 0.4, s = 0.8 + rnd() * 0.6;
      rocks.push([Math.cos(a) * rr, s * 0.45, Math.sin(a) * rr, s, s * 0.85, s * 0.9]);
      colliders.push({ x: SPRING.x + Math.cos(a) * rr, z: SPRING.z + Math.sin(a) * rr, r: s * 0.8 });
    }
    g.add(puffs(rocks, rockMat));
    const petalMat = new THREE.MeshLambertMaterial({ color: 0xffb3cc, emissive: 0x3a1a26, emissiveIntensity: 0.3, side: THREE.DoubleSide });
    for (let i = 0; i < 9; i++) {
      const p = new THREE.Mesh(new THREE.CircleGeometry(0.13, 10), petalMat); p.scale.y = 0.65;
      p.rotation.x = -Math.PI / 2; p.position.y = 0.22; p.userData.keep = true; g.add(p);
      petals.push({ m: p, r: 1 + rnd() * (SPRING.r - 1.6), a: rnd() * Math.PI * 2, sp: (rnd() - 0.5) * 0.12 });
    }
    const steamTex = glowTexture('rgba(255,255,255,0.9)', 'rgba(255,255,255,0)');
    for (let i = 0; i < 16; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0 }));
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * (SPRING.r - 0.5);
      g.add(s); steam.push({ s, t: rnd() * 4, x: Math.cos(a) * r, z: Math.sin(a) * r });
    }
    const lbl = makeSprite(textCanvas(['♨️ 구름 온천'], { font: 32 }), 0.7); lbl.position.y = 5.2; g.add(lbl);
  }

  // ======================================================================
  //  눈놀이터: 눈사람(캐릭터 키의 약 2배), 이글루, 눈덩이 양동이, 나무 울타리
  // ======================================================================
  const snowFx = [];
  const snowMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x3a3848, emissiveIntensity: 0.35 });
  {
    const g = new THREE.Group(); g.position.set(SNOW.x, 0, SNOW.z); g.rotation.y = facing(SNOW.x, SNOW.z); scene.add(g);
    const body = new THREE.Group(); body.userData.keep = true; g.add(body); SNOW.body = body;
    const coal = new THREE.MeshLambertMaterial({ color: 0x2b2630 });
    const sp = new THREE.SphereGeometry(1, 28, 20);
    const ball = (m, r, x, y, z) => { const o = new THREE.Mesh(sp, m); o.scale.setScalar(r); o.position.set(x, y, z); body.add(o); return o; };
    ball(snowMat, 1.05, 0, 0.95, 0); ball(snowMat, 0.8, 0, 2.35, 0); ball(snowMat, 0.6, 0, 3.45, 0);
    for (const s of [-1, 1]) ball(coal, 0.07, s * 0.2, 3.58, 0.53);
    for (let i = 0; i < 5; i++) { const a = -0.5 + i * 0.25; ball(coal, 0.045, Math.sin(a) * 0.32, 3.3 - Math.cos(a * 1.2) * 0.08 + 0.08, 0.52); }
    for (let i = 0; i < 3; i++) ball(coal, 0.07, 0, 2.6 - i * 0.32, 0.76 - i * 0.02);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.5, 14), new THREE.MeshLambertMaterial({ color: 0xff8a3d })); nose.rotation.x = Math.PI / 2; nose.position.set(0, 3.45, 0.82); body.add(nose);
    const scarfMat = new THREE.MeshLambertMaterial({ color: 0xe8566b });
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.13, 10, 32), scarfMat); scarf.rotation.x = Math.PI / 2; scarf.position.y = 2.95; body.add(scarf);
    const tail = box(0.22, 0.6, 0.08, scarfMat); tail.position.set(0.35, 2.65, 0.55); tail.rotation.z = 0.25; body.add(tail);
    const hat = new THREE.Mesh(new THREE.SphereGeometry(0.56, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x9db8f0 })); hat.position.y = 3.72; body.add(hat);
    const brim = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.09, 8, 28), new THREE.MeshLambertMaterial({ color: 0xffffff })); brim.rotation.x = Math.PI / 2; brim.position.y = 3.74; body.add(brim);
    ball(new THREE.MeshLambertMaterial({ color: 0xffffff }), 0.16, 0, 4.32, 0);
    const stick = new THREE.MeshLambertMaterial({ color: 0x7a5534 });
    for (const s of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 1.3, 8), stick); arm.position.set(s * 1.25, 2.6, 0); arm.rotation.z = s * -1.05; body.add(arm);
      const twig = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.4, 6), stick); twig.position.set(s * 1.68, 3.0, 0); twig.rotation.z = s * -0.3; body.add(twig);
    }
    const mound = []; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, r = 1.25 + rnd() * 0.5, s = 0.45 + rnd() * 0.3; mound.push([Math.cos(a) * r, 0.05, Math.sin(a) * r, s, s * 0.45, s]); }
    g.add(puffs(mound, snowMat));
    const lbl = makeSprite(textCanvas(['☃️ 눈놀이터 · 눈덩이를 던져 봐요'], { font: 28 }), 0.62); lbl.position.y = 5.1; g.add(lbl);
    zoneOf(g, 'sn');
    colliders.push({ x: SNOW.x, z: SNOW.z, r: 1.3 });
    SNOW.group = g; SNOW.wob = 0; SNOW.wobDir = 1;
    const flake = new THREE.SphereGeometry(1, 8, 6);
    SNOW.hit = (p) => {
      SNOW.wob = 1; SNOW.wobDir = Math.random() < 0.5 ? -1 : 1;
      for (let i = 0; i < 12; i++) {
        const m = new THREE.Mesh(flake, snowMat); m.scale.setScalar(0.05 + Math.random() * 0.07);
        m.position.copy(p); scene.add(m);
        snowFx.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 3, 1 + Math.random() * 2.5, (Math.random() - 0.5) * 3), life: 0.9 + Math.random() * 0.4 });
      }
    };
    SNOW.target = () => {
      const h = 1.2 + Math.random() * 2.3, rr = h > 2.9 ? 0.55 : h > 1.7 ? 0.75 : 0.95;
      return g.localToWorld(new THREE.Vector3((Math.random() - 0.5) * 0.6, h, rr * 0.9));
    };
  }
  // 이글루: 눈사람 뒤 바깥쪽
  {
    const d = Math.hypot(SNOW.x, SNOW.z), ox = SNOW.x / d, oz = SNOW.z / d, sx = -oz, sz = ox;
    const ix = SNOW.x + ox * 3.6 + sx * 3, iz = SNOW.z + oz * 3.6 + sz * 3;
    const g = new THREE.Group(); g.position.set(ix, 0, iz); g.rotation.y = facing(ix, iz); g.scale.setScalar(0.7); scene.add(g);
    const iceMat = new THREE.MeshLambertMaterial({ color: 0xf4f8ff, emissive: 0x2c3448, emissiveIntensity: 0.3 });
    g.add(new THREE.Mesh(new THREE.SphereGeometry(2.4, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), iceMat));
    const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 1.6, 20, 1, false, -Math.PI / 2, Math.PI), iceMat);
    tunnel.rotation.x = Math.PI / 2; tunnel.position.set(0, 0, 2.3); g.add(tunnel);
    const door = new THREE.Mesh(new THREE.CircleGeometry(0.75, 20, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x6e7fa8 })); door.position.set(0, 0.01, 3.11); g.add(door);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xd6def0 });
    for (const y of [0.7, 1.35, 1.9]) { const r = Math.sqrt(2.4 * 2.4 - y * y) + 0.01; const ln = new THREE.Mesh(new THREE.TorusGeometry(r, 0.03, 4, 48), lineMat); ln.rotation.x = Math.PI / 2; ln.position.y = y; g.add(ln); }
    colliders.push({ x: ix, z: iz, r: 1.75 });
    // 눈덩이 양동이
    const bx = SNOW.x - sx * 2.4 + ox * 0.4, bz = SNOW.z - sz * 2.4 + oz * 0.4;
    const bucket = cyl(0.5, 0.4, 0.7, new THREE.MeshLambertMaterial({ color: 0x8fb3ec }), 16); bucket.position.set(bx, 0.35, bz); scene.add(bucket);
    const sb = []; for (let i = 0; i < 6; i++) sb.push([bx + (rnd() - 0.5) * 0.5, 0.72 + rnd() * 0.12, bz + (rnd() - 0.5) * 0.5, 0.2]);
    scene.add(puffs(sb, snowMat));
    colliders.push({ x: bx, z: bz, r: 0.5 });
    // 나무 울타리 (바깥쪽 반원)
    const post = new THREE.CylinderGeometry(0.09, 0.11, 1.0, 6), rail = new THREE.BoxGeometry(1, 0.1, 0.06);
    const posts = [], rails = [];
    const base = Math.atan2(oz, ox);
    for (let i = 0; i <= 10; i++) {
      const a = base - 0.9 + i * (1.8 / 10), x = SNOW.x + Math.cos(a) * 6.2, z = SNOW.z + Math.sin(a) * 6.2;
      posts.push([x, z]);
      if (i) { const [px, pz] = posts[i - 1]; rails.push([(x + px) / 2, (z + pz) / 2, Math.hypot(x - px, z - pz), Math.atan2(-(z - pz), x - px)]); }
    }
    const pm = new THREE.InstancedMesh(post, wood, posts.length), rm = new THREE.InstancedMesh(rail, wood, rails.length * 2), o = new THREE.Object3D();
    posts.forEach(([x, z], i) => { o.position.set(x, 0.5, z); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); o.updateMatrix(); pm.setMatrixAt(i, o.matrix); });
    rails.forEach(([x, z, l, ry], i) => { for (const k of [0, 1]) { o.position.set(x, 0.45 + k * 0.35, z); o.rotation.set(0, ry, 0); o.scale.set(l, 1, 1); o.updateMatrix(); rm.setMatrixAt(i * 2 + k, o.matrix); } });
    pm.instanceMatrix.needsUpdate = rm.instanceMatrix.needsUpdate = true; scene.add(pm, rm);
  }

  // ======================================================================
  //  밴드 무대: 둥근 무대 위 드럼·베이스·기타·건반, 뒤에 천국의 문
  // ======================================================================
  BAND.parts = [];
  BAND.lights = [];
  BAND.beat = 0;
  {
    const ry = facing(BAND.x, BAND.z), fx = Math.sin(ry), fz = Math.cos(ry), sx = fz, sz = -fx;   // 앞(광장 쪽), 오른쪽
    const W2 = (f, s) => [BAND.x + fx * f + sx * s, BAND.z + fz * f + sz * s];
    const stage = new THREE.Group(); stage.position.set(BAND.x, 0, BAND.z); stage.rotation.y = ry; scene.add(stage);
    stage.add(at(cyl(BAND.r, BAND.r + 0.15, BAND.h, new THREE.MeshLambertMaterial({ color: 0xf3e6fb }), 48), 0, BAND.h / 2, 0));
    const rim = new THREE.Mesh(new THREE.TorusGeometry(BAND.r + 0.05, 0.09, 6, 64), gold); rim.rotation.x = Math.PI / 2; rim.position.y = BAND.h; stage.add(rim);
    // 무대 앞 계단 (광장 쪽)
    stage.add(at(box(3, 0.22, 0.7, new THREE.MeshLambertMaterial({ color: 0xe6d6f3 })), 0, 0.11, BAND.r + 0.3));
    // 악기 만들기
    const black = new THREE.MeshLambertMaterial({ color: 0x3a3346 }), white = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const chrome = new THREE.MeshPhongMaterial({ color: 0xdedce8, specular: 0xffffff, shininess: 90 });
    function drums(){
      const g = new THREE.Group(), shell = new THREE.MeshLambertMaterial({ color: 0xc58fe6 }), skin = new THREE.MeshLambertMaterial({ color: 0xfbf8ff });
      const kick = cyl(0.55, 0.55, 0.5, shell, 20); kick.rotation.x = Math.PI / 2; kick.position.set(0, 0.55, 0); g.add(kick);
      const kf = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), skin); kf.position.set(0, 0.55, 0.26); g.add(kf);
      const star = makeSprite(textCanvas(['★'], { font: 40, bg: null, color: '#c58fe6' }), 0.5); star.position.set(0, 0.55, 0.3); g.add(star);
      for (const [x, y, z, r] of [[-0.35, 1.05, 0.1, 0.24], [0.35, 1.05, 0.1, 0.24], [-0.65, 0.6, -0.25, 0.3]]) {
        const t = cyl(r, r, 0.28, shell, 16); t.position.set(x, y, z); t.rotation.x = 0.35; g.add(t);
        const s = cyl(r * 0.96, r * 0.96, 0.02, skin, 16); s.position.set(x, y + 0.14, z + 0.05); s.rotation.x = 0.35; g.add(s);
      }
      const snare = cyl(0.26, 0.26, 0.18, chrome, 16); snare.position.set(0.5, 0.75, -0.4); g.add(snare);
      for (const [x, y] of [[-0.9, 1.45], [0.9, 1.55]]) {
        const st = cyl(0.025, 0.025, y, chrome, 6); st.position.set(x, y / 2, -0.2); g.add(st);
        const cy = cyl(0.42, 0.42, 0.02, gold, 20); cy.position.set(x, y, -0.2); cy.rotation.z = x < 0 ? 0.15 : -0.15; g.add(cy);
      }
      const stool = cyl(0.25, 0.25, 0.08, black, 12); stool.position.set(0, 0.5, -1.0); g.add(stool);
      const leg = cyl(0.04, 0.04, 0.5, chrome, 6); leg.position.set(0, 0.25, -1.0); g.add(leg);
      return g;
    }
    function guitarShape(bodyCol, neckL){
      const g = new THREE.Group(), bm = new THREE.MeshPhongMaterial({ color: bodyCol, shininess: 60 });
      const b1 = cyl(0.34, 0.34, 0.12, bm, 18); b1.rotation.x = Math.PI / 2; b1.position.y = 0; g.add(b1);
      const b2 = cyl(0.26, 0.26, 0.12, bm, 18); b2.rotation.x = Math.PI / 2; b2.position.y = 0.38; g.add(b2);
      const neck = box(0.09, neckL, 0.05, woodDark); neck.position.y = 0.45 + neckL / 2; g.add(neck);
      const head = box(0.14, 0.2, 0.05, black); head.position.y = 0.5 + neckL; g.add(head);
      const pick = box(0.16, 0.12, 0.01, white); pick.position.set(0.1, 0.05, 0.065); g.add(pick);
      return g;
    }
    function onStand(inst){
      const g = new THREE.Group();
      const legs = cyl(0.03, 0.03, 0.9, chrome, 6); legs.position.y = 0.45; g.add(legs);
      const foot = cyl(0.28, 0.28, 0.04, chrome, 3); foot.position.y = 0.02; g.add(foot);
      inst.position.y = 0.6; inst.rotation.x = -0.15; g.add(inst); g.userData.top = inst; inst.userData.keep = true;   // 누가 연주하면 손으로 옮겨가요
      return g;
    }
    function keys(){
      const g = new THREE.Group();
      const top = box(1.5, 0.12, 0.45, black); top.position.y = 0.95; g.add(top);
      const kb = box(1.36, 0.04, 0.22, white); kb.position.set(0, 1.02, 0.08); g.add(kb);
      for (let i = 0; i < 9; i++) { if (i === 2 || i === 6) continue; const k = box(0.07, 0.04, 0.12, black); k.position.set(-0.6 + i * 0.15 + 0.075, 1.05, 0.03); g.add(k); }
      for (const s of [-1, 1]) { const l = box(0.05, 0.95, 0.05, chrome); l.position.set(s * 0.6, 0.47, 0); l.rotation.z = s * 0.35; g.add(l); }
      return g;
    }
    // 연주 자리: 사람은 악기 뒤에 서서 광장을 바라봐요
    const PARTS = [
      { id: 'drums', name: '드럼', emo: '🥁', f: -2.1, s: 0, make: drums, instF: -1.1 },
      { id: 'bass', name: '베이스', emo: '🎸', f: -0.2, s: -2.4, make: () => onStand(guitarShape(0x6aa8e8, 1.15)), instF: 0.8, instS: 0.5 },
      { id: 'guitar', name: '기타', emo: '🎸', f: 1.4, s: 0, make: () => onStand(guitarShape(0xf28bb5, 0.85)), instF: 2.4, instS: 0.5 },
      { id: 'keys', name: '건반', emo: '🎹', make: () => { const k = keys(); k.rotation.y = Math.PI; return k; }, instF: 0.75, f: -0.2, s: 2.4 }   // 건반이 연주자 쪽을 보게
    ];
    const ringTex = glowTexture('rgba(255,240,255,0.95)', 'rgba(255,220,250,0)');
    for (const P of PARTS) {
      const inst = P.make(); inst.position.set(P.s + (P.instS || 0), BAND.h, P.instF); stage.add(inst);
      zoneOf(inst, 'bd:' + P.id);   // 악기를 클릭하면 걸어가서 연주해요
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.75, 32), new THREE.MeshBasicMaterial({ map: ringTex, color: 0xd6b3ff, transparent: true, opacity: 0.7, depthWrite: false, toneMapped: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(P.s, BAND.h + 0.02, P.f); ring.userData.keep = true; stage.add(ring);
      const lbl = makeSprite(textCanvas([`${P.emo} ${P.name}`], { font: 28 }), 0.5); lbl.position.set(P.s, BAND.h + 2.9, P.f); stage.add(lbl);
      const [x, z] = W2(P.f, P.s), [ix, iz] = W2(P.instF + (P.id === 'drums' ? 0.35 : 0), P.s + (P.instS || 0));
      BAND.parts.push({ id: P.id, name: P.name, emo: P.emo, x, z, ry, ring, inst, label: lbl });
      colliders.push({ x: ix, z: iz, r: P.id === 'drums' ? 0.6 : 0.35 });
    }
    const lbl = makeSprite(textCanvas(['🎵 밴드 무대 · 악기 자리에 서면 연주해요'], { font: 28 }), 0.62); lbl.position.set(0, 5.4, 0); stage.add(lbl);
    BAND.label = lbl;
    // 천국의 문: 무대 뒤쪽을 감싸는 아치 + 라벤더 커튼 + 박자에 맞춰 반짝이는 전구
    const GS = 0.72, [gx, gz] = W2(-BAND.r + 0.15, 0);
    const g = new THREE.Group(); g.position.set(gx, 0, gz); g.rotation.y = ry; g.scale.setScalar(GS); scene.add(g);
    for (const x of [-4.6, 4.6]) {
      g.add(at(cyl(0.6, 0.72, 10, marble, 20), x, 5, 0));
      g.add(at(cyl(0.95, 0.65, 0.5, gold, 20), x, 10.2, 0));
      g.add(at(cyl(1.0, 1.1, 0.5, gold, 20), x, 0.25, 0));
      colliders.push({ x: gx + sx * x * GS, z: gz + sz * x * GS, r: 0.8 });
    }
    const arch = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.4, 12, 40, Math.PI), gold); arch.position.y = 10.3; g.add(arch);
    const curtain = new THREE.MeshLambertMaterial({ color: 0xb79be8, emissive: 0x2a1850, emissiveIntensity: 0.3 });
    g.add(at(box(8.6, 9.6, 0.18, curtain), 0, 5.2, -0.5));
    for (let i = 0; i < 9; i++) g.add(at(cyl(0.22, 0.22, 9.6, curtain, 8), -3.9 + i * 0.975, 5.2, -0.35));   // 커튼 주름
    const star = makeSprite(textCanvas(['★'], { font: 96, bg: null, color: '#ffd76a', bold: true }), 2.2); star.position.set(0, 8.6, 0); g.add(star);
    for (let i = 0; i <= 10; i++) {
      const a = i / 10 * Math.PI, bulb = new THREE.Sprite(new THREE.SpriteMaterial({ map: lampTex, depthWrite: false, blending: THREE.AdditiveBlending, transparent: true, color: i % 2 ? 0xffc7ea : 0xfff0b0 }));
      bulb.position.set(Math.cos(a) * 4.6, 10.3 + Math.sin(a) * 4.6, 0.45); bulb.userData.base = 1.4; bulb.scale.set(1.4, 1.4, 1); g.add(bulb); BAND.lights.push(bulb);
    }
    const cl = []; for (let i = 0; i < 12; i++) { const t = i / 11, s = 0.9 + rnd() * 0.6; cl.push([-5.6 + t * 11.2, 0.2, -0.6 + (rnd() - 0.5) * 1.2, s, s * 0.6, s]); }
    g.add(puffs(cl));
    const gl = makeSprite(textCanvas(['천국의 문'], { font: 44, bg: null, color: '#b98a12', family: '"Gowun Batang", serif', bold: true }), 1.3); gl.position.y = 15.6; g.add(gl);
  }
  // 무대 위 높이 (그 위에선 살짝 올라가요)
  const floorAt = (x, z) => Math.hypot(x - BAND.x, z - BAND.z) < BAND.r ? BAND.h : Math.hypot(x - GAZEBO.x, z - GAZEBO.z) < 2.5 ? 0.25 : 0;

  // ======================================================================
  //  섬 가장자리에 매달린 별
  // ======================================================================
  const stars = [];
  {
    const shape = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.42 : 1; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? shape.lineTo(x, y) : shape.moveTo(x, y); }
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.08, bevelSegments: 2 });
    geo.translate(0, 0, -0.15);
    const starMat = new THREE.MeshPhongMaterial({ color: 0xffe08a, emissive: 0x806020, emissiveIntensity: 0.5, specular: 0xffffff, shininess: 80 });
    const strMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 });
    for (let i = 0; i < 16; i++) {   // 섬 가장자리 아래에 대롱대롱
      const a = i / 16 * Math.PI * 2 + rnd() * 0.2, r = 22.5 + rnd() * 2, top = -1.2, len = 1.6 + rnd() * 3;
      const piv = new THREE.Group(); piv.position.set(Math.cos(a) * r, top, Math.sin(a) * r); piv.userData.keep = true; scene.add(piv);
      const str = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -len, 0)]), strMat); piv.add(str);
      const st = new THREE.Mesh(geo, starMat); st.position.y = -len - 0.6; st.scale.setScalar(0.5 + rnd() * 0.3); piv.add(st);
      stars.push({ piv, st, ph: rnd() * 6, sp: 0.4 + rnd() * 0.4 });
    }
  }

  // ======================================================================
  //  유니콘 놀이터: 그네(두 자리)와 시소(두 자리, 둘이 타면 오르락내리락)
  // ======================================================================
  const PLAY = { rides: [], occ: new Set(), now: 0 };
  {
    const white = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x3a3048, emissiveIntensity: 0.3 });
    const blush = new THREE.MeshLambertMaterial({ color: 0xffd3e2 });
    const ink = new THREE.MeshBasicMaterial({ color: 0x3d3550 });
    const hornMat = new THREE.MeshPhongMaterial({ color: 0xffd76a, emissive: 0x6a4a00, emissiveIntensity: 0.4, shininess: 90 });
    const MANE = [0xffb3c8, 0xffd59e, 0xfff3a0, 0xbfe8c4, 0xb9d8ff, 0xd4bfff].map(c => new THREE.MeshLambertMaterial({ color: c, emissive: 0x2a2030, emissiveIntensity: 0.2 }));
    const ball = new THREE.SphereGeometry(1, 14, 10);
    const blob = (m, sx, sy, sz, x, y, z) => { const o = new THREE.Mesh(ball, m); o.scale.set(sx, sy, sz); o.position.set(x, y, z); return o; };
    // 유니콘 머리 (+z 쪽을 바라봐요)
    function unicornHead(sc){
      const g = new THREE.Group();
      g.add(blob(white, 0.42, 0.4, 0.46, 0, 0, 0));
      g.add(blob(blush, 0.28, 0.24, 0.3, 0, -0.14, 0.36));
      for (const sx of [-1, 1]) {
        g.add(blob(ink, 0.045, 0.06, 0.03, sx * 0.19, 0.08, 0.38));
        g.add(blob(blush, 0.07, 0.045, 0.03, sx * 0.27, -0.06, 0.33));
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 8), white); ear.position.set(sx * 0.2, 0.4, -0.04); ear.rotation.z = -sx * 0.25; g.add(ear);
      }
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.5, 12), hornMat); horn.position.set(0, 0.5, 0.14); horn.rotation.x = 0.35; g.add(horn);
      for (let i = 0; i < 6; i++) g.add(blob(MANE[i], 0.13, 0.13, 0.13, 0, 0.36 - i * 0.11, -0.2 - i * 0.05));
      g.scale.setScalar(sc); return g;
    }
    const pastel = [0xffc2d9, 0xc9b6f2, 0xbfe3f5].map(c => new THREE.MeshLambertMaterial({ color: c, emissive: 0x2a2030, emissiveIntensity: 0.2 }));
    const rope = new THREE.MeshLambertMaterial({ color: 0xf7f0ff });
    // --- 그네: 무지개빛 A자 틀, 꼭대기 큰 유니콘, 자리마다 작은 유니콘 ---
    {
      const g = new THREE.Group(); g.position.set(SWING.x, 0, SWING.z); scene.add(g);   // 그네는 광장(-z)을 향해 흔들려요
      const TOP = 3.4;
      for (const sx of [-2.3, 2.3]) for (const sz of [-1, 1]) {
        const leg = cyl(0.11, 0.13, 3.6, pastel[sz < 0 ? 0 : 1], 10); leg.position.set(sx, TOP / 2, sz * 0.75); leg.rotation.x = -sz * 0.43; g.add(leg);
        colliders.push({ x: SWING.x + sx, z: SWING.z + sz * 1.45, r: 0.3 });
      }
      const bar = cyl(0.13, 0.13, 4.9, pastel[2], 12); bar.rotation.z = Math.PI / 2; bar.position.y = TOP; g.add(bar);
      const big = unicornHead(1.15); big.position.set(0, TOP + 0.55, 0); big.rotation.y = Math.PI; g.add(big);
      for (const sx of [-2.3, 2.3]) { const k = at(new THREE.Mesh(ball, pastel[0]), sx, TOP, 0); k.scale.setScalar(0.2); g.add(k); }
      for (let i = 0; i < 2; i++) {
        const PX = i ? 1.1 : -1.1, piv = new THREE.Group(); piv.position.set(PX, TOP, 0); piv.userData.keep = true; g.add(piv);
        for (const rx of [-0.32, 0.32]) piv.add(at(cyl(0.025, 0.025, 2.75, rope, 6), rx, -1.375, 0));
        piv.add(at(box(0.85, 0.09, 0.5, pastel[i ? 1 : 0]), 0, -2.75, 0));
        const mini = unicornHead(0.42); mini.position.set(0, -2.45, -0.3); mini.rotation.y = Math.PI; piv.add(mini);
        zoneOf(piv, 'pl:sw' + i);
        const ride = { id: 'sw' + i, kind: 'swing', name: '유니콘 그네', x: SWING.x + PX, z: SWING.z + 0.9, piv, ph: i * 1.3 };
        ride.angle = () => PLAY.occ.has(ride.id) ? Math.sin(PLAY.now * Math.PI * 2 / 2.6 + ride.ph) * 0.55 : Math.sin(PLAY.now * 1.3 + ride.ph) * 0.03;
        ride.pose = () => { const a = ride.angle(), L = 2.7 - 0.05; return { x: SWING.x + PX, y: TOP - Math.cos(a) * 2.7 - 0.1, z: SWING.z - Math.sin(a) * L, ry: Math.PI }; };
        PLAY.rides.push(ride);
      }
      const lbl = makeSprite(textCanvas(['🦄 유니콘 그네'], { font: 28 }), 0.55); lbl.position.y = TOP + 2.0; g.add(lbl);
    }
    // --- 시소: 유니콘 받침, 양쪽 끝 손잡이도 유니콘 ---
    {
      const g = new THREE.Group(); g.position.set(SAW.x, 0, SAW.z); scene.add(g);
      const PIV = 0.7, END = 2.3;
      const base = cyl(0.55, 0.75, PIV, pastel[1], 3); base.position.y = PIV / 2; base.rotation.y = Math.PI / 2; g.add(base);
      const head = unicornHead(0.7); head.position.set(0, PIV + 0.25, -0.75); head.rotation.y = Math.PI; g.add(head);   // 받침 앞으로 고개를 내민 유니콘
      g.add(blob(MANE[0], 0.22, 0.22, 0.22, 0, PIV + 0.05, 0.6));
      const plank = new THREE.Group(); plank.position.y = PIV; plank.userData.keep = true; g.add(plank);
      plank.add(box(5.0, 0.14, 0.42, pastel[0]));
      for (const sx of [-1, 1]) {
        const seat = at(new THREE.Mesh(ball, white), sx * END, 0.12, 0); seat.scale.set(0.38, 0.1, 0.3); plank.add(seat);
        const post = cyl(0.05, 0.05, 0.45, pastel[2], 8); post.position.set(sx * (END - 0.6), 0.28, 0); plank.add(post);
        const h = unicornHead(0.38); h.position.set(sx * (END - 0.6), 0.6, 0); h.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2; plank.add(h);
      }
      zoneOf(plank, 'pl:ss'); zoneOf(g, 'pl:ss');
      for (const x of [-2, 0, 2]) colliders.push({ x: SAW.x + x, z: SAW.z, r: 0.45 });
      PLAY.saw = plank;
      const tilt = () => {
        const a = PLAY.occ.has('ss0'), b = PLAY.occ.has('ss1');
        if (a && b) return Math.sin(PLAY.now * Math.PI * 2 / 2.6) * 0.27;   // 둘이 타면 오르락내리락
        if (b) return -0.27; if (a) return 0.27;                            // 혼자면 그쪽이 쿵 내려가요
        return 0.27;
      };
      PLAY.sawTilt = tilt;
      for (let i = 0; i < 2; i++) {
        const sx = i ? 1 : -1;   // ss0 = 왼쪽(-x), ss1 = 오른쪽(+x)
        const ride = { id: 'ss' + i, kind: 'seesaw', name: '유니콘 시소', x: SAW.x + sx * END, z: SAW.z + 0.9 };
        ride.pose = () => { const a = tilt(), lx = sx * (END + 0.05); return { x: SAW.x + Math.cos(a) * lx, y: PIV + Math.sin(a) * lx + 0.12, z: SAW.z, ry: sx > 0 ? -Math.PI / 2 : Math.PI / 2 }; };
        PLAY.rides.push(ride);
      }
      const lbl = makeSprite(textCanvas(['🦄 유니콘 시소 · 둘이 타 봐요'], { font: 28 }), 0.55); lbl.position.y = 2.7; g.add(lbl);
    }
  }

  // ======================================================================
  //  크리스마스: 소원 트리 (오너먼트에 소원을 적어 달아요) + 선물 상자 + 함박눈
  // ======================================================================
  {
    const g = new THREE.Group(); g.position.set(XMAS.x, 0, XMAS.z); g.rotation.y = facing(XMAS.x, XMAS.z); scene.add(g);
    const pine = new THREE.MeshLambertMaterial({ color: 0x7cc79a, emissive: 0x123020, emissiveIntensity: 0.3 });
    const pine2 = new THREE.MeshLambertMaterial({ color: 0x92d6ad, emissive: 0x123020, emissiveIntensity: 0.3 });
    g.add(at(cyl(0.32, 0.4, 1.0, woodDark, 10), 0, 0.5, 0));
    const TIERS = [[2.3, 2.0, 1.6], [1.85, 1.8, 2.75], [1.4, 1.6, 3.8], [0.95, 1.4, 4.75]];   // [반지름, 높이, 가운데 높이]
    TIERS.forEach(([r, h, y], i) => g.add(at(new THREE.Mesh(new THREE.ConeGeometry(r, h, 18), i % 2 ? pine2 : pine), 0, y, 0)));
    // 눈 쌓인 가장자리
    TIERS.forEach(([r, h, y]) => { const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 0.93, 0.09, 6, 28), snowMat); rim.rotation.x = Math.PI / 2; rim.position.y = y - h / 2 + 0.06; g.add(rim); });
    // 꼭대기 별
    const sh = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.2 : 0.48; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    const star = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.14, bevelEnabled: false }), new THREE.MeshPhongMaterial({ color: 0xffd76a, emissive: 0xb08000, emissiveIntensity: 0.6, shininess: 90 }));
    star.position.set(0, 5.75, -0.07); star.userData.keep = true; g.add(star); XMAS.star = star;
    const starGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: lampTex, depthWrite: false, blending: THREE.AdditiveBlending, transparent: true })); starGlow.scale.set(2.2, 2.2, 1); starGlow.position.y = 5.8; g.add(starGlow); XMAS.glow = starGlow;
    // 반짝이 전구 줄 (나선)
    const BULB = [0xff8fb1, 0xffe08a, 0x9ad5ff, 0xc8a8ff, 0xa8f0c0].map(c => new THREE.Color(c));
    const NB = 44, bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), NB);
    const o = new THREE.Object3D(), coneR = y => y < 0.6 ? 0 : y > 5.45 ? 0 : (y < 2.6 ? 2.3 * (2.6 - y) / 2.0 : y < 3.65 ? 1.85 * (3.65 - y) / 1.8 : y < 4.6 ? 1.4 * (4.6 - y) / 1.6 : 0.95 * (5.45 - y) / 1.4);
    for (let i = 0; i < NB; i++) {
      const k = i / NB, y = 0.9 + k * 4.3, a = k * Math.PI * 2 * 4.2, r = coneR(y) * 0.98 + 0.04;
      o.position.set(Math.cos(a) * r, y, Math.sin(a) * r); o.updateMatrix(); bulbs.setMatrixAt(i, o.matrix); bulbs.setColorAt(i, BULB[i % BULB.length]);
    }
    bulbs.userData.keep = true; g.add(bulbs); XMAS.bulbs = bulbs; XMAS.bulbCols = BULB;
    // 소원 오너먼트 자리 (최근 소원 24개). 오너먼트 그림은 main이 카메라를 향한 카드로 달아요
    const NO = 24, ORN_HEX = ['#f2667f', '#f5c542', '#f79cc5', '#6fb6f2', '#a98be8', '#7fd6a6'];
    const cy = Math.cos(g.rotation.y), sy = Math.sin(g.rotation.y);
    XMAS.slots = [];
    for (let i = 0; i < NO; i++) {
      const k = (i * 0.61803 + 0.1) % 1, y = 1.15 + k * 3.6, a = i * 2.39996, r = coneR(y) + 0.22;
      const lx = Math.cos(a) * r, lz = Math.sin(a) * r;
      XMAS.slots.push(new THREE.Vector3(XMAS.x + lx * cy + lz * sy, y, XMAS.z - lx * sy + lz * cy));
    }
    XMAS.ORN_HEX = ORN_HEX;
    // 선물 상자
    const GIFT = [[0xf79cc5, 0xffffff, -1.5, 1.6, 0.7], [0x9ad5ff, 0xffd76a, 1.6, 1.3, 0.6], [0xc8a8ff, 0xf79cc5, 0.4, 2.3, 0.5], [0xffe08a, 0xf2667f, -0.6, -2.2, 0.55]];
    for (const [c, rc, x, z, sz] of GIFT) {
      const bx = new THREE.Group(); bx.position.set(x, sz / 2, z); bx.rotation.y = rnd() * 1.5; g.add(bx);
      bx.add(box(sz, sz, sz, new THREE.MeshLambertMaterial({ color: c })));
      const rib = new THREE.MeshLambertMaterial({ color: rc });
      bx.add(box(sz * 1.02, sz * 1.02, sz * 0.18, rib)); bx.add(box(sz * 0.18, sz * 1.02, sz * 1.02, rib));
      for (const sx of [-1, 1]) { const bow = new THREE.Mesh(new THREE.TorusGeometry(sz * 0.16, sz * 0.05, 6, 14), rib); bow.position.set(sx * sz * 0.14, sz * 0.58, 0); bow.rotation.y = Math.PI / 2; bow.rotation.x = sx * 0.6; bx.add(bow); }
    }
    const lbl = makeSprite(textCanvas(['🎄 소원 트리 · 오너먼트에 소원 달기'], { font: 28 }), 0.6); lbl.position.y = 7.0; g.add(lbl);
    const d = Math.hypot(XMAS.x, XMAS.z), fx = -XMAS.x / d, fz = -XMAS.z / d;
    ZONES.xm = { id: 'xm', name: '소원 트리', x: XMAS.x + fx * 2.6, z: XMAS.z + fz * 2.6, r: 3.6, label: lbl };
    zoneOf(g, 'xm');
    colliders.push({ x: XMAS.x, z: XMAS.z, r: 2.2 });
    XMAS.top = new THREE.Vector3(XMAS.x, 7.9, XMAS.z);
  }
  // 함박눈: 섬 위로 천천히 내려요 (점 하나로 그려서 가벼워요)
  const FLAKES = 320, flakeGeo = new THREE.BufferGeometry(), flakePos = new Float32Array(FLAKES * 3);
  for (let i = 0; i < FLAKES; i++) { const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 30; flakePos[i*3] = Math.cos(a) * r; flakePos[i*3+1] = rnd() * 22; flakePos[i*3+2] = Math.sin(a) * r; }
  flakeGeo.setAttribute('position', new THREE.BufferAttribute(flakePos, 3));
  scene.add(new THREE.Points(flakeGeo, new THREE.PointsMaterial({ size: 0.32, map: glowTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)'), transparent: true, opacity: 0.9, depthWrite: false })));

  // ======================================================================
  //  그래픽 부담 줄이기: 움직이지 않는 조각들을 재료별로 한 덩어리로 합쳐요
  //  (조각 수백 개 → 재료 수만큼만 그리면 돼서 그래픽카드가 훨씬 편해져요)
  // ======================================================================
  function bake(root){
    root.updateMatrixWorld(true);
    const buckets = new Map(), victims = [];
    const walk = o => {
      if (o.userData.keep) return;
      if (o.isMesh && !o.isInstancedMesh && o.visible && !o.material.transparent && !Array.isArray(o.material) && o.geometry && o.geometry.attributes && o.geometry.attributes.position) {
        const zone = o.userData.zone || '', key = o.material.uuid + '|' + zone;
        let b = buckets.get(key); if (!b) buckets.set(key, b = { mat: o.material, zone, list: [] });
        b.list.push(o); victims.push(o);
      }
      for (const c of o.children.slice()) walk(c);
    };
    walk(root);
    for (const v of victims) { v.parent.remove(v); const i = clickables.indexOf(v); if (i >= 0) clickables.splice(i, 1); }
    for (const b of buckets.values()) {
      const geos = b.list.map(m => { const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone(); g.applyMatrix4(m.matrixWorld); return g; });
      let n = 0; for (const g of geos) n += g.attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
      let k = 0;
      for (const g of geos) {
        const a = g.attributes, c = a.position.count;
        pos.set(a.position.array.subarray(0, c * 3), k * 3);
        if (a.normal) nor.set(a.normal.array.subarray(0, c * 3), k * 3);
        if (a.uv) uv.set(a.uv.array.subarray(0, c * 2), k * 2);
        k += c; g.dispose();
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      geo.computeBoundingSphere();
      const m = new THREE.Mesh(geo, b.mat); scene.add(m);
      if (b.zone) { m.userData.zone = b.zone; clickables.push(m); }
    }
    for (const b of buckets.values()) for (const m of b.list) m.geometry.dispose();
  }
  bake(scene);

  // 매 프레임 환경 애니메이션
  let twinkleT = 0, twinkle = 0; const dimCol = new THREE.Color(0x6a6080);
  function tick(dt, t){
    sea.rotation.y += dt * 0.004;
    for (const f of floaters) { f.g.position.y = f.base + Math.sin(t * 0.5 + f.ph) * 1.5; f.crystal.rotation.y += dt * 0.6; }
    ray.material.opacity = 0.03 + Math.sin(t * 0.6) * 0.012;
    const pa = sparkGeo.attributes.position.array;
    for (let i = 0; i < SPARK_N; i++) { pa[i*3+1] += dt * (0.4 + (i % 5) * 0.08); if (pa[i*3+1] > 30) pa[i*3+1] = 0; }
    sparkGeo.attributes.position.needsUpdate = true;
    for (const st of steam) {
      st.t += dt;
      if (st.t > 4) { st.t = 0; const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * (SPRING.r - 0.5); st.x = Math.cos(a) * r; st.z = Math.sin(a) * r; }
      const k = st.t / 4;
      st.s.position.set(st.x + Math.sin(t + st.x) * 0.2 * k, 0.35 + k * 3.2, st.z);
      st.s.scale.setScalar(0.7 + k * 1.8);
      st.s.material.opacity = Math.sin(k * Math.PI) * 0.42;
    }
    if (SNOW.wob > 0.001) { SNOW.wob *= Math.pow(0.04, dt); SNOW.body.rotation.z = Math.sin(t * 22) * 0.09 * SNOW.wob * SNOW.wobDir; } else SNOW.body.rotation.z = 0;
    for (let i = snowFx.length - 1; i >= 0; i--) {
      const f = snowFx[i]; f.life -= dt; f.v.y -= 9 * dt; f.m.position.addScaledVector(f.v, dt);
      if (f.life <= 0 || f.m.position.y < 0) { scene.remove(f.m); snowFx.splice(i, 1); }
    }
    for (const p of petals) { p.a += p.sp * dt; p.m.position.set(Math.cos(p.a) * p.r, 0.22, Math.sin(p.a) * p.r); p.m.rotation.z += dt * 0.2; }
    for (const s of stars) { s.piv.rotation.z = Math.sin(t * s.sp + s.ph) * 0.05; s.st.rotation.y = Math.sin(t * 0.7 + s.ph) * 0.6; }
    // 놀이터: 그네 흔들기 · 시소 기울기 (main이 PLAY.now·PLAY.occ를 넣어줘요)
    for (const r of PLAY.rides) if (r.piv) r.piv.rotation.x = r.angle();
    PLAY.saw.rotation.z = PLAY.sawTilt();
    // 함박눈과 트리 반짝이
    for (let i = 0; i < FLAKES; i++) { flakePos[i*3+1] -= dt * (0.7 + (i % 7) * 0.08); flakePos[i*3] += Math.sin(t * 0.6 + i) * dt * 0.15; if (flakePos[i*3+1] < 0) flakePos[i*3+1] = 22; }
    flakeGeo.attributes.position.needsUpdate = true;
    XMAS.star.rotation.y = t * 0.8; XMAS.glow.material.opacity = 0.55 + Math.sin(t * 2.4) * 0.25;
    if ((twinkleT += dt) > 0.45) {
      twinkleT = 0; twinkle++;
      for (let i = 0; i < 44; i++) XMAS.bulbs.setColorAt(i, (i + twinkle) % 3 === 0 ? dimCol : XMAS.bulbCols[(i + (twinkle >> 1)) % XMAS.bulbCols.length]);
      if (XMAS.bulbs.instanceColor) XMAS.bulbs.instanceColor.needsUpdate = true;
    }
    // 밴드: 박자에 맞춰 무대 조명이 반짝 (main이 BAND.beat를 0~1로 넣어줘요)
    const b = BAND.beat;
    for (const l of BAND.lights) { l.material.opacity = 0.45 + b * 0.55; const s = l.userData.base * (1 + b * 0.5); l.scale.set(s, s, 1); }
    for (const p of BAND.parts) { p.ring.material.opacity = p.active ? 0.6 + b * 0.4 : 0.35 + Math.sin(t * 2) * 0.1; if (p.inst.userData.top) p.inst.userData.top.visible = !p.active; }
  }

  return { renderer, scene, camera, gold, shadowTex, colliders, clickables, ZONES, boardFrames, gbFrames, ISLAND_R, SEATS, SPRING, SNOW, STATUE, BAND, SPAWN, PLAY, XMAS, floorAt, tick, bake,
    busy: () => snowFx.length > 0 || SNOW.wob > 0.01 || BAND.beat > 0.01 || PLAY.occ.size > 0 };
}
