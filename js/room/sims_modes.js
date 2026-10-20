// مشاهد إضافية للمحاكيات: لكل مسألة مشهد يطابق مثالها، وكل متغيراتها مربوطة بالمحاكاة
import * as THREE from 'three';
import { Arrow, COLORS, vlen, damp, dashedLine, textSprite, rbox, lathe, mesh, weightGeo } from './kit.js';
import { OrbitsBase, ImpulseBase, CollisionBase } from './sims_a.js';
import { WorkBase, LeverBase, FormsBase, RampBase } from './sims_b.js';
import { plainNum } from '../fmt.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const g = 9.8, TAU = Math.PI * 2;
const ease = (t) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t)));

/** يضيف دعم «المشهد» لأي محاكاة: إخفاء أجزاء المشهد الأساسي وإظهار مجموعة المشهد الحالي */
export function withModes(Base, nBase = 1) {
  return class extends Base {
    constructor(ctx, defs) {
      super(ctx, defs);
      this.discrete.add('mode'); this.baseParts = [...this.root.children]; this.groups = {}; this.curMode = -1; this.nBase = nBase;
    }
    get mode() { return Math.round(this.p.mode || 0); }
    /** المشاهد الأصلية للمحاكاة (قبل إضافة المشاهد الجديدة) */
    get isBase() { return this.mode < this.nBase; }
    group(m) { const gr = new THREE.Group(); gr.visible = false; this.root.add(gr); this.groups[m] = gr; return gr; }
    applyMode(keep = []) {
      const m = this.mode; if (m === this.curMode) return false;
      if (this.curMode < this.nBase) this.baseVis = this.baseParts.map((o) => o.visible);
      this.curMode = m; this.clearTrails();
      const base = m < this.nBase;
      this.baseParts.forEach((o, i) => (o.visible = base ? this.baseVis[i] : keep.includes(o)));
      Object.entries(this.groups).forEach(([k, gr]) => (gr.visible = +k === m));
      this.onModeEnter?.(m); return true;
    }
    readout() { return this.isBase || !this.modeReadout ? super.readout() : this.modeReadout(); }
    graph() { return this.isBase || !this.modeGraph ? super.graph() : this.modeGraph(); }
  };
}

/** لافتة نصية قابلة للتحديث */
export function liveLabel(parent, color = '#ffffff', size = 0.2) {
  const holder = new THREE.Group(); parent.add(holder); let last = '', at = 0;
  holder.setText = (t) => {
    const now = performance.now(); if (t === last || (last && now - at < 250)) return; last = t; at = now;
    holder.children.forEach((o) => { o.material?.map?.dispose(); o.material?.dispose(); }); holder.clear();
    holder.add(textSprite(t, { color, size, italic: false }));
  };
  return holder;
}

/* ═════ 1-1: مشهد جسمين متجاذبين (قانون نيوتن الثالث) ═════ */
export class Orbits extends withModes(OrbitsBase) {
  constructor(ctx, defs) {
    super(ctx, defs);
    const P = this.group(1); P.position.y = 1.45;
    this.b1 = mesh(new THREE.SphereGeometry(1, 48, 32), this.M.paint('#e8613f')); this.b2 = mesh(new THREE.SphereGeometry(1, 48, 32), this.M.paint('#3f8fe0'));
    this.f1 = new Arrow(COLORS.force, { label: 'F', sub: '12' }); this.f2 = new Arrow(COLORS.force, { label: 'F', sub: '21' });
    this.ruler = dashedLine([V(), V(1, 0, 0)], COLORS.displacement); this.rLab = textSprite('r', { color: COLORS.displacement, size: 0.18 });
    P.add(this.b1, this.b2, this.f1, this.f2, this.ruler, this.rLab);
    [this.l1, this.l2] = [liveLabel(P, '#ffffff', 0.16), liveLabel(P, '#ffffff', 0.16)];
  }
  update(dt) {
    this.applyMode(this.baseParts.filter((o) => o !== this.tilt));
    if (this.mode !== 1) return super.update(dt);
    const d = this.p.a * 0.3, r1 = 0.1 + 0.12 * Math.cbrt(this.p.mp), r2 = 0.1 + 0.12 * Math.cbrt(this.p.ms);
    this.b1.scale.setScalar(r1); this.b2.scale.setScalar(r2);
    this.b1.position.set(-d / 2, 0, 0); this.b2.position.set(d / 2, 0, 0);
    this.b1.rotation.y += dt * 0.5; this.b2.rotation.y -= dt * 0.4;
    const F = this.p.mp * this.p.ms / Math.pow(this.p.a / 4.5, 2); const L = Math.abs(vlen(F, 1.2, 0.55));
    this.f1.set(V(-d / 2 + r1, 0, 0.02), V(Math.min(L, d / 2 - r1), 0, 0)); this.f2.set(V(d / 2 - r2, 0, 0.02), V(-Math.min(L, d / 2 - r2), 0, 0));
    const pos = this.ruler.geometry.attributes.position; pos.setXYZ(0, -d / 2, -0.45, 0); pos.setXYZ(1, d / 2, -0.45, 0); pos.needsUpdate = true; this.ruler.computeLineDistances();
    this.rLab.position.set(0, -0.32, 0);
    this.l1.position.set(-d / 2, r1 + 0.22, 0); this.l2.position.set(d / 2, r2 + 0.22, 0);
    this.l1.setText(`m₁ ×${plainNum(this.p.mp)}`); this.l2.setText(`m₂ ×${plainNum(this.p.ms)}`);
    this.pairState = { d: this.p.a / 4.5, F };
  }
  modeReadout() { const s = this.pairState || {}; return [['المسافة r (نسبية)', plainNum(s.d)], ['قوة التجاذب (نسبية)', plainNum(s.F)], ['F₁₂ = F₂₁', 'متساويتان ومتعاكستان ✓'], ['إذا ضاعفت r', 'تصبح F ربع قيمتها']]; }
  modeGraph() { const s = this.pairState; return s && [{ label: 'قوة التجاذب (نسبية)', value: s.F, color: COLORS.force }]; }
}

