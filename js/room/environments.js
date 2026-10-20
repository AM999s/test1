// 13 بيئة موضوعية: لكل درس معمار وإضاءة وألوان مختلفة
import * as THREE from 'three';
import { canvasTex, rbox, lathe, mesh, panelTexture, FONT } from './kit.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);

/* ═════════ قوام إجرائي ═════════ */
function starSky({ base = '#03050c', nebula = ['#3b2a78', '#16416e', '#5a1f4f'], stars = 2600, w = 2048, h = 1024 } = {}) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 14; i++) {
      const x = rnd(0, w), y = rnd(h * 0.1, h * 0.75), r = rnd(120, 420); const c = nebula[i % nebula.length];
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c + '66'); gr.addColorStop(1, c + '00'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < stars; i++) {
      const s = Math.random() ** 3 * 2.4 + 0.4; g.fillStyle = `rgba(${200 + rnd(0, 55)},${200 + rnd(0, 55)},255,${rnd(0.4, 1)})`;
      g.beginPath(); g.arc(rnd(0, w), rnd(0, h * 0.95), s, 0, TAU); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
  });
}

function noiseFill(g, w, h, n, a, light) { for (let i = 0; i < n; i++) { const v = light ? 255 : 0; g.fillStyle = `rgba(${v},${v},${v},${Math.random() * a})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2); } }

/** أرضية من طبقتين: لون/خشونة + خطوط مضيئة (emissive) */
function floorMats(kind, accent, rep = [1, 1]) {
  const S = 1024;
  const base = canvasTex(S, S, (g) => {
    const B = { epoxy: '#101219', radial: '#0a0f22', terrazzo: '#e9e6df', concrete: '#6c6e72', court: '#c58a4f', grating: '#bfc6cf', hex: '#15181f', tile: '#e8eef0', wood: '#3a2a20', gradient: '#222' }[kind] || '#222';
    g.fillStyle = B; g.fillRect(0, 0, S, S);
    if (kind === 'terrazzo') { for (let i = 0; i < 2600; i++) { g.fillStyle = ['#b9b2a6', '#8c8577', '#d9cfbf', '#a39a8b', '#ffffff'][i % 5]; g.beginPath(); g.ellipse(rnd(0, S), rnd(0, S), rnd(1.5, 6), rnd(1, 4), rnd(0, 3), 0, TAU); g.fill(); } }
    if (kind === 'concrete') { noiseFill(g, S, S, 60000, 0.1, true); noiseFill(g, S, S, 60000, 0.12); for (let i = 0; i < 18; i++) { const gr = g.createRadialGradient(rnd(0, S), rnd(0, S), 0, rnd(0, S), rnd(0, S), rnd(80, 300)); gr.addColorStop(0, 'rgba(0,0,0,.06)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, S, S); } }
    if (kind === 'court') { for (let x = 0; x < S; x += 32) { g.fillStyle = `hsl(28, 48%, ${44 + Math.random() * 10}%)`; g.fillRect(x, 0, 31, S); for (let y = 0; y < S; y += rnd(120, 300)) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x, y, 31, 1.5); } } noiseFill(g, S, S, 20000, 0.06); }
    if (kind === 'grating') { for (let x = 0; x < S; x += 128) for (let y = 0; y < S; y += 128) { g.fillStyle = `hsl(210, 8%, ${70 + Math.random() * 8}%)`; g.fillRect(x + 3, y + 3, 122, 122); g.fillStyle = 'rgba(0,0,0,.18)'; for (let k = 0; k < 6; k++) g.fillRect(x + 20 + k * 16, y + 20, 6, 88); } }
    if (kind === 'tile') { for (let x = 0; x < S; x += 64) for (let y = 0; y < S; y += 64) { g.fillStyle = `hsl(190, 12%, ${86 + Math.random() * 6}%)`; g.fillRect(x + 2, y + 2, 60, 60); } }
    if (kind === 'wood') { for (let y = 0; y < S; y += 48) for (let x = (y / 48) % 2 ? -100 : 0; x < S; x += 260) { g.fillStyle = `hsl(24, 35%, ${18 + Math.random() * 9}%)`; g.fillRect(x + 2, y + 2, 256, 44); } noiseFill(g, S, S, 30000, 0.08); }
    if (kind === 'epoxy' || kind === 'hex' || kind === 'radial') noiseFill(g, S, S, 40000, 0.05, true);
    if (kind === 'gradient') { const gr = g.createLinearGradient(0, 0, S, 0); gr.addColorStop(0, '#163a5c'); gr.addColorStop(0.5, '#2a2d36'); gr.addColorStop(1, '#5c2c16'); g.fillStyle = gr; g.fillRect(0, 0, S, S); noiseFill(g, S, S, 40000, 0.06, true); }
  }, { repeat: rep });
  const glow = canvasTex(S, S, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, S, S); g.strokeStyle = '#fff'; g.fillStyle = '#fff';
    if (kind === 'epoxy') { g.lineWidth = 2; for (let i = 0; i <= S; i += S / 8) { g.globalAlpha = 0.5; g.beginPath(); g.moveTo(i, 0); g.lineTo(i, S); g.moveTo(0, i); g.lineTo(S, i); g.stroke(); } }
    if (kind === 'radial') { const c = S / 2; g.lineWidth = 3; for (let r = 60; r < c; r += 70) { g.globalAlpha = r % 140 === 60 ? 0.9 : 0.35; g.beginPath(); g.arc(c, c, r, 0, TAU); g.stroke(); } g.globalAlpha = 0.25; for (let k = 0; k < 24; k++) { const a = k / 24 * TAU; g.beginPath(); g.moveTo(c + Math.cos(a) * 200, c + Math.sin(a) * 200); g.lineTo(c + Math.cos(a) * c, c + Math.sin(a) * c); g.stroke(); } g.globalAlpha = 1; for (let i = 0; i < 160; i++) { g.beginPath(); g.arc(rnd(0, S), rnd(0, S), rnd(1, 2.5), 0, TAU); g.fill(); } }
    if (kind === 'hex') { const r = 64, hgt = Math.sqrt(3) * r; g.lineWidth = 2.5; g.globalAlpha = 0.7; for (let y = -hgt; y < S + hgt; y += hgt) for (let x = -r, k = 0; x < S + r; x += r * 1.5, k++) { const cy = y + (k % 2) * hgt / 2; g.beginPath(); for (let i = 0; i <= 6; i++) { const a = i / 6 * TAU; const px = x + Math.cos(a) * (r - 3), py = cy + Math.sin(a) * (r - 3); i ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); } }
    if (kind === 'court') { g.lineWidth = 10; g.globalAlpha = 0.9; g.strokeRect(60, 60, S - 120, S - 120); g.beginPath(); g.moveTo(S / 2, 60); g.lineTo(S / 2, S - 60); g.stroke(); g.beginPath(); g.arc(S / 2, S / 2, 140, 0, TAU); g.stroke(); }
    if (kind === 'concrete') { g.globalAlpha = 0.8; g.fillRect(0, S * 0.1, S, 14); g.fillRect(0, S * 0.9 - 14, S, 14); }
    if (kind === 'tile' || kind === 'grating') { g.globalAlpha = 0.6; g.fillRect(S / 2 - 6, 0, 12, S); }
  }, { repeat: rep });
  const mat = new THREE.MeshStandardMaterial({
    map: base, emissiveMap: glow, emissive: accent, emissiveIntensity: { radial: 0.45, epoxy: 0.3, hex: 0.35, court: 0.2, concrete: 0.15, tile: 0.15, grating: 0.2 }[kind] ?? 0,
    roughness: { epoxy: 0.55, radial: 0.55, terrazzo: 0.6, concrete: 0.7, court: 0.6, grating: 0.6, hex: 0.55, tile: 0.5, wood: 0.65, gradient: 0.55 }[kind] ?? 0.6,
    metalness: kind === 'grating' ? 0.7 : 0.05,
  });
  return mat;
}

function wallTex(kind, accent) {
  return canvasTex(1024, 512, (g, w, h) => {
    if (kind === 'panels') { g.fillStyle = '#e9edf2'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 128) { g.fillStyle = `hsl(210, 14%, ${90 + Math.random() * 4}%)`; g.fillRect(x + 4, 4, 120, h - 8); g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(x + 124, 0, 4, h); } }
    if (kind === 'concrete') { g.fillStyle = '#5d5f63'; g.fillRect(0, 0, w, h); noiseFill(g, w, h, 40000, 0.12, true); noiseFill(g, w, h, 40000, 0.12); g.fillStyle = 'rgba(0,0,0,.25)'; for (let x = 0; x < w; x += 256) g.fillRect(x, 0, 2, h); for (let y = 0; y < h; y += 170) g.fillRect(0, y, w, 2); for (let x = 64; x < w; x += 128) for (let y = 42; y < h; y += 85) { g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill(); } }
    if (kind === 'plaster') { g.fillStyle = '#efeae1'; g.fillRect(0, 0, w, h); noiseFill(g, w, h, 20000, 0.04); }
    if (kind === 'brick') { g.fillStyle = '#4b2a20'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32) for (let x = (y / 32) % 2 ? -32 : 0; x < w; x += 64) { g.fillStyle = `hsl(${12 + Math.random() * 8}, ${45 + Math.random() * 15}%, ${28 + Math.random() * 10}%)`; g.fillRect(x + 2, y + 2, 60, 28); } noiseFill(g, w, h, 30000, 0.1); }
    if (kind === 'tile') { g.fillStyle = '#c9d3d6'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 64) for (let y = 0; y < h; y += 32) { g.fillStyle = `hsl(185, 18%, ${90 + Math.random() * 5}%)`; g.fillRect(x + 1.5, y + 1.5, 61, 29); } }
    if (kind === 'dark') { g.fillStyle = '#16181f'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 64) { g.fillStyle = `hsl(225, 12%, ${10 + Math.random() * 4}%)`; g.fillRect(x + 2, 0, 60, h); } }
    if (kind === 'copper') { g.fillStyle = '#7a4524'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 128) { const gr = g.createLinearGradient(x, 0, x + 128, h); gr.addColorStop(0, '#b8703f'); gr.addColorStop(0.5, '#8a4f2c'); gr.addColorStop(1, '#c47f4c'); g.fillStyle = gr; g.fillRect(x + 3, 3, 122, h - 6); } }
    if (kind === 'frost') { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#dbeeff'); gr.addColorStop(1, '#9cc6ea'); g.fillStyle = gr; g.fillRect(0, 0, w, h); noiseFill(g, w, h, 30000, 0.2, true); g.fillStyle = 'rgba(255,255,255,.4)'; for (let x = 0; x < w; x += 170) g.fillRect(x, 0, 3, h); }
  });
}

/* ═════════ عناصر معمارية ═════════ */
function led(scene, a, b, color, t = 0.035, intensity = 2.5) {
  const d = b.clone().sub(a); const L = d.length();
  const m = new THREE.Mesh(new THREE.BoxGeometry(t, t, L), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity * 0.65), toneMapped: false }));
  m.position.copy(a).add(b).multiplyScalar(0.5); m.lookAt(b); scene.add(m); return m;
}

function wallPlane(scene, w, h, mat, x, z, ry, y0 = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y0 + h / 2, z); m.rotation.y = ry; m.receiveShadow = true; scene.add(m); return m;
}

/** غرفة مستطيلة */
function rectShell(scene, W, D, H, { floor, wall, ceil, skipBack = false }) {
  const f = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floor); f.rotation.x = -Math.PI / 2; f.receiveShadow = true; scene.add(f);
  if (ceil) { const c = new THREE.Mesh(new THREE.PlaneGeometry(W, D), ceil); c.rotation.x = Math.PI / 2; c.position.y = H; scene.add(c); }
  if (!skipBack) wallPlane(scene, W, H, wall, 0, -D / 2, 0);
  wallPlane(scene, W, H, wall, 0, D / 2, Math.PI); wallPlane(scene, D, H, wall, -W / 2, 0, Math.PI / 2); wallPlane(scene, D, H, wall, W / 2, 0, -Math.PI / 2);
}

/** غرفة مضلّعة/دائرية */
function polyShell(scene, n, R, H, { floor, wall, ceil, skip = () => false, sx = 1, sz = 1, rot = 0 }) {
  const f = new THREE.Mesh(new THREE.CircleGeometry(R * 1.02, Math.max(n, 6)), floor); f.rotation.x = -Math.PI / 2; f.scale.set(sx, sz, 1); f.receiveShadow = true; scene.add(f);
  if (ceil) { const c = new THREE.Mesh(new THREE.CircleGeometry(R * 1.02, Math.max(n, 6)), ceil); c.rotation.x = Math.PI / 2; c.position.y = H; c.scale.set(sx, sz, 1); scene.add(c); }
  for (let i = 0; i < n; i++) {
    const a0 = ((i + rot) / n) * TAU, a1 = ((i + 1 + rot) / n) * TAU, am = (a0 + a1) / 2;
    if (skip(am)) continue;
    const p0 = V(Math.sin(a0) * R * sx, 0, Math.cos(a0) * R * sz), p1 = V(Math.sin(a1) * R * sx, 0, Math.cos(a1) * R * sz);
    const w = p0.distanceTo(p1) + 0.02, mid = p0.clone().add(p1).multiplyScalar(0.5);
    const m = wallPlane(scene, w, H, wall, mid.x, mid.z, 0); m.lookAt(0, H / 2, 0); m.position.y = H / 2;
  }
}

function gearGeo(R, teeth, depth = 0.12, hole = 0.25) {
  const s = new THREE.Shape(); const r1 = R * 0.86;
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * TAU, d = TAU / teeth;
    const pts = [[r1, a], [R, a + d * 0.18], [R, a + d * 0.45], [r1, a + d * 0.62]];
    pts.forEach(([r, t], k) => (i === 0 && k === 0 ? s.moveTo(Math.cos(t) * r, Math.sin(t) * r) : s.lineTo(Math.cos(t) * r, Math.sin(t) * r)));
  }
  s.closePath();
  const h = new THREE.Path(); h.absarc(0, 0, R * hole, 0, TAU, true); s.holes.push(h);
  for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU, c = new THREE.Path(); c.absarc(Math.cos(a) * R * 0.58, Math.sin(a) * R * 0.58, R * 0.14, 0, TAU, true); s.holes.push(c); }
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 6 });
}

/* ═════════ المنصّات ═════════ */
function dais(scene, mats, style, color, at) {
  const g = new THREE.Group(); g.position.copy(at); let top, h = 0.3;
  if (style === 'disc') {
    top = mesh(lathe([[0, 0.3], [3.25, 0.3], [3.38, 0.24], [3.42, 0.04], [3.3, 0]], 96), mats.graphite);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.022, 8, 160), mats.led(color, 2.4)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.16;
    const bevel = new THREE.Mesh(new THREE.TorusGeometry(3.26, 0.02, 8, 160), mats.chrome); bevel.rotation.x = Math.PI / 2; bevel.position.y = 0.3;
    g.add(top, ring, bevel);
  } else if (style === 'hex') {
    top = mesh(new THREE.CylinderGeometry(3.5, 3.6, 0.3, 6), mats.graphite); top.position.y = 0.15; top.rotation.y = Math.PI / 6;
    const edge = new THREE.Mesh(new THREE.TorusGeometry(3.55, 0.025, 6, 6), mats.led(color, 2.2)); edge.rotation.x = Math.PI / 2; edge.rotation.z = Math.PI / 6; edge.position.y = 0.3;
    g.add(top, edge);
  } else { // plinth: منصة مستطيلة واسعة للمحاكيات الطويلة
    top = mesh(rbox(7.2, 0.3, 3.6, 0.08, 4), mats.graphite); top.position.y = 0.15;
    for (const z of [-1.81, 1.81]) { const l = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.02, 0.02), mats.led(color, 2.2)); l.position.set(0, 0.22, z); g.add(l); }
    g.add(top);
  }
  top.userData.pick = 'stage'; scene.add(g);
  return { top, h, radius: style === 'plinth' ? 3.9 : 3.75, rect: style === 'plinth' };
}

/* ═════════ إضاءة ═════════ */
function keyLight(scene, quality, pos, target, color = '#fff3e2', intensity = 1.6, span = 10) {
  const k = new THREE.DirectionalLight(color, intensity); k.position.copy(pos); k.target.position.copy(target);
  k.castShadow = true; const s = k.shadow; s.mapSize.set(quality.high ? 2048 : 1024, quality.high ? 2048 : 1024);
  Object.assign(s.camera, { left: -span, right: span, top: span, bottom: -span, near: 0.5, far: 40 }); s.bias = -0.0004; s.normalBias = 0.03;
  scene.add(k, k.target); return k;
}

function stageSpot(scene, quality, at, color = '#ffffff', intensity = 40, y = 6) {
  const s = new THREE.SpotLight(color, intensity, 16, 0.62, 0.75, 2); s.position.set(at.x, y, at.z + 0.8); s.target.position.copy(at);
  s.castShadow = quality.high; s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -0.0005; s.shadow.normalBias = 0.02; scene.add(s, s.target); return s;
}

/* ═════════ مواضع المعروضات ═════════ */
function rectSlots(W, zs) { const x = W / 2 - 1.5; return zs.flatMap((z) => [{ x, z, ry: -Math.PI / 2 }, { x: -x, z, ry: Math.PI / 2 }]); }
function ringSlots(R, degs, sx = 1, sz = 1) { return degs.map((d) => { const a = d * Math.PI / 180, x = Math.sin(a) * R * sx, z = Math.cos(a) * R * sz; return { x, z, ry: Math.atan2(-x, -z) }; }); }

/* ═════════ البيئات الثلاث عشرة ═════════ */
const ENVS = {
  /* 1-1 المرصد الفلكي: قبة نجوم دوّارة، أرضية نحاسية الحلقات */
  '1-1'(c) {
    const { scene, mats, quality } = c; const R = 9.6, H = 4.2, gold = '#f2b45a';
    polyShell(scene, 48, R, H, { floor: floorMats('radial', gold, [1, 1]), wall: new THREE.MeshStandardMaterial({ map: wallTex('dark'), roughness: 0.6, metalness: 0.3 }) });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 32, 0, TAU, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ map: starSky(), side: THREE.BackSide }));
    dome.position.y = H; scene.add(dome);
    const rib = new THREE.Mesh(new THREE.TorusGeometry(R - 0.05, 0.05, 8, 160), mats.gold); rib.rotation.x = Math.PI / 2; rib.position.y = H; scene.add(rib);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R - 0.12, 0.025, 8, 160), mats.led(gold, 2.4)); ring.rotation.x = Math.PI / 2; ring.position.y = H - 0.15; scene.add(ring);
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; const arc = new THREE.Mesh(new THREE.TorusGeometry(R - 0.1, 0.03, 6, 60, Math.PI / 2), mats.gold); arc.position.y = H; arc.rotation.set(0, a, 0); scene.add(arc); }
    // تلسكوب
    const tel = new THREE.Group(); tel.position.set(Math.sin(0.5) * 7.6, 0, Math.cos(0.5) * 7.6);
    for (let k = 0; k < 3; k++) { const leg = mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 8), mats.graphite); const a = k / 3 * TAU; leg.position.set(Math.cos(a) * 0.3, 0.7, Math.sin(a) * 0.3); leg.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3); tel.add(leg); }
    const tube = mesh(lathe([[0.1, 0], [0.14, 0.2], [0.14, 1.5], [0.17, 1.55], [0.17, 1.7], [0, 1.7]], 32), mats.gold); tube.position.y = 1.4; tube.rotation.x = -0.9; tel.add(tube); scene.add(tel);
    scene.add(new THREE.HemisphereLight('#7d8cff', '#1a1208', 0.35));
    const at = V(0, 0, 0); const d = dais(scene, mats, 'disc', gold, at);
    keyLight(scene, quality, V(3, 9, 4), at, '#fff0d8', 1.1); stageSpot(scene, quality, at.clone().setY(0.3), '#ffe4b8', 45, H - 0.2);
    return { stage: V(0, 0.3, 0), dais: d, bounds: { r: R - 0.9 }, spawn: V(0, 1.65, 7.4), slots: ringSlots(7.3, [55, 100, 145, 215, 260, 305]),
      title: { pos: V(0, 2.9, -R + 0.45), ry: 0, w: 5, h: 2.1 }, plaques: ringSlots(R - 0.12, [125, 235, 80]).map((s) => ({ ...s, y: 3.1 })),
      bg: '#03050c', fog: [12, 30], envI: 0.35, exposure: 1.0, bloom: [0.9, 0.55, 1.00], update: (dt) => { dome.rotation.y += dt * 0.01; } };
  },

  /* 1-2 محطة الفضاء: مثمّن أبيض، نافذة بانورامية على الأرض */
  '1-2'(c) {
    const { scene, mats, quality } = c; const R = 9, H = 5.4, cyan = '#46c8ff';
    const wall = new THREE.MeshStandardMaterial({ map: wallTex('panels'), roughness: 0.35, metalness: 0.1 });
    polyShell(scene, 8, R, H, { floor: floorMats('grating', cyan, [3, 3]), wall, ceil: new THREE.MeshStandardMaterial({ color: '#dde3ea', roughness: 0.5 }), skip: (am) => Math.abs(Math.cos(am) + 1) < 0.2, rot: 0.5 });
    // النافذة البانورامية (الجهة الخلفية)
    const a0 = Math.PI - Math.PI / 8, a1 = Math.PI + Math.PI / 8; const p0 = V(Math.sin(a0) * R, 0, Math.cos(a0) * R), p1 = V(Math.sin(a1) * R, 0, Math.cos(a1) * R);
    const ww = p0.distanceTo(p1), wz = (p0.z + p1.z) / 2;
    for (const [y, h] of [[0, 0.7], [H - 0.9, 0.9]]) { const m = wallPlane(scene, ww, h, wall, 0, wz, 0, y); }
    for (let k = 0; k <= 4; k++) { const x = -ww / 2 + k * ww / 4; const mull = mesh(rbox(0.16, H - 1.6, 0.2, 0.05), mats.ceramic); mull.position.set(x, 0.7 + (H - 1.6) / 2, wz); scene.add(mull); }
    led(scene, V(-ww / 2, 0.7, wz + 0.1), V(ww / 2, 0.7, wz + 0.1), cyan, 0.04, 2.5);
    const sky = new THREE.Mesh(new THREE.SphereGeometry(140, 48, 24), new THREE.MeshBasicMaterial({ map: starSky({ nebula: ['#16416e', '#123a52', '#2a2d6e'] }), side: THREE.BackSide })); scene.add(sky);
    const earthTex = canvasTex(1024, 512, (g, w, h) => { const oc = g.createLinearGradient(0, 0, 0, h); oc.addColorStop(0, '#0d3566'); oc.addColorStop(1, '#1d5aa0'); g.fillStyle = oc; g.fillRect(0, 0, w, h); for (let i = 0; i < 70; i++) { g.fillStyle = Math.random() > 0.5 ? '#3c6b33' : '#9b8358'; g.beginPath(); g.ellipse(rnd(0, w), rnd(40, h - 40), rnd(20, 90), rnd(10, 50), rnd(0, 3), 0, TAU); g.fill(); } g.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 120; i++) { g.beginPath(); g.ellipse(rnd(0, w), rnd(0, h), rnd(20, 80), rnd(4, 12), rnd(-0.3, 0.3), 0, TAU); g.fill(); } });
    const earth = new THREE.Mesh(new THREE.SphereGeometry(40, 64, 40), new THREE.MeshStandardMaterial({ map: earthTex, roughness: 0.8, emissive: '#0a2a55', emissiveIntensity: 0.35 })); earth.position.set(6, -34, -66); scene.add(earth);
    const atmo = new THREE.Mesh(new THREE.SphereGeometry(41.2, 64, 40), new THREE.MeshBasicMaterial({ color: '#6fc3ff', transparent: true, opacity: 0.22, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false })); atmo.position.copy(earth.position); scene.add(atmo);
    const sun = new THREE.DirectionalLight('#ffffff', 1.4); sun.position.set(-30, 10, -40); scene.add(sun);
    // حلقة إضاءة السقف
    const halo = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.06, 10, 120), mats.led('#e8f7ff', 2.2)); halo.rotation.x = Math.PI / 2; halo.position.set(0, H - 0.05, -0.5); scene.add(halo);
    for (let k = 0; k < 8; k++) { const a = (k + 0.5) / 8 * TAU; if (Math.abs(Math.cos(a) + 1) < 0.2) continue; led(scene, V(Math.sin(a) * (R - 0.25), 0.05, Math.cos(a) * (R - 0.25)), V(Math.sin(a) * (R - 0.25), H, Math.cos(a) * (R - 0.25)), cyan, 0.05, 2.2); }
    scene.add(new THREE.HemisphereLight('#eaf6ff', '#38414d', 0.55));
    const at = V(0, 0, -0.5); const d = dais(scene, mats, 'hex', cyan, at);
    keyLight(scene, quality, V(-3, 9, 4), at, '#ffffff', 1.3); stageSpot(scene, quality, at.clone().setY(0.3), '#e8f7ff', 30, H - 0.1);
    return { stage: V(0, 0.3, -0.5), dais: d, bounds: { r: R - 1.0 }, spawn: V(0, 1.65, 6.8), slots: ringSlots(7.0, [50, 95, 135, 225, 265, 310]),
      title: { pos: V(0, H - 0.5, wz + 0.08), ry: 0, w: 3.4, h: 0.75 }, plaques: ringSlots(R * 0.9, [70, 290, 115]).map((s) => ({ ...s, y: 3.2 })),
      bg: '#020409', fog: null, envI: 0.45, exposure: 0.9, bloom: [0.7, 0.5, 1.00], update: (dt) => { earth.rotation.y += dt * 0.01; } };
  },

  /* 2-1 قاعة الدوران: حلقات سقف تدور بسرعات مختلفة وزعانف جدارية */
  '2-1'(c) {
    const { scene, mats, quality } = c; const R = 9.2, H = 6, teal = '#3fd6c6';
    polyShell(scene, 40, R, H, { floor: floorMats('radial', teal), wall: new THREE.MeshStandardMaterial({ map: wallTex('plaster'), roughness: 0.85 }), ceil: new THREE.MeshStandardMaterial({ color: '#13171e', roughness: 0.8 }) });
    const fins = new THREE.InstancedMesh(rbox(0.12, H, 0.7, 0.04), mats.anod('#b98a52', 0.35), 36); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    for (let k = 0; k < 36; k++) { const a = k / 36 * TAU; if (Math.cos(a) > 0.9) { m4.makeScale(0, 0, 0); fins.setMatrixAt(k, m4); continue; } q.setFromAxisAngle(V(0, 1, 0), a); m4.compose(V(Math.sin(a) * (R - 0.4), H / 2, Math.cos(a) * (R - 0.4)), q, V(1, 1, 1)); fins.setMatrixAt(k, m4); }
    fins.castShadow = true; scene.add(fins);
    const rings = [2.6, 4.2, 5.8].map((r, i) => { const g = new THREE.Group(); g.position.y = H - 0.5 - i * 0.25; const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.08, 12, 160), mats.anod('#c9d2db', 0.2)); const l = new THREE.Mesh(new THREE.TorusGeometry(r, 0.025, 8, 160), mats.led(i === 1 ? '#ffffff' : teal, 2.4)); l.position.y = -0.07; t.rotation.x = l.rotation.x = Math.PI / 2; g.add(t, l); for (let k = 0; k < 4 + i * 2; k++) { const s = mesh(rbox(0.3, 0.06, 0.14, 0.02), mats.chrome, false); const a = k / (4 + i * 2) * TAU; s.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); g.add(s); } scene.add(g); return g; });
    scene.add(new THREE.HemisphereLight('#e8fffb', '#2a2522', 0.7));
    const at = V(0, 0, -0.4); const d = dais(scene, mats, 'disc', teal, at);
    keyLight(scene, quality, V(4, 10, 5), at, '#fff7ea', 1.6); stageSpot(scene, quality, at.clone().setY(0.3), '#ffffff', 30, H - 0.3);
    return { stage: V(0, 0.3, -0.4), dais: d, bounds: { r: R - 1.0 }, spawn: V(0, 1.65, 7.0), slots: ringSlots(7.1, [55, 100, 145, 215, 260, 305]),
      title: { pos: V(0, 3.4, -R + 0.95), ry: 0, w: 4.6, h: 1.95 }, plaques: ringSlots(R - 0.85, [125, 235, 80, 280]).map((s) => ({ ...s, y: 3.3 })),
      bg: '#0b0e13', fog: [14, 30], envI: 0.5, exposure: 1.05, bloom: [0.6, 0.45, 1.05], update: (dt) => rings.forEach((g, i) => (g.rotation.y += dt * (i % 2 ? -0.25 : 0.18) * (1 + i * 0.4))) };
  },

  /* 2-2 الورشة الهندسية: خرسانة، جسور فولاذية، تروس عملاقة على الجدران */
  '2-2'(c) {
    const { scene, mats, quality } = c; const W = 14, D = 19, H = 7.5, amber = '#ffb02e';
    rectShell(scene, W, D, H, { floor: floorMats('concrete', amber, [2, 3]), wall: new THREE.MeshStandardMaterial({ map: wallTex('concrete'), roughness: 0.8 }), ceil: new THREE.MeshStandardMaterial({ color: '#1a1b1e', roughness: 0.9 }) });
    const beam = new THREE.InstancedMesh(new THREE.BoxGeometry(W, 0.45, 0.25), mats.anod('#3a3f48', 0.45), 6); const m4 = new THREE.Matrix4();
    for (let k = 0; k < 6; k++) { m4.makeTranslation(0, H - 0.4, -D / 2 + 1.6 + k * 3.2); beam.setMatrixAt(k, m4); } beam.castShadow = true; scene.add(beam);
    const lampShade = lathe([[0.04, 0.42], [0.08, 0.4], [0.32, 0.08], [0.36, 0], [0.34, 0]], 32);
    const lamps = [];
    for (const x of [-3.5, 3.5]) for (const z of [-5.5, -0.5, 4.5]) { const g = new THREE.Group(); g.position.set(x, H - 1.6, z); const sh = mesh(lampShade, mats.anod('#2a2d33', 0.4), false); const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), mats.led('#ffd9a0', 3)); bulb.position.y = 0.08; const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.2, 6), mats.graphite); cord.position.y = 1.0; g.add(sh, bulb, cord); scene.add(g); lamps.push(g); if (quality.high && z !== 4.5) { const pl = new THREE.PointLight('#ffcf8a', 6, 9, 2); pl.position.set(x, H - 1.8, z); scene.add(pl); } }
    const gears = [];
    const addGear = (R, t, x, y, z, ry, sp, mat) => { const gm = mesh(gearGeo(R, t), mat); gm.position.set(x, y, z); gm.rotation.y = ry; scene.add(gm); gears.push([gm, sp]); };
    addGear(1.6, 24, -W / 2 + 0.15, 3.4, -4.2, Math.PI / 2, 0.15, mats.anod('#c79a54', 0.3)); addGear(1.0, 15, -W / 2 + 0.3, 4.9, -2.05, Math.PI / 2, -0.24, mats.brushed);
    addGear(1.4, 21, W / 2 - 0.15, 3.6, 0.8, -Math.PI / 2, -0.17, mats.anod('#c79a54', 0.3)); addGear(0.85, 13, W / 2 - 0.3, 2.2, 2.65, -Math.PI / 2, 0.28, mats.brushed);
    // شريط أمان أصفر/أسود
    const hazard = canvasTex(512, 64, (g, w, h) => { g.fillStyle = '#111'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffc21a'; for (let x = -64; x < w; x += 64) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 32, 0); g.lineTo(x + 64, 0); g.lineTo(x + 32, h); g.fill(); } }, { repeat: [10, 1] });
    for (const z of [-D / 2 + 0.6, D / 2 - 0.6]) { const s = new THREE.Mesh(new THREE.PlaneGeometry(W - 1, 0.25), new THREE.MeshStandardMaterial({ map: hazard, roughness: 0.6 })); s.rotation.x = -Math.PI / 2; s.position.set(0, 0.01, z); scene.add(s); }
    scene.add(new THREE.HemisphereLight('#fff1dc', '#2a2622', 0.55));
    const at = V(0, 0, -1.2); const d = dais(scene, mats, 'hex', amber, at);
    keyLight(scene, quality, V(5, 11, 6), at, '#fff0dc', 1.5); stageSpot(scene, quality, at.clone().setY(0.3), '#ffe9c8', 35, H - 0.8);
    return { stage: V(0, 0.3, -1.2), dais: d, bounds: { x0: -W / 2 + 0.6, x1: W / 2 - 0.6, z0: -D / 2 + 0.6, z1: D / 2 - 0.6 }, spawn: V(0, 1.65, 6.6), slots: rectSlots(W, [-5.4, -1.2, 3.0]),
      title: { pos: V(0, 3.6, -D / 2 + 0.06), ry: 0, w: 5.6, h: 2.4 }, plaques: [{ x: -W / 2 + 0.06, z: 4.6, ry: Math.PI / 2, y: 3.2 }, { x: W / 2 - 0.06, z: 4.6, ry: -Math.PI / 2, y: 3.2 }, { x: -W / 2 + 0.06, z: 1.0, ry: Math.PI / 2, y: 4.8 }],
      bg: '#101114', fog: [16, 34], envI: 0.4, exposure: 1.0, bloom: [0.55, 0.4, 1.05], update: (dt) => gears.forEach(([g, s]) => (g.rotation.z += dt * s)) };
  },

  /* 2-3 معرض العمارة والتوازن: أقواس بيضاء، سقف زجاجي، منحوتة متوازنة معلّقة */
  '2-3'(c) {
    const { scene, mats, quality } = c; const W = 14, D = 20, H = 9, sand = '#e6b36a';
    const wall = new THREE.MeshStandardMaterial({ map: wallTex('plaster'), roughness: 0.9 });
    rectShell(scene, W, D, H, { floor: floorMats('terrazzo', '#000', [3, 4]), wall });
    // سقف زجاجي بإطار
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshBasicMaterial({ color: '#9fc4e6' })); sky.rotation.x = Math.PI / 2; sky.position.y = H + 0.6; scene.add(sky);
    for (let x = -W / 2; x <= W / 2; x += 2) { const b = mesh(new THREE.BoxGeometry(0.12, 0.25, D), mats.ceramic, false); b.position.set(x, H, 0); scene.add(b); }
    for (let z = -D / 2; z <= D / 2; z += 2.5) { const b = mesh(new THREE.BoxGeometry(W, 0.25, 0.12), mats.ceramic, false); b.position.set(0, H, z); scene.add(b); }
    // أقواس جدارية
    const archMat = mats.ceramic;
    for (const s of [-1, 1]) for (let k = 0; k < 4; k++) {
      const z = -6.6 + k * 4.4; const g = new THREE.Group(); g.position.set(s * (W / 2 - 0.25), 0, z); g.rotation.y = -s * Math.PI / 2;
      for (const x of [-1.5, 1.5]) { const col = mesh(rbox(0.36, 4.6, 0.36, 0.06), archMat); col.position.set(x, 2.3, 0); g.add(col); }
      const arc = mesh(new THREE.TorusGeometry(1.5, 0.18, 12, 40, Math.PI), archMat); arc.position.y = 4.6; g.add(arc);
      const niche = new THREE.Mesh(new THREE.PlaneGeometry(2.64, 4.6), new THREE.MeshStandardMaterial({ color: '#d9cbb3', roughness: 0.95 })); niche.position.set(0, 2.3, -0.17); g.add(niche);
      scene.add(g);
    }
    // منحوتة متوازنة (موبايل)
    const mobile = new THREE.Group(); mobile.position.set(0, H - 0.6, -1); scene.add(mobile);
    const arms = [];
    const build = (parent, len, depth) => { const arm = new THREE.Group(); const bar = mesh(new THREE.CylinderGeometry(0.015, 0.015, len, 8), mats.graphite, false); bar.rotation.z = Math.PI / 2; arm.add(bar); parent.add(arm); arms.push(arm);
      for (const sd of [-1, 1]) { const wire = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.6, 4), mats.graphite, false); wire.position.set(sd * len / 2, -0.3, 0); arm.add(wire);
        if (depth > 0 && sd > 0) { const sub = new THREE.Group(); sub.position.set(sd * len / 2, -0.6, 0); arm.add(sub); build(sub, len * 0.6, depth - 1); }
        else { const disc = mesh(new THREE.CylinderGeometry(0.22 * (depth + 1) * 0.7, 0.22 * (depth + 1) * 0.7, 0.02, 32), mats.paint(['#e8613f', '#1f3b70', sand][depth % 3]), false); disc.rotation.x = Math.PI / 2; disc.position.set(sd * len / 2, -0.75, 0); arm.add(disc); } } };
    build(mobile, 3.2, 2);
    scene.add(new THREE.HemisphereLight('#ffffff', '#c9b9a0', 0.6));
    const at = V(0, 0, -1.2); const d = dais(scene, mats, 'plinth', sand, at);
    keyLight(scene, quality, V(5, 14, 4), at, '#fff3e0', 1.5, 11); stageSpot(scene, quality, at.clone().setY(0.3), '#ffffff', 20, 8.5);
    return { stage: V(0, 0.35, -1.2), dais: d, bounds: { x0: -W / 2 + 0.7, x1: W / 2 - 0.7, z0: -D / 2 + 0.6, z1: D / 2 - 0.6 }, spawn: V(0, 1.65, 7.4), slots: rectSlots(W, [-6.6, -2.2, 2.2]).map((s) => ({ ...s, x: s.x * 0.9 })),
      title: { pos: V(0, 4.2, -D / 2 + 0.06), ry: 0, w: 6.4, h: 2.8 }, plaques: [{ x: -W / 2 + 0.1, z: 6.6, ry: Math.PI / 2, y: 2.4 }, { x: W / 2 - 0.1, z: 6.6, ry: -Math.PI / 2, y: 2.4 }, { x: -W / 2 + 0.1, z: 6.6, ry: Math.PI / 2, y: 5.6 }],
      bg: '#dfe9f2', fog: null, envI: 0.55, exposure: 0.85, bloom: [0.25, 0.4, 1.15], update: (dt, t) => arms.forEach((a, i) => (a.rotation.y = Math.sin(t * 0.25 + i) * 0.6)) };
  },

  /* 3-1 الملعب التقني: أرضية ملعب، لوحة نتائج LED، أبراج إضاءة */
  '3-1'(c) {
    const { scene, mats, quality } = c; const W = 16, D = 22, H = 9, coral = '#ff6b4a';
    rectShell(scene, W, D, H, { floor: floorMats('court', '#ffffff', [1, 1]), wall: new THREE.MeshStandardMaterial({ map: wallTex('dark'), roughness: 0.7 }), ceil: new THREE.MeshStandardMaterial({ color: '#0d0f14' }) });
    for (const y of [1.2, 1.35, 3.6]) { led(scene, V(-W / 2 + 0.05, y, -D / 2 + 0.3), V(-W / 2 + 0.05, y, D / 2 - 0.3), y > 3 ? '#4cc3ff' : coral, 0.05, 2.2); led(scene, V(W / 2 - 0.05, y, -D / 2 + 0.3), V(W / 2 - 0.05, y, D / 2 - 0.3), y > 3 ? '#4cc3ff' : coral, 0.05, 2.2); }
    const board = canvasTex(1024, 360, (g, w, h) => { g.fillStyle = '#05070c'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff6b4a'; g.font = '700 70px "Plex Arabic", sans-serif'; g.textAlign = 'center'; g.fillText('IMPULSE  ·  FΔt = Δp', w / 2, 120); g.fillStyle = '#4cc3ff'; g.font = '700 110px monospace'; g.fillText('00 : 01.1 ms', w / 2, 270); for (let x = 0; x < w; x += 8) for (let y = 0; y < h; y += 8) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x, y, 2, 2); } });
    const sb = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.1), new THREE.MeshBasicMaterial({ map: board, toneMapped: false })); sb.position.set(0, 6.9, -D / 2 + 0.08); scene.add(sb);
    const frame = mesh(rbox(6.3, 2.4, 0.2, 0.05), mats.graphite, false); frame.position.set(0, 6.9, -D / 2 + 0.02); scene.add(frame);
    for (const x of [-5, 0, 5]) for (const z of [-6, 2]) { const rig = mesh(rbox(2.4, 0.2, 0.9, 0.04), mats.graphite, false); rig.position.set(x, H - 0.4, z); scene.add(rig); for (let k = 0; k < 6; k++) { const l = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16), mats.led('#ffffff', 2.6)); l.rotation.x = Math.PI / 2; l.position.set(x - 0.95 + k * 0.38, H - 0.51, z); scene.add(l); } }
    // شبكة جانبية
    const net = canvasTex(256, 256, (g) => { g.clearRect(0, 0, 256, 256); g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2; for (let i = 0; i < 256; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); } }, { repeat: [10, 3] });
    for (const s of [-1, 1]) { const n = new THREE.Mesh(new THREE.PlaneGeometry(D - 2, 3), new THREE.MeshBasicMaterial({ map: net, transparent: true, depthWrite: false, side: THREE.DoubleSide })); n.position.set(s * (W / 2 - 0.3), 5.6, 0); n.rotation.y = Math.PI / 2; scene.add(n); }
    scene.add(new THREE.HemisphereLight('#ffffff', '#3a2a1d', 0.7));
    const at = V(0, 0, -1.4); const d = dais(scene, mats, 'plinth', coral, at);
    keyLight(scene, quality, V(2, 14, 5), at, '#ffffff', 2.0, 11); stageSpot(scene, quality, at.clone().setY(0.3), '#ffffff', 28, 8);
    return { stage: V(0, 0.35, -1.4), dais: d, bounds: { x0: -W / 2 + 0.7, x1: W / 2 - 0.7, z0: -D / 2 + 0.6, z1: D / 2 - 0.6 }, spawn: V(0, 1.65, 7.6), slots: rectSlots(W, [-6.2, -1.4, 3.4]),
      title: { pos: V(0, 3.4, -D / 2 + 0.08), ry: 0, w: 6, h: 2.6 }, plaques: [{ x: -W / 2 + 0.08, z: 7.4, ry: Math.PI / 2, y: 2.6 }, { x: W / 2 - 0.08, z: 7.4, ry: -Math.PI / 2, y: 2.6 }, { x: -W / 2 + 0.08, z: 1, ry: Math.PI / 2, y: 2.6 }],
      bg: '#0c0e13', fog: [18, 40], envI: 0.5, exposure: 1.0, bloom: [0.6, 0.45, 1.05] };
  },

  /* 3-2 نفق التصادم: أقواس متتابعة بإضاءة متسلسلة */
  '3-2'(c) {
    const { scene, mats, quality } = c; const W = 13, D = 24, H = 6.2, mag = '#ff4fd8', blue = '#4c7dff';
    const f = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMats('epoxy', blue, [2, 4])); f.rotation.x = -Math.PI / 2; f.receiveShadow = true; scene.add(f);
    const back = wallPlane(scene, W, H + 1, new THREE.MeshStandardMaterial({ map: wallTex('dark'), roughness: 0.6 }), 0, -D / 2, 0);
    const n = 11, ribs = [], ribGeo = new THREE.TorusGeometry(W / 2, 0.16, 10, 64, Math.PI);
    const ribMat = mats.anod('#2c3140', 0.35);
    for (let k = 0; k < n; k++) {
      const z = -D / 2 + 1 + k * (D - 2) / (n - 1); const r = mesh(ribGeo, ribMat, false); r.position.set(0, 0, z); scene.add(r);
      const l = new THREE.Mesh(new THREE.TorusGeometry(W / 2 - 0.2, 0.035, 8, 64, Math.PI), new THREE.MeshBasicMaterial({ color: '#fff', toneMapped: false })); l.position.set(0, 0, z); scene.add(l); ribs.push(l);
    }
    // جلد النفق
    const skin = new THREE.Mesh(new THREE.CylinderGeometry(W / 2 + 0.15, W / 2 + 0.15, D, 48, 1, true, -Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ color: '#141824', roughness: 0.5, metalness: 0.5, side: THREE.BackSide }));
    skin.rotation.x = Math.PI / 2; skin.rotation.y = Math.PI; scene.add(skin);
    for (const x of [-1.2, 1.2]) led(scene, V(x, 0.01, -D / 2 + 0.5), V(x, 0.01, D / 2 - 0.5), x < 0 ? mag : blue, 0.04, 2.6);
    scene.add(new THREE.HemisphereLight('#c7d3ff', '#1a1022', 0.45));
    const at = V(0, 0, -1.6); const d = dais(scene, mats, 'plinth', mag, at);
    keyLight(scene, quality, V(0, 12, 6), at, '#f1f3ff', 1.4, 12); stageSpot(scene, quality, at.clone().setY(0.3), '#f6f0ff', 36, 5.8);
    const ca = new THREE.Color(mag), cb = new THREE.Color(blue);
    return { stage: V(0, 0.35, -1.6), dais: d, bounds: { x0: -W / 2 + 1.6, x1: W / 2 - 1.6, z0: -D / 2 + 0.8, z1: D / 2 - 0.8 }, spawn: V(0, 1.65, 8.6), slots: rectSlots(W - 1.8, [-7, -1.6, 3.8]),
      title: { pos: V(0, 3.2, -D / 2 + 0.08), ry: 0, w: 5.2, h: 2.25 }, plaques: [{ x: -W / 2 + 1.1, z: 8.2, ry: Math.PI / 2 - 0.25, y: 2.0 }, { x: W / 2 - 1.1, z: 8.2, ry: -Math.PI / 2 + 0.25, y: 2.0 }, { x: -W / 2 + 1.1, z: 1.1, ry: Math.PI / 2 - 0.25, y: 2.0 }],
      bg: '#06070d', fog: [10, 30], envI: 0.35, exposure: 1.05, bloom: [1.0, 0.5, 1.00],
      update: (dt, t) => ribs.forEach((r, i) => { const w = 0.5 + 0.5 * Math.sin(t * 3 - i * 0.7); r.material.color.copy(ca).lerp(cb, (i % 2) * 0.8).multiplyScalar(0.4 + w * 1.3); }) };
  },

  /* 4-1 المستودع: رفوف بضائع، ممرات مطلية، نوافذ سقفية */
  '4-1'(c) {
    const { scene, mats, quality } = c; const W = 16, D = 22, H = 10, green = '#5fe08a';
    rectShell(scene, W, D, H, { floor: floorMats('concrete', green, [2, 3]), wall: new THREE.MeshStandardMaterial({ map: wallTex('concrete'), roughness: 0.85 }), ceil: new THREE.MeshStandardMaterial({ color: '#2a2c30', roughness: 0.9 }) });
    for (let z = -8; z <= 8; z += 4) { const s = new THREE.Mesh(new THREE.PlaneGeometry(W - 2, 1.0), mats.led('#f4f8ff', 1.6)); s.rotation.x = Math.PI / 2; s.position.set(0, H - 0.02, z); scene.add(s); }
    // رفوف بضائع على الجدار الخلفي والجانبين
    const upr = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 6, 0.1), mats.anod('#2f6fd6', 0.4), 40);
    const shelf = new THREE.InstancedMesh(new THREE.BoxGeometry(2.4, 0.08, 1.0), mats.anod('#ff8a1a', 0.45), 40);
    const box = new THREE.InstancedMesh(rbox(0.7, 0.6, 0.8, 0.04, 2), new THREE.MeshStandardMaterial({ color: '#c09763', roughness: 0.8 }), 120);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); let iu = 0, is = 0, ib = 0;
    const rack = (x, z, ry) => { q.setFromAxisAngle(V(0, 1, 0), ry); const ax = V(Math.cos(ry), 0, -Math.sin(ry));
      for (const s of [-1.2, 1.2]) for (const d of [-0.45, 0.45]) { const p = V(x, 3, z).add(ax.clone().multiplyScalar(s)).add(V(Math.sin(ry), 0, Math.cos(ry)).multiplyScalar(d)); m4.compose(p, q, V(1, 1, 1)); upr.setMatrixAt(iu++, m4); }
      for (let lv = 0; lv < 4; lv++) { const y = 0.4 + lv * 1.6; m4.compose(V(x, y, z), q, V(1, 1, 1)); shelf.setMatrixAt(is++, m4);
        for (let b = -1; b <= 1; b++) if (Math.random() > 0.25 && ib < 120) { const p = V(x, y + 0.34, z).add(ax.clone().multiplyScalar(b * 0.78)); m4.compose(p, q, V(1, 0.7 + Math.random() * 0.5, 1)); box.setMatrixAt(ib++, m4); } } };
    for (const x of [-5.6, -2.8, 2.8, 5.6]) rack(x, -D / 2 + 0.7, 0);
    for (const z of [-7, 6.5]) { rack(-W / 2 + 0.7, z, Math.PI / 2); rack(W / 2 - 0.7, z, -Math.PI / 2); }
    upr.count = iu; shelf.count = is; box.count = ib; [upr, shelf, box].forEach((m) => { m.castShadow = true; m.receiveShadow = true; scene.add(m); });
    scene.add(new THREE.HemisphereLight('#f4f8ff', '#3b3a36', 0.9));
    const at = V(0, 0, -1.4); const d = dais(scene, mats, 'plinth', green, at);
    keyLight(scene, quality, V(-4, 15, 4), at, '#f8fbff', 1.9, 12); stageSpot(scene, quality, at.clone().setY(0.3), '#ffffff', 30, 8.5);
    return { stage: V(0, 0.35, -1.4), dais: d, bounds: { x0: -W / 2 + 1.6, x1: W / 2 - 1.6, z0: -D / 2 + 1.6, z1: D / 2 - 0.6 }, spawn: V(0, 1.65, 7.6), slots: rectSlots(W - 2, [-3.6, 0.2, 3.6]),
      title: { pos: V(0, 7.6, -D / 2 + 0.1), ry: 0, w: 5.6, h: 2.4 }, plaques: [{ x: -W / 2 + 0.08, z: 9.6, ry: Math.PI / 2, y: 2.6 }, { x: W / 2 - 0.08, z: 9.6, ry: -Math.PI / 2, y: 2.6 }, { x: -W / 2 + 0.08, z: 0, ry: Math.PI / 2, y: 7.4 }],
      bg: '#2a2c30', fog: [20, 45], envI: 0.55, exposure: 1.0, bloom: [0.35, 0.4, 1.10] };
  },

  /* 4-2 قاعة الآلات: طوب، تروس وبكرات وسلاسل نحاسية */
  '4-2'(c) {
    const { scene, mats, quality } = c; const W = 14, D = 20, H = 8, copper = '#e08a4a';
    rectShell(scene, W, D, H, { floor: floorMats('wood', copper, [3, 4]), wall: new THREE.MeshStandardMaterial({ map: wallTex('brick'), roughness: 0.85 }), ceil: new THREE.MeshStandardMaterial({ color: '#1e1714' }) });
    const gears = [], gm = [mats.anod('#a8692f', 0.4), mats.anod('#b8924f', 0.42), mats.anod('#8a929e', 0.45)];
    const train = [[2.0, 30, -3.4, 4.6], [1.25, 19, -0.2, 5.3], [0.9, 14, 1.95, 4.35], [1.6, 24, 4.4, 5.1]];
    let sp = 0.14; train.forEach(([R, t, x, y], i) => { const g = mesh(gearGeo(R, t, 0.16), gm[i % 3]); g.position.set(x, y, -D / 2 + 0.25); scene.add(g); gears.push([g, (i % 2 ? -1 : 1) * sp * (2 / R)]); });
    for (const s of [-1, 1]) { const pul = mesh(lathe([[0, -0.08], [0.6, -0.08], [0.6, -0.05], [0.52, 0], [0.6, 0.05], [0.6, 0.08], [0, 0.08]], 48), mats.brushed); pul.rotation.z = Math.PI / 2; pul.position.set(s * (W / 2 - 0.4), 5.6, -1.5); scene.add(pul); gears.push([pul, s * 0.4, 'x']);
      const ch = mesh(new THREE.CylinderGeometry(0.02, 0.02, 5.1, 6), mats.graphite, false); ch.position.set(s * (W / 2 - 0.4), 3.05, -0.95); scene.add(ch);
      const wt = mesh(lathe([[0, 0], [0.25, 0], [0.25, 0.5], [0.08, 0.6], [0, 0.6]], 24), mats.graphite); wt.position.set(s * (W / 2 - 0.4), 0.4, -0.95); scene.add(wt); }
    for (const y of [2.4, 6.9]) { const pipe = mesh(new THREE.CylinderGeometry(0.08, 0.08, D, 16), mats.anod(copper, 0.25), false); pipe.rotation.x = Math.PI / 2; pipe.position.set(-W / 2 + 0.3, y, 0); scene.add(pipe); const p2 = pipe.clone(); p2.position.x = W / 2 - 0.3; scene.add(p2); }
    for (const x of [-3.5, 3.5]) for (const z of [-4, 3]) { const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), mats.led('#ffcc88', 1.5)); bulb.position.set(x, H - 1.2, z); scene.add(bulb); if (quality.high) { const pl = new THREE.PointLight('#ffb870', 6, 9, 2); pl.position.copy(bulb.position); scene.add(pl); } }
    scene.add(new THREE.HemisphereLight('#ffe8d2', '#2a1a12', 0.5));
    const at = V(0, 0, -1); const d = dais(scene, mats, 'hex', copper, at);
    keyLight(scene, quality, V(4, 12, 6), at, '#ffe9d0', 1.5); stageSpot(scene, quality, at.clone().setY(0.3), '#fff0dc', 34, 7.6);
    return { stage: V(0, 0.3, -1), dais: d, bounds: { x0: -W / 2 + 0.9, x1: W / 2 - 0.9, z0: -D / 2 + 0.7, z1: D / 2 - 0.6 }, spawn: V(0, 1.65, 7.2), slots: rectSlots(W, [-5.4, -0.6, 3.6]),
      title: { pos: V(0, 2.3, -D / 2 + 0.3), ry: 0, w: 4.6, h: 1.95 }, plaques: [{ x: -W / 2 + 0.06, z: 6.6, ry: Math.PI / 2, y: 3.4 }, { x: W / 2 - 0.06, z: 6.6, ry: -Math.PI / 2, y: 3.4 }, { x: W / 2 - 0.06, z: 1.6, ry: -Math.PI / 2, y: 3.4 }],
      bg: '#120d0a', fog: [14, 32], envI: 0.4, exposure: 1.05, bloom: [0.55, 0.45, 1.05], update: (dt) => gears.forEach(([g, s, ax]) => (ax ? (g.rotation.x += dt * s) : (g.rotation.z += dt * s))) };
  },

  /* 5-1 جناح الطاقة: قاعة بيضاوية بيضاء وأعمدة طاقة متوهجة */
  '5-1'(c) {
    const { scene, mats, quality } = c; const R = 9, H = 6.5, violet = '#b48cf0', sx = 1.0, sz = 1.2;
    polyShell(scene, 36, R, H, { floor: new THREE.MeshStandardMaterial({ color: '#e4e2ea', roughness: 0.6, metalness: 0 }), wall: new THREE.MeshStandardMaterial({ color: '#fafafc', roughness: 0.6 }), ceil: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 }), sx, sz });
    // شرائط ضوئية متموجة على الجدار
    for (let lv = 0; lv < 3; lv++) { const pts = []; for (let k = 0; k <= 120; k++) { const a = k / 120 * TAU; pts.push(V(Math.sin(a) * (R - 0.08) * sx, 1.2 + lv * 1.6 + Math.sin(a * 5 + lv) * 0.35, Math.cos(a) * (R - 0.08) * sz)); } const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 360, 0.03, 6, true), mats.led(lv === 1 ? '#7ef0ff' : violet, 2.0)); scene.add(tube); }
    const flowTex = canvasTex(64, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); [['#7ef0ff', 0], [violet, 0.33], ['#ffffff', 0.5], [violet, 0.66], ['#7ef0ff', 1]].forEach(([cl, s]) => gr.addColorStop(s, cl)); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, { repeat: [1, 2] });
    const colMat = new THREE.MeshBasicMaterial({ map: flowTex, toneMapped: false, color: new THREE.Color(1.05, 1.05, 1.05) });
    const cols = ringSlots(R - 1.1, [30, 75, 120, 160, 200, 240, 285, 330], sx, sz).map((s) => { const g = new THREE.Group(); g.position.set(s.x, 0, s.z); const core = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, H - 0.4, 16, 1, true), colMat); core.position.y = (H - 0.4) / 2; const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, H - 0.4, 24, 1, true), mats.glassTint('#e9e2ff')); shell.position.y = core.position.y; const cap = mesh(lathe([[0, 0], [0.32, 0], [0.32, 0.12], [0.24, 0.2], [0, 0.2]], 32), mats.chrome); const cap2 = cap.clone(); cap2.position.y = H - 0.2; cap2.rotation.x = Math.PI; g.add(core, shell, cap, cap2); scene.add(g); return g; });
    scene.add(new THREE.HemisphereLight('#ffffff', '#d8d0e8', 0.6));
    const at = V(0, 0, -0.6); const d = dais(scene, mats, 'disc', violet, at);
    keyLight(scene, quality, V(3, 12, 5), at, '#ffffff', 1.4); stageSpot(scene, quality, at.clone().setY(0.3), '#ffffff', 22, H - 0.2);
    return { stage: V(0, 0.3, -0.6), dais: d, bounds: { r: R - 1.4 }, spawn: V(0, 1.65, 7.0), slots: ringSlots(7.2, [55, 100, 140, 220, 260, 305], 0.95, 1.12),
      title: { pos: V(0, 3.3, -R * sz + 0.45), ry: 0, w: 5.2, h: 2.25 }, plaques: ringSlots(R - 0.25, [130, 230, 90], sx, sz).map((s) => ({ ...s, y: 3.6 })),
      bg: '#f2f0f7', fog: null, envI: 0.55, exposure: 0.85, bloom: [0.45, 0.5, 1.12], update: (dt) => { flowTex.offset.y -= dt * 0.25; } };
  },

  /* 5-2 قاعة الأفعوانية: سقف زجاجي مرتفع وشريط أفعواني معلّق تجري عليه عربة مضيئة */
  '5-2'(c) {
    const { scene, mats, quality } = c; const W = 16, D = 22, H = 12, purple = '#9b6bff', gold = '#f2c46d';
    rectShell(scene, W, D, H, { floor: floorMats('epoxy', purple, [2, 3]), wall: new THREE.MeshStandardMaterial({ map: wallTex('dark'), roughness: 0.55, metalness: 0.2 }) });
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshBasicMaterial({ map: canvasTex(512, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a1f6b'); gr.addColorStop(1, '#f2a46d'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }) }));
    sky.rotation.x = Math.PI / 2; sky.position.y = H + 0.3; scene.add(sky);
    for (let x = -W / 2; x <= W / 2; x += 2) { const b = mesh(new THREE.BoxGeometry(0.1, 0.2, D), mats.graphite, false); b.position.set(x, H, 0); scene.add(b); }
    for (let z = -D / 2; z <= D / 2; z += 2) { const b = mesh(new THREE.BoxGeometry(W, 0.2, 0.1), mats.graphite, false); b.position.set(0, H, z); scene.add(b); }
    const pts = []; for (let k = 0; k < 14; k++) { const a = k / 14 * TAU; pts.push(V(Math.sin(a) * 5.6, 8.4 + Math.sin(a * 3) * 1.6 + Math.cos(a * 2) * 0.7, Math.cos(a) * 7.4 - 1)); }
    const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
    const rail = new THREE.Mesh(new THREE.TubeGeometry(curve, 400, 0.08, 10, true), mats.chrome); scene.add(rail);
    const glow = new THREE.Mesh(new THREE.TubeGeometry(curve, 400, 0.025, 6, true), mats.led(gold, 2.0)); glow.position.y = -0.12; scene.add(glow);
    for (let k = 0; k < 12; k++) { const p = curve.getPointAt(k / 12); const cab = mesh(new THREE.CylinderGeometry(0.008, 0.008, H - p.y, 4), mats.graphite, false); cab.position.set(p.x, (H + p.y) / 2, p.z); scene.add(cab); }
    const car = new THREE.Group(); const body = mesh(rbox(0.6, 0.3, 0.4, 0.1), mats.paint('#ff4d5e')); const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), mats.led('#ffffff', 3)); lamp.position.x = 0.32; car.add(body, lamp); scene.add(car);
    scene.add(new THREE.HemisphereLight('#ffe6d2', '#2a1f4a', 0.75));
    const at = V(0, 0, -1.2); const d = dais(scene, mats, 'plinth', purple, at);
    keyLight(scene, quality, V(-3, 16, 5), at, '#fff1e2', 1.8, 12); stageSpot(scene, quality, at.clone().setY(0.3), '#ffffff', 30, 7);
    let u = 0;
    return { stage: V(0, 0.35, -1.2), dais: d, bounds: { x0: -W / 2 + 0.7, x1: W / 2 - 0.7, z0: -D / 2 + 0.6, z1: D / 2 - 0.6 }, spawn: V(0, 1.65, 7.6), slots: rectSlots(W, [-6, -1.2, 3.6]),
      title: { pos: V(0, 3.6, -D / 2 + 0.08), ry: 0, w: 6, h: 2.6 }, plaques: [{ x: -W / 2 + 0.08, z: 7.6, ry: Math.PI / 2, y: 2.6 }, { x: W / 2 - 0.08, z: 7.6, ry: -Math.PI / 2, y: 2.6 }, { x: -W / 2 + 0.08, z: 1.2, ry: Math.PI / 2, y: 3.6 }],
      bg: '#120c22', fog: [20, 45], envI: 0.5, exposure: 1.05, bloom: [0.7, 0.5, 1.02],
      update: (dt) => { const p0 = curve.getPointAt(u); const y = p0.y; u = (u + dt * (0.02 + Math.max(0, 10.2 - y) * 0.012)) % 1; const p = curve.getPointAt(u), tg = curve.getTangentAt(u); car.position.copy(p).add(V(0, 0.2, 0)); car.lookAt(p.clone().add(tg)); car.rotateY(-Math.PI / 2); } };
  },

  /* 6-1 المختبر الحراري: نصف بارد (زجاج مثلّج أزرق) ونصف ساخن (نحاس كهرماني) */
  '6-1'(c) {
    const { scene, mats, quality } = c; const W = 14, D = 18, H = 6;
    const f = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMats('gradient', '#000', [1, 1])); f.rotation.x = -Math.PI / 2; f.receiveShadow = true; scene.add(f);
    const cold = new THREE.MeshStandardMaterial({ map: wallTex('frost'), roughness: 0.25, metalness: 0.1 }), hot = new THREE.MeshStandardMaterial({ map: wallTex('copper'), roughness: 0.3, metalness: 0.8 });
    wallPlane(scene, D, H, cold, -W / 2, 0, Math.PI / 2); wallPlane(scene, D, H, hot, W / 2, 0, -Math.PI / 2);
    wallPlane(scene, W / 2, H, cold, -W / 4, -D / 2, 0); wallPlane(scene, W / 2, H, hot, W / 4, -D / 2, 0);
    wallPlane(scene, W / 2, H, cold, -W / 4, D / 2, Math.PI); wallPlane(scene, W / 2, H, hot, W / 4, D / 2, Math.PI);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ color: '#9aa1aa', roughness: 0.9 })); ceil.rotation.x = Math.PI / 2; ceil.position.y = H; scene.add(ceil);
    for (let z = -7; z <= 7; z += 3.5) { led(scene, V(-5.6, H - 0.04, z), V(-0.4, H - 0.04, z), '#9fd8ff', 0.08, 1.0); led(scene, V(0.4, H - 0.04, z), V(5.6, H - 0.04, z), '#ffc58a', 0.08, 1.0); }
    // أنابيب حرارية عمودية
    for (let k = 0; k < 6; k++) { const z = -7 + k * 2.8; for (const s of [-1, 1]) { const p = mesh(new THREE.CylinderGeometry(0.07, 0.07, H, 14), s < 0 ? mats.anod('#bfe3ff', 0.2) : mats.anod('#e8803e', 0.25), false); p.position.set(s * (W / 2 - 0.25), H / 2, z); scene.add(p); } }
    const pc = new THREE.PointLight('#6fb8ff', 10, 12, 2); pc.position.set(-4.5, 3.5, 0); const ph = new THREE.PointLight('#ff9a4a', 10, 12, 2); ph.position.set(4.5, 3.5, 0); scene.add(pc, ph);
    scene.add(new THREE.HemisphereLight('#ffffff', '#2a2a30', 0.7));
    const at = V(0, 0, -1); const d = dais(scene, mats, 'disc', '#ffffff', at);
    keyLight(scene, quality, V(0, 12, 6), at, '#ffffff', 1.5); stageSpot(scene, quality, at.clone().setY(0.3), '#ffffff', 28, H - 0.2);
    return { stage: V(0, 0.3, -1), dais: d, bounds: { x0: -W / 2 + 0.7, x1: W / 2 - 0.7, z0: -D / 2 + 0.6, z1: D / 2 - 0.6 }, spawn: V(0, 1.65, 6.6), slots: rectSlots(W, [-5.4, -1, 3.2]),
      title: { pos: V(0, 3.3, -D / 2 + 0.08), ry: 0, w: 5.6, h: 2.4 }, plaques: [{ x: -W / 2 + 0.45, z: 6.2, ry: Math.PI / 2, y: 2.8 }, { x: W / 2 - 0.45, z: 6.2, ry: -Math.PI / 2, y: 2.8 }, { x: -W / 2 + 0.45, z: 1.2, ry: Math.PI / 2, y: 4.4 }],
      bg: '#15171d', fog: [14, 30], envI: 0.6, exposure: 1.0, bloom: [0.5, 0.45, 1.08], update: (dt, t) => { pc.intensity = 9 + Math.sin(t * 1.3) * 1.5; ph.intensity = 9 + Math.sin(t * 1.7 + 1) * 1.5; } };
  },

  /* 6-2 مختبر البخار: بلاط مخبري، أنابيب سقفية، خزانات ضغط، بخار متصاعد */
  '6-2'(c) {
    const { scene, mats, quality } = c; const W = 14, D = 18, H = 7, teal = '#2fd3c4';
    rectShell(scene, W, D, H, { floor: floorMats('tile', teal, [3, 4]), wall: new THREE.MeshStandardMaterial({ map: wallTex('tile'), roughness: 0.25 }), ceil: new THREE.MeshStandardMaterial({ color: '#2b3137' }) });
    for (let k = 0; k < 4; k++) { const pipe = mesh(new THREE.CylinderGeometry(0.12, 0.12, D, 18), mats.brushed, false); pipe.rotation.x = Math.PI / 2; pipe.position.set(-4.5 + k * 3, H - 0.5 - (k % 2) * 0.35, 0); scene.add(pipe);
      for (let z = -6; z <= 6; z += 4) { const v = mesh(new THREE.TorusGeometry(0.2, 0.04, 8, 24), mats.paint('#e8513a'), false); v.position.set(-4.5 + k * 3, H - 0.2 - (k % 2) * 0.35, z); scene.add(v); } }
    const tanks = [];
    for (const [x, z] of [[-W / 2 + 1.1, -D / 2 + 1.1], [W / 2 - 1.1, -D / 2 + 1.1], [-W / 2 + 1.1, D / 2 - 1.6], [W / 2 - 1.1, D / 2 - 1.6]]) {
      const t = mesh(lathe([[0, 0], [0.7, 0], [0.75, 0.15], [0.75, 2.6], [0.6, 3.0], [0.15, 3.15], [0.15, 3.3], [0, 3.3]], 40), mats.brushed); t.position.set(x, 0, z); scene.add(t);
      const gauge = new THREE.Mesh(new THREE.CircleGeometry(0.16, 24), mats.led('#e8fff9', 1.4)); gauge.position.set(x + (x > 0 ? -0.76 : 0.76), 1.6, z); gauge.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2; scene.add(gauge); tanks.push(t);
    }
    // بخار (جسيمات نقطية)
    const N = quality.high ? 260 : 140; const sp = new Float32Array(N * 3); const vents = [[-4.5, H - 0.6], [-1.5, H - 0.95], [1.5, H - 0.6], [4.5, H - 0.95]];
    const steamTex = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,.9)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
    const seeds = [];
    for (let i = 0; i < N; i++) { const v = vents[i % 4]; seeds.push([v[0], v[1], rnd(-6, 6), Math.random()]); }
    const steamGeo = new THREE.BufferGeometry(); steamGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    const steam = new THREE.Points(steamGeo, new THREE.PointsMaterial({ map: steamTex, size: 0.5, transparent: true, opacity: 0.28, depthWrite: false })); scene.add(steam);
    scene.add(new THREE.HemisphereLight('#f2fffd', '#2a3236', 0.85));
    const at = V(0, 0, -1); const d = dais(scene, mats, 'hex', teal, at);
    keyLight(scene, quality, V(4, 12, 6), at, '#ffffff', 1.6); stageSpot(scene, quality, at.clone().setY(0.3), '#f2fffd', 16, H - 0.8);
    const colliders = [[-W / 2 + 1.1, -D / 2 + 1.1], [W / 2 - 1.1, -D / 2 + 1.1], [-W / 2 + 1.1, D / 2 - 1.6], [W / 2 - 1.1, D / 2 - 1.6]].map(([x, z]) => ({ x, z, r: 1.1 }));
    return { stage: V(0, 0.3, -1), dais: d, colliders, bounds: { x0: -W / 2 + 0.7, x1: W / 2 - 0.7, z0: -D / 2 + 0.6, z1: D / 2 - 0.6 }, spawn: V(0, 1.65, 6.0), slots: rectSlots(W, [-4.8, -1, 2.8]),
      title: { pos: V(0, 3.3, -D / 2 + 0.08), ry: 0, w: 5.2, h: 2.25 }, plaques: [{ x: -W / 2 + 0.06, z: 5.4, ry: Math.PI / 2, y: 2.8 }, { x: W / 2 - 0.06, z: 5.4, ry: -Math.PI / 2, y: 2.8 }, { x: W / 2 - 0.06, z: 0.9, ry: -Math.PI / 2, y: 4.6 }],
      bg: '#1b2024', fog: [14, 30], envI: 0.6, exposure: 1.0, bloom: [0.45, 0.45, 1.10],
      update: (dt) => { for (let i = 0; i < N; i++) { const s = seeds[i]; s[3] += dt * 0.25; if (s[3] > 1) s[3] = 0; const k = s[3]; sp[i * 3] = s[0] + Math.sin(i + k * 6) * 0.25 * k; sp[i * 3 + 1] = s[1] - 0.1 - k * 1.6; sp[i * 3 + 2] = s[2] + Math.cos(i * 1.7 + k * 4) * 0.3 * k; } steamGeo.attributes.position.needsUpdate = true; } };
  },
};

export function buildEnvironment(code, ctx) {
  const env = (ENVS[code] || ENVS['2-2'])(ctx);
  env.update ||= () => {};
  return env;
}
