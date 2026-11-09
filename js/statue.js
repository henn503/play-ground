// 하트 동상: 하얀 정장에 웨이브 흑발, 손하트를 한 꼬마 피규어
// 키 약 2.15 단위로 만들고, 바깥에서 크기를 키워서 써요.
import * as THREE from 'three';

export function buildHeartFigure(){
  const g = new THREE.Group();
  const lam = (c, e = 0x201a24, ei = 0.3) => new THREE.MeshLambertMaterial({ color: c, emissive: e, emissiveIntensity: ei });
  const SKIN = lam(0xffe3d6, 0x3a2418, 0.38);
  const SUIT = lam(0xf8f5f3, 0x2a2430, 0.32);
  const SUIT2 = lam(0xebe5e6, 0x2a2430, 0.25);      // 깃·그림자 쪽 흰색
  const SHIRT = lam(0xffffff, 0x302a30, 0.35);
  const HAIR = new THREE.MeshLambertMaterial({ color: 0x2f2533, emissive: 0x1a1220, emissiveIntensity: 0.4, side: THREE.DoubleSide });
  const EYE = new THREE.MeshBasicMaterial({ color: 0x35264f });
  const WHITE = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const BLUSH = new THREE.MeshBasicMaterial({ color: 0xffa2b4, transparent: true, opacity: 0.5, depthWrite: false });
  const MOUTH = new THREE.MeshBasicMaterial({ color: 0xd9707f });
  const sph = new THREE.SphereGeometry(1, 28, 20);
  const ball = (m, x, y, z, sx, sy = sx, sz = sx) => { const o = new THREE.Mesh(sph, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); g.add(o); return o; };
  // 두 점 사이를 잇는 원기둥 (팔)
  const limb = (m, a, b, r1, r2) => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A);
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, d.length(), 16), m);
    o.position.copy(A).addScaledVector(d, 0.5);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    g.add(o); return o;
  };

  // ── 신발 · 바지 ──
  for (const s of [-1, 1]) {
    ball(SUIT, s * 0.13, 0.08, 0.06, 0.15, 0.09, 0.2);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.125, 0.4, 18), SUIT); leg.position.set(s * 0.12, 0.33, 0); g.add(leg);
  }
  // ── 재킷 ──
  const jacket = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.37, 0.56, 28), SUIT); jacket.position.y = 0.8; g.add(jacket);
  ball(SUIT, 0, 0.53, 0, 0.37, 0.06, 0.37);                         // 밑단
  const shirt = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 3), SHIRT); shirt.position.set(0, 0.96, 0.27); shirt.rotation.set(Math.PI, 0, 0); shirt.scale.z = 0.25; g.add(shirt);
  for (const s of [-1, 1]) {
    const lap = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.34, 0.025), SUIT2); lap.position.set(s * 0.085, 0.9, 0.3); lap.rotation.set(-0.12, 0, s * 0.32); g.add(lap);
    ball(lam(0xddd5da, 0x201a24, 0.2), s * 0.075, 0.68, 0.355, 0.026);   // 단추
    ball(SUIT, s * 0.31, 1.0, 0, 0.14, 0.12, 0.14);                     // 어깨
  }
  // ── 팔: 어깨 → 팔꿈치 → 가슴 앞에서 손하트 ──
  for (const s of [-1, 1]) {
    const sh = [s * 0.33, 0.99, 0.0], el = [s * 0.31, 0.74, 0.2], wr = [s * 0.11, 0.98, 0.37];
    limb(SUIT, sh, el, 0.105, 0.095);
    ball(SUIT, ...el, 0.095);
    limb(SUIT, el, wr, 0.095, 0.085);
    ball(SHIRT, ...wr, 0.07, 0.07, 0.05);                             // 소매 끝 셔츠
    ball(SKIN, s * 0.075, 1.02, 0.4, 0.075, 0.085, 0.065);            // 손
  }
  // 손가락 하트 (살구색 하트 테두리)
  {
    const sh = new THREE.Shape();
    sh.moveTo(0, 0.25); sh.bezierCurveTo(0, 0.3, -0.05, 0.4, -0.2, 0.4); sh.bezierCurveTo(-0.45, 0.4, -0.45, 0.12, -0.45, 0.12);
    sh.bezierCurveTo(-0.45, -0.05, -0.3, -0.22, 0, -0.4); sh.bezierCurveTo(0.3, -0.22, 0.45, -0.05, 0.45, 0.12);
    sh.bezierCurveTo(0.45, 0.12, 0.45, 0.4, 0.2, 0.4); sh.bezierCurveTo(0.05, 0.4, 0, 0.3, 0, 0.25);
    const hole = new THREE.Path();
    hole.moveTo(0, 0.12); hole.bezierCurveTo(-0.05, 0.22, -0.28, 0.26, -0.28, 0.1); hole.bezierCurveTo(-0.28, -0.02, -0.15, -0.12, 0, -0.24);
    hole.bezierCurveTo(0.15, -0.12, 0.28, -0.02, 0.28, 0.1); hole.bezierCurveTo(0.28, 0.26, 0.05, 0.22, 0, 0.12);
    sh.holes.push(hole);
    const heart = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 3, curveSegments: 18 }), SKIN);
    heart.scale.setScalar(0.24); heart.position.set(0, 1.075, 0.42); g.add(heart);
  }
  // ── 목 · 머리 · 귀 ──
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.12, 14), SKIN); neck.position.y = 1.1; g.add(neck);
  const HY = 1.58;
  ball(SKIN, 0, HY, 0, 0.53, 0.5, 0.5);
  for (const s of [-1, 1]) ball(SKIN, s * 0.52, HY - 0.13, 0.02, 0.09, 0.11, 0.07);
  // ── 얼굴 ──
  for (const s of [-1, 1]) {
    ball(EYE, s * 0.19, HY - 0.07, 0.475, 0.075, 0.095, 0.04);
    ball(WHITE, s * 0.19 + 0.025, HY - 0.03, 0.51, 0.026);
    ball(WHITE, s * 0.19 - 0.03, HY - 0.11, 0.508, 0.012);
    ball(BLUSH, s * 0.3, HY - 0.17, 0.4, 0.085, 0.055, 0.03);
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.009, 6, 16, Math.PI), MOUTH); mouth.rotation.z = Math.PI; mouth.position.set(0, HY - 0.2, 0.488); g.add(mouth);
  // ── 머리카락: 동글게 말린 굵은 머리 다발들 (클레이 피규어 느낌) ──
  // 바탕: 정수리와 뒤통수를 감싸는 껍데기
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.6, 40, 20, Math.PI / 2 + 0.85, Math.PI * 2 - 1.7, 0, Math.PI * 0.5), HAIR);   // 이마 쪽은 비워서 챙처럼 뜨지 않게
  cap.position.y = HY + 0.02; cap.rotation.x = -0.3; cap.scale.set(1.12, 1.02, 1.06); g.add(cap);
  const back = new THREE.Mesh(new THREE.SphereGeometry(0.6, 40, 20, Math.PI / 2 + 1.6, Math.PI * 2 - 3.2, 0, Math.PI * 0.62), HAIR);
  back.position.y = HY; back.scale.set(1.0, 1, 1.05); g.add(back);

  // 머리 다발: 곡선을 따라 구슬을 촘촘히 이어 매끈한 다발을 만들어요 (끝으로 갈수록 가늘게)
  const beads = [];
  const lock = (pts, r0, r1, shade = 0) => {
    const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], HY + p[1], p[2])));
    const n = 18;
    for (let i = 0; i <= n; i++) {
      const t = i / n, p = curve.getPoint(t);
      const r = r0 + (r1 - r0) * t, tip = i === n ? 0.9 : 1;
      beads.push({ p, r: r * tip, shade });
    }
  };
  const L = (s, x, y, z) => [s * x, y, z];
  // 정수리에서 사방으로 흘러내리는 다발: 옆은 귀 위에서 동글게 끝나고, 뒤는 목덜미 쪽으로 말려 들어가요
  const RADIAL = [
    // [각도, 끝 높이, 말린 끝 높이, 끝 폭 비율]
    [0.62, 0.16, 0.08, 1.0],
    [1.05, 0.12, 0.04, 1.0],
    [1.5, 0.1, 0.03, 1.0],
    [1.95, 0.02, -0.06, 0.92],
    [2.4, -0.02, -0.1, 0.75],
    [2.85, -0.1, -0.18, 0.6]
  ];
  RADIAL.forEach(([a, yEnd, yCurl, w], k) => {
    for (const s of [-1, 1]) {
      const sx = s * Math.sin(a), cz = Math.cos(a);
      lock([
        [sx * 0.08, 0.63, 0.03 + cz * 0.08],
        [sx * 0.43, 0.56, cz * 0.42],
        [sx * 0.62, 0.34, cz * 0.58],
        [sx * 0.64 * w, yEnd, cz * 0.6],
        [sx * 0.55 * w, yCurl, cz * 0.52]
      ], 0.23, 0.12, k % 2);
    }
  });
  for (const s of [-1, 1]) {
    // 가운데 가르마에서 이마를 감싸며 눈꼬리 옆으로 내려오는 큰 앞머리
    lock([L(s, 0.09, 0.6, 0.3), L(s, 0.23, 0.5, 0.49), L(s, 0.34, 0.3, 0.55), L(s, 0.44, 0.1, 0.5), L(s, 0.41, -0.02, 0.45)], 0.15, 0.075, 1);
    // 안쪽의 가는 앞머리 한 가닥 (눈썹 위에서 끝남)
    lock([L(s, 0.1, 0.55, 0.42), L(s, 0.18, 0.4, 0.55), L(s, 0.25, 0.22, 0.55), L(s, 0.29, 0.1, 0.52)], 0.07, 0.035, 0);
    // 관자놀이 다발 (귀 위에서 바깥으로 살짝 뻗침)
    lock([L(s, 0.32, 0.52, 0.34), L(s, 0.53, 0.34, 0.4), L(s, 0.6, 0.12, 0.36), L(s, 0.57, 0.03, 0.31)], 0.14, 0.075, 0);
  }
  // 목덜미 (뒤에서만 보여요)
  for (const s of [-1, 0, 1]) lock([[s * 0.22, -0.02, -0.52], [s * 0.23, -0.16, -0.5], [s * 0.18, -0.25, -0.44]], 0.14, 0.09, 1);

  const im = new THREE.InstancedMesh(sph, new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x1a1220, emissiveIntensity: 0.4 }), beads.length);
  const o3 = new THREE.Object3D(), c0 = new THREE.Color(0x2f2533), c1 = new THREE.Color(0x3a2e40);
  beads.forEach((b, i) => { o3.position.copy(b.p); o3.scale.setScalar(b.r); o3.updateMatrix(); im.setMatrixAt(i, o3.matrix); im.setColorAt(i, b.shade ? c1 : c0); });
  im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
  g.add(im);
  return g;
}
