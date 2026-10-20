// المحاكيات (2): الشغل، الآلات، الطاقة، الحرارة — نماذج عصرية
import * as THREE from 'three';
import { Arrow, COLORS, vlen, damp, textSprite, heatColor, canvasTex, rbox, lathe, mesh, weightGeo } from './kit.js';
import { Sim, darkGraph } from './sims_a.js';
import { plainNum } from '../fmt.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const g = 9.8, TAU = Math.PI * 2;

/** أعمدة طاقة على شكل أنابيب زجاجية مملوءة بسائل مضيء */
class EnergyTubes extends THREE.Group {
  constructor(M, items, { height = 1.6, gap = 0.36 } = {}) {
    super(); this.H = height; this.fills = [];
    const n = items.length, total = (n - 1) * gap;
    const base = mesh(rbox(total + 0.5, 0.1, 0.4, 0.04), M.graphite); base.position.y = 0.05; this.add(base);
    items.forEach(([color, label], i) => {
      const x = -total / 2 + i * gap;
      const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, height, 32, 1, true), M.glassTint('#e8f2ff')); shell.position.set(x, 0.1 + height / 2, 0);
      const cap = mesh(lathe([[0, 0], [0.13, 0], [0.13, 0.04], [0, 0.04]], 32), M.chrome); cap.position.set(x, 0.1 + height, 0);
      const fill = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 1, 24), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.3, roughness: 0.2, transparent: true, opacity: 0.92 }));
      fill.geometry.translate(0, 0.5, 0); fill.position.set(x, 0.1, 0);
      const s = textSprite(label, { color, size: 0.13, italic: false }); s.position.set(x, -0.1, 0.22);
      this.add(shell, cap, fill, s); this.fills.push(fill);
    });
  }
  set(values, max) { this.fills.forEach((b, i) => { b.scale.y = Math.max(0.001, Math.min(1, values[i] / Math.max(max, 1e-6)) * this.H); }); }
}

/* ════════ 4-1 الشغل: سحب حاوية ════════ */
export class WorkBase extends Sim {
  constructor(ctx, defs) {
    super(ctx, defs);
    this.legend = [[COLORS.force, 'قوة السحب F ومركبتاها'], [COLORS.weight, 'الاحتكاك f'], [COLORS.displacement, 'الإزاحة d']];
    const M = this.M;
    const ruler = canvasTex(2048, 128, (gg, w, h) => { gg.fillStyle = '#1b1f28'; gg.fillRect(0, 0, w, h); gg.fillStyle = '#ffd23f'; for (let k = 0; k <= 56; k++) { const x = k / 56 * w; gg.fillRect(x - 2, 0, 4, k % 5 === 0 ? 60 : 30); } gg.font = '600 34px "Plex Arabic", sans-serif'; gg.textAlign = 'center'; for (let k = 0; k <= 11; k++) gg.fillText(`${k}`, k / 11 * w, 108); });
    const mat = mesh(rbox(5.8, 0.04, 1.3, 0.02), M.graphite); mat.position.y = 0.02;
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 0.2), new THREE.MeshStandardMaterial({ map: ruler, roughness: 0.5, emissive: '#ffffff', emissiveMap: ruler, emissiveIntensity: 0.4 })); strip.rotation.x = -Math.PI / 2; strip.position.set(0, 0.042, 0.52);
    const ribTex = canvasTex(256, 256, (gg) => { gg.fillStyle = '#d9822b'; gg.fillRect(0, 0, 256, 256); for (let x = 0; x < 256; x += 32) { gg.fillStyle = 'rgba(0,0,0,.18)'; gg.fillRect(x, 0, 6, 256); gg.fillStyle = 'rgba(255,255,255,.12)'; gg.fillRect(x + 8, 0, 3, 256); } });
    this.crate = mesh(rbox(0.6, 0.55, 0.55, 0.05), new THREE.MeshPhysicalMaterial({ map: ribTex, roughness: 0.35, metalness: 0.4, clearcoat: 0.6 }));
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.02, 0.57), M.led('#5fe08a', 2.4)); band.position.y = 0.2; this.crate.add(band);
    this.rope = mesh(new THREE.CylinderGeometry(0.014, 0.014, 1, 10), M.anod('#e7d8b0', 0.7)); this.rope.geometry.translate(0, 0.5, 0);
    this.handle = mesh(new THREE.TorusGeometry(0.07, 0.02, 10, 28), M.chrome);
    this.root.add(mat, strip, this.crate, this.rope, this.handle);
    this.FA = new Arrow(COLORS.force, { label: 'F', radius: 0.032 });
    this.Fx = new Arrow(COLORS.force, { label: 'F cosθ', dashed: true, labelSize: 0.15 });
    this.Fy = new Arrow(COLORS.force, { label: 'F sinθ', dashed: true, labelSize: 0.15 });
    this.fA = new Arrow(COLORS.weight, { label: 'f' }); this.dA = new Arrow(COLORS.displacement, { label: 'd' });
    [this.FA, this.Fx, this.Fy, this.fA, this.dA].forEach((a) => this.root.add(a));
    this.u = 0; this.hold = 0;
  }
  graph() { const s = this.state; return s && [{ label: 'شغل قوة السحب (J)', value: s.WF, color: COLORS.force }, { label: 'شغل الاحتكاك (J)', value: s.Wf, color: COLORS.weight }]; }
  onParam() { this.u = 0; this.hold = 0; }
  update(dt) {
    const th = THREE.MathUtils.degToRad(this.p.theta), dvis = Math.min(this.p.d * 0.42, 4.2);
    if (this.u < 1) this.u = Math.min(1, this.u + dt / 3.2); else if ((this.hold += dt) > 1.2) { this.u = 0; this.hold = 0; }
    const x0 = -2.4, x = x0 + dvis * this.u;
    this.crate.position.set(x, 0.315, 0);
    const att = V(x + 0.3, 0.42, 0); const rl = 1.25; const rd = V(Math.cos(th), Math.sin(th), 0);
    this.rope.position.copy(att); this.rope.quaternion.setFromUnitVectors(V(0, 1, 0), rd); this.rope.scale.y = rl;
    this.handle.position.copy(att.clone().add(rd.clone().multiplyScalar(rl))); this.handle.rotation.y = Math.PI / 2;
    const L = (F) => Math.abs(vlen(F, 200, 0.9)); const front = V(x, 0.31, 0.36);
    this.FA.set(front, rd.clone().multiplyScalar(L(this.p.F)));
    this.Fx.set(front, V(L(this.p.F) * Math.cos(th), 0, 0));
    this.Fy.set(front.clone().add(V(L(this.p.F) * Math.cos(th), 0, 0)), V(0, L(this.p.F) * Math.sin(th), 0));
    this.fA.set(V(x - 0.3, 0.08, 0.36), V(-L(this.p.f), 0, 0));
    this.dA.set(V(x0, 0.08, 0.66), V(dvis * this.u, 0, 0));
    const s = this.p.d * this.u;
    this.state = { WF: this.p.F * Math.cos(th) * s, Wf: -this.p.f * s, Fx: this.p.F * Math.cos(th), s };
  }
  readout() {
    const s = this.state || {};
    return [['الإزاحة المقطوعة d', plainNum(s.s) + ' m'], ['F cosθ', plainNum(s.Fx) + ' N'], ['شغل قوة السحب', plainNum(s.WF) + ' J'], ['شغل الاحتكاك', plainNum(s.Wf) + ' J']];
  }
}

