// المحاكيات (1): الجاذبية، الحركة الدورانية، الزخم — نماذج عصرية بمواد مصقولة وإضاءات حواف
import * as THREE from 'three';
import { Arrow, COLORS, vlen, damp, dashedLine, textSprite, canvasTex, rbox, lathe, mesh, weightGeo, Trail } from './kit.js';
import { plainNum } from '../fmt.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const G = 6.67e-11;
const TAU = Math.PI * 2;

/** الأساس المشترك: معاملات ناعمة الانتقال، قراءات، ودليل ألوان */
export class Sim {
  constructor(ctx, defs, discrete = []) {
    this.ctx = ctx; this.M = ctx.mats; this.root = new THREE.Group(); this.root.scale.setScalar(1.12); this.discrete = new Set(discrete);
    this.p = {}; this.target = {}; this.defs = defs;
    for (const [k, d] of Object.entries(defs)) this.p[k] = this.target[k] = d.value;
    this.t = 0; this.legend = []; this.trails = [];
  }
  /** أثر حركة يُضاف إلى مجموعة (parent) */
  trail(parent, color, n, size) { const t = new Trail(color, n, size); parent.add(t); this.trails.push(t); return t; }
  clearTrails() { this.trails.forEach((t) => t.clear()); }
  setTrails(v) { this.trails.forEach((t) => t.setEnabled(v)); }
  /** سلاسل الرسم البياني الحي: [{label, value, color}] */
  graph() { return null; }
  set(params) {
    for (const [k, v] of Object.entries(params)) {
      if (!(k in this.defs) || !isFinite(v)) continue;
      const d = this.defs[k]; const c = Math.max(d.min, Math.min(d.max, v));
      if (this.target[k] !== c) this.clearTrails?.();
      this.target[k] = c; if (this.discrete.has(k)) this.p[k] = c;
      this.onParam?.(k);
    }
  }
  reset() { this.set(Object.fromEntries(Object.entries(this.defs).map(([k, d]) => [k, d.value]))); }
  tick(dt) { for (const k in this.p) if (!this.discrete.has(k)) this.p[k] = damp(this.p[k], this.target[k], 5, dt); this.t += dt; this.update(dt); }
  readout() { return []; }
  shadow(obj) { obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return obj; }
  /** قاعدة إسقاط هولوغرامية صغيرة */
  projector(r = 0.5, color = '#7fd3ff') {
    const g = new THREE.Group();
    const base = mesh(lathe([[0, 0], [r, 0], [r * 1.04, 0.03], [r * 0.95, 0.09], [r * 0.6, 0.12], [0, 0.12]], 64), this.M.graphite);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.78, 0.012, 8, 96), this.M.led(color, 2.6)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.122;
    const lens = new THREE.Mesh(new THREE.CircleGeometry(r * 0.5, 48), this.M.led(color, 0.9)); lens.rotation.x = -Math.PI / 2; lens.position.y = 0.123;
    g.add(base, ring, lens); return g;
  }
  /** عمود ضوئي شفاف من القاعدة إلى المجسم */
  beam(h, r, color) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.5, r, h, 48, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.position.y = h / 2; return m;
  }
  /** شاشة هولوغرامية بإطار */
  holoScreen(w, h, tex) {
    const g = new THREE.Group();
    const frame = mesh(rbox(w + 0.08, h + 0.08, 0.05, 0.03), this.M.graphite, false);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: new THREE.Color(0.95, 0.95, 0.95) })); face.position.z = 0.03;
    const edge = new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, 0.012), this.M.led('#7fd3ff', 2.4)); edge.position.set(0, -h / 2 - 0.05, 0.03);
    g.add(frame, face, edge); return g;
  }
}

function glowSprite(color, size) {
  const tex = canvasTex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.22, color); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  s.scale.set(size, size, 1); return s;
}

/** شاشة بيانات داكنة (منحنيات) */
export function darkGraph(W = 1024, H = 560) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const begin = () => {
    const g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0);
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0d1424'); gr.addColorStop(1, '#070b15'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(127,211,255,.08)'; g.lineWidth = 1; for (let x = 0; x < W; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 0; y < H; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    return g;
  };
  return { cv, tex, begin };
}