/* ═════ 3-1: دولاب يتلقى دفعاً زاوياً + سيارة تكبح ═════ */
export class Impulse extends withModes(ImpulseBase) {
  constructor(ctx, defs) {
    super(ctx, defs);
    const M = this.M;
    // المشهد 1: دولاب
    const W = this.group(1);
    const stand = mesh(rbox(0.5, 0.08, 0.6, 0.03), M.graphite); stand.position.y = 0.04;
    const post = mesh(rbox(0.12, 1.5, 0.12, 0.04), M.graphite); post.position.set(0, 0.79, -0.25);
    this.wheel = new THREE.Group(); this.wheel.position.set(0, 1.5, 0);
    const disc = mesh(lathe([[0, -0.06], [0.75, -0.06], [0.78, -0.03], [0.78, 0.03], [0.75, 0.06], [0, 0.06]], 72), M.brushed); disc.rotation.x = Math.PI / 2;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.014, 8, 96), M.led('#c77dff', 2.4)); ring.position.z = 0.065;
    const mark = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 0.02), M.led('#ffffff', 1.6)); mark.position.set(0, 0.35, 0.07);
    this.wheel.add(disc, ring, mark);
    this.tauA = new Arrow(COLORS.torque, { label: 'τ' }); this.LA = new Arrow('#ffffff', { label: 'L', radius: 0.035 });
    this.wLab = liveLabel(W, '#c77dff', 0.17); this.wLab.position.set(0, 2.55, 0);
    W.add(stand, post, this.wheel, this.tauA, this.LA);
    this.wt = 0; this.wang = 0;
    // المشهد 2: سيارة تكبح
    const C = this.group(2);
    this.car = new THREE.Group();
    const body = mesh(rbox(0.9, 0.22, 0.42, 0.08), M.paint('#e8513a')); body.position.y = 0.2;
    const cab = mesh(rbox(0.5, 0.18, 0.36, 0.07), M.glassTint('#cfe6ff')); cab.position.set(-0.05, 0.38, 0);
    for (const x of [-0.3, 0.3]) for (const z of [-0.2, 0.2]) { const w = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 20), M.rubber); w.rotation.x = Math.PI / 2; w.position.set(x, 0.1, z); this.car.add(w); }
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.3), M.led('#ff3b3b', 2)); lamp.position.set(-0.455, 0.24, 0); this.brake = lamp;
    this.car.add(body, cab, lamp); C.add(this.car);
    this.carP = new Arrow(COLORS.momentum, { label: 'p' }); this.carF = new Arrow(COLORS.force, { label: 'F', sub: 'brake', radius: 0.035 });
    C.add(this.carP, this.carF); this.ct = 0;
  }
  onModeEnter() { this.wt = 0; this.ct = 0; this.dirty = true; }
  onParam(k) { super.onParam?.(k); this.wt = 0; this.ct = 0; }
  update(dt) {
    const m = this.mode;
    this.applyMode(m === 2 ? this.baseParts.filter((o) => o !== this.plate && o !== this.ball && o !== this.pA && o !== this.FA) : []);
    if (m === 0) return super.update(dt);
    if (m === 1) {
      const { I, tau, T } = this.p; const Tv = 1 + T * 0.35;
      this.wt += dt; const on = this.wt < Tv; const tr = Math.min(this.wt, Tv) / Tv * T;
      const w = tau * tr / I, L = I * w;
      if (this.wt > Tv + 2.2) { this.wt = 0; this.wang = 0; }
      this.wang += Math.min(w, 14) * dt * 0.6; this.wheel.rotation.z = -this.wang;
      if (on) this.tauA.set(V(0, 1.5, 0.12), V(0, 0, Math.max(0.1, Math.abs(vlen(tau, 8, 0.8))))); else this.tauA.visible = false;
      this.LA.set(V(0.0, 1.5, -0.12), V(0, 0, -Math.max(0.05, Math.abs(vlen(L, 20, 1.0)))));
      this.wLab.setText(`ω = ${plainNum(w)} rad/s`);
      this.spin = { w, L, tr, on };
      return;
    }
    // m === 2: كبح سيارة بقوة ثابتة
    if (this.dirty) { this.dirty = false; this.drawGraph(); }
    const D = 1.2 + this.p.dt * 9, Lx = 4.2, x0 = -2.4;
    this.ct += dt; let tt = Math.min(this.ct, D);
    const v0 = 2 * Lx / D, a = v0 / D; const x = x0 + v0 * tt - 0.5 * a * tt * tt;
    if (this.ct > D + 1.2) this.ct = 0;
    this.car.position.set(x, 0.66, 0.3); this.car.children.forEach((c) => { if (c.geometry?.type === 'CylinderGeometry') c.rotation.y -= (v0 - a * tt) * dt / 0.1; });
    const frac = 1 - tt / D, vReal = this.p.vin * frac, pReal = this.p.m * 600 * vReal;
    this.brake.material.color.setRGB(frac > 0 && this.ct < D ? 1.6 : 0.4, 0.1, 0.1);
    this.carP.set(V(x, 1.35, 0.3), V(Math.max(0, Math.abs(vlen(pReal, 30000, 1.1))), 0, 0));
    if (this.ct < D) this.carF.set(V(x - 0.48, 0.85, 0.3), V(-Math.abs(vlen(this.p.m * 600 * this.p.vin / (this.p.dt * 40), 3000, 0.9)), 0, 0)); else this.carF.visible = false;
    this.brakeState = { v: vReal, p: pReal, t: (tt / D) * this.p.dt * 40 };
  }
  modeReadout() {
    if (this.mode === 1) { const s = this.spin || {}; return [['الدفع الزاوي τΔt', plainNum(this.p.tau * (s.tr || 0)) + ' N·m·s'], ['الزخم الزاوي L', plainNum(s.L) + ' kg·m²/s'], ['السرعة الزاوية ω', plainNum(s.w) + ' rad/s'], ['العزم', s.on ? 'مؤثر الآن' : 'توقف — L ثابت']]; }
    const s = this.brakeState || {}; return [['السرعة v', plainNum(s.v) + ' m/s'], ['الزخم p', plainNum(s.p) + ' kg·m/s'], ['الزمن', plainNum(s.t) + ' s'], ['قوة الكبح', 'ثابتة وعكس الحركة']];
  }
  modeGraph() {
    if (this.mode === 1) { const s = this.spin; return s && [{ label: 'ω (rad/s)', value: s.w, color: COLORS.torque }, { label: 'L', value: s.L, color: '#ffffff' }]; }
    const s = this.brakeState; return s && [{ label: 'الزخم p', value: s.p, color: COLORS.momentum }];
  }
}