/* ════════ 4-2 الرافعة ════════ */
export class LeverBase extends Sim {
  constructor(ctx, defs) {
    super(ctx, defs);
    this.legend = [[COLORS.force, 'القوة المسلّطة Fe'], [COLORS.weight, 'قوة المقاومة Fr'], [COLORS.displacement, 'الإزاحتان de و dr']];
    const M = this.M;
    this.fulcrum = mesh(lathe([[0, 0], [0.5, 0], [0.52, 0.04], [0.26, 0.2], [0.1, 0.72], [0, 0.78]], 3), M.anod('#e08a4a', 0.3)); this.fulcrum.rotation.y = Math.PI / 6;
    this.bar = new THREE.Group();
    this.plank = mesh(rbox(1, 0.09, 0.26, 0.04), M.brushed); this.bar.add(this.plank);
    this.edge = new THREE.Mesh(new THREE.BoxGeometry(1, 0.012, 0.012), M.led('#e08a4a', 2.4)); this.edge.position.set(0, -0.045, 0.135); this.bar.add(this.edge);
    this.load = mesh(weightGeo(), M.graphite); this.bar.add(this.load);
    this.grip = mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.34, 20), M.paint('#e8513a')); this.grip.rotation.x = Math.PI / 2; this.bar.add(this.grip);
    this.root.add(this.fulcrum, this.bar);
    this.Fe = new Arrow(COLORS.force, { label: 'F', sub: 'e', radius: 0.032 }); this.Fr = new Arrow(COLORS.weight, { label: 'F', sub: 'r', radius: 0.032 });
    this.de = new Arrow(COLORS.displacement, { label: 'd', sub: 'e', radius: 0.018 }); this.dr = new Arrow(COLORS.displacement, { label: 'd', sub: 'r', radius: 0.018 });
    [this.Fe, this.Fr, this.de, this.dr].forEach((a) => this.root.add(a));
  }
  graph() { const s = this.state; return s && [{ label: 'Fe (N)', value: s.Fe, color: COLORS.force }, { label: 'Fr (N)', value: s.Fr, color: COLORS.weight }]; }
  update(dt) {
    const { le, lr, load, eff } = this.p; const k = 4.6 / (le + lr);
    const L1 = lr * k, L2 = le * k, cx = (L1 - L2) / 2;
    this.fulcrum.position.set(cx, 0, 0); this.bar.position.set(cx, 0.83, 0);
    this.plank.scale.x = L1 + L2; this.plank.position.x = (L2 - L1) / 2; this.edge.scale.x = L1 + L2; this.edge.position.x = this.plank.position.x;
    const s = 0.28 + 0.2 * Math.cbrt(load / 20); this.load.scale.setScalar(s); this.load.position.set(-L1 + s * 0.6, 0.045, 0);
    this.grip.position.set(L2 - 0.12, 0.08, 0);
    const A = 0.16; const ang = -A * (0.5 - 0.5 * Math.cos(this.t * 1.3)); this.bar.rotation.z = ang;
    this.bar.updateMatrixWorld(true);
    const toRoot = (v) => this.bar.localToWorld(v.clone()).sub(this.root.getWorldPosition(V())).divideScalar(this.root.scale.x);
    const IMA = le / lr, MA = (eff / 100) * IMA, Fr = load * g, Fe = Fr / MA;
    const FL = (F) => Math.abs(vlen(F, 600, 0.9));
    this.Fe.set(toRoot(V(L2 - 0.12, 0.15, 0)).add(V(0, FL(Fe) + 0.05, 0.22)), V(0, -FL(Fe), 0));
    this.Fr.set(toRoot(V(-L1 + s * 0.6, 0.05 + s * 0.5, 0)).add(V(0, 0, 0.32)), V(0, -FL(Fr), 0));
    this.de.set(V(cx + L2 + 0.2, 0.83, 0), V(0, -L2 * Math.sin(A), 0));
    this.dr.set(V(cx - L1 - 0.2, 0.83, 0), V(0, L1 * Math.sin(A), 0));
    this.state = { IMA, MA, Fe, Fr };
  }
  readout() {
    const s = this.state || {};
    return [['IMA = de/dr', plainNum(s.IMA)], ['MA = Fr/Fe', plainNum(s.MA)], ['قوة المقاومة Fr', plainNum(s.Fr) + ' N'], ['القوة المسلّطة Fe', plainNum(s.Fe) + ' N']];
  }
}