/* ════════ 1-1 نظام شمسي: قوانين كبلر ونيوتن ════════ */
export class OrbitsBase extends Sim {
  constructor(ctx, defs) {
    super(ctx, defs);
    this.legend = [[COLORS.force, 'قوة الجذب F'], [COLORS.velocity, 'السرعة v'], ['#ffd27a', 'مساحات متساوية في أزمنة متساوية']];
    const proj = this.projector(0.7, '#ffcf6b'); this.root.add(proj, this.beam(1.4, 0.55, '#ffcf6b'));
    this.tilt = new THREE.Group(); this.tilt.position.set(0, 1.5, 0); this.tilt.rotation.x = 0.55; this.root.add(this.tilt);
    const sunTex = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#ffb347'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${255},${150 + Math.random() * 105},${40 + Math.random() * 60},${Math.random() * 0.5})`; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 1 + Math.random() * 5, 0, TAU); g.fill(); } });
    this.sun = new THREE.Mesh(new THREE.SphereGeometry(0.3, 64, 40), new THREE.MeshBasicMaterial({ map: sunTex, color: new THREE.Color(2.4, 1.7, 1.0), toneMapped: false }));
    this.tilt.add(this.sun, glowSprite('rgba(255,180,80,.9)', 1.5));
    this.light = new THREE.PointLight('#ffd9a0', 8, 8, 1.6); this.tilt.add(this.light);
    // مستوى المدار: شبكة قطبية شفافة
    const polar = canvasTex(1024, 1024, (g, w) => { const c = w / 2; g.clearRect(0, 0, w, w); g.strokeStyle = 'rgba(160,200,255,.35)'; g.lineWidth = 2; for (let r = 60; r < c; r += 60) { g.beginPath(); g.arc(c, c, r, 0, TAU); g.stroke(); } for (let k = 0; k < 24; k++) { const a = k / 24 * TAU; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.cos(a) * c, c + Math.sin(a) * c); g.stroke(); } });
    const plane = new THREE.Mesh(new THREE.CircleGeometry(3.4, 96), new THREE.MeshBasicMaterial({ map: polar, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    plane.rotation.x = -Math.PI / 2; this.tilt.add(plane);
    const pTex = canvasTex(512, 256, (g, w, h) => { for (let y = 0; y < h; y += 4) { const t = y / h; g.fillStyle = `hsl(${205 + Math.sin(t * 20) * 12}, ${55 + Math.sin(t * 9) * 15}%, ${42 + Math.sin(t * 13) * 14}%)`; g.fillRect(0, y, w, 4); } });
    this.planet = mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshStandardMaterial({ map: pTex, roughness: 0.55 }));
    const atm = new THREE.Mesh(new THREE.SphereGeometry(1.08, 32, 24), new THREE.MeshBasicMaterial({ color: '#7fc4ff', transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false })); this.planet.add(atm);
    this.tilt.add(this.planet);
    this.orbitMat = this.M.led('#cfe1ff', 1.4); this.orbit = null; this.lastAE = '';
    this.sectors = [0, 1].map((i) => {
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(200 * 9), 3)); geo.setDrawRange(0, 0);
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: i ? '#ffd27a' : '#7fc4ff', transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }));
      this.tilt.add(m); return { m, pts: [] };
    });
    this.cur = 0; this.secT = 0; this.M_ = 0;
    this.fArrow = new Arrow(COLORS.force, { label: 'F' }); this.vArrow = new Arrow(COLORS.velocity, { label: 'v' });
    this.tilt.add(this.fArrow, this.vArrow);
    this.ptrail = this.trail(this.tilt, '#7fc4ff', 160, 0.04);
  }
  graph() { const s = this.state; return s && [{ label: 'السرعة v', value: s.v, color: COLORS.velocity }, { label: 'قوة الجذب F', value: s.F * 0.6, color: COLORS.force }]; }
  geom() { const a = this.p.a * 0.36, e = this.p.e; return { a, e, b: a * Math.sqrt(1 - e * e) }; }
  update(dt) {
    const { a, e, b } = this.geom();
    const key = a.toFixed(2) + e.toFixed(2);
    if (key !== this.lastAE) {
      this.lastAE = key; if (this.orbit) { this.tilt.remove(this.orbit); this.orbit.geometry.dispose(); }
      const pts = []; for (let i = 0; i < 128; i++) { const E = (i / 128) * TAU; pts.push(V(a * (Math.cos(E) - e), 0, b * Math.sin(E))); }
      this.orbit = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 256, 0.01, 6, true), this.orbitMat); this.tilt.add(this.orbit);
    }
    const n = (TAU / 11) * Math.pow(4.5 / this.p.a, 1.5) * Math.sqrt(this.p.ms);
    this.M_ += n * dt;
    let E = this.M_; for (let k = 0; k < 6; k++) E -= (E - e * Math.sin(E) - this.M_) / (1 - e * Math.cos(E));
    const ppos = V(a * (Math.cos(E) - e), 0, b * Math.sin(E));
    const dE = n / (1 - e * Math.cos(E));
    const vel = V(-a * Math.sin(E) * dE, 0, b * Math.cos(E) * dE);
    this.planet.position.copy(ppos); this.planet.scale.setScalar(0.1 + 0.06 * Math.cbrt(this.p.mp)); this.planet.rotation.y += dt; this.ptrail.push(ppos);
    const r = ppos.length(); const F = this.p.ms * this.p.mp / (r * r);
    this.fArrow.set(ppos, ppos.clone().negate().normalize().multiplyScalar(Math.abs(vlen(F, 0.9, 0.7))));
    this.vArrow.set(ppos, vel.clone().normalize().multiplyScalar(Math.abs(vlen(vel.length(), 1.2, 0.8))));
    this.sun.scale.setScalar(0.8 + 0.2 * Math.cbrt(this.p.ms)); this.sun.rotation.y += dt * 0.2;
    this.secT += dt;
    const S = this.sectors[this.cur]; S.pts.push(ppos.clone());
    if (this.secT > 1.4) { this.secT = 0; this.cur = 1 - this.cur; this.sectors[this.cur].pts = [ppos.clone()]; }
    for (const s of this.sectors) {
      const arr = s.m.geometry.attributes.position.array; const pts = s.pts.slice(-199);
      for (let i = 0; i < pts.length - 1; i++) arr.set([0, 0, 0, pts[i].x, 0, pts[i].z, pts[i + 1].x, 0, pts[i + 1].z], i * 9);
      s.m.geometry.setDrawRange(0, Math.max(0, pts.length - 1) * 3); s.m.geometry.attributes.position.needsUpdate = true;
      s.m.material.opacity = s === S ? 0.32 : 0.16;
    }
    this.state = { r, v: vel.length(), F, T: TAU / n };
  }
  readout() {
    const s = this.state || {};
    return [['البعد عن النجم', plainNum(s.r / 0.36) + ' وحدة'], ['قوة الجذب (نسبية)', plainNum(s.F * 100)], ['السرعة (نسبية)', plainNum(s.v)], ['الزمن الدوري للعرض', plainNum(s.T) + ' s']];
  }
}

/* ════════ 1-2 قمر صناعي حول الأرض ════════ */
function earthTex(moon) {
  return canvasTex(1024, 512, (g, w, h) => {
    if (moon) {
      g.fillStyle = '#8f8f8b'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 300; i++) { const x = Math.random() * w, y = Math.random() * h, r = 3 + Math.random() ** 3 * 40; g.fillStyle = `rgba(${Math.random() > 0.5 ? 50 : 210},${Math.random() > 0.5 ? 50 : 210},${Math.random() > 0.5 ? 50 : 210},.16)`; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
      return;
    }
    const oc = g.createLinearGradient(0, 0, 0, h); oc.addColorStop(0, '#0d3566'); oc.addColorStop(0.5, '#1f63a8'); oc.addColorStop(1, '#0d3566');
    g.fillStyle = oc; g.fillRect(0, 0, w, h);
    const blob = (cx, cy, rx, ry, col) => { g.fillStyle = col; for (let i = 0; i < 46; i++) { g.beginPath(); g.ellipse(cx + (Math.random() - 0.5) * rx * 1.4, cy + (Math.random() - 0.5) * ry * 1.4, rx * (0.2 + Math.random() * 0.5), ry * (0.2 + Math.random() * 0.5), Math.random() * 3, 0, 7); g.fill(); } };
    [[220, 160, 90, 70], [300, 330, 60, 90], [540, 150, 110, 60], [560, 300, 70, 90], [760, 170, 130, 70], [840, 360, 60, 40]].forEach(([x, y, a, b], i) => blob(x, y, a, b, i % 3 ? '#41713a' : '#a48a5c'));
    g.fillStyle = '#eef3f7'; g.fillRect(0, 0, w, 24); g.fillRect(0, h - 28, w, 28);
  });
}