/* ═════ 3-2: متزلجان يتدافعان (ارتداد) + متزلجة دوّارة (حفظ الزخم الزاوي) ═════ */
export class Collision extends withModes(CollisionBase) {
  constructor(ctx, defs) {
    super(ctx, defs);
    const M = this.M; const S = this.group(2);
    const plat = mesh(lathe([[0, 0], [0.9, 0], [0.95, 0.04], [0.9, 0.08], [0, 0.08]], 64), M.ceramic);
    const pRing = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.012, 8, 96), M.led('#ff4fd8', 2.2)); pRing.rotation.x = Math.PI / 2; pRing.position.y = 0.05;
    this.sk = new THREE.Group(); this.sk.position.y = 0.08;
    const legs = mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.8, 16), M.paint('#2b3442')); legs.position.y = 0.4;
    const torso = mesh(rbox(0.36, 0.55, 0.22, 0.1), M.paint('#ff4fd8')); torso.position.y = 1.08;
    const head = mesh(new THREE.SphereGeometry(0.13, 24, 16), M.ceramic); head.position.y = 1.52;
    this.arms = [-1, 1].map((sd) => { const sh = new THREE.Group(); sh.position.set(sd * 0.2, 1.3, 0); const arm = mesh(rbox(0.62, 0.08, 0.08, 0.04), M.paint('#ff4fd8')); arm.position.x = sd * 0.31; const hand = mesh(new THREE.SphereGeometry(0.06, 16, 12), M.ceramic); hand.position.x = sd * 0.64; sh.add(arm, hand); sh.userData.sd = sd; return sh; });
    this.sk.add(legs, torso, head, ...this.arms);
    this.LA = new Arrow('#ffffff', { label: 'L', radius: 0.035 }); this.wA = new Arrow(COLORS.torque, { label: 'ω' });
    this.wLab = liveLabel(S, '#ff9ef0', 0.17); this.wLab.position.set(0, 2.55, 0);
    S.add(plat, pRing, this.sk, this.LA, this.wA);
    this.st = 0; this.ang = 0;
  }
  onModeEnter(m) { this.st = 0; if (m === 1) this.resetRun(); }
  resetRun() { super.resetRun(); this.et = 0; }
  update(dt) {
    const m = this.mode;
    this.applyMode(m === 1 ? this.baseParts : []);
    if (m === 0) return super.update(dt);
    if (m === 1) return this.explode(dt);
    // m === 2: المتزلجة
    const { I1, w1, I2 } = this.p; this.st += dt; const t = this.st % 6.4;
    const k = t < 2.4 ? 0 : t < 3.0 ? ease((t - 2.4) / 0.6) : t < 5.8 ? 1 : 1 - ease((t - 5.8) / 0.6);
    const I = I1 + (I2 - I1) * k, w = I1 * w1 / I, L = I1 * w1;
    this.ang += Math.min(w, 16) * dt * 0.7; this.sk.rotation.y = this.ang;
    this.arms.forEach((a) => { a.rotation.z = a.userData.sd * -(k * 1.35); a.scale.x = 1 - 0.25 * k; });
    this.LA.set(V(0, 1.75, 0), V(0, Math.max(0.1, Math.abs(vlen(L, 15, 0.7))), 0));
    this.wA.set(V(0.45, 1.75, 0), V(0, Math.max(0.05, Math.abs(vlen(w, 6, 0.8))), 0));
    this.wLab.setText(`ω = ${plainNum(w)} rad/s · I = ${plainNum(I)} kg·m²`);
    this.spin = { I, w, L };
  }
  /** ارتداد: العربتان تبدآن متلاصقتين ساكنتين ثم يدفع كل منهما الآخر */
  explode(dt) {
    const { mA, mB } = this.p; const vAr = Math.abs(this.target.vA) || 2; const vBr = mA * vAr / mB;
    const w = [0.3 + 0.1 * mA, 0.3 + 0.1 * mB];
    this.et = (this.et || 0) + dt; const t = this.et;
    if (t < 0.9) { this.x = [-w[0] / 2, w[1] / 2]; this.v = [0, 0]; }
    else { this.v = [-vAr * 0.35, vBr * 0.35]; this.x[0] += this.v[0] * dt; this.x[1] += this.v[1] * dt; }
    if (this.x[0] - w[0] / 2 < -3 || this.x[1] + w[1] / 2 > 3 || t > 6) { this.et = 0; this.clearTrails(); }
    this.ctrails?.forEach((tr, i) => tr.push(V(this.x[i], 0.78, 0.42)));
    this.carts.forEach((c, i) => { c.position.set(this.x[i], 0.86, 0.2); c.userData.body.forEach((b) => (b.scale.x = w[i])); c.userData.bump[0].position.x = -w[i] / 2; c.userData.bump[1].position.x = w[i] / 2; });
    const real = [this.v[0] / 0.35, this.v[1] / 0.35]; const pl = (p) => vlen(p, 10, 1.0);
    this.pa[0].set(V(this.x[0], 1.25, 0.2), V(pl(mA * real[0]), 0, 0)); this.pa[1].set(V(this.x[1], 1.55, 0.2), V(pl(mB * real[1]), 0, 0));
    this.pt.visible = false;
    const k = this.p.ks || 20; this.state = { pA: k * mA * real[0], pB: k * mB * real[1], tot: k * (mA * real[0] + mB * real[1]) };
  }
  modeReadout() {
    if (this.mode === 1) { const s = this.state || {}; return [['زخم الأول', plainNum(s.pA) + ' kg·m/s'], ['زخم الثاني', plainNum(s.pB) + ' kg·m/s'], ['الزخم الكلي', plainNum(s.tot) + ' (صفر قبل وبعد) ✓'], ['الأخف', 'يرتد بسرعة أكبر']]; }
    const s = this.spin || {}; return [['عزم القصور I', plainNum(s.I) + ' kg·m²'], ['السرعة الزاوية ω', plainNum(s.w) + ' rad/s'], ['الزخم الزاوي L = Iω', plainNum(s.L) + ' (ثابت) ✓'], ['ضم الذراعين', 'يقلل I فتزيد ω']];
  }
  modeGraph() {
    if (this.mode === 1) return super.graph();
    const s = this.spin; return s && [{ label: 'ω (rad/s)', value: s.w, color: COLORS.torque }, { label: 'I', value: s.I, color: '#ff9ef0' }, { label: 'L (ثابت)', value: s.L, color: '#ffffff' }];
  }
}