/* ════════ 5-1 أشكال الطاقة: برج إسقاط ودولاب ════════ */
export class FormsBase extends Sim {
  constructor(ctx, defs) {
    super(ctx, defs);
    this.legend = [['#4c8dff', 'طاقة الوضع PE'], [COLORS.velocity, 'الطاقة الحركية KE'], [COLORS.torque, 'الحركية الدورانية'], [COLORS.velocity, 'متجه السرعة']];
    const M = this.M; this.S = 0.55;
    const tower = mesh(rbox(0.16, 2.5, 0.16, 0.05), M.graphite); tower.position.set(-2.1, 1.25, -0.2);
    for (let k = 0; k <= 4; k++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.014, 0.02), M.led('#b48cf0', 2.2)); t.position.set(-1.96, k * this.S + 0.02, -0.12); this.root.add(t); const lab = textSprite(`${k} m`, { size: 0.11, italic: false }); lab.position.set(-2.42, k * this.S + 0.03, -0.12); this.root.add(lab); }
    this.platform = mesh(rbox(0.42, 0.04, 0.42, 0.02), M.chrome);
    this.ball = mesh(new THREE.SphereGeometry(1, 40, 28), M.paint('#e8513a', 0.2));
    const pad = mesh(lathe([[0, 0], [0.34, 0], [0.36, 0.02], [0.3, 0.05], [0, 0.05]], 48), M.graphite); pad.position.set(-1.6, 0, 0);
    this.root.add(tower, this.platform, this.ball, pad);
    this.bars = new EnergyTubes(M, [['#4c8dff', 'PE'], [COLORS.velocity, 'KE'], ['#ffffff', 'E'], [COLORS.torque, 'KEᵣₒₜ']]); this.bars.position.set(0.25, 0, -0.7); this.root.add(this.bars);
    const stand = mesh(rbox(0.12, 1.1, 0.42, 0.04), M.graphite); stand.position.set(2.15, 0.55, 0);
    this.fly = new THREE.Group();
    const disc = mesh(lathe([[0, -0.07], [0.5, -0.07], [0.52, -0.05], [0.52, 0.05], [0.5, 0.07], [0.15, 0.07], [0.12, 0.1], [0, 0.1]], 64), M.brushed); disc.rotation.z = Math.PI / 2;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.015, 8, 64), M.led('#c77dff', 2.6)); ring.rotation.y = Math.PI / 2; ring.position.x = -0.075;
    const mark = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.05), M.led('#ffffff', 2)); mark.position.set(-0.075, 0.25, 0);
    this.fly.add(disc, ring, mark); this.fly.position.set(2.0, 1.1, 0); this.root.add(stand, this.fly);
    this.vA = new Arrow(COLORS.velocity, { label: 'v' }); this.root.add(this.vA);
    this.phase = 0; this.tt = 0; this.ang = 0;
    this.ftrail = this.trail(this.root, '#ff8a6b', 60, 0.04);
  }
  graph() { const s = this.state; return s && [{ label: 'PE', value: s.PE, color: '#4c8dff' }, { label: 'KE', value: s.KE, color: COLORS.velocity }]; }
  onParam() { this.phase = 0; this.tt = 0; }
  update(dt) {
    const { m, h, I, omega } = this.p; const r = 0.08 + 0.05 * Math.cbrt(m);
    this.tt += dt; let y = h, v = 0;
    const tf = Math.sqrt(2 * h / g) * 1.6;
    if (this.phase === 0) { if (this.tt > 0.9) { this.phase = 1; this.tt = 0; } }
    else if (this.phase === 1) { const t = this.tt / 1.6; y = Math.max(0, h - 0.5 * g * t * t); if (this.tt >= tf) { this.phase = 2; this.tt = 0; } }
    else { y = 0; if (this.tt > 0.8) { this.phase = 0; this.tt = 0; } }
    if (this.phase === 1) v = Math.sqrt(Math.max(0, 2 * g * (h - y)));
    this.platform.position.set(-1.6, h * this.S - 0.02, 0); this.platform.visible = this.phase === 0;
    this.ball.scale.setScalar(r); this.ball.position.set(-1.6, y * this.S + r + 0.05, 0);
    if (this.phase === 0) this.ftrail.clear(); else this.ftrail.push(this.ball.position.clone());
    this.vA.set(V(-1.6 + r + 0.05, y * this.S + r, 0.1), V(0, -Math.abs(vlen(v, 6, 0.8)), 0));
    this.ang += Math.min(omega, 25) * dt; this.fly.rotation.x = -this.ang;
    const PE = m * g * y, KE = this.phase === 1 ? m * g * (h - y) : 0, KR = 0.5 * I * omega * omega, E = this.phase === 2 ? 0 : m * g * h;
    this.bars.set([PE, KE, E, KR], Math.max(m * g * h, KR) * 1.05);
    this.state = { PE, KE, KR, v };
  }
  readout() {
    const s = this.state || {};
    return [['طاقة الوضع mgh', plainNum(s.PE) + ' J'], ['الطاقة الحركية ½mv²', plainNum(s.KE) + ' J'], ['السرعة v', plainNum(s.v) + ' m/s'], ['الدورانية ½Iω²', plainNum(s.KR) + ' J']];
  }
}