export class Satellite extends Sim {
  constructor(ctx, defs) {
    super(ctx, defs, ['moon']);
    this.legend = [[COLORS.weight, 'قوة الجاذبية (نحو المركز)'], [COLORS.velocity, 'السرعة المدارية v']];
    this.root.add(this.projector(0.6, '#7fd3ff'), this.beam(1.0, 0.45, '#7fd3ff'));
    this.center = new THREE.Group(); this.center.position.set(0, 1.5, 0); this.root.add(this.center);
    this.tilt = new THREE.Group(); this.tilt.rotation.x = 0.5; this.tilt.rotation.z = -0.08; this.center.add(this.tilt);
    this.earthMat = new THREE.MeshStandardMaterial({ map: earthTex(false), roughness: 0.7, metalness: 0 });
    this.moonMat = new THREE.MeshStandardMaterial({ map: earthTex(true), roughness: 0.95 });
    this.body = mesh(new THREE.SphereGeometry(0.6, 72, 48), this.earthMat); this.center.add(this.body);
    const cloudTex = canvasTex(1024, 512, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.75)'; for (let i = 0; i < 260; i++) { g.beginPath(); g.ellipse(Math.random() * w, 30 + Math.random() * (h - 60), 18 + Math.random() * 70, 4 + Math.random() * 12, (Math.random() - 0.5) * 0.4, 0, 7); g.fill(); } });
    this.clouds = new THREE.Mesh(new THREE.SphereGeometry(0.615, 64, 40), new THREE.MeshStandardMaterial({ map: cloudTex, transparent: true, depthWrite: false, roughness: 1 }));
    this.atmo = new THREE.Mesh(new THREE.SphereGeometry(0.66, 48, 32), new THREE.MeshBasicMaterial({ color: '#7fb8ff', transparent: true, opacity: 0.22, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.center.add(this.clouds, this.atmo);
    const sat = this.sat = new THREE.Group();
    const bus = mesh(rbox(0.14, 0.12, 0.12, 0.02), this.M.gold);
    const panelTex = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#0d1a3d'; g.fillRect(0, 0, w, h); g.strokeStyle = '#3d6bd6'; g.lineWidth = 2; for (let x = 0; x < w; x += 22) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y < h; y += 22) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } });
    const panelMat = new THREE.MeshStandardMaterial({ map: panelTex, roughness: 0.25, metalness: 0.6, emissive: '#10245a', emissiveIntensity: 0.6 });
    for (const s of [-1, 1]) { const arm = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.08, 6), this.M.chrome); arm.rotation.x = Math.PI / 2; arm.position.z = s * 0.1; const pnl = mesh(new THREE.BoxGeometry(0.012, 0.09, 0.3), panelMat); pnl.position.z = s * 0.29; sat.add(arm, pnl); }
    const dish = mesh(lathe([[0, 0], [0.06, 0.012], [0.07, 0.03]], 24), this.M.ceramic); dish.position.y = 0.06; dish.rotation.x = Math.PI; const light = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), this.M.led('#ff4d5e', 3)); light.position.set(0.07, 0.06, 0);
    sat.add(bus, dish, light); this.tilt.add(sat);
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.0035, 6, 200), this.M.led('#9fd8ff', 1.6)); this.ring.rotation.x = Math.PI / 2; this.tilt.add(this.ring);
    this.gArrow = new Arrow(COLORS.weight, { label: 'F', sub: 'g' }); this.vArrow = new Arrow(COLORS.velocity, { label: 'v' });
    this.tilt.add(this.gArrow, this.vArrow); this.ang = 0;
    this.strail = this.trail(this.tilt, '#ffd27a', 120, 0.03);
  }
  graph() { const s = this.state; return s && [{ label: 'السرعة المدارية (km/s)', value: s.v / 1000, color: COLORS.velocity }, { label: 'g (N/kg)', value: s.g, color: COLORS.weight }]; }
  update(dt) {
    const moon = this.p.moon >= 0.5; const R = moon ? 0.42 : 0.6;
    this.body.material = moon ? this.moonMat : this.earthMat; this.atmo.visible = this.clouds.visible = !moon;
    [this.body, this.clouds, this.atmo].forEach((m) => m.scale.setScalar(R / 0.6));
    this.body.rotation.y += dt * 0.12; this.clouds.rotation.y += dt * 0.16;
    const rs = R * (1 + (this.p.rr - 1) * 0.42); this.ring.scale.setScalar(rs);
    const w = Math.max(0.12, 1.3 * Math.sqrt(Math.max(this.p.mc, 0.05)) * Math.pow(this.p.rr, -1.5));
    this.ang += w * dt;
    const pos = V(Math.cos(this.ang) * rs, 0, -Math.sin(this.ang) * rs);
    this.sat.position.copy(pos); this.sat.rotation.y = this.ang; this.strail.push(pos);
    const g = this.p.mc / (this.p.rr * this.p.rr), v = Math.sqrt(this.p.mc / this.p.rr);
    this.gArrow.set(pos, pos.clone().negate().normalize().multiplyScalar(Math.abs(vlen(g, 0.6, 0.6))));
    this.vArrow.set(pos, V(-Math.sin(this.ang), 0, -Math.cos(this.ang)).multiplyScalar(Math.abs(vlen(v, 0.8, 0.7))));
    const M = this.p.mc * 5.97e24, Rr = this.p.rr * (moon ? 1.74e6 : 6.38e6);
    this.state = { r: Rr, v: Math.sqrt(G * M / Rr), T: TAU * Math.sqrt(Rr ** 3 / (G * M)), g: G * M / (Rr * Rr) };
  }
  readout() {
    const s = this.state || {};
    return [['نصف قطر المدار r', plainNum(s.r) + ' m'], ['السرعة المدارية v', plainNum(s.v) + ' m/s'], ['الزمن الدوري T', plainNum(s.T / 60) + ' min'], ['مجال الجاذبية g', plainNum(s.g) + ' N/kg']];
  }
}