/* ═════ 4-1: رافعة ترفع حملاً رأسياً + تسريع حاوية ═════ */
export class Work extends withModes(WorkBase) {
  constructor(ctx, defs) {
    super(ctx, defs);
    const M = this.M; const L = this.group(1);
    const mast = mesh(rbox(0.16, 3.1, 0.16, 0.05), M.anod('#ffb02e', 0.35)); mast.position.set(-1.4, 1.55, -0.3);
    const boom = mesh(rbox(2.0, 0.14, 0.14, 0.05), M.anod('#ffb02e', 0.35)); boom.position.set(-0.5, 3.05, -0.3);
    const base = mesh(rbox(0.7, 0.12, 0.7, 0.04), M.graphite); base.position.set(-1.4, 0.06, -0.3);
    this.cable = mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 8), M.chrome); this.cable.geometry.translate(0, -0.5, 0); this.cable.position.set(0.4, 3.0, -0.3);
    this.hook = mesh(new THREE.TorusGeometry(0.05, 0.015, 8, 20, Math.PI * 1.5), M.chrome);
    this.box = mesh(rbox(0.5, 0.45, 0.5, 0.05), M.paint('#5fe08a'));
    this.Fup = new Arrow(COLORS.normal, { label: 'F' }); this.Wdn = new Arrow(COLORS.weight, { label: 'F', sub: 'g' }); this.dUp = new Arrow(COLORS.displacement, { label: 'd' });
    L.add(mast, boom, base, this.cable, this.hook, this.box, this.Fup, this.Wdn, this.dUp);
    this.lt = 0;
    // المشهد 2: تسارع
    const A = this.group(2);
    this.vArrow = new Arrow(COLORS.velocity, { label: 'v' }); this.netF = new Arrow(COLORS.force, { label: 'F', sub: 'net' });
    A.add(this.vArrow, this.netF); this.at = 0;
  }
  onModeEnter() { this.lt = 0; this.at = 0; }
  onParam(k) { super.onParam?.(k); this.lt = 0; this.at = 0; }
  update(dt) {
    const m = this.mode;
    this.applyMode(m === 2 ? this.baseParts.filter((o) => ![this.rope, this.handle, this.FA, this.Fx, this.Fy, this.fA].includes(o)) : []);
    if (m === 0) return super.update(dt);
    if (m === 1) {
      const { m: mass, h, T } = this.p; const Hv = 0.35 + 2.0 * Math.pow(h / 20, 0.6), D = 1.4 + T * 0.06;
      this.lt += dt; const u = Math.min(1, this.lt / D); if (this.lt > D + 1.3) this.lt = 0;
      const y = 0.25 + Hv * u; this.box.scale.setScalar(Math.min(1.6, 0.7 + 0.4 * Math.cbrt(mass / 100)));
      this.box.position.set(0.4, y, -0.3); this.hook.position.set(0.4, y + 0.32, -0.3);
      this.cable.scale.y = Math.max(0.01, 3.0 - (y + 0.35));
      const fl = Math.abs(vlen(mass * g, 1500, 0.8));
      this.Fup.set(V(0.4, y + 0.3, 0.05), V(0, fl, 0)); this.Wdn.set(V(0.4, y - 0.2, 0.05), V(0, -fl, 0));
      this.dUp.set(V(0.95, 0.25, -0.3), V(0, Math.max(0.01, Hv * u), 0));
      this.liftState = { W: mass * g * h * u, P: mass * g * h / T, d: h * u, F: mass * g };
      return;
    }
    // m === 2: حاوية تتسارع من v1 إلى v2
    const { v1, v2 } = this.p; const D = 3.2; this.at += dt; const u = Math.min(1, this.at / D); if (this.at > D + 1) this.at = 0;
    const span = 4.4, avg = (v1 + v2) / 2 || 1; const s = (v1 * u + (v2 - v1) * u * u / 2) / avg; // كسر المسافة المقطوعة
    const x = -2.4 + span * Math.min(1, s); this.crate.position.set(x, 0.315, 0);
    const v = v1 + (v2 - v1) * u;
    this.vArrow.set(V(x, 0.75, 0.36), V(Math.max(0.01, Math.abs(vlen(v, 15, 1.1))), 0, 0));
    this.netF.set(V(x - 0.3, 0.32, 0.36), V(Math.sign(v2 - v1) * Math.max(0.15, Math.abs(vlen(v2 - v1, 15, 0.6))), 0, 0));
    this.dA.set(V(-2.4, 0.08, 0.66), V(Math.max(0.01, x + 2.4), 0, 0));
    const KE = 0.5 * this.p.m * v * v; this.accState = { v, KE, K1: 0.5 * this.p.m * v1 * v1, K2: 0.5 * this.p.m * v2 * v2 };
  }
  modeReadout() {
    if (this.mode === 1) { const s = this.liftState || {}; return [['القوة F = mg', plainNum(s.F) + ' N'], ['المسافة المرفوعة', plainNum(s.d) + ' m'], ['الشغل حتى الآن', plainNum(s.W) + ' J'], ['القدرة P = W/t', plainNum(s.P) + ' W']]; }
    const s = this.accState || {}; return [['السرعة v', plainNum(s.v) + ' m/s'], ['الطاقة الحركية الآن', plainNum(s.KE) + ' J'], ['KE البداية → النهاية', plainNum(s.K1) + ' → ' + plainNum(s.K2)], ['الشغل W = ΔKE', plainNum(s.K2 - s.K1) + ' J']];
  }
  modeGraph() {
    if (this.mode === 1) { const s = this.liftState; return s && [{ label: 'الشغل (J)', value: s.W, color: COLORS.displacement }]; }
    const s = this.accState; return s && [{ label: 'KE (J)', value: s.KE, color: COLORS.velocity }];
  }
}