/* ════════ 5-2 مسار الأفعوانية ════════ */
export class RampBase extends Sim {
  constructor(ctx, defs) {
    super(ctx, defs);
    this.legend = [['#4c8dff', 'PE'], [COLORS.velocity, 'KE ومتجه السرعة'], [COLORS.weight, 'طاقة مفقودة (حرارة)']];
    this.prof = [[0, 1], [0.08, 0.95], [0.22, 0.32], [0.34, 0.03], [0.46, 0.28], [0.58, 0.6], [0.7, 0.3], [0.82, 0.06], [0.93, 0.45], [1, 0.92]];
    this.trackGroup = new THREE.Group(); this.root.add(this.trackGroup);
    this.ball = mesh(new THREE.SphereGeometry(0.11, 40, 28), this.M.chrome); this.root.add(this.ball);
    this.glow = new THREE.PointLight('#9b6bff', 2, 1.5, 2); this.ball.add(this.glow);
    this.vA = new Arrow(COLORS.velocity, { label: 'v' }); this.root.add(this.vA);
    this.bars = new EnergyTubes(this.M, [['#4c8dff', 'PE'], [COLORS.velocity, 'KE'], [COLORS.weight, 'Q'], ['#ffffff', 'E']], { height: 1.1, gap: 0.3 });
    this.bars.position.set(0, 2.25, -0.75); this.root.add(this.bars);
    this.built = -1; this.s = 0; this.dir = 1; this.H = null; this.rest = 0;
    this.rtrail = this.trail(this.root, '#c9a7ff', 120, 0.04);
  }
  graph() { const s = this.state; return s && [{ label: 'PE', value: s.PE, color: '#4c8dff' }, { label: 'KE', value: s.KE, color: COLORS.velocity }, { label: 'المجموع', value: s.PE + s.KE + s.Q, color: '#ffffff' }]; }
  build(hv) {
    this.trackGroup.traverse((o) => o.geometry?.dispose?.()); this.trackGroup.clear();
    const pts = this.prof.map(([u, f]) => V(-2.8 + 5.6 * u, 0.3 + f * hv, 0));
    this.curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    for (const z of [-0.09, 0.09]) {
      const c = new THREE.CatmullRomCurve3(pts.map((p) => p.clone().setZ(z)), false, 'centripetal');
      this.trackGroup.add(mesh(new THREE.TubeGeometry(c, 220, 0.024, 10), this.M.chrome));
    }
    const under = new THREE.CatmullRomCurve3(pts.map((p) => p.clone().add(V(0, -0.05, 0))), false, 'centripetal');
    this.trackGroup.add(new THREE.Mesh(new THREE.TubeGeometry(under, 220, 0.012, 6), this.M.led('#9b6bff', 2.4)));
    for (let i = 0; i <= 14; i++) {
      const p = this.curve.getPointAt(i / 14);
      const post = mesh(new THREE.CylinderGeometry(0.022, 0.03, p.y - 0.06, 10), this.M.graphite); post.position.set(p.x, (p.y - 0.06) / 2, -0.13); this.trackGroup.add(post);
      const tie = mesh(rbox(0.04, 0.03, 0.26, 0.01), this.M.graphite); tie.position.set(p.x, p.y - 0.04, 0); this.trackGroup.add(tie);
    }
    this.N = 400; this.len = this.curve.getLength(); this.samples = this.curve.getSpacedPoints(this.N);
    this.minY = Math.min(...this.samples.map((p) => p.y));
  }
  onParam(k) { if (k === 'h' || k === 'mu') { this.s = 0; this.dir = 1; this.H = null; } }
  update(dt) {
    const hv = this.p.h * 0.42;
    if (Math.abs(hv - this.built) > 0.02) { this.build(hv); this.built = hv; this.s = 0; this.H = null; }
    const k = 0.42; const yReal = (vis) => (vis - 0.3) / k;
    if (this.H === null) { this.H = this.p.h; this.lost = 0; this.dir = 1; this.s = 0; }
    const i = Math.round(this.s * this.N); const p = this.samples[Math.max(0, Math.min(this.N, i))];
    const y = yReal(p.y); const v = Math.sqrt(Math.max(0, 2 * g * (this.H - y)));
    const ds = (v * k * dt) / this.len;
    let ns = this.s + this.dir * Math.max(ds, 0.0004);
    const ny = yReal(this.samples[Math.max(0, Math.min(this.N, Math.round(ns * this.N)))].y);
    if (ny > this.H || ns <= 0 || ns >= 1) { this.dir *= -1; ns = Math.max(0, Math.min(1, this.s)); }
    if (this.p.mu > 0) { const dl = Math.abs(ns - this.s) * this.len / k; this.H -= this.p.mu * 0.25 * dl; this.lost = this.p.h - this.H; }
    this.s = ns;
    if (v < 0.05 && this.H - yReal(this.minY) < 0.03) { this.rest += dt; if (this.rest > 1.5) { this.H = null; this.rest = 0; } } else this.rest = 0;
    const pos = this.curve.getPointAt(this.s); const tan = this.curve.getTangentAt(this.s);
    this.ball.position.copy(pos).add(V(0, 0.13, 0)); this.ball.rotation.z -= this.dir * v * k * dt / 0.11; this.rtrail.push(this.ball.position);
    this.vA.set(pos.clone().add(V(0, 0.13, 0.15)), tan.clone().multiplyScalar(this.dir * Math.abs(vlen(v, 8, 0.8))));
    const m = this.p.m, E0 = m * g * this.p.h;
    const PE = m * g * yReal(pos.y), KE = Math.max(0, m * g * (this.H ?? this.p.h) - PE), Q = m * g * (this.lost || 0);
    this.bars.set([PE, KE, Q, PE + KE + Q], E0 * 1.02);
    this.state = { PE, KE, Q, v };
  }
  readout() {
    const s = this.state || {};
    return [['طاقة الوضع PE', plainNum(s.PE) + ' J'], ['الطاقة الحركية KE', plainNum(s.KE) + ' J'], ['المجموع PE + KE + Q', plainNum(s.PE + s.KE + s.Q) + ' J'], ['السرعة v', plainNum(s.v) + ' m/s']];
  }
}