/* ════════ 2-1 قرص دوّار ════════ */
export class Disk extends Sim {
  constructor(ctx, defs) {
    super(ctx, defs);
    this.legend = [[COLORS.velocity, 'السرعة الخطية v = rω'], [COLORS.torque, 'السرعة الزاوية ω'], [COLORS.displacement, 'الإزاحة الزاوية θ']];
    const base = mesh(lathe([[0, 0], [0.75, 0], [0.8, 0.04], [0.5, 0.12], [0.28, 0.2], [0.24, 0.5], [0.3, 0.52], [0, 0.52]], 64), this.M.graphite);
    const baseRing = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.012, 8, 96), this.M.led('#3fd6c6', 2.4)); baseRing.rotation.x = Math.PI / 2; baseRing.position.y = 0.075;
    const tex = canvasTex(1024, 1024, (g, w) => {
      const c = w / 2; const gr = g.createRadialGradient(c, c, 0, c, c, c); gr.addColorStop(0, '#20242d'); gr.addColorStop(1, '#14171d'); g.fillStyle = gr; g.fillRect(0, 0, w, w);
      for (let r = 40; r < c; r += 5) { g.strokeStyle = `rgba(255,255,255,${0.025 + (r % 50 === 0 ? 0.05 : 0)})`; g.beginPath(); g.arc(c, c, r, 0, 7); g.stroke(); }
      g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 3;
      for (let k = 0; k < 72; k++) { const a = (k / 72) * TAU; const r0 = k % 6 ? c - 22 : c - 60; g.beginPath(); g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); g.lineTo(c + Math.cos(a) * (c - 6), c + Math.sin(a) * (c - 6)); g.stroke(); }
      g.fillStyle = '#3fd6c6'; g.fillRect(c, c - 4, c - 6, 8);
    });
    this.disk = new THREE.Group(); this.disk.position.y = 0.56;
    const platter = mesh(lathe([[0, 0], [1.95, 0], [2.02, 0.02], [2.02, 0.06], [1.97, 0.08], [0, 0.08]], 128), this.M.brushed);
    const top = new THREE.Mesh(new THREE.CircleGeometry(1.95, 128), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.3, metalness: 0.4 })); top.rotation.x = -Math.PI / 2; top.position.y = 0.081; top.receiveShadow = true;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(2.02, 0.012, 8, 160), this.M.led('#3fd6c6', 2.6)); rim.rotation.x = Math.PI / 2; rim.position.y = 0.04;
    const hub = mesh(lathe([[0, 0], [0.16, 0], [0.16, 0.06], [0.06, 0.12], [0, 0.12]], 32), this.M.chrome); hub.position.y = 0.08;
    this.disk.add(platter, top, rim, hub);
    this.root.add(base, baseRing, this.disk);
    const puckGeo = lathe([[0, 0], [0.1, 0], [0.11, 0.02], [0.11, 0.07], [0.09, 0.09], [0, 0.09]], 32);
    this.pucks = ['#ff7a59', '#ffd23f'].map((c) => { const m = mesh(puckGeo, this.M.paint('#e9edf3')); const l = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 8, 32), this.M.led(c, 2.6)); l.rotation.x = Math.PI / 2; l.position.y = 0.092; m.add(l); m.position.y = 0.08; this.disk.add(m); return m; });
    this.vA = [0, 1].map(() => new Arrow(COLORS.velocity, { label: 'v' })); this.vA.forEach((a) => this.root.add(a));
    this.wArrow = new Arrow(COLORS.torque, { label: 'ω' }); this.root.add(this.wArrow);
    this.arcMat = new THREE.MeshBasicMaterial({ color: COLORS.displacement, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
    this.arc = new THREE.Mesh(new THREE.BufferGeometry(), this.arcMat); this.arc.rotation.x = -Math.PI / 2; this.arc.position.y = 0.66; this.root.add(this.arc);
    this.theta = 0; this.w = this.p.omega; this.tw = 0; this.arcT = 0;
    this.dtrail = this.trail(this.root, '#ffd23f', 90, 0.035);
  }
  graph() { const s = this.state; return s && [{ label: 'ω (rad/s)', value: s.w, color: COLORS.torque }, { label: 'v الحافة (m/s)', value: s.v1, color: COLORS.velocity }]; }
  onParam(k) { if (k === 'omega' || k === 'alpha') this.tw = 0; }
  update(dt) {
    this.tw += dt;
    if (Math.abs(this.p.alpha) > 0.01) { this.w += this.p.alpha * dt; if (this.w > 6 || this.w < 0 || this.tw > 7) { this.w = this.target.omega; this.tw = 0; this.theta = 0; } }
    else this.w = this.p.omega;
    this.theta += this.w * dt; this.disk.rotation.y = this.theta;
    const r = Math.min(this.p.r, 1.85); const rs = [r, r / 2];
    this.pucks.forEach((m, i) => m.position.set(rs[i], 0.08, 0));
    this.dtrail.push(V(Math.cos(this.theta) * r, 0.75, -Math.sin(this.theta) * r));
    rs.forEach((rr, i) => { const a = this.theta; this.vA[i].set(V(Math.cos(a) * rr, 0.8, -Math.sin(a) * rr), V(-Math.sin(a), 0, -Math.cos(a)).multiplyScalar(Math.abs(vlen(rr * this.w, 2.2, 0.9)))); });
    this.wArrow.set(V(0, 0.78, 0), V(0, Math.max(0.05, vlen(this.w, 2.5, 0.9)), 0));
    this.arcT += dt;
    if (this.arcT > 0.06) { this.arcT = 0; const th = this.theta % TAU; this.arc.geometry.dispose(); this.arc.geometry = new THREE.RingGeometry(0.25, Math.max(0.3, r * 0.45), 48, 1, 0, Math.max(0.01, th)); }
    this.state = { w: this.w, th: this.theta % TAU, v1: r * this.w, v2: (r / 2) * this.w, r };
  }
  readout() {
    const s = this.state || {};
    return [['السرعة الزاوية ω', plainNum(s.w) + ' rad/s'], ['θ في الدورة الحالية', plainNum(s.th) + ' rad'], [`v عند r = ${plainNum(s.r)} m`, plainNum(s.v1) + ' m/s'], ['v عند r/2', plainNum(s.v2) + ' m/s']];
  }
}