/* ═════ 4-2: نظام بكرات + مستوى مائل ═════ */
export class Lever extends withModes(LeverBase) {
  constructor(ctx, defs) {
    super(ctx, defs);
    const M = this.M;
    // البكرات
    const P = this.group(1);
    for (const x of [-1.3, 1.3]) { const post = mesh(rbox(0.14, 3.0, 0.14, 0.05), M.graphite); post.position.set(x, 1.5, -0.2); P.add(post); }
    const beam = mesh(rbox(2.8, 0.16, 0.16, 0.05), M.graphite); beam.position.set(0, 3.0, -0.2); P.add(beam);
    const wheelGeo = lathe([[0, -0.06], [0.3, -0.06], [0.3, -0.03], [0.25, 0], [0.3, 0.03], [0.3, 0.06], [0, 0.06]], 40);
    this.topBlock = new THREE.Group(); this.topBlock.position.set(0, 2.6, 0); this.botBlock = new THREE.Group();
    for (const b of [this.topBlock, this.botBlock]) { const frame = mesh(rbox(0.8, 0.12, 0.2, 0.04), M.anod('#e08a4a', 0.3)); b.add(frame); }
    this.topWheels = []; this.botWheels = [];
    for (let i = 0; i < 3; i++) { const w1 = mesh(wheelGeo, M.brushed); w1.rotation.x = Math.PI / 2; this.topBlock.add(w1); this.topWheels.push(w1); const w2 = mesh(wheelGeo, M.brushed); w2.rotation.x = Math.PI / 2; this.botBlock.add(w2); this.botWheels.push(w2); }
    const hang = mesh(new THREE.CylinderGeometry(0.01, 0.01, 2.6 - 2.6 + 0.4, 6), M.chrome); hang.position.y = 2.8; P.add(hang);
    this.pLoad = mesh(weightGeo(), M.graphite); this.ropes = [];
    for (let i = 0; i < 7; i++) { const r = mesh(new THREE.CylinderGeometry(0.01, 0.01, 1, 6), M.anod('#d9c9a3', 0.6), false); r.geometry.translate(0, 0.5, 0); P.add(r); this.ropes.push(r); }
    this.freeRope = mesh(new THREE.CylinderGeometry(0.01, 0.01, 1, 6), M.anod('#d9c9a3', 0.6), false); this.freeRope.geometry.translate(0, -0.5, 0);
    this.pGrip = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.2, 16), M.paint("#e8513a")); this.pGrip.rotation.z = Math.PI / 2;
    this.pFe = new Arrow(COLORS.force, { label: 'F', sub: 'e', radius: 0.03 }); this.pFr = new Arrow(COLORS.weight, { label: 'F', sub: 'r', radius: 0.03 });
    this.nLab = liveLabel(P, '#e08a4a', 0.17); this.nLab.position.set(0, 3.35, 0);
    P.add(this.topBlock, this.botBlock, this.pLoad, this.freeRope, this.pGrip, this.pFe, this.pFr);
    // المستوى المائل
    const R = this.group(2);
    this.ramp = new THREE.Group(); R.add(this.ramp);
    this.rCrate = mesh(rbox(0.42, 0.36, 0.42, 0.05), M.paint('#e08a4a'));
    this.iFe = new Arrow(COLORS.force, { label: 'F', sub: 'e', radius: 0.03 }); this.iW = new Arrow(COLORS.weight, { label: 'F', sub: 'g', radius: 0.03 });
    this.hLab = liveLabel(R, COLORS.displacement, 0.16);
    R.add(this.rCrate, this.iFe, this.iW); this.builtRamp = '';
  }
  buildRamp(de, dr) {
    const key = de.toFixed(2) + dr.toFixed(2); if (key === this.builtRamp) return; this.builtRamp = key;
    this.ramp.traverse((o) => o.geometry?.dispose?.()); this.ramp.clear();
    const Lv = 4.6, ang = Math.asin(Math.min(0.9, dr / de)), Hv = Lv * Math.sin(ang), Wv = Lv * Math.cos(ang);
    const sh = new THREE.Shape(); sh.moveTo(-Wv / 2, 0); sh.lineTo(Wv / 2, 0); sh.lineTo(Wv / 2, Hv); sh.closePath();
    const wedge = mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.8, bevelEnabled: false }), this.M.anod('#3a3f48', 0.4)); wedge.position.z = -0.4; this.ramp.add(wedge);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(Lv, 0.012, 0.012), this.M.led('#e08a4a', 2.4)); edge.position.set(0, Hv / 2, 0.41); edge.rotation.z = ang; this.ramp.add(edge);
    const hLine = dashedLine([V(Wv / 2 + 0.25, 0, 0.4), V(Wv / 2 + 0.25, Hv, 0.4)], COLORS.displacement); this.ramp.add(hLine);
    this.rampGeo = { Lv, ang, Hv, Wv };
  }
  onModeEnter() { this.builtRamp = ''; }
  update(dt) {
    const m = this.mode; this.applyMode([]);
    if (m === 0) return super.update(dt);
    const { load, eff } = this.p; const Fr = load * g; const FL = (F) => Math.abs(vlen(F, 600, 0.9));
    const cyc = 0.5 - 0.5 * Math.cos(this.t * 1.1);
    if (m === 1) {
      const n = Math.max(1, Math.round(this.p.n)); const IMA = n, MA = eff / 100 * IMA, Fe = Fr / MA;
      const nb = Math.ceil(n / 2), nt = Math.max(1, Math.floor((n + 1) / 2));
      this.topWheels.forEach((w, i) => { w.visible = i < Math.max(1, nt); w.position.set((i - (Math.max(1, nt) - 1) / 2) * 0.24, 0, 0); });
      this.botWheels.forEach((w, i) => { w.visible = i < nb && n > 1; w.position.set((i - (nb - 1) / 2) * 0.24, 0, 0); });
      this.botBlock.visible = n > 1;
      const lift = 0.5 * cyc, yb = 1.2 + lift; this.botBlock.position.set(0, yb, 0);
      const s = 0.3 + 0.2 * Math.cbrt(load / 20); this.pLoad.scale.setScalar(s); this.pLoad.position.set(0, (n > 1 ? yb : 1.2 + lift) - 0.12 - s * 0.92, 0);
      this.ropes.forEach((r, i) => { r.visible = i < n; if (i >= n) return; const x = (i - (n - 1) / 2) * 0.12; const y0 = n > 1 ? yb : this.pLoad.position.y + s * 0.92; r.position.set(x, y0, 0.11); r.scale.y = Math.max(0.05, 2.6 - y0); });
      const freeLen = 1.0 + n * lift; this.freeRope.position.set(0.45, 2.6, 0.11); this.freeRope.scale.y = freeLen; this.pGrip.position.set(0.45, 2.6 - freeLen, 0.11);
      this.pFe.set(V(0.62, 2.6 - freeLen, 0.11), V(0, -FL(Fe), 0)); this.pFr.set(V(0, this.pLoad.position.y, 0.4), V(0, -FL(Fr), 0));
      this.nLab.setText(`${n} أجزاء حبل ⇒ IMA = ${n}`);
      this.mState = { IMA, MA, Fe, Fr };
      return;
    }
    // m === 2: المستوى المائل
    const { de, dr } = this.p; this.buildRamp(de, dr); const { Lv, ang, Hv, Wv } = this.rampGeo;
    const IMA = de / dr, MA = eff / 100 * IMA, Fe = Fr / MA;
    const u = 0.1 + 0.8 * cyc; const along = V(Math.cos(ang), Math.sin(ang), 0);
    const p0 = V(-Wv / 2, 0, 0).add(along.clone().multiplyScalar(Lv * u)).add(V(-Math.sin(ang), Math.cos(ang), 0).multiplyScalar(0.18));
    this.rCrate.position.copy(p0); this.rCrate.rotation.z = ang; this.rCrate.scale.setScalar(0.8 + 0.4 * Math.cbrt(load / 60));
    this.iFe.set(p0.clone().add(V(0, 0, 0.3)), along.clone().multiplyScalar(FL(Fe)));
    this.iW.set(p0.clone().add(V(0, 0, 0.3)), V(0, -FL(Fr), 0));
    this.hLab.position.set(Wv / 2 + 0.55, Hv / 2, 0.4); this.hLab.setText(`dr = ${plainNum(dr)} m`);
    this.mState = { IMA, MA, Fe, Fr };
  }
  modeReadout() { const s = this.mState || {}; return [[this.mode === 1 ? 'IMA = أجزاء الحبل' : 'IMA = de/dr', plainNum(s.IMA)], ['MA الفعلية', plainNum(s.MA)], ['الحِمل Fr', plainNum(s.Fr) + ' N'], ['القوة المسلّطة Fe', plainNum(s.Fe) + ' N']]; }
  modeGraph() { const s = this.mState; return s && [{ label: 'Fe (N)', value: s.Fe, color: COLORS.force }, { label: 'Fr (N)', value: s.Fr, color: COLORS.weight }]; }
}