/* ════════ جسيمات مضيئة ════════ */
class Particles {
  constructor(n, radius, box) {
    this.n = n; this.box = box;
    this.mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(radius, 12, 8), new THREE.MeshStandardMaterial({ roughness: 0.25, metalness: 0.1, emissive: '#ffffff', emissiveIntensity: 0.35 }), n);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.p = []; this.v = []; this.m4 = new THREE.Matrix4(); this.c = new THREE.Color();
    for (let i = 0; i < n; i++) { this.p.push(V((Math.random() - 0.5) * box.x, (Math.random() - 0.5) * box.y, (Math.random() - 0.5) * box.z)); this.v.push(V().randomDirection()); this.mesh.setColorAt(i, this.c.set('#fff')); }
  }
  step(dt, speed, color, bounds = this.box, round = false) {
    const hx = bounds.x / 2, hy = bounds.y / 2, hz = bounds.z / 2;
    for (let i = 0; i < this.n; i++) {
      const p = this.p[i], v = this.v[i];
      p.addScaledVector(v, speed * dt);
      if (round) { const rr = Math.hypot(p.x, p.z); if (rr > hx) { p.x *= hx / rr; p.z *= hx / rr; const nx = p.x / hx, nz = p.z / hx; const d = v.x * nx + v.z * nz; v.x -= 2 * d * nx; v.z -= 2 * d * nz; } }
      else { if (p.x > hx || p.x < -hx) { v.x *= -1; p.x = THREE.MathUtils.clamp(p.x, -hx, hx); } if (p.z > hz || p.z < -hz) { v.z *= -1; p.z = THREE.MathUtils.clamp(p.z, -hz, hz); } }
      if (p.y > hy || p.y < -hy) { v.y *= -1; p.y = THREE.MathUtils.clamp(p.y, -hy, hy); }
      this.m4.makeTranslation(p.x, p.y, p.z); this.mesh.setMatrixAt(i, this.m4);
      if (color) this.mesh.setColorAt(i, color);
    }
    this.mesh.instanceMatrix.needsUpdate = true; if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

/** شاشة رقمية صغيرة (عدّاد حرارة) */
function lcd(M, w = 0.5, h = 0.22) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 112;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const g0 = new THREE.Group(); const bez = mesh(rbox(w + 0.05, h + 0.05, 0.04, 0.015), M.graphite, false);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); face.position.z = 0.022; g0.add(bez, face);
  g0.draw = (txt, color) => { const g2 = cv.getContext('2d'); g2.fillStyle = '#05080f'; g2.fillRect(0, 0, 256, 112); g2.fillStyle = color; g2.font = '700 64px monospace'; g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.fillText(txt, 128, 60); tex.needsUpdate = true; };
  return g0;
}