/* ════════ 2-2 عجلة ومفتاح: العزم ════════ */
export class Torque extends Sim {
  constructor(ctx, defs) {
    super(ctx, defs);
    this.legend = [[COLORS.force, 'القوة F'], [COLORS.torque, 'متجه العزم τ'], [COLORS.displacement, 'ذراع القوة L = r sinθ']];
    const M = this.M;
    const plate = mesh(rbox(1.2, 0.08, 0.9, 0.03), M.graphite); plate.position.y = 0.04; this.root.add(plate);
    for (const s of [-1, 1]) { const leg = mesh(rbox(0.1, 1.55, 0.14, 0.04), M.anod('#ffb02e', 0.3)); leg.position.set(s * 0.32, 0.8, -0.34); leg.rotation.z = -s * 0.2; this.root.add(leg); }
    const brg = mesh(lathe([[0, -0.12], [0.11, -0.12], [0.13, -0.1], [0.13, 0.1], [0.11, 0.12], [0, 0.12]], 32), M.chrome); brg.rotation.x = Math.PI / 2; brg.position.set(0, 1.55, -0.34); this.root.add(brg);
    this.pivot = new THREE.Group(); this.pivot.position.set(0, 1.55, 0); this.root.add(this.pivot);
    const axle = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 16), M.chrome); axle.rotation.x = Math.PI / 2; axle.position.z = -0.2; this.pivot.add(axle);
    const wheel = this.wheel = new THREE.Group();
    const rim = mesh(new THREE.TorusGeometry(0.58, 0.045, 20, 96), M.chrome); const rimLed = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.012, 8, 96), M.led('#c77dff', 2.4)); rimLed.position.z = 0.05;
    for (let k = 0; k < 5; k++) { const sp = mesh(rbox(0.05, 0.56, 0.03, 0.012), M.graphite); sp.geometry.translate(0, 0.28, 0); sp.rotation.z = (k / 5) * TAU; wheel.add(sp); }
    const hub = mesh(lathe([[0, -0.06], [0.11, -0.06], [0.13, 0], [0.11, 0.06], [0, 0.06]], 40), M.gold); hub.rotation.x = Math.PI / 2;
    this.arm = mesh(rbox(1, 0.07, 0.04, 0.02), M.brushed); this.arm.geometry.translate(0.5, 0, 0); this.arm.position.z = 0.09;
    this.knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 14), M.led('#ff4d5e', 2.2));
    wheel.add(rim, rimLed, hub, this.arm, this.knob); this.pivot.add(wheel);
    this.F = new Arrow(COLORS.force, { label: 'F' }); this.tau = new Arrow(COLORS.torque, { label: 'τ' });
    this.pivot.add(this.F, this.tau);
    this.leverLine = dashedLine([V(), V(1, 0, 0)], COLORS.displacement); this.leverLine.position.z = 0.12; this.pivot.add(this.leverLine);
    this.actLine = dashedLine([V(), V(1, 0, 0)], '#ffffff', { opacity: 0.35 }); this.actLine.position.z = 0.12; this.pivot.add(this.actLine);
    this.Llabel = textSprite('L', { color: COLORS.displacement, size: 0.16 }); this.pivot.add(this.Llabel);
    this.ang = 0.35; this.w = 0; this.tw = 0;
  }
  graph() { const s = this.state; return s && [{ label: 'ω (rad/s)', value: this.w, color: COLORS.torque }, { label: 'τ (N·m)', value: s.tau / 20, color: COLORS.force }]; }
  onParam() { this.tw = 0; this.w = 0; }
  update(dt) {
    const r = this.p.r * 1.9, th = THREE.MathUtils.degToRad(this.p.theta);
    const tau = this.p.F * this.p.r * Math.sin(th), alpha = tau / this.p.I;
    this.tw += dt; this.w += alpha * dt * 0.12; this.ang += this.w * dt;
    if (this.tw > 6 || Math.abs(this.w) > 4) { this.tw = 0; this.w = 0; this.ang = 0.35; }
    this.wheel.rotation.z = this.ang; this.arm.scale.x = r; this.knob.position.set(r, 0, 0.09);
    const ax = V(Math.cos(this.ang), Math.sin(this.ang), 0);
    const tip = ax.clone().multiplyScalar(r).setZ(0.12);
    const fdir = ax.clone().applyAxisAngle(V(0, 0, 1), th);
    this.F.set(tip, fdir.clone().multiplyScalar(Math.abs(vlen(this.p.F, 80, 0.8))));
    this.tau.set(V(0, 0, 0.1), V(0, 0, Math.sign(tau) * Math.max(0.05, Math.abs(vlen(tau, 30, 0.8)))));
    const foot = tip.clone().setZ(0).sub(fdir.clone().multiplyScalar(tip.clone().setZ(0).dot(fdir)));
    const set = (line, a, b) => { const p = line.geometry.attributes.position; p.setXYZ(0, a.x, a.y, 0); p.setXYZ(1, b.x, b.y, 0); p.needsUpdate = true; line.computeLineDistances(); };
    set(this.leverLine, V(), foot); set(this.actLine, tip.clone().sub(fdir.clone().multiplyScalar(1.6)), tip.clone().add(fdir.clone().multiplyScalar(1.6)));
    this.Llabel.position.copy(foot.clone().multiplyScalar(0.5)).setZ(0.2);
    this.state = { tau, L: this.p.r * Math.abs(Math.sin(th)), alpha };
  }
  readout() {
    const s = this.state || {};
    return [['العزم τ', plainNum(s.tau) + ' N·m'], ['ذراع القوة L', plainNum(s.L) + ' m'], ['عزم القصور I', plainNum(this.p.I) + ' kg·m²'], ['التسارع الزاوي α', plainNum(s.alpha) + ' rad/s²']];
  }
}