/* ═════ 5-1: جسم متحرك أفقياً (KE = ½mv²) + طاقة السكون ═════ */
export class Forms extends withModes(FormsBase) {
  constructor(ctx, defs) {
    super(ctx, defs);
    const M = this.M; const R = this.group(1);
    const lane = mesh(rbox(5.4, 0.04, 0.5, 0.02), M.graphite); lane.position.y = 0.02;
    for (let k = 0; k <= 10; k++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.004, 0.2), M.led('#35e08a', 1.4)); t.position.set(-2.5 + k * 0.5, 0.045, 0.2); R.add(t); }
    this.runner = mesh(new THREE.SphereGeometry(1, 40, 28), M.paint('#35e08a', 0.2));
    this.rv = new Arrow(COLORS.velocity, { label: 'v' });
    R.add(lane, this.runner, this.rv); this.rx = -2.4;
    const S = this.group(2);
    const ped = mesh(lathe([[0, 0], [0.4, 0], [0.42, 0.04], [0.3, 0.1], [0.22, 0.9], [0.3, 0.95], [0, 0.95]], 48), M.graphite); ped.position.x = -1.4;
    this.matter = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffb340', emissiveIntensity: 1.2, roughness: 0.2, metalness: 0.4 }));
    this.halo = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), new THREE.MeshBasicMaterial({ color: '#ffcf6b', transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.eLab = liveLabel(S, '#ffd27a', 0.2); this.eLab.position.set(-1.4, 2.0, 0);
    this.bulbs = []; for (let i = 0; i < 12; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshBasicMaterial({ color: '#555' })); b.position.set(-0.4 + (i % 6) * 0.22, 2.05 + Math.floor(i / 6) * 0.22, -0.7); S.add(b); this.bulbs.push(b); }
    this.bLab = liveLabel(S, '#ffffff', 0.13); this.bLab.position.set(0.15, 1.75, -0.7);
    S.add(ped, this.matter, this.halo);
  }
  update(dt) {
    const m = this.mode; this.applyMode([this.bars]);
    if (m === 0) return super.update(dt);
    if (m === 1) {
      const { m: mass, v } = this.p; const r = 0.08 + 0.05 * Math.cbrt(mass);
      this.rx += Math.max(0.05, v * 0.25) * dt; if (this.rx > 2.5) { this.rx = -2.4; this.clearTrails(); }
      this.runner.scale.setScalar(r); this.runner.position.set(this.rx, r + 0.04, 0); this.runner.rotation.z -= v * 0.25 * dt / r;
      this.rv.set(V(this.rx, 2 * r + 0.15, 0), V(Math.max(0.01, Math.abs(vlen(v, 6, 1.0))), 0, 0));
      const KE = 0.5 * mass * 10 * v * v; this.bars.set([0, KE, KE, 0], KE * 1.05);
      this.runState = { KE, v, K2: 4 * KE };
      return;
    }
    // m === 2: طاقة السكون
    const mg = this.p.mg; const E = mg / 1000 * 9e16, hrs = E / 100 / 3600;
    const s = 0.08 + 0.18 * Math.cbrt(mg / 10); this.matter.scale.setScalar(s); this.matter.position.set(-1.4, 0.95 + s / 2 + 0.05, 0); this.matter.rotation.y += dt * 0.6; this.matter.rotation.x += dt * 0.3;
    const pulse = 1 + 0.15 * Math.sin(this.t * 3); this.halo.scale.setScalar(s * 2.2 * pulse); this.halo.position.copy(this.matter.position);
    const lit = Math.max(1, Math.min(12, Math.round(Math.log10(hrs + 1) * 1.6)));
    this.bulbs.forEach((b, i) => b.material.color.set(i < lit ? '#ffe9a8' : '#3a3a3a'));
    this.bLab.setText(`تكفي مصباحاً 100 W لمدة ${plainNum(hrs)} ساعة`);
    this.eLab.setText(`E₀ = ${plainNum(E)} J`);
    this.bars.set([0, 0, 1, 0], 1);
    this.restState = { E, hrs };
  }
  modeReadout() {
    if (this.mode === 1) { const s = this.runState || {}; return [['السرعة v', plainNum(s.v) + ' m/s'], ['الطاقة الحركية ½mv²', plainNum(s.KE) + ' J'], ['عند مضاعفة السرعة', plainNum(s.K2) + ' J (×4)'], ['طاقة الوضع', '0 (على مستوى الأرض)']]; }
    const s = this.restState || {}; return [['الكتلة', plainNum(this.p.mg) + ' g'], ['طاقة السكون E₀ = mc²', plainNum(s.E) + ' J'], ['تشغيل مصباح 100 W', plainNum(s.hrs) + ' ساعة'], ['c²', '9×10¹⁶ m²/s²']];
  }
  modeGraph() { if (this.mode === 1) { const s = this.runState; return s && [{ label: 'KE (J)', value: s.KE, color: COLORS.velocity }]; } return null; }
}