/* ════════ 6-1 حجرتان في تماس حراري ════════ */
export class Thermal extends Sim {
  constructor(ctx, defs) {
    super(ctx, defs);
    this.legend = [['#ff4d5e', 'جسيمات ساخنة (أسرع)'], ['#4c8dff', 'جسيمات باردة (أبطأ)'], [COLORS.force, 'اتجاه انتقال الحرارة']];
    const M = this.M; const n = ctx.quality.high ? 50 : 30;
    const capGeo = lathe([[0, 0], [0.58, 0], [0.6, 0.03], [0.6, 0.1], [0.56, 0.12], [0, 0.12]], 64);
    this.cells = [-1, 1].map((sd, i) => {
      const grp = new THREE.Group(); grp.position.set(sd * 1.05, 0, 0);
      const bottom = mesh(capGeo, M.brushed); const top = mesh(capGeo, M.brushed); top.position.y = 1.62; top.rotation.x = Math.PI; top.position.y = 1.74;
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 1.5, 48, 1, true), M.glassTint('#e6f3ff')); glass.position.y = 0.87;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.012, 8, 72), M.led(i ? '#4c8dff' : '#ff4d5e', 2.4)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.06;
      const parts = new Particles(n, 0.035, V(0.84, 1.36, 0.84)); parts.mesh.position.y = 0.87;
      const screen = lcd(M); screen.position.set(0, 2.05, 0.1);
      grp.add(bottom, top, glass, ring, parts.mesh, screen); this.root.add(grp);
      const lab = textSprite(i ? 'B' : 'A', { size: 0.18, italic: false }); lab.position.set(sd * 1.05, 2.4, 0); this.root.add(lab);
      return { parts, ring, screen };
    });
    const bridge = mesh(rbox(0.9, 0.14, 0.14, 0.04), M.anod('#d4824a', 0.22)); bridge.position.set(0, 0.87, 0); this.root.add(bridge);
    this.flow = new Arrow(COLORS.force, { label: 'Q' }); this.root.add(this.flow);
    this.restart(); this.lcdT = 0;
  }
  graph() { return [{ label: 'حرارة A (°C)', value: this.TA, color: '#ff4d5e' }, { label: 'حرارة B (°C)', value: this.TB, color: '#4c8dff' }]; }
  onParam() { this.restart(); }
  restart() { this.TA = this.target.TA; this.TB = this.target.TB; this.eq = 0; }
  update(dt) {
    const CA = this.p.mA * this.p.CA, CB = this.p.mB * this.p.CB;
    const k = 0.45 * (CA * CB) / (CA + CB);
    const q = k * (this.TA - this.TB) * dt; this.TA -= q / CA; this.TB += q / CB;
    if (Math.abs(this.TA - this.TB) < 0.3) { if ((this.eq += dt) > 2.5) this.restart(); }
    const Tf = (CA * this.target.TA + CB * this.target.TB) / (CA + CB);
    const c = new THREE.Color();
    [this.TA, this.TB].forEach((T, i) => { const cell = this.cells[i]; heatColor((T + 10) / 260, c); cell.parts.step(dt, 0.55 * Math.sqrt((T + 273) / 300), c, V(0.84, 1.36, 0.84), true); cell.ring.material.color.copy(c).multiplyScalar(2.4); });
    this.lcdT += dt; if (this.lcdT > 0.25) { this.lcdT = 0; this.cells.forEach((cell, i) => { const T = i ? this.TB : this.TA; cell.screen.draw(`${T.toFixed(1)}°C`, '#' + heatColor((T + 10) / 260).getHexString()); }); }
    const d = this.TA - this.TB;
    this.flow.set(V(-Math.sign(d) * 0.3, 1.15, 0.1), V(Math.sign(d) * Math.max(0.05, Math.abs(vlen(d, 40, 0.5))), 0, 0));
    this.state = { TA: this.TA, TB: this.TB, Tf };
  }
  readout() {
    const s = this.state || {};
    return [['حرارة A', plainNum(s.TA) + ' °C'], ['حرارة B', plainNum(s.TB) + ' °C'], ['حرارة الاتزان المتوقعة', plainNum(s.Tf) + ' °C'], ['بالكلفن (A)', plainNum(s.TA + 273) + ' K']];
  }
}