/* ════════ 2-3 عارضة الاتزان (ثلاثة أوضاع) ════════ */
export class Seesaw extends Sim {
  constructor(ctx, defs) {
    super(ctx, defs, ['mode']);
    this.legend = [[COLORS.weight, 'الأوزان mg'], [COLORS.normal, 'قوى الدعم / الشد'], [COLORS.torque, 'محصلة العزم']];
    const M = this.M;
    this.beam = new THREE.Group(); this.beam.position.y = 1.0;
    const plank = mesh(rbox(5, 0.11, 0.46, 0.04), M.anod('#2b3442', 0.3)); this.beam.add(plank);
    const ruler = canvasTex(2048, 128, (g, w, h) => { g.fillStyle = '#e9e4d6'; g.fillRect(0, 0, w, h); g.fillStyle = '#1b2230'; for (let k = 0; k <= 100; k++) { const x = k / 100 * w; const L = k % 10 === 0 ? 70 : k % 5 === 0 ? 46 : 26; g.fillRect(x - 2, 0, 4, L); } g.font = '600 38px "Plex Arabic", sans-serif'; g.textAlign = 'center'; for (let k = -5; k <= 5; k++) g.fillText(String(Math.abs(k * 0.5)), (k + 5) / 10 * w, 112); });
    const top = new THREE.Mesh(new THREE.PlaneGeometry(4.9, 0.18), new THREE.MeshStandardMaterial({ map: ruler, roughness: 0.5 })); top.rotation.x = -Math.PI / 2; top.position.set(0, 0.057, 0.1); this.beam.add(top);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.012, 0.012), M.led('#e6b36a', 2.4)); edge.position.set(0, -0.06, 0.235); this.beam.add(edge);
    this.pivot = mesh(lathe([[0, 0], [0.55, 0], [0.58, 0.04], [0.3, 0.2], [0.14, 0.78], [0.16, 0.84], [0, 0.84]], 48), M.ceramic);
    const brg = mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 24), M.chrome); brg.rotation.x = Math.PI / 2; brg.position.y = 0.9; this.pivot.add(brg);
    this.supports = [-2.4, 2.4].map((x) => { const s = mesh(rbox(0.26, 0.95, 0.5, 0.06), M.ceramic); s.position.set(x, 0.47, 0); this.root.add(s); return s; });
    this.hinge = new THREE.Group(); const hp = mesh(rbox(0.26, 1.9, 0.5, 0.06), M.ceramic); hp.position.set(-2.62, 0.95, 0);
    const pin = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 16), M.chrome); pin.rotation.x = Math.PI / 2; pin.position.set(-2.45, 1.0, 0); this.hinge.add(hp, pin);
    this.gantry = new THREE.Group(); const gp = mesh(rbox(0.16, 2.9, 0.16, 0.05), M.graphite); gp.position.set(2.9, 1.45, -0.4);
    const gb = mesh(rbox(0.9, 0.14, 0.16, 0.05), M.graphite); gb.position.set(2.5, 2.85, -0.4);
    this.rope = mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 8), M.anod('#d9c9a3', 0.6)); this.gantry.add(gp, gb, this.rope);
    const wg = weightGeo();
    this.blocks = ['#e8613f', '#3f8fe0'].map((c) => { const b = mesh(wg, M.paint(c)); this.beam.add(b); return b; });
    this.hang = mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 6), M.chrome); this.beam.add(this.hang);
    this.root.add(this.beam, this.pivot, this.hinge, this.gantry);
    this.W = [0, 1, 2].map((i) => new Arrow(COLORS.weight, { label: 'F', sub: ['g1', 'g2', 'g'][i] }));
    this.N = [0, 1].map((i) => new Arrow(COLORS.normal, { label: 'F', sub: i ? 'R' : 'L' }));
    this.tauA = new Arrow(COLORS.torque, { label: 'Στ' });
    [...this.W, ...this.N, this.tauA].forEach((a) => this.root.add(a));
    this.angle = 0; this.av = 0;
  }
  graph() { return [{ label: 'زاوية الميل (°)', value: -this.angle * 57.3, color: COLORS.torque }]; }
  placeWeight(b, m, x, yBase) { const s = 0.26 + 0.2 * Math.cbrt(m / 10); b.scale.setScalar(s); b.position.set(x, yBase, 0); return s * 0.92; }
  update(dt) {
    const g = 9.8, { m1, m2, mode } = this.p; const { x1, x2 } = this.p; const md = Math.round(mode);
    this.pivot.visible = md === 0; this.supports.forEach((s) => (s.visible = md === 1)); this.hinge.visible = md === 2; this.gantry.visible = md === 2;
    let net = 0, pos1, pos2, h1 = 0, h2 = 0;
    const toWorld = (v) => this.beam.localToWorld(v.clone()).sub(this.root.getWorldPosition(V())).divideScalar(this.root.scale.x);
    this.beam.updateMatrixWorld(true);
    if (md === 0) {
      pos1 = -Math.min(x1, 2.4); pos2 = Math.min(x2, 2.4);
      net = m2 * g * pos2 + m1 * g * pos1;
      const target = -0.26 * Math.tanh(net / 120);
      this.av += ((target - this.angle) * 30 - this.av * 7) * dt; this.angle += this.av * dt;
      this.blocks[0].visible = true; this.hang.visible = false;
      h1 = this.placeWeight(this.blocks[0], m1, pos1, 0.055); h2 = this.placeWeight(this.blocks[1], m2, pos2, 0.055);
      this.beam.position.set(0, 0.9, 0);
    } else {
      this.angle = damp(this.angle, 0, 8, dt); this.beam.position.set(0, 1.0, 0); this.blocks[0].visible = false;
      if (md === 1) { pos2 = THREE.MathUtils.clamp(x2, -2.3, 2.3); h2 = this.placeWeight(this.blocks[1], m2, pos2, 0.055); this.hang.visible = false; }
      else { pos2 = 2.4; const s = 0.26 + 0.2 * Math.cbrt(m2 / 10); this.blocks[1].scale.setScalar(s); this.blocks[1].position.set(pos2, -0.62 - s * 0.92, 0); this.hang.visible = true; this.hang.position.set(2.4, -0.33, 0); this.hang.scale.y = 0.6; }
    }
    this.beam.rotation.z = this.angle;
    const wl = (m) => Math.abs(vlen(m * g, 500, 0.75));
    this.W.forEach((a) => (a.visible = false)); this.N.forEach((a) => (a.visible = false));
    if (md === 0) {
      this.W[0].set(toWorld(V(pos1, 0.06 + h1 / 2, 0.32)), V(0, -wl(m1), 0));
      this.W[1].set(toWorld(V(pos2, 0.06 + h2 / 2, 0.32)), V(0, -wl(m2), 0));
      this.N[0].set(V(0, 0.82, 0.36), V(0, wl(m1 + m2), 0));
      this.tauA.set(V(0, 0.9, 0.3), V(0, 0, -Math.sign(net) * Math.abs(vlen(net, 150, 0.7))));
      this.state = { t1: m1 * g * Math.abs(pos1), t2: m2 * g * pos2, net };
    } else if (md === 1) {
      const FR = (m1 * g * 2.4 + m2 * g * (pos2 + 2.4)) / 4.8, FL = (m1 + m2) * g - FR;
      this.W[2].set(V(0, 1.0, 0.3), V(0, -wl(m1), 0)); this.W[1].set(V(pos2, 1.06 + h2 / 2, 0.32), V(0, -wl(m2), 0));
      this.N[0].set(V(-2.4, 0.3, 0.32), V(0, wl(FL / g), 0)); this.N[1].set(V(2.4, 0.3, 0.32), V(0, wl(FR / g), 0));
      this.tauA.visible = false; this.state = { FL, FR };
    } else {
      const T = m1 * g / 2 + m2 * g, FH = (m1 + m2) * g - T;
      this.rope.position.set(2.4, 1.0 + (2.85 - 1.0) / 2, 0.4); this.rope.scale.y = 1.85;
      this.W[2].set(V(0, 1.0, 0.3), V(0, -wl(m1), 0)); this.W[1].set(V(2.4, 0.2, 0.36), V(0, -wl(m2), 0));
      this.N[1].set(V(2.4, 1.06, 0.36), V(0, wl(T / g), 0)); this.N[0].set(V(-2.4, 0.4, 0.36), V(0, wl(Math.max(FH, 0) / g), 0));
      this.tauA.visible = false; this.state = { T, FH };
    }
  }
  readout() {
    const s = this.state || {}; const md = Math.round(this.p.mode);
    if (md === 0) return [['عزم الكتلة اليسرى', plainNum(s.t1) + ' N·m'], ['عزم الكتلة اليمنى', plainNum(s.t2) + ' N·m'], ['محصلة العزم Στ', plainNum(s.net) + ' N·m'], ['الحالة', Math.abs(s.net) < 2 ? 'متزنة ✓' : 'تميل']];
    if (md === 1) return [['قوة الدعامة اليسرى', plainNum(s.FL) + ' N'], ['قوة الدعامة اليمنى', plainNum(s.FR) + ' N'], ['ΣF', '0 ✓'], ['Στ', '0 ✓']];
    return [['قوة الشد T', plainNum(s.T) + ' N'], ['قوة المفصّلة', plainNum(s.FH) + ' N'], ['ΣF', '0 ✓'], ['Στ', '0 ✓']];
  }
}