/* ═════ 5-2: تصادم غير مرن + قذف رأسي ═════ */
export class Ramp extends withModes(RampBase) {
  constructor(ctx, defs) {
    super(ctx, defs);
    const M = this.M; const C = this.group(1);
    const rail = mesh(rbox(5.8, 0.08, 0.32, 0.03), M.brushed); rail.position.set(0, 0.5, 0);
    const glow = new THREE.Mesh(new THREE.BoxGeometry(5.7, 0.012, 0.012), M.led('#9b6bff', 2.2)); glow.position.set(0, 0.46, 0.17);
    this.cA = mesh(rbox(0.5, 0.2, 0.3, 0.05), M.paint('#3f8fe0')); this.cB = mesh(rbox(0.5, 0.2, 0.3, 0.05), M.paint('#e0613f'));
    this.cvA = new Arrow(COLORS.velocity, { label: 'v' }); this.cvB = new Arrow(COLORS.velocity, { label: 'v' });
    this.flash = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), new THREE.MeshBasicMaterial({ color: '#ffb36b', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    C.add(rail, glow, this.cA, this.cB, this.cvA, this.cvB, this.flash); this.ct = 0;
    const T = this.group(2); T.position.x = -1.7; this.T = T;
    const tower = mesh(rbox(0.1, 2.8, 0.1, 0.03), M.graphite); tower.position.set(-0.45, 1.4, 0);
    this.ticks = []; for (let k = 0; k <= 5; k++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.012, 0.02), M.led('#9b6bff', 1.6)); t.position.set(-0.35, 0.3 + k * 0.5, 0.06); T.add(t); }
    this.tLab = liveLabel(T, COLORS.displacement, 0.15);
    this.tBall = mesh(new THREE.SphereGeometry(0.12, 32, 24), M.chrome);
    this.tv = new Arrow(COLORS.velocity, { label: 'v' }); this.hMax = dashedLine([V(-0.6, 0, 0), V(0.6, 0, 0)], COLORS.displacement);
    T.add(tower, this.tBall, this.tv, this.hMax); this.tt = 0;
  }
  onModeEnter() { this.ct = 0; this.tt = 0; }
  onParam(k) { super.onParam?.(k); this.ct = 0; this.tt = 0; }
  update(dt) {
    const m = this.mode; this.applyMode(m === 2 ? [this.bars, this.rtrail] : [this.bars]);
    if (m === 0) return super.update(dt);
    if (m === 1) {
      const { mA, vA, mB } = this.p; const v2 = mA * vA / (mA + mB);
      const K1 = 0.5 * mA * vA * vA, K2 = 0.5 * (mA + mB) * v2 * v2;
      this.ct += dt; const xB0 = 0.6, wA = 0.35 + 0.08 * mA, wB = 0.35 + 0.08 * mB;
      this.cA.scale.x = wA / 0.5; this.cB.scale.x = wB / 0.5;
      const tHit = (xB0 - wB / 2 - wA / 2 + 2.4) / (vA * 0.3);
      let xA, xB, vNow, after = false;
      if (this.ct < tHit) { xA = -2.4 + vA * 0.3 * this.ct; xB = xB0; vNow = [vA, 0]; }
      else { after = true; const tt = this.ct - tHit; xB = xB0 + v2 * 0.3 * tt; xA = xB - wB / 2 - wA / 2; vNow = [v2, v2]; }
      if (xB > 2.9 || this.ct > tHit + 6) this.ct = 0;
      this.cA.position.set(xA, 0.64, 0); this.cB.position.set(xB, 0.64, 0);
      const fl = (v) => Math.abs(vlen(v, 6, 0.9));
      this.cvA.set(V(xA, 0.95, 0), V(Math.max(0.01, fl(vNow[0])), 0, 0)); if (vNow[1] > 0.01) this.cvB.set(V(xB, 1.2, 0), V(fl(vNow[1]), 0, 0)); else this.cvB.visible = false;
      const since = this.ct - tHit; this.flash.position.set(xB - wB / 2, 0.64, 0); this.flash.material.opacity = since > 0 && since < 0.5 ? (1 - since / 0.5) * 0.8 : 0;
      const KE = after ? K2 : K1, Q = after ? K1 - K2 : 0;
      this.bars.set([0, KE, Q, KE + Q], K1 * 1.02);
      this.colState = { K1, K2, v2, loss: K1 - K2, KE, Q };
      return;
    }
    // m === 2: قذف رأسي لأعلى
    const v0 = this.p.v0, H = v0 * v0 / (2 * g), k = Math.min(0.5, 2.4 / H), Tf = 2 * v0 / g, f = Tf / 3.2;
    this.tt += dt; const t = this.tt * f; if (t > Tf + 0.4 * f) { this.tt = 0; this.clearTrails(); }
    const tc = Math.min(t, Tf); const y = Math.max(0, v0 * tc - 0.5 * g * tc * tc), v = v0 - g * tc;
    this.tBall.position.set(0, 0.42 + y * k, 0); this.rtrail.push(this.tBall.position.clone().add(this.T.position));
    this.tv.set(V(0.2, 0.42 + y * k, 0), V(0, Math.sign(v) * Math.max(0.01, Math.abs(vlen(v, 15, 0.9))), 0));
    const yH = 0.42 + H * k; const hp = this.hMax.geometry.attributes.position; hp.setXYZ(0, -0.6, yH, 0); hp.setXYZ(1, 0.6, yH, 0); hp.needsUpdate = true; this.hMax.computeLineDistances();
    this.tLab.position.set(0.95, yH, 0); this.tLab.setText(`h = ${plainNum(H)} m`);
    const mass = this.p.m, PE = mass * g * y, KE = 0.5 * mass * v * v; this.bars.set([PE, KE, 0, PE + KE], 0.5 * mass * v0 * v0 * 1.02);
    this.throwState = { y, v, PE, KE, H };
  }
  modeReadout() {
    if (this.mode === 1) { const s = this.colState || {}; return [['السرعة المشتركة', plainNum(s.v2) + ' m/s'], ['KE قبل', plainNum(s.K1) + ' J'], ['KE بعد', plainNum(s.K2) + ' J'], ['المفقود (حرارة وصوت)', plainNum(s.loss) + ' J']]; }
    const s = this.throwState || {}; return [['الارتفاع الآن', plainNum(s.y) + ' m'], ['السرعة', plainNum(s.v) + ' m/s'], ['أقصى ارتفاع v²/2g', plainNum(s.H) + ' m'], ['PE + KE', plainNum(s.PE + s.KE) + ' J (ثابت)']];
  }
  modeGraph() {
    if (this.mode === 1) { const s = this.colState; return s && [{ label: 'KE', value: s.KE, color: COLORS.velocity }, { label: 'المفقود Q', value: s.Q, color: COLORS.weight }]; }
    const s = this.throwState; return s && [{ label: 'PE', value: s.PE, color: '#4c8dff' }, { label: 'KE', value: s.KE, color: COLORS.velocity }, { label: 'المجموع', value: s.PE + s.KE, color: '#ffffff' }];
  }
}