/* ════════ 6-2 تحولات الحالة + المكبس ════════ */
export class Phase extends Sim {
  constructor(ctx, defs) {
    super(ctx, defs);
    this.legend = [['#9fd4ff', 'جزيئات الماء'], [COLORS.force, 'الحرارة Q'], [COLORS.displacement, 'الشغل W']];
    const M = this.M; const n = ctx.quality.high ? 64 : 40; this.n = n;
    const beaker = new THREE.Mesh(lathe([[0.5, 0], [0.53, 0.02], [0.55, 1.25], [0.6, 1.3], [0.62, 1.3]], 64), M.glassTint('#eef7ff')); beaker.position.set(-0.9, 0.36, 0);
    const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.5, 48), M.glassTint('#eef7ff')); bottom.rotation.x = -Math.PI / 2; bottom.position.set(-0.9, 0.365, 0);
    const marks = new THREE.Group(); for (let k = 1; k <= 5; k++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.008, 0.005), M.led('#ffffff', 1.2)); t.position.set(-0.9, 0.36 + k * 0.2, 0.545); marks.add(t); }
    this.plate = mesh(lathe([[0, 0], [0.66, 0], [0.7, 0.04], [0.68, 0.3], [0.62, 0.34], [0, 0.34]], 64), M.graphite); this.plate.position.set(-0.9, 0, 0);
    this.coil = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.025, 10, 64), new THREE.MeshStandardMaterial({ color: '#221', emissive: '#ff5a1f', emissiveIntensity: 0 }));
    this.coil.rotation.x = Math.PI / 2; this.coil.position.set(-0.9, 0.345, 0);
    this.root.add(beaker, bottom, marks, this.plate, this.coil);
    this.parts = new Particles(n, 0.045, V(0.7, 1.1, 0.7)); this.parts.mesh.position.set(-0.9, 0.95, 0); this.root.add(this.parts.mesh);
    this.lattice = []; const side = Math.ceil(Math.cbrt(n));
    for (let i = 0; i < n; i++) { const a = i % side, b = Math.floor(i / side) % side, c = Math.floor(i / side / side); this.lattice.push(V((a - (side - 1) / 2) * 0.13, -0.47 + c * 0.13, (b - (side - 1) / 2) * 0.13)); }
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 1.4, 48, 1, true), M.glassTint('#f3f7ff')); cyl.position.set(1.25, 1.0, 0);
    this.piston = mesh(lathe([[0, -0.05], [0.34, -0.05], [0.35, -0.03], [0.35, 0.03], [0.34, 0.05], [0, 0.05]], 48), M.chrome);
    this.pistonRing = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.01, 8, 48), M.led('#ffd23f', 2.4)); this.pistonRing.rotation.x = Math.PI / 2;
    this.rod = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 12), M.chrome);
    const cbase = mesh(lathe([[0, 0], [0.45, 0], [0.48, 0.04], [0.42, 0.3], [0, 0.3]], 48), M.graphite); cbase.position.set(1.25, 0, 0);
    this.gas = new Particles(ctx.quality.high ? 30 : 18, 0.03, V(0.5, 0.5, 0.5)); this.root.add(this.gas.mesh);
    this.root.add(cyl, this.piston, this.pistonRing, this.rod, cbase);
    this.QA = new Arrow(COLORS.force, { label: 'Q' }); this.WA = new Arrow(COLORS.displacement, { label: 'W' }); this.root.add(this.QA, this.WA);
    this.gfx = darkGraph(1024, 520); const scr = this.holoScreen(2.3, 1.17, this.gfx.tex); scr.position.set(0.1, 2.35, -0.95); this.root.add(scr);
    this.c = new THREE.Color(); this.lastT = null;
  }
  graph() { return [{ label: 'ΔU (J)', value: this.p.Q - this.p.W, color: COLORS.displacement }, { label: 'T (°C)', value: this.p.T * 20, color: '#7fd3ff' }]; }
  curvePos(T) {
    const segs = [[-40, 0, 82], [0, 0, 334], [0, 100, 418], [100, 100, 2260 * 0.35], [100, 140, 80]];
    const tot = segs.reduce((a, s) => a + s[2], 0); let acc = 0; const pts = [];
    for (const [a, b, q] of segs) { pts.push([acc / tot, a]); acc += q; pts.push([acc / tot, b]); }
    let x;
    if (T < 0) x = ((T + 40) / 40) * 82 / tot; else if (T === 0) x = (82 + 167) / tot; else if (T < 100) x = (82 + 334 + (T / 100) * 418) / tot;
    else if (T === 100) x = (82 + 334 + 418 + 395) / tot; else x = (tot - 80 + ((T - 100) / 40) * 80) / tot;
    return { pts, x };
  }
  drawCurve(T) {
    const g2 = this.gfx.begin(), W = 1024, H = 520; const { pts, x } = this.curvePos(T);
    const ox = 100, oy = H - 70, w = W - 150, h = H - 150; const ty = (t) => oy - ((t + 40) / 180) * h;
    g2.strokeStyle = '#a6aecb'; g2.lineWidth = 3; g2.beginPath(); g2.moveTo(ox, 30); g2.lineTo(ox, oy); g2.lineTo(ox + w, oy); g2.stroke();
    g2.strokeStyle = '#7fd3ff'; g2.lineWidth = 7; g2.shadowColor = '#7fd3ff'; g2.shadowBlur = 16; g2.beginPath(); pts.forEach(([u, t], i) => (i ? g2.lineTo(ox + u * w, ty(t)) : g2.moveTo(ox + u * w, ty(t)))); g2.stroke(); g2.shadowBlur = 0;
    g2.fillStyle = '#ff4d5e'; g2.shadowColor = '#ff4d5e'; g2.shadowBlur = 20; g2.beginPath(); g2.arc(ox + x * w, ty(T), 16, 0, 7); g2.fill(); g2.shadowBlur = 0;
    g2.fillStyle = '#ffffff'; g2.font = '600 26px "Plex Arabic", sans-serif'; g2.textAlign = 'right';
    [[0, '0 °C'], [100, '100 °C']].forEach(([t, s]) => g2.fillText(s, ox - 10, ty(t) + 8));
    g2.direction = 'rtl'; g2.textAlign = 'center'; g2.font = '600 32px "Plex Arabic", sans-serif';
    g2.fillText('منحنى التسخين: درجة الحرارة مقابل الحرارة المضافة', W / 2, 36);
    g2.font = '500 26px "Plex Arabic", sans-serif'; g2.fillStyle = '#a6aecb';
    g2.fillText('انصهار (Q = mHf)', ox + w * 0.2, ty(0) - 22); g2.fillText('غليان (Q = mHv)', ox + w * 0.68, ty(100) - 22);
    this.gfx.tex.needsUpdate = true;
  }
  update(dt) {
    const T = Math.round(this.target.T * 10) / 10; const Tp = this.p.T;
    if (T !== this.lastT) { this.drawCurve(T); this.lastT = T; }
    const st = Tp < -0.5 ? 'solid' : Tp < 0.5 ? 'melt' : Tp < 99.5 ? 'liquid' : Tp < 100.5 ? 'boil' : 'gas';
    this.coil.material.emissiveIntensity = THREE.MathUtils.clamp((Tp + 40) / 90, 0.1, 3);
    const P = this.parts; const speed = 0.25 * Math.sqrt((Tp + 273) / 273);
    for (let i = 0; i < this.n; i++) {
      const half = i % 2 === 0;
      const mode = st === 'solid' ? 's' : st === 'melt' ? (half ? 's' : 'l') : st === 'liquid' ? 'l' : st === 'boil' ? (half ? 'l' : 'g') : 'g';
      const p = P.p[i], v = P.v[i];
      if (mode === 's') { const L = this.lattice[i]; const a = 0.006 + 0.012 * (Tp + 40) / 40; p.set(L.x + (Math.random() - 0.5) * a, L.y + (Math.random() - 0.5) * a, L.z + (Math.random() - 0.5) * a); this.c.set('#cfeaff'); }
      else {
        const top = mode === 'l' ? -0.05 : 0.55, sp = mode === 'l' ? speed * 0.9 : speed * 3.2;
        v.x += (Math.random() - 0.5) * 0.6; v.y += (Math.random() - 0.5) * 0.6 + (mode === 'l' ? -0.05 : 0); v.z += (Math.random() - 0.5) * 0.6; v.normalize();
        p.addScaledVector(v, sp * dt);
        const rr = Math.hypot(p.x, p.z); if (rr > 0.45) { p.x *= 0.45 / rr; p.z *= 0.45 / rr; v.x *= -1; v.z *= -1; }
        if (p.y < -0.5) { p.y = -0.5; v.y = Math.abs(v.y); } if (p.y > top) { p.y = top; v.y = -Math.abs(v.y); }
        this.c.set(mode === 'l' ? '#3f8fe0' : '#eef4ff');
      }
      P.m4.makeTranslation(p.x, p.y, p.z); P.mesh.setMatrixAt(i, P.m4); P.mesh.setColorAt(i, this.c);
    }
    P.mesh.instanceMatrix.needsUpdate = true; P.mesh.instanceColor.needsUpdate = true;
    const { Q, W } = this.p; const dU = Q - W; const hp = 0.55 + (W / 3000) * 0.65;
    this.piston.position.set(1.25, 0.3 + hp, 0); this.pistonRing.position.copy(this.piston.position); this.rod.position.set(1.25, 0.3 + hp + 0.4, 0);
    this.gas.mesh.position.set(1.25, 0.3 + hp / 2, 0);
    this.gas.step(dt, 0.25 + Math.max(0, dU) / 2500, heatColor(0.3 + dU / 6000), V(0.6, hp - 0.08, 0.6), true);
    this.QA.set(V(1.25, -0.05, 0.5), V(0, Math.max(0.05, Math.abs(vlen(Q, 2500, 0.45))), 0));
    this.WA.set(V(1.25, 0.3 + hp + 0.82, 0), V(0, Math.max(0.05, Math.abs(vlen(W, 1500, 0.55))), 0));
    this.state = { T: Tp, st, dU };
  }
  readout() {
    const s = this.state || {}; const names = { solid: 'صلب (جليد)', melt: 'انصهار — الحرارة ثابتة', liquid: 'سائل', boil: 'غليان — الحرارة ثابتة', gas: 'غاز (بخار)' };
    return [['درجة الحرارة', plainNum(s.T) + ' °C'], ['الحالة', names[s.st] || ''], ['المكبس: Q − W', plainNum(this.p.Q) + ' − ' + plainNum(this.p.W)], ['ΔU', plainNum(s.dU) + ' J']];
  }
}