/* ════════ 3-1 الدفع: كرة تصطدم بلوح قياس القوة ════════ */
export class ImpulseBase extends Sim {
  constructor(ctx, defs) {
    super(ctx, defs);
    this.legend = [[COLORS.momentum, 'الزخم p'], [COLORS.force, 'متوسط القوة F أثناء التلامس']];
    const M = this.M;
    const track = mesh(rbox(5.4, 0.08, 0.7, 0.03), M.graphite); track.position.set(0, 0.6, 0.3);
    for (const z of [-0.02, 0.62]) { const l = new THREE.Mesh(new THREE.BoxGeometry(5.3, 0.012, 0.012), M.led('#4cc3ff', 2.2)); l.position.set(0, 0.645, z); this.root.add(l); }
    for (const x of [-2.3, 2.3]) { const l = mesh(rbox(0.12, 0.56, 0.5, 0.04), M.brushed); l.position.set(x, 0.28, 0.3); this.root.add(l); }
    // لوح قياس القوة
    this.plate = new THREE.Group(); this.plate.position.set(2.56, 1.05, 0.3);
    const frame = mesh(rbox(0.2, 0.9, 0.78, 0.04), M.graphite);
    const sensorTex = canvasTex(256, 256, (g) => { g.fillStyle = '#05080f'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#ff4d5e'; for (let x = 16; x < 256; x += 32) for (let y = 16; y < 256; y += 32) { g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill(); } });
    this.sensorMat = new THREE.MeshStandardMaterial({ map: sensorTex, emissiveMap: sensorTex, emissive: '#ffffff', emissiveIntensity: 0.4, roughness: 0.2 });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.8), this.sensorMat); face.rotation.y = -Math.PI / 2; face.position.x = -0.102;
    this.plate.add(frame, face);
    const ballTex = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d23a3a'; g.lineWidth = 6; g.setLineDash([10, 8]); for (const o of [0, w / 2]) { g.beginPath(); for (let x = 0; x <= w / 2; x += 4) { const y = h / 2 + Math.sin(x / (w / 2) * TAU) * h * 0.28; x ? g.lineTo(o + x, y) : g.moveTo(o + x, y); } g.stroke(); } });
    this.ball = mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshPhysicalMaterial({ map: ballTex, roughness: 0.4, clearcoat: 0.5 }));
    this.root.add(track, this.plate, this.ball);
    this.pA = new Arrow(COLORS.momentum, { label: 'p' }); this.FA = new Arrow(COLORS.force, { label: 'F', radius: 0.04 });
    this.root.add(this.pA, this.FA);
    this.gfx = darkGraph(1024, 560); const scr = this.holoScreen(2.4, 1.31, this.gfx.tex); scr.position.set(0, 2.15, -0.9); this.root.add(scr);
    this.phase = 0; this.pt = 0; this.x = -2.2; this.dirty = true;
    this.btrail = this.trail(this.root, '#ffffff', 80, 0.03);
  }
  graph() { const v = this.phase === 0 ? this.p.m * this.p.vin : this.phase === 2 ? -this.p.m * this.p.vout : this.phase === 1 ? 0 : -this.p.m * this.p.vout; return [{ label: 'الزخم p (kg·m/s)', value: v, color: COLORS.momentum }]; }
  onParam() { this.dirty = true; }
  drawGraph() {
    const g = this.gfx.begin(), W = 1024, H = 560;
    const ox = 90, oy = H - 80, w = W - 150, h = H - 160;
    g.strokeStyle = '#a6aecb'; g.lineWidth = 3; g.beginPath(); g.moveTo(ox, 40); g.lineTo(ox, oy); g.lineTo(ox + w, oy); g.stroke();
    const F = this.p.m * (this.p.vin + this.p.vout) / this.p.dt;
    const width = Math.min(0.85, 0.12 + this.p.dt * 2.6) * w, peak = Math.min(1, 0.15 + Math.log10(1 + F) / 4.2) * h;
    const x0 = ox + (w - width) / 2;
    g.beginPath(); g.moveTo(x0, oy); for (let i = 0; i <= 60; i++) { const u = i / 60; g.lineTo(x0 + u * width, oy - Math.sin(Math.PI * u) ** 2 * peak * 1.6); } g.closePath();
    const gr = g.createLinearGradient(0, oy - peak * 1.6, 0, oy); gr.addColorStop(0, 'rgba(255,77,94,.55)'); gr.addColorStop(1, 'rgba(255,77,94,.05)'); g.fillStyle = gr; g.fill();
    g.strokeStyle = '#ff4d5e'; g.lineWidth = 6; g.shadowColor = '#ff4d5e'; g.shadowBlur = 18; g.stroke(); g.shadowBlur = 0;
    g.setLineDash([12, 10]); g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, oy - peak * 0.8); g.lineTo(x0 + width, oy - peak * 0.8); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#ffffff'; g.font = 'italic 600 40px "Times New Roman", serif'; g.fillText('F', ox - 50, 70); g.fillText('t', ox + w + 10, oy + 10);
    g.font = '600 34px "Plex Arabic", sans-serif'; g.direction = 'rtl'; g.textAlign = 'center';
    g.fillText(`المساحة = الدفع FΔt = ${plainNum(this.p.m * (this.p.vin + this.p.vout))} N·s`, W / 2, 40);
    g.font = '500 28px "Plex Arabic", sans-serif'; g.fillStyle = '#7fd3ff';
    g.fillText(`F المتوسطة ≈ ${plainNum(F)} N   ·   Δt = ${plainNum(this.p.dt)} s`, W / 2, H - 28);
    this.gfx.tex.needsUpdate = true;
  }
  update(dt) {
    if (this.dirty) { this.dirty = false; this.drawGraph(); }
    const r = 0.1 + 0.07 * Math.cbrt(this.p.m); const y = 0.645 + r;
    const vin = THREE.MathUtils.clamp(this.p.vin * 0.22, 0.5, 3.2), vout = THREE.MathUtils.clamp(this.p.vout * 0.22, 0, 3.2);
    const contact = 0.25 + Math.min(this.p.dt, 0.3) * 2.5;
    this.pt += dt; let sq = 1; const xw = 2.455 - r;
    if (this.phase === 0) { this.x += vin * dt; if (this.x >= xw) { this.x = xw; this.phase = 1; this.pt = 0; } }
    else if (this.phase === 1) { sq = 1 - 0.28 * Math.sin(Math.PI * Math.min(this.pt / contact, 1)); if (this.pt > contact) { this.phase = 2; this.pt = 0; } }
    else if (this.phase === 2) { this.x -= vout * dt; if (this.x < -2.4 || this.pt > 3.5 || (vout === 0 && this.pt > 1.2)) { this.phase = 3; this.pt = 0; } }
    else if (this.pt > 0.6) { this.phase = 0; this.x = -2.2; }
    this.sensorMat.emissiveIntensity = damp(this.sensorMat.emissiveIntensity, this.phase === 1 ? 3 : 0.4, 10, dt);
    this.ball.scale.set(r * sq, r / Math.sqrt(sq), r / Math.sqrt(sq)); this.ball.position.set(this.x + (1 - sq) * r, y, 0.3);
    this.ball.rotation.z -= (this.phase === 0 ? vin : this.phase === 2 ? -vout : 0) * dt / r;
    if (this.phase === 3) this.btrail.clear(); else this.btrail.push(this.ball.position.clone());
    const pl = (v) => Math.abs(vlen(this.p.m * v, 8, 0.9)); const at = V(this.x, y + r + 0.15, 0.3);
    if (this.phase === 0) this.pA.set(at, V(pl(this.p.vin), 0, 0)); else if (this.phase === 2) this.pA.set(at, V(-pl(this.p.vout), 0, 0)); else this.pA.visible = false;
    const F = this.p.m * (this.p.vin + this.p.vout) / this.p.dt;
    if (this.phase === 1) this.FA.set(V(this.x + r, y, 0.3), V(-Math.abs(vlen(F, 400, 1.0)), 0, 0)); else this.FA.visible = false;
    this.state = { pi: this.p.m * this.p.vin, pf: -this.p.m * this.p.vout, F };
  }
  readout() {
    const s = this.state || {};
    return [['الزخم قبل pᵢ', plainNum(s.pi) + ' kg·m/s'], ['الزخم بعد p_f', plainNum(s.pf) + ' kg·m/s'], ['التغير Δp', plainNum(s.pf - s.pi) + ' kg·m/s'], ['متوسط القوة F', plainNum(-s.F) + ' N']];
  }
}

/* ════════ 3-2 حفظ الزخم: عربتان على مسار هوائي ════════ */
export class CollisionBase extends Sim {
  constructor(ctx, defs) {
    super(ctx, defs, ['stick']);
    this.legend = [[COLORS.momentum, 'زخم كل عربة'], ['#ffffff', 'الزخم الكلي (ثابت)']];
    const M = this.M;
    const holes = canvasTex(1024, 64, (g, w, h) => { g.fillStyle = '#c9d0db'; g.fillRect(0, 0, w, h); g.fillStyle = '#5b6372'; for (let x = 8; x < w; x += 16) for (const y of [20, 44]) { g.beginPath(); g.arc(x, y, 3, 0, TAU); g.fill(); } });
    const rail = mesh(rbox(6, 0.1, 0.3, 0.03), M.brushed); rail.position.set(0, 0.7, 0.2);
    const top = new THREE.Mesh(new THREE.PlaneGeometry(5.9, 0.22), new THREE.MeshStandardMaterial({ map: holes, roughness: 0.3, metalness: 0.7 })); top.rotation.x = -Math.PI / 2; top.position.set(0, 0.751, 0.2);
    for (const z of [0.04, 0.36]) { const l = new THREE.Mesh(new THREE.BoxGeometry(5.9, 0.012, 0.012), M.led('#ff4fd8', 2.2)); l.position.set(0, 0.66, z); this.root.add(l); }
    for (const x of [-2.7, 2.7]) { const l = mesh(rbox(0.12, 0.66, 0.36, 0.04), M.graphite); l.position.set(x, 0.33, 0.2); this.root.add(l); }
    for (const x of [-3.02, 3.02]) { const st = mesh(rbox(0.07, 0.3, 0.42, 0.03), M.chrome); st.position.set(x, 0.85, 0.2); this.root.add(st); }
    this.root.add(rail, top);
    this.carts = ['#3f8fe0', '#e0613f'].map((c, i) => {
      const g = new THREE.Group();
      const body = mesh(rbox(1, 0.16, 0.34, 0.05), M.paint(c)); const canopy = mesh(rbox(0.7, 0.09, 0.24, 0.04), M.glassTint('#d9ecff')); canopy.position.y = 0.12;
      const strip = new THREE.Mesh(new THREE.BoxGeometry(1, 0.012, 0.012), M.led(c, 2.6)); strip.position.set(0, -0.05, 0.175);
      const bump = [-0.5, 0.5].map((x) => { const b = mesh(new THREE.SphereGeometry(0.05, 16, 12), M.chrome); b.position.x = x; return b; });
      g.add(body, canopy, strip, ...bump); g.userData.body = [body, canopy, strip]; g.userData.bump = bump; this.root.add(g);
      const lab = textSprite(i ? 'B' : 'A', { color: '#ffffff', size: 0.16, italic: false }); lab.position.y = 0.32; g.add(lab);
      return g;
    });
    this.pa = [new Arrow(COLORS.momentum, { label: 'p', sub: 'A' }), new Arrow(COLORS.momentum, { label: 'p', sub: 'B' })];
    this.pt = new Arrow('#ffffff', { label: 'p', sub: 'total', radius: 0.035 });
    [...this.pa, this.pt].forEach((a) => this.root.add(a));
    this.ctrails = [this.trail(this.root, '#3f8fe0', 100, 0.03), this.trail(this.root, '#e0613f', 100, 0.03)];
    this.resetRun();
  }
  graph() { const s = this.state; return s && [{ label: 'p_A', value: s.pA, color: '#3f8fe0' }, { label: 'p_B', value: s.pB, color: '#e0613f' }, { label: 'الزخم الكلي', value: s.tot, color: '#ffffff' }]; }
  onParam() { this.resetRun(); }
  resetRun() { this.x = [-1.7, 0.9]; this.v = null; this.joined = false; this.time = 0; this.clearTrails?.(); }
  update(dt) {
    const { mA, mB, stick } = this.p;
    if (!this.v) this.v = [this.target.vA * 0.35, this.target.vB * 0.35];
    const w = [0.3 + 0.1 * mA, 0.3 + 0.1 * mB];
    this.time += dt; this.x[0] += this.v[0] * dt; this.x[1] += this.v[1] * dt;
    if (!this.joined && this.x[0] + w[0] / 2 >= this.x[1] - w[1] / 2 && this.v[0] > this.v[1]) {
      if (stick >= 0.5) { const v = (mA * this.v[0] + mB * this.v[1]) / (mA + mB); this.v = [v, v]; this.joined = true; }
      else { const [u1, u2] = this.v; this.v = [((mA - mB) * u1 + 2 * mB * u2) / (mA + mB), ((mB - mA) * u2 + 2 * mA * u1) / (mA + mB)]; }
      const overlap = this.x[0] + w[0] / 2 - (this.x[1] - w[1] / 2); this.x[0] -= overlap / 2; this.x[1] += overlap / 2;
    }
    if (this.time > 6 || this.x[0] - w[0] / 2 < -3 || this.x[1] + w[1] / 2 > 3) this.resetRun();
    this.ctrails?.forEach((t, i) => t.push(V(this.x[i], 0.78, 0.42)));
    this.carts.forEach((c, i) => { c.position.set(this.x[i], 0.86, 0.2); c.userData.body.forEach((b) => (b.scale.x = w[i])); c.userData.bump[0].position.x = -w[i] / 2; c.userData.bump[1].position.x = w[i] / 2; });
    const real = [this.v[0] / 0.35, this.v[1] / 0.35]; const pl = (p) => vlen(p, 10, 1.0);
    this.pa[0].set(V(this.x[0], 1.25, 0.2), V(pl(mA * real[0]), 0, 0));
    this.pa[1].set(V(this.x[1], 1.55, 0.2), V(pl(mB * real[1]), 0, 0));
    const tot = mA * real[0] + mB * real[1];
    this.pt.set(V(0, 2.05, 0.2), V(pl(tot), 0, 0));
    this.state = { pA: mA * real[0], pB: mB * real[1], tot };
  }
  readout() {
    const s = this.state || {};
    return [['زخم A', plainNum(s.pA) + ' kg·m/s'], ['زخم B', plainNum(s.pB) + ' kg·m/s'], ['الزخم الكلي', plainNum(s.tot) + ' kg·m/s'], ['نوع التصادم', this.p.stick >= 0.5 ? 'التحام (غير مرن)' : 'مرن']];
  }
}
