// مشاهد موسّعة تغطي بقية موضوعات كتاب فيزياء 2 — كل مشهد مرتبط بمعروض (مسألة أو مستكشف) ويتغير مع متغيراته
import * as THREE from 'three';
import { Arrow, COLORS, vlen, damp, dashedLine, textSprite, canvasTex, heatColor, rbox, lathe, mesh, weightGeo } from './kit.js';
import { darkGraph, Satellite as SatelliteB, Disk as DiskB, Torque as TorqueB, Seesaw as SeesawB } from './sims_a.js';
import { Thermal as ThermalB, Phase as PhaseB } from './sims_b.js';
import { withModes, liveLabel, Orbits as OrbitsM, Impulse as ImpulseM, Collision as CollisionM, Work as WorkM, Lever as LeverM, Forms as FormsM, Ramp as RampM } from './sims_modes.js';
import { plainNum } from '../fmt.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const g = 9.8, G = 6.67e-11, TAU = Math.PI * 2, DEG = Math.PI / 180;
const clamp = THREE.MathUtils.clamp;
const ease = (t) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t, 0, 1));
const deg = (r) => r / DEG;

/* ─── أدوات بناء مشتركة ─── */
function label(parent, text, pos, color = '#ffffff', size = 0.15) { const s = textSprite(text, { color, size, italic: false }); s.position.copy(pos); parent.add(s); return s; }
/** شخص مبسّط أنيق بمفاصل (ارتفاعه نحو 1.3 وحدة) */
function person(M, color = '#4c8dff') {
  const p = new THREE.Group(); const skin = M.paint('#e9c7a4', 0.5), pants = M.paint('#2b3442', 0.5), shirt = M.paint(color, 0.35), shoe = M.paint('#15181f', 0.6);
  const cap = (r, h, mat) => mesh(new THREE.CapsuleGeometry(r, h, 6, 14), mat);
  const legs = new THREE.Group();
  for (const s of [-1, 1]) {
    const thigh = cap(0.055, 0.24, pants); thigh.position.set(s * 0.065, 0.47, 0);
    const shin = cap(0.048, 0.24, pants); shin.position.set(s * 0.065, 0.2, 0);
    const foot = mesh(rbox(0.09, 0.05, 0.17, 0.02), shoe); foot.position.set(s * 0.065, 0.025, 0.03);
    legs.add(thigh, shin, foot);
  }
  const hips = mesh(rbox(0.24, 0.12, 0.15, 0.05), pants); hips.position.y = 0.62;
  const torso = mesh(rbox(0.3, 0.38, 0.18, 0.08), shirt); torso.position.y = 0.86;
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 8, 20), M.led(color, 1.4)); collar.rotation.x = Math.PI / 2; collar.position.y = 1.06;
  const neck = cap(0.035, 0.05, skin); neck.position.y = 1.08;
  const head = mesh(new THREE.SphereGeometry(0.1, 28, 20), skin); head.position.y = 1.2; head.scale.set(0.95, 1.08, 1);
  const hair = mesh(new THREE.SphereGeometry(0.104, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), M.paint('#2a1c14', 0.7)); hair.position.y = 1.215; hair.rotation.x = -0.25;
  const arms = [-1, 1].map((s) => {
    const sh = new THREE.Group(); sh.position.set(s * 0.19, 1.0, 0);
    const up = cap(0.042, 0.2, shirt); up.position.y = -0.12; const fore = cap(0.036, 0.18, skin); fore.position.y = -0.34;
    const hand = mesh(new THREE.SphereGeometry(0.04, 14, 10), skin); hand.position.y = -0.47;
    sh.add(up, fore, hand); p.add(sh); return sh;
  });
  p.add(legs, hips, torso, collar, neck, head, hair); p.userData = { legs, torso, head, arms }; return p;
}
/** سيارة صغيرة عصرية */
function car(M, color) {
  const c = new THREE.Group();
  const body = mesh(rbox(0.9, 0.22, 0.42, 0.08), M.paint(color)); body.position.y = 0.2;
  const cab = mesh(rbox(0.5, 0.18, 0.36, 0.07), M.glassTint('#cfe6ff')); cab.position.set(-0.05, 0.38, 0);
  c.add(body, cab);
  for (const x of [-0.3, 0.3]) for (const z of [-0.2, 0.2]) {
    const w = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 24), M.rubber); w.rotation.x = Math.PI / 2; w.position.set(x, 0.1, z);
    const rim = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.085, 16), M.chrome); w.add(rim); c.add(w);
  }
  for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.08), M.led('#fff6d8', 2)); l.position.set(0.455, 0.22, s * 0.13); c.add(l); }
  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.012, 0.012), M.led('#7fd3ff', 1.8)); strip.position.set(0, 0.12, 0.215); c.add(strip);
  return c;
}
/** خط يُحدَّث من نقاط */
function polyLine(n, color, opacity = 1) {
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const l = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity })); l.frustumCulled = false; l.n = n;
  l.setPts = (pts) => { const a = geo.attributes.position; pts.forEach((p, i) => a.setXYZ(i, p.x, p.y, p.z)); geo.setDrawRange(0, pts.length); a.needsUpdate = true; };
  return l;
}
/** حبل/قضيب بين نقطتين (أسطوانة بطول 1 تُحجَّم) */
function rod(M, r = 0.012, mat) { const m = mesh(new THREE.CylinderGeometry(r, r, 1, 8), mat || M.anod('#d9c9a3', 0.6), false); m.setEnds = (a, b) => { const d = b.clone().sub(a); const L = d.length(); m.position.copy(a).addScaledVector(d, 0.5); m.scale.set(1, Math.max(L, 0.001), 1); if (L > 1e-6) m.quaternion.setFromUnitVectors(V(0, 1, 0), d.divideScalar(L)); }; return m; }
/** مؤقّت دوري لمشهد متحرك */
class Loop { constructor() { this.t = 0; } tick(dt, period) { this.t += dt; if (this.t > period) { this.t = 0; return true; } return false; } }
/** حلقة متوهجة على الأرض */
function glowRing(M, r, color) { const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 8, 96), M.led(color, 2.4)); m.rotation.x = Math.PI / 2; return m; }

/* ═══════════ 1-1: ميزان كافندش + نجم مضغوط وانحناء الضوء ═══════════ */
export class Orbits extends OrbitsM {
  constructor(ctx, defs) {
    super(ctx, defs);
    this.buildCav(this.group(2)); this.buildStar(this.group(3));
  }
  buildCav(Gr) {
    const M = this.M;
    for (const x of [-1.6, 1.6]) { const p = mesh(rbox(0.12, 2.75, 0.12, 0.04), M.graphite); p.position.set(x, 1.37, -0.7); Gr.add(p); }
    const bar = mesh(rbox(3.32, 0.12, 0.12, 0.04), M.graphite); bar.position.set(0, 2.75, -0.7);
    const arm = mesh(rbox(0.12, 0.1, 0.8, 0.03), M.graphite); arm.position.set(0, 2.75, -0.32);
    const fiber = rod(M, 0.004, M.chrome); fiber.setEnds(V(0, 2.7, 0), V(0, 1.47, 0));
    Gr.add(bar, arm, fiber);
    this.cRod = new THREE.Group(); this.cRod.position.y = 1.45;
    const bar2 = mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.6, 12), M.chrome); bar2.rotation.z = Math.PI / 2;
    const mirror = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.1), M.led('#dff3ff', 1.6)); mirror.position.z = 0.02;
    this.cSmall = [-1, 1].map((s) => { const b = mesh(new THREE.SphereGeometry(0.06, 32, 20), M.gold); b.position.x = s * 0.8; this.cRod.add(b); return b; });
    this.cRod.add(bar2, mirror); Gr.add(this.cRod);
    // مسار الكرتين الصغيرتين (دائرة مرجعية)
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.004, 6, 128), M.led('#ffd27a', 0.8)); ring.rotation.x = Math.PI / 2; ring.position.y = 1.45; Gr.add(ring);
    this.cBig = [1, -1].map((s) => { const b = mesh(new THREE.SphereGeometry(1, 40, 28), M.anod('#7d8590', 0.4)); const st = rod(M, 0.02, M.graphite); Gr.add(b, st); return { b, st, s }; });
    this.cF = [0, 1].map(() => { const a = new Arrow(COLORS.force, { label: 'F', radius: 0.022 }); Gr.add(a); return a; });
    this.cLab = liveLabel(Gr, '#ffd27a', 0.16); this.cLab.position.set(0, 2.45, 0.3);
    label(Gr, 'سلك لَيّ رفيع', V(0.45, 2.25, 0), '#9fb3d9', 0.12);
    this.cth = 0; this.cw = 0;
  }
  buildStar(Gr) {
    const M = this.M;
    this.grid = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 3.2, 56, 32), new THREE.MeshBasicMaterial({ color: '#6c9bff', wireframe: true, transparent: true, opacity: 0.3, depthWrite: false }));
    this.grid.rotation.x = -Math.PI / 2; this.grid.position.y = 0.95; Gr.add(this.grid);
    this.gridBase = this.grid.geometry.attributes.position.array.slice();
    this.star = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.5, 1.3), toneMapped: false }));
    this.halo = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), new THREE.MeshBasicMaterial({ color: '#9cc4ff', transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide }));
    this.horizon = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 10, 80), new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 1.2, 0.5), toneMapped: false })); this.horizon.rotation.x = Math.PI / 2 - 0.25;
    Gr.add(this.star, this.halo, this.horizon);
    this.ray = polyLine(120, '#ffe27a'); this.ray0 = dashedLine([V(-2.7, 1.75, 0.9), V(2.7, 1.75, 0.9)], '#ffffff', { opacity: 0.3 });
    this.photon = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), M.led('#fff2a8', 3));
    Gr.add(this.ray, this.ray0, this.photon);
    this.sLab = liveLabel(Gr, '#cfe1ff', 0.16); this.sLab.position.set(0, 2.85, 0);
    this.starKey = ''; this.ph = 0;
  }
  update(dt) {
    const m = this.mode; if (m < 2) return super.update(dt);
    this.applyMode(m === 3 ? this.baseParts.slice(0, 2) : []);
    if (m === 2) this.cav(dt); else this.starStep(dt);
  }
  cav(dt) {
    const { Mb, msm, rc } = this.p; const F = G * Mb * msm / (rc * rc);
    const d = 0.14 + rc * 1.1, rb = 0.1 + 0.07 * Math.cbrt(Mb / 158), rs = 0.035 + 0.03 * Math.cbrt(msm / 0.73);
    this.cSmall.forEach((b) => b.scale.setScalar(rs / 0.06));
    this.cBig.forEach(({ b, st, s }) => { b.scale.setScalar(rb); b.position.set(s * 0.8, 1.45, -s * (d + rb * 0.4)); st.setEnds(V(s * 0.8, 0, -s * (d + rb * 0.4)), V(s * 0.8, 1.45 - rb, -s * (d + rb * 0.4))); });
    // ميزان اللَّي يتذبذب ثم يستقر عند زاوية تتناسب مع القوة
    const eq = 0.32 * Math.tanh(F / 1.6e-7);
    this.cw += (-(this.cth - eq) * 5 - this.cw * 0.8) * dt; this.cth += this.cw * dt; this.cRod.rotation.y = this.cth;
    this.cSmall.forEach((b, i) => {
      const s = i ? 1 : -1; const p = V(s * 0.8 * Math.cos(this.cth), 1.45, -s * 0.8 * Math.sin(this.cth));
      const tgt = this.cBig.find((o) => o.s === s).b.position; const dir = tgt.clone().sub(p).normalize();
      this.cF[i].set(p, dir.multiplyScalar(Math.abs(vlen(F, 1.5e-7, 0.35))));
    });
    this.cLab.setText(`F = ${plainNum(F)} N · زاوية اللَّي ${plainNum(deg(this.cth))}°`);
    this.cavState = { F, th: deg(this.cth) };
  }
  starStep(dt) {
    const { Ms, Rk } = this.p; const gS = G * Ms * 1.99e30 / Math.pow(Rk * 1e3, 2); const lg = Math.log10(gS / 9.8);
    const bh = Rk <= 2.95 * Ms; const rv = 0.05 + 0.5 * Math.pow(Math.log10(Math.max(Rk, 1)) / Math.log10(20000), 1.4);
    const key = Ms.toFixed(2) + '|' + Rk.toFixed(0);
    if (key !== this.starKey) {
      this.starKey = key;
      const depth = clamp(0.12 + 0.1 * (lg - 3), 0.1, 1.4), w = 0.25 + rv * 0.8;
      const a = this.grid.geometry.attributes.position; const b = this.gridBase;
      for (let i = 0; i < a.count; i++) { const x = b[i * 3], y = b[i * 3 + 1]; const r2 = x * x + y * y; a.setZ(i, -depth * (w * w) / (r2 + w * w) * (bh ? 1.3 : 1)); }
      a.needsUpdate = true;
      const alpha = bh ? 9 : clamp(0.03 + 0.12 * (lg - 4), 0, 1.25);
      const pts = []; let x = -2.7, z = 0.9, ang = 0;
      for (let i = 0; i < 120; i++) {
        pts.push(V(x, 1.75, z)); if (bh && Math.hypot(x, z) < rv * 1.2) break;
        const dist = Math.hypot(x, z); const pull = alpha * 0.35 / Math.max(dist * dist, 0.05);
        ang += pull * 0.045 * (bh ? 1 : 1); x += Math.cos(ang) * 0.045; z -= Math.sin(ang) * 0.045;
        if (Math.abs(x) > 2.8 || z < -1.6) { pts.push(V(x, 1.75, z)); break; }
      }
      this.rayPts = pts; this.ray.setPts(pts); this.ph = 0;
    }
    this.star.scale.setScalar(rv); this.star.position.set(0, 1.75, 0);
    this.star.material.color.set(bh ? '#000000' : Rk < 100 ? '#cfe2ff' : '#ffffff').multiplyScalar(bh ? 1 : 1.5);
    this.halo.scale.setScalar(rv * (bh ? 1.6 : 1.9)); this.halo.position.copy(this.star.position);
    this.horizon.visible = bh; this.horizon.scale.setScalar(rv * 1.5); this.horizon.position.copy(this.star.position);
    this.ph = (this.ph + dt * 40) % (this.rayPts.length + 10); const k = Math.min(this.rayPts.length - 1, Math.floor(this.ph)); this.photon.position.copy(this.rayPts[k]);
    this.sLab.setText(bh ? 'ثقب أسود: الكتلة مضغوطة جداً فلا يفلت الضوء' : `g على السطح = ${plainNum(gS)} m/s² (${plainNum(gS / 9.8)} ضعف الأرض)`);
    this.starState = { g: gS, bh, W: 60 * gS };
  }
  modeReadout() {
    if (this.mode === 2) { const s = this.cavState || {}; return [['قوة التجاذب F', plainNum(s.F) + ' N'], ['زاوية لَيّ السلك', plainNum(s.th) + '°'], ['G = F r²/(m₁m₂)', '6.67×10⁻¹¹ N·m²/kg²'], ['القوة ضئيلة', 'لذا يلزم ميزان حساس جداً']]; }
    if (this.mode === 3) { const s = this.starState || {}; return [['تسارع الجاذبية g', plainNum(s.g) + ' m/s²'], ['مقارنة بالأرض', plainNum(s.g / 9.8) + ' ×'], ['وزن 60 kg هناك', plainNum(s.W) + ' N'], ['الحالة', s.bh ? 'ثقب أسود' : 'نجم مضغوط']]; }
    return super.modeReadout();
  }
  modeGraph() {
    if (this.mode === 2) { const s = this.cavState; return s && [{ label: 'زاوية اللَّي (°)', value: s.th, color: COLORS.torque }]; }
    if (this.mode === 3) return null;
    return super.modeGraph();
  }
}

/* ═══════════ 1-2: المصعد (الوزن الظاهري) + كتلة القصور + السقوط على كوكب ═══════════ */
export class Satellite extends withModes(SatelliteB) {
  constructor(ctx, defs) {
    super(ctx, defs);
    this.buildLift(this.group(1)); this.buildInertia(this.group(2)); this.buildPlanet(this.group(3));
  }
  buildLift(Gr) {
    const M = this.M;
    for (const x of [-0.85, 0.85]) { const r = mesh(rbox(0.1, 3.2, 0.1, 0.03), M.brushed); r.position.set(x, 1.6, -0.55); Gr.add(r); }
    const top = mesh(rbox(1.9, 0.14, 0.4, 0.04), M.graphite); top.position.set(0, 3.25, -0.35); Gr.add(top);
    this.cable = rod(M, 0.015, M.chrome); Gr.add(this.cable);
    this.cab = new THREE.Group(); Gr.add(this.cab);
    const floor = mesh(rbox(1.3, 0.07, 0.95, 0.03), M.graphite); const roof = mesh(rbox(1.3, 0.07, 0.95, 0.03), M.graphite); roof.position.y = 1.62;
    const back = new THREE.Mesh(new THREE.PlaneGeometry(1.24, 1.56), M.glassTint('#d9ecff')); back.position.set(0, 0.81, -0.46);
    for (const x of [-0.62, 0.62]) for (const z of [-0.45, 0.45]) { const p = mesh(rbox(0.05, 1.56, 0.05, 0.02), M.brushed); p.position.set(x, 0.81, z); this.cab.add(p); }
    const strip = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.012, 0.012), M.led('#7fd3ff', 2.4)); strip.position.set(0, 1.57, 0.47);
    this.scaleBox = mesh(rbox(0.44, 0.06, 0.34, 0.02), M.ceramic); this.scaleBox.position.set(0, 0.065, 0.05);
    this.rider = person(M, '#4cc3ff'); this.rider.scale.setScalar(0.95); this.cab.add(floor, roof, back, strip, this.scaleBox, this.rider);
    this.disp = liveLabel(this.cab, '#7fffb2', 0.15); this.disp.position.set(0.48, 0.25, 0.4);
    this.lW = new Arrow(COLORS.weight, { label: 'F', sub: 'g' }); this.lN = new Arrow(COLORS.normal, { label: 'F', sub: 'N' }); this.lA = new Arrow(COLORS.velocity, { label: 'a', radius: 0.03 });
    this.cab.add(this.lW, this.lN, this.lA);
    this.ly = 0.8; this.lv = 0;
  }
  buildInertia(Gr) {
    const M = this.M;
    const track = mesh(rbox(4.6, 0.08, 0.5, 0.03), M.brushed); track.position.set(-0.4, 0.6, 0.2);
    const led = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.012, 0.012), M.led('#7fd3ff', 2.2)); led.position.set(-0.4, 0.56, 0.46);
    for (const x of [-2.5, 1.7]) { const l = mesh(rbox(0.12, 0.56, 0.4, 0.04), M.graphite); l.position.set(x, 0.28, 0.2); Gr.add(l); }
    this.icart = new THREE.Group(); const body = mesh(rbox(1, 0.22, 0.36, 0.06), M.paint('#4cc3ff')); body.position.y = 0.11; this.icart.add(body);
    this.ibody = body; this.ispr = rod(M, 0.01, M.chrome); this.igrip = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.2, 14), M.paint('#e8513a')); this.igrip.rotation.x = Math.PI / 2;
    this.iF = new Arrow(COLORS.force, { label: 'F' }); this.ia = new Arrow(COLORS.velocity, { label: 'a', radius: 0.025 });
    Gr.add(track, led, this.icart, this.ispr, this.igrip, this.iF, this.ia);
    // ميزان ذو كفتين: كتلة الجاذبية
    const B = new THREE.Group(); B.position.set(2.3, 0, -0.5);
    const post = mesh(rbox(0.08, 1.3, 0.08, 0.03), M.brushed); post.position.y = 0.65; const base = mesh(rbox(0.6, 0.06, 0.4, 0.02), M.graphite); base.position.y = 0.03;
    const beam = mesh(rbox(1.1, 0.04, 0.05, 0.015), M.chrome); beam.position.y = 1.3;
    B.add(post, base, beam);
    for (const s of [-1, 1]) { const pan = mesh(lathe([[0, 0], [0.18, 0], [0.2, 0.03]], 32), M.brushed); pan.position.set(s * 0.52, 0.85, 0); const h = rod(M, 0.004, M.chrome); h.setEnds(V(s * 0.52, 1.3, 0), V(s * 0.52, 0.87, 0)); B.add(pan, h); }
    this.panA = mesh(rbox(1, 1, 1, 0.1), M.paint('#4cc3ff')); this.panB = mesh(weightGeo(), M.gold); B.add(this.panA, this.panB);
    label(B, 'كتلة الجاذبية', V(0, 1.6, 0), '#ffd27a', 0.13); Gr.add(B);
    this.it = 0;
  }
  buildPlanet(Gr) {
    const M = this.M;
    this.pads = [['#3f8fe0', 'الأرض'], ['#c1440e', 'الكوكب']].map(([c, n], i) => {
      const x = i ? 1.1 : -1.1;
      const pad = mesh(lathe([[0, 0], [0.8, 0], [0.82, 0.05], [0.78, 0.12], [0, 0.12]], 48), M.paint(c, 0.6)); pad.position.x = x;
      const tower = mesh(rbox(0.1, 2.3, 0.1, 0.03), M.graphite); tower.position.set(x - 0.45, 1.15, -0.2);
      const arm = mesh(rbox(0.5, 0.06, 0.08, 0.02), M.graphite); arm.position.set(x - 0.2, 2.3, -0.2);
      const ball = mesh(new THREE.SphereGeometry(0.09, 28, 20), M.chrome);
      for (let k = 0; k <= 4; k++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.01, 0.02), M.led(c, 1.6)); t.position.set(x - 0.38, 0.21 + k * 0.5, -0.15); Gr.add(t); }
      label(Gr, n, V(x, 2.6, 0), c, 0.16); Gr.add(pad, tower, arm, ball);
      const tr = this.trail(Gr, c, 40, 0.03);
      return { x, ball, tr, landed: false };
    });
    this.pt = 0;
  }
  update(dt) {
    const m = this.mode; this.applyMode([]);
    if (m === 0) return super.update(dt);
    if (m === 1) return this.lift(dt);
    if (m === 2) return this.inertia(dt);
    return this.planet(dt);
  }
  lift(dt) {
    const { mp, acc } = this.p; const Fs = Math.max(0, mp * (g + acc)); const av = acc * 0.045;
    if (Math.abs(acc) < 0.05) this.lv = damp(this.lv, 0, 3, dt); else this.lv += av * dt;
    this.ly += this.lv * dt; if (this.ly > 1.45 || this.ly < 0.1) { this.ly = acc > 0 ? 0.15 : 1.4; this.lv = 0; }
    this.cab.position.set(0, this.ly, 0); this.cable.setEnds(V(0, 3.2, -0.1), V(0, this.ly + 1.66, -0.1));
    const float = Fs < mp * 0.5 ? 0.12 * (0.5 + 0.5 * Math.sin(this.t * 2)) * (1 - Fs / (mp * 0.5)) : 0;
    this.rider.position.set(0, 0.1 + float, 0.05); this.rider.rotation.z = float * 0.6;
    const FL = (F) => Math.abs(vlen(F, 800, 0.8));
    this.lW.set(V(-0.25, 0.85 + float, 0.3), V(0, -FL(mp * g), 0));
    if (Fs > 1) this.lN.set(V(0.25, 0.1, 0.3), V(0, FL(Fs), 0)); else this.lN.visible = false;
    this.lA.set(V(0.75, 0.8, 0.5), V(0, Math.sign(acc) * Math.abs(vlen(acc, 5, 0.6)), 0));
    this.disp.setText(Fs < 1 ? 'الميزان: 0 N (انعدام وزن)' : `الميزان: ${plainNum(Fs)} N`);
    this.liftState = { W: mp * g, Fs, acc };
  }
  inertia(dt) {
    const { Fi, ai } = this.p; const mI = Fi / ai; const s = 0.6 + 0.45 * Math.cbrt(mI / 4);
    this.it += dt; const av = ai * 0.12; let x = -2.0 + 0.5 * av * this.it * this.it;
    if (x > 1.0) { if (this.it > Math.sqrt(2 * 3.0 / av) + 0.7) this.it = 0; x = 1.0; }
    this.icart.position.set(x, 0.64, 0.2); this.icart.scale.set(s, s, s);
    const front = x + 0.5 * s; this.igrip.position.set(front + 0.45, 0.75, 0.2); this.ispr.setEnds(V(front, 0.75, 0.2), V(front + 0.35, 0.75, 0.2));
    this.iF.set(V(front + 0.55, 0.75, 0.2), V(Math.abs(vlen(Fi, 20, 0.8)), 0, 0));
    this.ia.set(V(x, 0.95 + 0.25 * s, 0.2), V(Math.abs(vlen(ai, 4, 0.7)), 0, 0));
    const ps = 0.12 + 0.06 * Math.cbrt(mI / 4); this.panA.scale.setScalar(ps); this.panA.position.set(-0.52, 0.86 + ps / 2, 0);
    this.panB.scale.setScalar(ps * 1.1); this.panB.position.set(0.52, 0.86, 0);
    this.inState = { mI, F: Fi, a: ai };
  }
  planet(dt) {
    const { mpl, rpl } = this.p; const gP = G * mpl * 1e23 / Math.pow(rpl * 1e6, 2); const H = 2.0;
    this.pt += dt; const gs = [g, gP]; let done = true;
    this.pads.forEach((o, i) => {
      const tf = Math.sqrt(2 * H / gs[i]); const t = Math.min(this.pt, tf); const y = H - 0.5 * gs[i] * t * t;
      o.ball.position.set(o.x - 0.2, 0.21 + y * 1.0, -0.2 + 0.05); if (t < tf) { done = false; o.tr.push(o.ball.position); }
    });
    if (done && this.pt > Math.sqrt(2 * H / Math.min(...gs)) + 1.2) { this.pt = 0; this.pads.forEach((o) => o.tr.clear()); }
    this.plState = { g: gP, tE: Math.sqrt(2 * H / g), tP: Math.sqrt(2 * H / gP), W: 60 * gP };
  }
  modeReadout() {
    if (this.mode === 1) { const s = this.liftState || {}; return [['الوزن الحقيقي mg', plainNum(s.W) + ' N'], ['قراءة الميزان m(g+a)', plainNum(s.Fs) + ' N'], ['تسارع المصعد a', plainNum(s.acc) + ' m/s²'], ['الحالة', s.Fs < 1 ? 'انعدام وزن (سقوط حر)' : s.acc > 0.05 ? 'تشعر بثقل أكبر' : s.acc < -0.05 ? 'تشعر بخفة' : 'وزن طبيعي']]; }
    if (this.mode === 2) { const s = this.inState || {}; return [['القوة المحصلة F', plainNum(s.F) + ' N'], ['التسارع المقاس a', plainNum(s.a) + ' m/s²'], ['كتلة القصور F/a', plainNum(s.mI) + ' kg'], ['كتلة الجاذبية', plainNum(s.mI) + ' kg (متساويتان)']]; }
    const s = this.plState || {}; return [['g على الكوكب', plainNum(s.g) + ' m/s²'], ['زمن السقوط من 2 m (الأرض)', plainNum(s.tE) + ' s'], ['زمن السقوط (الكوكب)', plainNum(s.tP) + ' s'], ['وزن 60 kg هناك', plainNum(s.W) + ' N']];
  }
  modeGraph() {
    if (this.mode === 1) { const s = this.liftState; return s && [{ label: 'قراءة الميزان (N)', value: s.Fs, color: COLORS.normal }]; }
    if (this.mode === 3) { const s = this.plState; return s && [{ label: 'g الكوكب', value: s.g, color: '#c1440e' }, { label: 'g الأرض', value: g, color: '#3f8fe0' }]; }
    return null;
  }
}

/* ═══════════ 2-1: الراديان والإزاحة الزاوية ═══════════ */
export class Disk extends withModes(DiskB) {
  constructor(ctx, defs) {
    super(ctx, defs);
    const M = this.M; const Gr = this.group(1); Gr.position.set(0, 1.6, 0);
    const face = mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.05, 96).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#0c1220', roughness: 0.35, metalness: 0.3 })); face.position.z = -0.06;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.018, 8, 160), M.led('#3fd6c6', 2.4));
    for (let k = 0; k < 24; k++) { const a = k / 24 * TAU; const t = new THREE.Mesh(new THREE.BoxGeometry(k % 6 ? 0.05 : 0.11, 0.012, 0.01), M.led('#ffffff', 1.2)); t.position.set(Math.cos(a) * 1.29, Math.sin(a) * 1.29, -0.02); t.rotation.z = a; Gr.add(t); }
    const post = mesh(lathe([[0, 0], [0.5, 0], [0.52, 0.04], [0.14, 0.12], [0.08, 1.6], [0, 1.6]], 40), M.graphite); post.position.set(0, -1.6, -0.25);
    const hub = mesh(new THREE.SphereGeometry(0.06, 20, 14), M.chrome);
    this.radArm = mesh(rbox(1, 0.035, 0.03, 0.012), M.brushed); this.radArm.geometry.translate(0.5, 0, 0);
    this.base0 = mesh(rbox(1, 0.02, 0.02, 0.008), M.led('#ffffff', 0.8)); this.base0.geometry.translate(0.5, 0, 0);
    this.radArc = mesh(this.arcGeo(0.05, 1), M.led('#ffd23f', 2.2), false); this.radArc1 = mesh(this.arcGeo(0.05, 1), M.led('#ff6bd6', 2.4), false);
    this.radDots = []; for (let k = 1; k <= 12; k++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), M.led('#ff6bd6', 2.4)); Gr.add(d); this.radDots.push(d); }
    this.rLab = label(Gr, 'r', V(), '#9fe8ff', 0.16); this.oneRad = label(Gr, '1 rad', V(), '#ff9ee8', 0.14);
    this.thLab = liveLabel(Gr, '#ffd23f', 0.17); this.thLab.position.set(0, 1.62, 0);
    Gr.add(face, rim, post, hub, this.radArm, this.base0, this.radArc, this.radArc1);
    this.sweep = 0; this.lastArc = '';
  }
  arcGeo(th, R) {
    const n = Math.max(2, Math.ceil(th / TAU * 160)); const pts = [];
    for (let i = 0; i <= n; i++) { const a = th * i / n; const r = R * (1 - 0.07 * a / TAU); pts.push(V(Math.cos(a) * r, Math.sin(a) * r, 0.01)); }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, 0.022, 6, false);
  }
  update(dt) {
    const m = this.mode; this.applyMode([]);
    if (m === 0) return super.update(dt);
    const { th, r } = this.p; const thr = th * DEG; const R = 0.45 + 0.4 * r;
    this.sweep += dt; const D = 1.2 + thr * 0.25; const u = ease(this.sweep / D); if (this.sweep > D + 1.8) this.sweep = 0;
    const cur = thr * u; const key = (Math.round(deg(cur) * 2) / 2).toFixed(1) + R.toFixed(2);
    if (key !== this.lastArc) {
      this.lastArc = key; const ok = cur > 0.01; this.radArc.visible = this.radArc1.visible = ok;
      if (ok) { this.radArc.geometry.dispose(); this.radArc1.geometry.dispose(); this.radArc.geometry = this.arcGeo(cur, R); this.radArc1.geometry = this.arcGeo(Math.min(cur, 1), R + 0.04); }
    }
    this.radArm.rotation.z = cur; this.radArm.scale.x = R; this.base0.scale.x = R;
    this.radDots.forEach((d, k) => { const a = k + 1; d.visible = a <= cur; const rr = R * (1 - 0.07 * a / TAU); d.position.set(Math.cos(a) * rr, Math.sin(a) * rr, 0.03); });
    this.rLab.position.set(Math.cos(cur) * R * 0.5 - Math.sin(cur) * 0.12, Math.sin(cur) * R * 0.5 + Math.cos(cur) * 0.12, 0.05);
    this.oneRad.visible = cur >= 1; this.oneRad.position.set(Math.cos(0.5) * (R + 0.25), Math.sin(0.5) * (R + 0.25), 0.05);
    this.thLab.setText(`θ = ${plainNum(deg(cur))}° = ${plainNum(cur)} rad`);
    this.radState = { deg: th, rad: thr, s: r * thr, rev: th / 360 };
  }
  modeReadout() { const s = this.radState || {}; return [['الزاوية بالدرجات', plainNum(s.deg) + '°'], ['الزاوية بالراديان', plainNum(s.rad) + ' rad'], ['طول القوس s = rθ', plainNum(s.s) + ' m'], ['عدد الدورات', plainNum(s.rev)]]; }
  modeGraph() { const s = this.radState; return s && [{ label: 'θ (rad)', value: s.rad, color: '#ffd23f' }]; }
}

/* ═══════════ 2-2: محصلة العزم + عزم القصور + فتح باب ═══════════ */
export class Torque extends withModes(TorqueB) {
  constructor(ctx, defs) {
    super(ctx, defs);
    this.buildNet(this.group(1)); this.buildInertia(this.group(2)); this.buildDoor(this.group(3));
  }
  stand(Gr, x, y) {
    const M = this.M;
    for (const s of [-1, 1]) { const leg = mesh(rbox(0.1, y + 0.05, 0.12, 0.04), M.anod('#ffb02e', 0.3)); leg.position.set(x + s * 0.28, (y + 0.05) / 2, -0.32); leg.rotation.z = -s * 0.16; Gr.add(leg); }
    const plate = mesh(rbox(1.0, 0.07, 0.8, 0.03), M.graphite); plate.position.set(x, 0.035, -0.1);
    const brg = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.24, 24).rotateX(Math.PI / 2), M.chrome); brg.position.set(x, y, -0.32);
    Gr.add(plate, brg);
  }
  buildNet(Gr) {
    const M = this.M; this.stand(Gr, 0, 1.75);
    this.nW = new THREE.Group(); this.nW.position.set(0, 1.75, 0.05); Gr.add(this.nW);
    this.bigD = mesh(new THREE.CylinderGeometry(1, 1, 0.07, 72).rotateX(Math.PI / 2), M.brushed); this.bigD.position.z = 0.08;
    this.bigRim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 8, 120), M.led('#c77dff', 2.4)); this.bigRim.position.z = 0.12;
    this.smallD = mesh(new THREE.CylinderGeometry(1, 1, 0.12, 48).rotateX(Math.PI / 2), M.gold); this.smallD.position.z = -0.04;
    const mark = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.02), M.led('#ffffff', 1.6)); mark.position.set(0, 0.25, 0.13); this.nMark = mark;
    this.nW.add(this.bigD, this.bigRim, this.smallD, mark);
    this.r1 = rod(M); this.r2 = rod(M); this.w1 = mesh(weightGeo(), M.paint('#e8613f')); this.w2 = mesh(weightGeo(), M.paint('#3f8fe0'));
    this.f1 = new Arrow(COLORS.force, { label: 'F', sub: '1' }); this.f2 = new Arrow(COLORS.force, { label: 'F', sub: '2' }); this.tN = new Arrow(COLORS.torque, { label: 'Στ' });
    Gr.add(this.r1, this.r2, this.w1, this.w2, this.f1, this.f2, this.tN);
    this.nth = 0; this.nw = 0; this.nt = 0;
  }
  buildInertia(Gr) {
    const M = this.M; this.stand(Gr, -1.3, 1.5); this.stand(Gr, 1.3, 1.5);
    this.ringW = new THREE.Group(); this.ringW.position.set(-1.3, 1.5, 0.05);
    const ring = mesh(new THREE.TorusGeometry(1, 0.07, 16, 96), M.anod('#ffb02e', 0.3)); for (let k = 0; k < 3; k++) { const sp = mesh(new THREE.BoxGeometry(0.02, 2, 0.02), M.graphite); sp.rotation.z = k / 3 * Math.PI; this.ringW.add(sp); }
    this.diskW = new THREE.Group(); this.diskW.position.set(1.3, 1.5, 0.05);
    const disk = mesh(new THREE.CylinderGeometry(1, 1, 0.12, 64).rotateX(Math.PI / 2), M.brushed);
    for (const w of [this.ringW, this.diskW]) { const mk = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.85, 0.02), M.led('#ffffff', 1.8)); mk.position.set(0, 0.5, 0.08); w.add(mk); }
    this.ringW.add(ring); this.diskW.add(disk); Gr.add(this.ringW, this.diskW);
    label(Gr, 'حلقة: I = mr²', V(-1.3, 2.75, 0), '#ffb02e', 0.15); label(Gr, 'قرص: I = ½mr²', V(1.3, 2.75, 0), '#cfd6e2', 0.15);
    this.tR = new Arrow(COLORS.torque, { label: 'τ' }); this.tD = new Arrow(COLORS.torque, { label: 'τ' }); Gr.add(this.tR, this.tD);
    this.iLab = [liveLabel(Gr, '#ffb02e', 0.14), liveLabel(Gr, '#cfd6e2', 0.14)]; this.iLab[0].position.set(-1.3, 0.25, 0.4); this.iLab[1].position.set(1.3, 0.25, 0.4);
    this.it = 0;
  }
  buildDoor(Gr) {
    const M = this.M;
    const wall = mesh(rbox(0.25, 2.6, 1.6, 0.03), M.ceramic); wall.position.set(-1.62, 1.3, -0.5);
    const frameTop = mesh(rbox(2.2, 0.16, 0.2, 0.03), M.ceramic); frameTop.position.set(-0.4, 2.53, 0);
    const floor = mesh(rbox(4.2, 0.04, 3, 0.02), M.graphite); floor.position.set(0, 0.02, -0.4);
    this.door = new THREE.Group(); this.door.position.set(-1.45, 0, 0);
    const panel = mesh(rbox(2.0, 2.4, 0.07, 0.03), M.anod('#8a5a34', 0.45)); panel.position.set(1.0, 1.24, 0);
    const handle = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 12), M.chrome); handle.rotation.x = Math.PI / 2; handle.position.set(1.85, 1.15, 0.08);
    for (const y of [0.4, 2.1]) { const h = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.18, 12), M.gold); h.position.set(0.02, y, 0.04); this.door.add(h); }
    this.door.add(panel, handle);
    this.dF = new Arrow(COLORS.force, { label: 'F' }); this.dArm = dashedLine([V(), V(1, 0, 0)], COLORS.displacement); this.dDot = new THREE.Mesh(new THREE.SphereGeometry(0.04, 14, 10), M.led('#ff4d5e', 2.4));
    this.door.add(this.dF, this.dArm, this.dDot);
    this.dLab = liveLabel(Gr, '#ffb02e', 0.15); this.dLab.position.set(0.2, 2.9, 0);
    Gr.add(wall, frameTop, floor, this.door);
    this.dAng = 0; this.dW = 0; this.dt0 = 0;
  }
  update(dt) {
    const m = this.mode; this.applyMode([]);
    if (m === 0) return super.update(dt);
    if (m === 1) return this.net(dt);
    if (m === 2) return this.inert(dt);
    return this.doorStep(dt);
  }
  net(dt) {
    const { F1, r1, F2, r2, I } = this.p; const R1 = 0.2 + r1 * 1.15, R2 = 0.2 + r2 * 1.15;
    this.bigD.scale.set(R1, R1, 1); this.bigRim.scale.set(R1, R1, 1); this.smallD.scale.set(R2, R2, 1); this.nMark.position.y = R1 * 0.5; this.nMark.scale.y = R1 * 2;
    const tau = F1 * r1 - F2 * r2, al = tau / I;
    this.nt += dt; this.nw += al * dt * 0.15; this.nth += this.nw * dt;
    const L1 = 1.0 + this.nth * R1, L2 = 1.0 - this.nth * R2;
    if (this.nt > 4.5 || L1 < 0.25 || L1 > 1.55 || L2 < 0.25 || L2 > 1.55) { this.nt = 0; this.nw = 0; this.nth = 0; }
    this.nW.rotation.z = this.nth;
    const y0 = 1.75, s1 = 0.2 + 0.14 * Math.cbrt(F1 / 40), s2 = 0.2 + 0.14 * Math.cbrt(F2 / 40);
    const l1 = clamp(L1, 0.25, 1.55), l2 = clamp(L2, 0.25, 1.55);
    this.r1.setEnds(V(-R1, y0, 0.13), V(-R1, y0 - l1, 0.13)); this.r2.setEnds(V(R2, y0, -0.04), V(R2, y0 - l2, -0.04));
    this.w1.scale.setScalar(s1); this.w1.position.set(-R1, y0 - l1 - s1 * 0.92, 0.13); this.w2.scale.setScalar(s2); this.w2.position.set(R2, y0 - l2 - s2 * 0.92, -0.04);
    const FL = (F) => Math.abs(vlen(F, 60, 0.7));
    this.f1.set(V(-R1 - 0.12, y0 - l1 - s1 * 0.5, 0.3), V(0, -FL(F1), 0)); this.f2.set(V(R2 + 0.12, y0 - l2 - s2 * 0.5, 0.3), V(0, -FL(F2), 0));
    this.tN.set(V(0, y0, 0.2), V(0, 0, Math.sign(tau) * Math.abs(vlen(tau, 20, 0.8))));
    this.netState = { t1: F1 * r1, t2: F2 * r2, tau, al };
  }
  inert(dt) {
    const { mm, rw, tq } = this.p; const Ir = mm * rw * rw, Id = 0.5 * mm * rw * rw; const ar = tq / Ir, ad = tq / Id; const R = 0.35 + rw * 1.2;
    this.ringW.scale.set(R, R, 1); this.diskW.scale.set(R, R, 1);
    this.it += dt; if (this.it > 3.5) this.it = 0; const t = Math.min(this.it, 3);
    this.ringW.rotation.z = -0.5 * Math.min(ar, 40) * t * t * 0.1; this.diskW.rotation.z = -0.5 * Math.min(ad, 40) * t * t * 0.1;
    const TL = Math.abs(vlen(tq, 4, 0.7)); this.tR.set(V(-1.3, 1.5, 0.15), V(0, 0, -TL)); this.tD.set(V(1.3, 1.5, 0.15), V(0, 0, -TL));
    this.iLab[0].setText(`α = ${plainNum(ar)} rad/s²`); this.iLab[1].setText(`α = ${plainNum(ad)} rad/s²`);
    this.inState = { Ir, Id, ar, ad, wr: ar * t, wd: ad * t };
  }
  doorStep(dt) {
    const { F, r, theta } = this.p; const th = theta * DEG; const tau = F * r * Math.sin(th); const rv = 0.25 + r * 2.0;
    this.dt0 += dt; this.dW += tau / 30 * dt; this.dAng += this.dW * dt;
    if (this.dAng > 1.45 || this.dt0 > 5) { this.dAng = 0; this.dW = 0; this.dt0 = 0; }
    this.door.rotation.y = this.dAng;
    const at = V(rv, 1.15, 0.05); const dir = V(Math.cos(th), 0, -Math.sin(th));
    this.dDot.position.copy(at);
    this.dF.set(at.clone().sub(dir.clone().multiplyScalar(Math.abs(vlen(F, 80, 0.9)) + 0.05)), dir.clone().multiplyScalar(Math.abs(vlen(F, 80, 0.9))));
    const arm = rv * Math.sin(th); const p = this.dArm.geometry.attributes.position; p.setXYZ(0, 0, 1.15, 0.06); p.setXYZ(1, rv, 1.15, 0.06); p.needsUpdate = true; this.dArm.computeLineDistances();
    this.dLab.setText(`τ = F r sinθ = ${plainNum(tau)} N·m`);
    this.doorState = { tau, arm: r * Math.sin(th), max: F * r };
  }
  modeReadout() {
    if (this.mode === 1) { const s = this.netState || {}; return [['عزم القوة الأولى F₁r₁', plainNum(s.t1) + ' N·m'], ['عزم القوة الثانية F₂r₂', plainNum(s.t2) + ' N·m'], ['محصلة العزم Στ', plainNum(s.tau) + ' N·m'], ['التسارع الزاوي α = Στ/I', plainNum(s.al) + ' rad/s²']]; }
    if (this.mode === 2) { const s = this.inState || {}; return [['I للحلقة', plainNum(s.Ir) + ' kg·m²'], ['I للقرص', plainNum(s.Id) + ' kg·m²'], ['α للحلقة', plainNum(s.ar) + ' rad/s²'], ['α للقرص', plainNum(s.ad) + ' rad/s² (ضعف الحلقة)']]; }
    const s = this.doorState || {}; return [['العزم τ', plainNum(s.tau) + ' N·m'], ['ذراع القوة r sinθ', plainNum(s.arm) + ' m'], ['أكبر عزم (θ = 90°)', plainNum(s.max) + ' N·m'], ['القوة نحو المفصّلة', 'لا تفتح الباب (τ = 0)']];
  }
  modeGraph() {
    if (this.mode === 1) { const s = this.netState; return s && [{ label: 'Στ (N·m)', value: s.tau, color: COLORS.torque }]; }
    if (this.mode === 2) { const s = this.inState; return s && [{ label: 'ω الحلقة', value: s.wr, color: '#ffb02e' }, { label: 'ω القرص', value: s.wd, color: '#cfd6e2' }]; }
    const s = this.doorState; return s && [{ label: 'τ (N·m)', value: s.tau, color: COLORS.torque }];
  }
}

/* ═══════════ 2-3: الاستقرار ومركز الكتلة + القوة الطاردة المركزية + كوريوليس ═══════════ */
export class Seesaw extends withModes(SeesawB, 3) {
  constructor(ctx, defs) {
    super(ctx, defs);
    this.buildTip(this.group(3)); this.buildCarousel(this.group(4)); this.buildCoriolis(this.group(5));
  }
  buildTip(Gr) {
    const M = this.M;
    const floor = mesh(rbox(3.6, 0.1, 1.6, 0.03), M.ceramic); floor.position.y = 0.05; Gr.add(floor);
    this.tipPivot = new THREE.Group(); this.tipPivot.position.set(0.6, 0.1, 0); Gr.add(this.tipPivot);
    this.tipBox = mesh(rbox(1, 1, 0.7, 0.04), M.paint('#e6b36a')); this.tipPivot.add(this.tipBox);
    this.cm = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 14), M.led('#ff4d5e', 2.6)); this.tipPivot.add(this.cm);
    this.plumb = polyLine(2, '#ff4d5e'); Gr.add(this.plumb);
    this.edgeDot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), M.led('#7fffb2', 2.4)); this.edgeDot.position.set(0.6, 0.12, 0.38); Gr.add(this.edgeDot);
    this.tipLab = liveLabel(Gr, '#ffffff', 0.16); this.tipLab.position.set(0, 3.0, 0);
    this.Wt = new Arrow(COLORS.weight, { label: 'F', sub: 'g' }); Gr.add(this.Wt);
    this.tt = 0; this.tAng = 0; this.fell = false;
  }
  buildCarousel(Gr) {
    const M = this.M;
    const base = mesh(lathe([[0, 0], [2.5, 0], [2.55, 0.05], [2.45, 0.22], [0, 0.22]], 72), M.graphite); Gr.add(base);
    this.car = new THREE.Group(); this.car.position.y = 0.22; Gr.add(this.car);
    const tex = canvasTex(1024, 1024, (gg, w) => { const c = w / 2; gg.fillStyle = '#20263a'; gg.fillRect(0, 0, w, w); for (let k = 0; k < 12; k++) { gg.fillStyle = k % 2 ? '#2a3350' : '#ff9e3d'; gg.beginPath(); gg.moveTo(c, c); gg.arc(c, c, c, k / 12 * TAU, (k + 1) / 12 * TAU); gg.fill(); } gg.strokeStyle = 'rgba(255,255,255,.4)'; gg.lineWidth = 4; for (let r = 100; r < c; r += 100) { gg.beginPath(); gg.arc(c, c, r, 0, TAU); gg.stroke(); } });
    const plat = new THREE.Mesh(new THREE.CircleGeometry(2.3, 96), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 })); plat.rotation.x = -Math.PI / 2; plat.position.y = 0.01;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.025, 8, 160), M.led('#ff9e3d', 2.4)); rim.rotation.x = Math.PI / 2;
    const pole = mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 16), M.chrome); pole.position.y = 1.1;
    this.carRider = person(M, '#ff9e3d'); this.carRider.scale.setScalar(0.85);
    this.cFc = new Arrow(COLORS.force, { label: 'F', sub: 'c' }); this.cV = new Arrow(COLORS.velocity, { label: 'v' }); this.cFake = new Arrow('#ffffff', { label: 'وهمية', dashed: true, labelSize: 0.13 });
    this.car.add(plat, rim, pole, this.carRider, this.cFc, this.cV, this.cFake);
    this.cLab = liveLabel(Gr, '#ff9e3d', 0.15); this.cLab.position.set(0, 2.9, 0);
    this.cAng = 0;
  }
  buildCoriolis(Gr) {
    const M = this.M; const tilt = new THREE.Group(); tilt.position.y = 1.0; tilt.rotation.x = 0.42; Gr.add(tilt);
    const stand = mesh(lathe([[0, 0], [0.6, 0], [0.62, 0.05], [0.2, 0.12], [0.12, 1.0], [0, 1.0]], 40), M.graphite); stand.position.y = -1.0; Gr.add(stand); stand.position.set(0, 0, -0.4);
    this.cDisk = new THREE.Group(); tilt.add(this.cDisk);
    const tex = canvasTex(1024, 1024, (gg, w) => { const c = w / 2; gg.fillStyle = '#10182a'; gg.fillRect(0, 0, w, w); gg.strokeStyle = 'rgba(127,211,255,.35)'; gg.lineWidth = 3; for (let r = 80; r < c; r += 80) { gg.beginPath(); gg.arc(c, c, r, 0, TAU); gg.stroke(); } for (let k = 0; k < 16; k++) { const a = k / 16 * TAU; gg.beginPath(); gg.moveTo(c, c); gg.lineTo(c + Math.cos(a) * c, c + Math.sin(a) * c); gg.stroke(); } gg.fillStyle = '#3fd6c6'; gg.fillRect(c, c - 6, c, 12); });
    const top = new THREE.Mesh(new THREE.CircleGeometry(1.9, 96), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35, metalness: 0.2 })); top.rotation.x = -Math.PI / 2;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.02, 8, 160), M.led('#3fd6c6', 2.4)); rim.rotation.x = Math.PI / 2;
    this.cDisk.add(top, rim);
    this.corTrail = this.trail(this.cDisk, '#ffd23f', 160, 0.05);
    this.corBall = mesh(new THREE.SphereGeometry(0.07, 24, 16), M.paint('#ffd23f')); tilt.add(this.corBall);
    tilt.add(dashedLine([V(0, 0.05, 0), V(1.9, 0.05, 0)], '#ffffff', { opacity: 0.5 }));
    this.corLab = liveLabel(Gr, '#ffd23f', 0.15); this.corLab.position.set(0, 2.75, 0);
    label(Gr, 'المسار كما يراه مراقب خارجي: مستقيم ---', V(-1.1, 2.4, 0), '#ffffff', 0.11);
    this.ct = 0; this.cdA = 0;
  }
  update(dt) {
    const m = this.mode; this.applyMode([]);
    if (m < 3) return super.update(dt);
    if (m === 3) return this.tip(dt);
    if (m === 4) return this.carousel(dt);
    return this.coriolis(dt);
  }
  tip(dt) {
    const { bw, bh, tilt } = this.p; const thc = Math.atan(bw / (2 * bh)); const target = tilt * DEG;
    const k = Math.min(1, 2.6 / (2 * bh)); const W = bw * k, H = 2 * bh * k;
    this.tipBox.scale.set(W, H, 1); this.tipBox.position.set(-W / 2, H / 2, 0); this.cm.position.set(-W / 2, H / 2, 0.38);
    this.tt += dt;
    if (this.tt < 1.5) { this.tAng = target * ease(this.tt / 1.5); this.fell = false; }
    else if (this.tt < 2.1) this.tAng = target;
    else if (target > thc) { this.fell = true; this.tAng = Math.min(Math.PI / 2, this.tAng + (this.tAng - thc + 0.05) * dt * 3.5); if (this.tt > 4.5) this.tt = 0; }
    else { this.tAng = damp(this.tAng, 0, 4, dt); if (this.tt > 3.6) this.tt = 0; }
    this.tipPivot.rotation.z = -this.tAng;
    const cmW = V(-W / 2, H / 2, 0.38).applyAxisAngle(V(0, 0, 1), -this.tAng).add(this.tipPivot.position);
    this.plumb.setPts([cmW, V(cmW.x, 0.11, cmW.z)]); this.Wt.set(cmW.clone().add(V(0, 0, 0.05)), V(0, -0.55, 0));
    const outside = cmW.x > 0.6; this.cm.material = this.M.led(outside ? '#ff4d5e' : '#7fffb2', 2.6);
    this.tipLab.setText(this.fell ? 'مركز الكتلة خرج عن قاعدة الارتكاز ⇐ ينقلب' : `زاوية الانقلاب θc = ${plainNum(deg(thc))}°`);
    this.tipState = { thc: deg(thc), tilt, stable: target <= thc };
  }
  carousel(dt) {
    const { mr, rr, om } = this.p; const rv = 0.35 + rr * 0.6; const a = om * om * rr, F = mr * a, v = om * rr;
    this.cAng += om * dt; this.car.rotation.y = this.cAng;
    this.carRider.position.set(rv, 0, 0); this.carRider.rotation.y = Math.PI / 2;
    const FL = Math.abs(vlen(F, 400, 0.8));
    this.cFc.set(V(rv - 0.05, 0.75, 0), V(-FL, 0, 0)); this.cFake.set(V(rv + 0.05, 0.95, 0), V(FL * 0.8, 0, 0));
    this.cV.set(V(rv, 1.25, 0), V(0, 0, -Math.abs(vlen(v, 4, 0.8))));
    this.cLab.setText(`F = mω²r = ${plainNum(F)} N`);
    this.carState = { v, a, F };
  }
  coriolis(dt) {
    const { om, vb, Rd } = this.p; const vv = vb * 1.9 / Rd; const T = Rd / vb;
    this.ct += dt; this.cdA += om * dt; this.cDisk.rotation.y = this.cdA;
    const t = Math.min(this.ct, T); const x = vv * t;
    this.corBall.position.set(x, 0.07, 0);
    if (this.ct <= T) this.corTrail.push(V(x, 0.03, 0).applyAxisAngle(V(0, 1, 0), -this.cdA));
    if (this.ct > T + 1.2) { this.ct = 0; this.corTrail.clear(); }
    const th = om * T; this.corLab.setText(`القرص دار ${plainNum(deg(th))}° أثناء عبور الكرة`);
    this.corState = { T, th, s: Rd * th };
  }
  modeReadout() {
    if (this.mode === 3) { const s = this.tipState || {}; return [['زاوية الانقلاب θc', plainNum(s.thc) + '°'], ['زاوية الإمالة الحالية', plainNum(s.tilt) + '°'], ['الحالة', s.stable ? 'مستقر: يعود لوضعه' : 'غير مستقر: ينقلب'], ['لزيادة الاستقرار', 'قاعدة أعرض ومركز كتلة أخفض']]; }
    if (this.mode === 4) { const s = this.carState || {}; return [['السرعة الخطية v = ωr', plainNum(s.v) + ' m/s'], ['التسارع المركزي ω²r', plainNum(s.a) + ' m/s²'], ['القوة المركزية mω²r', plainNum(s.F) + ' N'], ['الطاردة المركزية', 'وهمية: يشعر بها الراكب فقط']]; }
    if (this.mode === 5) { const s = this.corState || {}; return [['زمن العبور t = R/v', plainNum(s.T) + ' s'], ['زاوية دوران القرص θ = ωt', plainNum(s.th) + ' rad'], ['الانحراف على الحافة s = Rθ', plainNum(s.s) + ' m'], ['قوة كوريوليس', 'وهمية في الإطار الدوّار']]; }
    return super.readout();
  }
  modeGraph() {
    if (this.mode === 3) return [{ label: 'زاوية الإمالة (°)', value: deg(this.tAng), color: COLORS.torque }];
    if (this.mode === 4) { const s = this.carState; return s && [{ label: 'F (N)', value: s.F, color: COLORS.force }]; }
    if (this.mode === 5) { const s = this.corState; return s && [{ label: 'θ القرص (rad)', value: s.th, color: '#ffd23f' }]; }
    return null;
  }
}

/* ═══════════ 3-1: سقوط بيضتين: أرض صلبة ووسادة ═══════════ */
export class Impulse extends ImpulseM {
  constructor(ctx, defs) {
    super(ctx, defs);
    const M = this.M; const Gr = this.group(3);
    this.eggs = [{ x: -1.0, soft: false }, { x: 1.0, soft: true }].map((o) => {
      const pad = o.soft ? mesh(rbox(1.1, 0.4, 0.9, 0.18), M.paint('#ff8fb8', 0.7)) : mesh(rbox(1.1, 0.12, 0.9, 0.03), M.graphite);
      pad.position.set(o.x, o.soft ? 0.2 : 0.06, 0);
      const post = mesh(rbox(0.08, 2.6, 0.08, 0.03), M.brushed); post.position.set(o.x - 0.62, 1.3, -0.3);
      const gate = mesh(rbox(0.5, 0.05, 0.1, 0.02), M.brushed); gate.position.set(o.x - 0.35, 2.55, -0.3);
      const egg = mesh(new THREE.SphereGeometry(1, 32, 24), M.paint('#f3e6c8', 0.4));
      const splat = new THREE.Mesh(new THREE.CircleGeometry(0.18, 24), new THREE.MeshStandardMaterial({ color: '#ffc21a', roughness: 0.3 })); splat.rotation.x = -Math.PI / 2; splat.position.set(o.x, 0.125, 0); splat.visible = false;
      const F = new Arrow(COLORS.force, { label: 'F' });
      label(Gr, o.soft ? 'وسادة: Δt كبير' : 'أرض صلبة: Δt صغير', V(o.x, 2.85, 0), o.soft ? '#ff8fb8' : '#cfd6e2', 0.14);
      Gr.add(pad, post, gate, egg, splat, F);
      return { ...o, pad, egg, splat, F };
    });
    this.eLab = liveLabel(Gr, '#ffffff', 0.14); this.eLab.position.set(0, 0.9, 0.6);
    label(Gr, 'حركة بطيئة ×3', V(0, 2.4, 0), '#7fd3ff', 0.12);
    this.et = 0;
  }
  update(dt) {
    const m = this.mode; if (m < 3) return super.update(dt);
    this.applyMode([]);
    const { mE, hE, t1, t2 } = this.p; const v = Math.sqrt(2 * g * hE), dp = mE * v; const F = [dp / t1, dp / t2];
    const slow = 3; this.et += dt / slow; const hv = 0.3 + hE * 1.0; const tf = Math.sqrt(2 * hE / g);
    if (this.et > tf + 0.9) this.et = 0;
    this.eggs.forEach((o, i) => {
      const top = o.soft ? 0.4 : 0.12; const t = Math.min(this.et, tf); const y = hv * (1 - (t * t) / (tf * tf));
      const hit = this.et >= tf; const after = this.et - tf;
      if (!o.soft) {
        o.egg.visible = !hit || after < 0.02; o.splat.visible = hit; o.splat.scale.setScalar(Math.min(1, 0.4 + after * 8));
        o.egg.scale.set(0.07, 0.095, 0.07); o.egg.position.set(o.x, top + 0.095 + y, 0);
        o.pad.scale.y = 1;
      } else {
        const sq = hit ? Math.sin(Math.min(1, after / (t2 * 4 + 0.05)) * Math.PI) * 0.35 : 0;
        o.pad.scale.y = 1 - sq * 0.6; o.egg.visible = true; o.splat.visible = false;
        o.egg.scale.set(0.07, 0.095, 0.07); o.egg.position.set(o.x, top * (1 - sq * 0.6) + 0.095 + (hit ? 0 : y), 0);
      }
      const show = hit && after < (i ? Math.max(0.3, t2 * 4) : 0.25);
      if (show) o.F.set(V(o.x + 0.3, top + 0.02, 0.3), V(0, Math.abs(vlen(F[i], 200, 1.3)), 0)); else o.F.visible = false;
    });
    this.eLab.setText(`F الأرض ≈ ${plainNum(F[0])} N   ·   F الوسادة ≈ ${plainNum(F[1])} N`);
    this.eggState = { v, dp, F1: F[0], F2: F[1] };
  }
  modeReadout() {
    if (this.mode === 3) { const s = this.eggState || {}; return [['السرعة لحظة الاصطدام', plainNum(s.v) + ' m/s'], ['التغير في الزخم Δp', plainNum(s.dp) + ' kg·m/s (نفسه)'], ['القوة على الأرض الصلبة', plainNum(s.F1) + ' N'], ['القوة على الوسادة', plainNum(s.F2) + ' N']]; }
    return super.modeReadout();
  }
  modeGraph() {
    if (this.mode === 3) { const s = this.eggState; return s && [{ label: 'F صلبة', value: s.F1, color: '#cfd6e2' }, { label: 'F وسادة', value: s.F2, color: '#ff8fb8' }]; }
    return super.modeGraph();
  }
}

/* ═══════════ 3-2: تصادم في بعدين + المحرك الأيوني ═══════════ */
export class Collision extends CollisionM {
  constructor(ctx, defs) {
    super(ctx, defs);
    this.build2D(this.group(3)); this.buildIon(this.group(4));
  }
  build2D(Gr) {
    const M = this.M;
    const table = mesh(rbox(5.8, 0.5, 3.8, 0.05), M.graphite); table.position.set(0, 0.25, 0);
    const tex = canvasTex(1024, 672, (gg, w, h) => { gg.fillStyle = '#2d3a2d'; gg.fillRect(0, 0, w, h); gg.fillStyle = '#3a3f48'; gg.fillRect(0, h / 2 - 80, w, 160); gg.fillRect(w / 2 - 80, 0, 160, h); gg.strokeStyle = '#ffd23f'; gg.lineWidth = 5; gg.setLineDash([30, 24]); gg.beginPath(); gg.moveTo(0, h / 2); gg.lineTo(w, h / 2); gg.moveTo(w / 2, 0); gg.lineTo(w / 2, h); gg.stroke(); });
    const road = new THREE.Mesh(new THREE.PlaneGeometry(5.7, 3.7), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 })); road.rotation.x = -Math.PI / 2; road.position.y = 0.505;
    this.cA = car(M, '#3f8fe0'); this.cB = car(M, '#e0613f'); this.cB.rotation.y = Math.PI / 2;
    this.qA = new Arrow(COLORS.momentum, { label: 'p', sub: 'A' }); this.qB = new Arrow(COLORS.momentum, { label: 'p', sub: 'B' }); this.qT = new Arrow('#ffffff', { label: 'p', sub: 'total', radius: 0.035 });
    // مثلث المتجهات
    this.tri = new THREE.Group(); this.tri.position.set(1.7, 2.1, 0);
    this.tA = new Arrow(COLORS.momentum, { label: 'p', sub: 'A', radius: 0.022 }); this.tB = new Arrow(COLORS.momentum, { label: 'p', sub: 'B', radius: 0.022 }); this.tT = new Arrow('#ffffff', { label: 'p', radius: 0.022, dashed: true });
    this.tri.add(this.tA, this.tB, this.tT);
    this.c2Lab = liveLabel(Gr, '#ffffff', 0.15); this.c2Lab.position.set(-1.2, 2.5, 0);
    Gr.add(table, road, this.cA, this.cB, this.qA, this.qB, this.qT, this.tri);
    this.ct2 = 0;
  }
  buildIon(Gr) {
    const M = this.M;
    const n = 420, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 6.4; pos[i * 3 + 1] = 0.2 + Math.random() * 3; pos[i * 3 + 2] = -1.6 + Math.random() * 1.2; }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#dfe8ff', size: 0.03, transparent: true, opacity: 0.9 }));
    this.probe = new THREE.Group(); this.probe.position.set(0.2, 1.6, 0);
    const bus = mesh(rbox(0.6, 0.45, 0.45, 0.05), M.gold);
    const pTex = canvasTex(256, 128, (gg, w, h) => { gg.fillStyle = '#0d1a3d'; gg.fillRect(0, 0, w, h); gg.strokeStyle = '#3d6bd6'; gg.lineWidth = 2; for (let x = 0; x < w; x += 22) { gg.beginPath(); gg.moveTo(x, 0); gg.lineTo(x, h); gg.stroke(); } });
    for (const s of [-1, 1]) { const pnl = mesh(new THREE.BoxGeometry(0.5, 0.02, 0.9), new THREE.MeshStandardMaterial({ map: pTex, roughness: 0.3, metalness: 0.6, emissive: '#10245a', emissiveIntensity: 0.5 })); pnl.position.set(0, 0, s * 0.72); const arm = mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.28, 6), M.chrome); arm.rotation.x = Math.PI / 2; arm.position.z = s * 0.3; this.probe.add(pnl, arm); }
    const noz = mesh(new THREE.CylinderGeometry(0.16, 0.1, 0.18, 32).rotateZ(Math.PI / 2), M.brushed); noz.position.x = -0.39;
    this.plume = new THREE.Mesh(new THREE.ConeGeometry(0.15, 1.6, 32, 1, true).rotateZ(Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#6fb7ff', transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    this.plume.geometry.translate(-0.48 - 0.8, 0, 0);
    const dish = mesh(lathe([[0, 0], [0.2, 0.04], [0.24, 0.1]], 32), M.ceramic); dish.rotation.z = -Math.PI / 2; dish.position.x = 0.32;
    this.probe.add(bus, noz, this.plume, dish);
    this.thr = new Arrow(COLORS.force, { label: 'F' }); this.dv = new Arrow(COLORS.velocity, { label: 'Δv' });
    this.ionLab = liveLabel(Gr, '#9fd0ff', 0.15); this.ionLab.position.set(0, 2.8, 0);
    Gr.add(this.stars, this.probe, this.thr, this.dv); this.it = 0;
  }
  update(dt) {
    const m = this.mode; if (m < 3) return super.update(dt);
    this.applyMode([]);
    if (m === 3) return this.twoD(dt);
    return this.ion(dt);
  }
  twoD(dt) {
    const { mA2, vA2, mB2, vB2 } = this.p; const k = 0.035, tc = 1.7;
    const px = mA2 * vA2, pz = mB2 * vB2, M2 = mA2 + mB2; const vf = Math.hypot(px, pz) / M2, th = Math.atan2(pz, px);
    this.ct2 += dt; if (this.ct2 > tc + 2.0) this.ct2 = 0; const t = this.ct2;
    const PL = (p) => Math.abs(vlen(p, 30000, 1.0));
    if (t < tc) {
      const xa = -vA2 * k * (tc - t), zb = vB2 * k * (tc - t);
      this.cA.position.set(xa - 0.3, 0.505, 0); this.cB.position.set(0, 0.505, zb + 0.3); this.cB.rotation.y = Math.PI / 2;
      this.qA.set(V(xa - 0.3, 1.05, 0), V(PL(px), 0, 0)); this.qB.set(V(0.25, 1.05, zb + 0.3), V(0, 0, -PL(pz))); this.qT.visible = false;
    } else {
      const s = (t - tc) * vf * k; const d = V(Math.cos(th), 0, -Math.sin(th));
      const c = d.clone().multiplyScalar(s);
      this.cA.position.set(c.x - 0.3, 0.505, c.z); this.cB.position.set(c.x, 0.505, c.z + 0.3);
      this.qA.visible = this.qB.visible = false; this.qT.set(V(c.x, 1.15, c.z), d.clone().multiplyScalar(PL(Math.hypot(px, pz))));
    }
    const ax = PL(px) * 0.7, bz = PL(pz) * 0.7;
    this.tA.set(V(0, 0, 0), V(ax, 0, 0)); this.tB.set(V(ax, 0, 0), V(0, bz, 0)); this.tT.set(V(0, 0, 0), V(ax, bz, 0));
    this.c2Lab.setText(`v = ${plainNum(vf)} m/s · θ = ${plainNum(deg(th))}°`);
    this.s2 = { px, pz, p: Math.hypot(px, pz), vf, th: deg(th) };
  }
  ion(dt) {
    const { Fi, mi, td } = this.p; const D = 5; this.it += dt; if (this.it > D + 1) this.it = 0;
    const u = Math.min(1, this.it / D), days = td * u, dv = Fi * days * 86400 / mi;
    const a = this.stars.geometry.attributes.position; const sp = (0.1 + 2.2 * Math.min(1, dv / 400)) * dt;
    for (let i = 0; i < a.count; i++) { let x = a.getX(i) - sp; if (x < -3.2) x += 6.4; a.setX(i, x); } a.needsUpdate = true;
    this.plume.scale.set(0.9 + 0.15 * Math.sin(this.t * 22), 1, 1); this.plume.material.opacity = 0.35 + 0.1 * Math.sin(this.t * 13);
    this.probe.position.y = 1.6 + Math.sin(this.t * 0.8) * 0.04;
    this.thr.set(V(0.55, 1.6, 0.35), V(Math.abs(vlen(Fi, 0.1, 0.7)), 0, 0));
    this.dv.set(V(-0.3, 2.05, 0), V(Math.max(0.01, Math.abs(vlen(dv, 300, 1.4))), 0, 0));
    this.ionLab.setText(`اليوم ${plainNum(days)} · Δv = ${plainNum(dv)} m/s`);
    this.ionState = { dv, days, J: Fi * days * 86400 };
  }
  modeReadout() {
    if (this.mode === 3) { const s = this.s2 || {}; return [['زخم A (أفقي)', plainNum(s.px) + ' kg·m/s'], ['زخم B (رأسي)', plainNum(s.pz) + ' kg·m/s'], ['الزخم الكلي √(pA²+pB²)', plainNum(s.p) + ' kg·m/s'], ['السرعة بعد الالتحام', plainNum(s.vf) + ' m/s عند ' + plainNum(s.th) + '°']]; }
    if (this.mode === 4) { const s = this.ionState || {}; return [['قوة الدفع F', plainNum(this.p.Fi) + ' N'], ['الزمن', plainNum(s.days) + ' يوم'], ['الدفع FΔt', plainNum(s.J) + ' N·s'], ['التغير في السرعة Δv', plainNum(s.dv) + ' m/s']]; }
    return super.modeReadout();
  }
  modeGraph() {
    if (this.mode === 3) { const s = this.s2; return s && [{ label: 'الزخم الكلي', value: s.p, color: '#ffffff' }]; }
    if (this.mode === 4) { const s = this.ionState; return s && [{ label: 'Δv (m/s)', value: s.dv, color: COLORS.velocity }]; }
    return super.modeGraph();
  }
}

/* ═══════════ 4-1: الشغل عند تغير القوة (نابض ومنحنى القوة–الإزاحة) ═══════════ */
export class Work extends WorkM {
  constructor(ctx, defs) {
    super(ctx, defs);
    const M = this.M; const Gr = this.group(3);
    const wall = mesh(rbox(0.2, 1.6, 0.9, 0.03), M.ceramic); wall.position.set(-2.5, 0.8, 0);
    const pts = []; for (let i = 0; i <= 400; i++) { const u = i / 400; const a = u * 14 * TAU; pts.push(V(u, Math.cos(a) * 0.11, Math.sin(a) * 0.11)); }
    this.spring = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 600, 0.012, 6), M.chrome); this.spring.position.set(-2.4, 0.9, 0);
    this.sHandle = mesh(new THREE.TorusGeometry(0.08, 0.022, 12, 28), M.paint('#e8513a')); this.sHandle.rotation.y = Math.PI / 2;
    this.sF = new Arrow(COLORS.force, { label: 'F' }); this.sX = new Arrow(COLORS.displacement, { label: 'd', radius: 0.02 });
    this.fd = darkGraph(768, 480); const scr = this.holoScreen(2.3, 1.44, this.fd.tex); scr.position.set(0.9, 1.95, -0.7);
    Gr.add(wall, this.spring, this.sHandle, this.sF, this.sX, scr);
    this.su = 0; this.sh = 0; this.lastU = -1;
  }
  drawFD(u) {
    const gg = this.fd.begin(), W = 768, H = 480; const ox = 80, oy = H - 70, w = W - 130, h = H - 140;
    gg.strokeStyle = '#a6aecb'; gg.lineWidth = 3; gg.beginPath(); gg.moveTo(ox, 40); gg.lineTo(ox, oy); gg.lineTo(ox + w, oy); gg.stroke();
    gg.beginPath(); gg.moveTo(ox, oy); gg.lineTo(ox + w * u, oy - h * u); gg.lineTo(ox + w * u, oy); gg.closePath();
    gg.fillStyle = 'rgba(95,224,138,.35)'; gg.fill();
    gg.setLineDash([10, 8]); gg.strokeStyle = 'rgba(255,255,255,.35)'; gg.lineWidth = 2; gg.beginPath(); gg.moveTo(ox, oy); gg.lineTo(ox + w, oy - h); gg.stroke(); gg.setLineDash([]);
    gg.strokeStyle = '#ff4d5e'; gg.lineWidth = 6; gg.beginPath(); gg.moveTo(ox, oy); gg.lineTo(ox + w * u, oy - h * u); gg.stroke();
    gg.fillStyle = '#ffffff'; gg.font = 'italic 600 34px "Times New Roman", serif'; gg.fillText('F', ox - 44, 64); gg.fillText('d', ox + w + 8, oy + 8);
    gg.font = '600 30px "Plex Arabic", sans-serif'; gg.direction = 'rtl'; gg.textAlign = 'center';
    gg.fillText(`الشغل = مساحة المثلث = ½Fd = ${plainNum(0.5 * this.p.Fm * this.p.dx * u * u)} J`, W / 2, 34);
    this.fd.tex.needsUpdate = true;
  }
  update(dt) {
    const m = this.mode; if (m < 3) return super.update(dt);
    this.applyMode([]);
    const { Fm, dx } = this.p;
    if (this.su < 1) this.su = Math.min(1, this.su + dt / 3); else if ((this.sh += dt) > 1.3) { this.su = 0; this.sh = 0; }
    const u = ease(this.su); const L = 1.1 + u * (0.3 + dx * 0.8);
    this.spring.scale.x = L; this.sHandle.position.set(-2.4 + L + 0.08, 0.9, 0);
    this.sF.set(V(-2.4 + L + 0.18, 0.9, 0), V(Math.max(0.01, Math.abs(vlen(Fm * u, 250, 0.9))), 0, 0));
    this.sX.set(V(-2.4 + 1.1, 0.45, 0.3), V(Math.max(0.01, u * (0.3 + dx * 0.8)), 0, 0));
    if (Math.abs(u - this.lastU) > 0.01 || this.dirtyFD) { this.lastU = u; this.dirtyFD = false; this.drawFD(u); }
    this.fdState = { F: Fm * u, d: dx * u, W: 0.5 * Fm * u * dx * u, Wt: 0.5 * Fm * dx };
  }
  onParam(k) { super.onParam?.(k); this.dirtyFD = true; this.su = 0; }
  modeReadout() {
    if (this.mode === 3) { const s = this.fdState || {}; return [['القوة الآن F', plainNum(s.F) + ' N'], ['الإزاحة الآن d', plainNum(s.d) + ' m'], ['الشغل حتى الآن', plainNum(s.W) + ' J'], ['الشغل الكلي ½F d', plainNum(s.Wt) + ' J']]; }
    return super.modeReadout();
  }
  modeGraph() { if (this.mode === 3) { const s = this.fdState; return s && [{ label: 'الشغل (J)', value: s.W, color: '#5fe08a' }]; } return super.modeGraph(); }
}

/* ═══════════ 4-2: العجلة والمحور + نواقل الحركة في الدراجة ═══════════ */
export class Lever extends LeverM {
  constructor(ctx, defs) {
    super(ctx, defs);
    this.buildWheel(this.group(3)); this.buildBike(this.group(4));
  }
  buildWheel(Gr) {
    const M = this.M;
    for (const s of [-1, 1]) { const leg = mesh(rbox(0.12, 2.3, 0.14, 0.04), M.graphite); leg.position.set(s * 0.25, 1.15, -0.45); Gr.add(leg); }
    const brg = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.7, 16).rotateX(Math.PI / 2), M.chrome); brg.position.set(0, 2.2, -0.15); Gr.add(brg);
    this.wa = new THREE.Group(); this.wa.position.set(0, 2.2, 0); Gr.add(this.wa);
    this.effD = mesh(new THREE.CylinderGeometry(1, 1, 0.08, 72).rotateX(Math.PI / 2), M.anod('#e08a4a', 0.35)); this.effD.position.z = 0.12;
    this.resD = mesh(new THREE.CylinderGeometry(1, 1, 0.12, 72).rotateX(Math.PI / 2), M.brushed); this.resD.position.z = -0.08;
    const mk = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1, 0.02), M.led('#ffffff', 1.6)); mk.geometry.translate(0, 0.5, 0); mk.position.z = 0.17; this.waMk = mk;
    this.wa.add(this.effD, this.resD, mk);
    this.eRope = rod(M); this.rRope = rod(M); this.eGrip = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.22, 14).rotateZ(Math.PI / 2), M.paint('#e8513a')); this.wLoad = mesh(weightGeo(), M.graphite);
    this.wFe = new Arrow(COLORS.force, { label: 'F', sub: 'e', radius: 0.03 }); this.wFr = new Arrow(COLORS.weight, { label: 'F', sub: 'r', radius: 0.03 });
    label(Gr, 'نصف قطر الجهد', V(1.3, 2.75, 0.2), '#e08a4a', 0.12); label(Gr, 'نصف قطر المقاومة', V(-1.3, 2.75, 0.2), '#cfd6e2', 0.12);
    Gr.add(this.eRope, this.rRope, this.eGrip, this.wLoad, this.wFe, this.wFr);
  }
  buildBike(Gr) {
    const M = this.M;
    const ground = mesh(rbox(6.0, 0.05, 0.8, 0.02), M.graphite); ground.position.set(0, 0.025, 0); Gr.add(ground);
    this.bk = { front: new THREE.Group(), rear: new THREE.Group(), crank: new THREE.Group(), ring: null, cog: null };
    const wheel = (grp) => { const tire = mesh(new THREE.TorusGeometry(1, 0.05, 12, 72), M.rubber); const rim = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.012, 8, 72), M.led('#c77dff', 2)); grp.add(tire, rim); for (let k = 0; k < 8; k++) { const s = mesh(new THREE.BoxGeometry(0.01, 1.9, 0.01), M.chrome); s.rotation.z = k / 8 * Math.PI; grp.add(s); } const hub = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 16).rotateX(Math.PI / 2), M.chrome); grp.add(hub); };
    wheel(this.bk.front); wheel(this.bk.rear);
    this.bk.ring = mesh(new THREE.CylinderGeometry(1, 1, 0.03, 48).rotateX(Math.PI / 2), M.gold); this.bk.ring.position.z = 0.1;
    this.bk.cog = mesh(new THREE.CylinderGeometry(1, 1, 0.04, 32).rotateX(Math.PI / 2), M.gold); this.bk.cog.position.z = 0.1;
    this.bk.arm = mesh(rbox(1, 0.05, 0.03, 0.015), M.brushed); this.bk.arm.geometry.translate(0.5, 0, 0); this.bk.arm.position.z = 0.16;
    this.bk.pedal = mesh(rbox(0.16, 0.04, 0.12, 0.015), M.graphite);
    this.bk.crank.add(this.bk.ring, this.bk.arm, this.bk.pedal);
    this.chain = polyLine(200, '#c9ccd4'); this.links = []; for (let i = 0; i < 26; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), M.chrome); Gr.add(l); this.links.push(l); }
    this.frame = [rod(M, 0.025, M.paint('#5b4cc9')), rod(M, 0.025, M.paint('#5b4cc9')), rod(M, 0.025, M.paint('#5b4cc9')), rod(M, 0.025, M.paint('#5b4cc9'))];
    this.bFe = new Arrow(COLORS.force, { label: 'F', sub: 'e', radius: 0.025 }); this.bFr = new Arrow(COLORS.weight, { label: 'F', sub: 'r', radius: 0.025 });
    this.bLab = liveLabel(Gr, '#c9a7ff', 0.15); this.bLab.position.set(0, 2.75, 0);
    Gr.add(this.bk.front, this.bk.rear, this.bk.crank, this.bk.cog, this.chain, ...this.frame, this.bFe, this.bFr);
    this.bAng = 0; this.bKey = '';
  }
  update(dt) {
    const m = this.mode; if (m < 3) return super.update(dt);
    this.applyMode([]);
    if (m === 3) return this.wheelStep(dt);
    return this.bikeStep(dt);
  }
  wheelStep(dt) {
    const { re, rr, eff, Fe } = this.p; const IMA = re / rr, MA = eff / 100 * IMA, Fr = MA * Fe;
    const RE = 0.12 + 0.9 * re / 50, RR = 0.12 + 0.9 * rr / 50; this.effD.scale.set(RE, RE, 1); this.resD.scale.set(RR, RR, 1); this.waMk.scale.y = Math.max(RE, RR);
    const cyc = 0.5 - 0.5 * Math.cos(this.t * 1.1); const th = -0.9 * cyc / Math.max(RE, RR); this.wa.rotation.z = th;
    const y0 = 2.2, de = -th * RE, dr = -th * RR;
    const ye = y0 - 1.0 - de, yr = y0 - 1.2 + dr;
    this.eRope.setEnds(V(RE, y0, 0.12), V(RE, ye, 0.12)); this.eGrip.position.set(RE, ye - 0.04, 0.12);
    const s = 0.22 + 0.16 * Math.cbrt(Fr / 300); this.wLoad.scale.setScalar(s); this.wLoad.position.set(-RR, yr - s * 0.92, -0.08); this.rRope.setEnds(V(-RR, y0, -0.08), V(-RR, yr, -0.08));
    const FL = (F) => Math.abs(vlen(F, 400, 0.8));
    this.wFe.set(V(RE + 0.15, ye, 0.12), V(0, -FL(Fe), 0)); this.wFr.set(V(-RR - 0.18, yr - s * 0.5, -0.08), V(0, -FL(Fr), 0));
    this.waState = { IMA, MA, Fr, Fe };
  }
  bikeStep(dt) {
    const { rp, rf, rb, rw, eff } = this.p; const k = 0.024;
    const Rw = rw * k, Rf = rf * k * 1.3, Rb = rb * k * 1.3, Lp = rp * k * 1.2;
    const rear = V(1.25, Rw + 0.05, 0), front = V(-1.6, Rw + 0.05, 0), bb = V(-0.15, 0.62, 0);
    this.bk.rear.position.copy(rear); this.bk.front.position.copy(front); this.bk.rear.scale.setScalar(Rw); this.bk.front.scale.setScalar(Rw);
    this.bk.crank.position.copy(bb); this.bk.ring.scale.set(Rf, Rf, 1); this.bk.arm.scale.x = Lp; this.bk.cog.position.set(rear.x, rear.y, 0.1); this.bk.cog.scale.set(Rb, Rb, 1);
    const key = [Rf, Rb, Rw].map((v) => v.toFixed(3)).join('|');
    if (key !== this.bKey) {
      this.bKey = key; const pts = []; const A = V(bb.x, bb.y, 0.12), B = V(rear.x, rear.y, 0.12);
      for (let i = 0; i <= 40; i++) { const a = Math.PI / 2 + i / 40 * Math.PI; pts.push(V(A.x + Math.cos(a) * Rf, A.y + Math.sin(a) * Rf, 0.12)); }
      for (let i = 0; i <= 40; i++) { const a = -Math.PI / 2 + i / 40 * Math.PI; pts.push(V(B.x + Math.cos(a) * Rb, B.y + Math.sin(a) * Rb, 0.12)); }
      pts.push(pts[0].clone()); this.chainPts = pts; this.chain.setPts(pts);
      const lens = [0]; for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + pts[i].distanceTo(pts[i - 1])); this.chainLen = lens;
      const seat = V(0.25, 1.55, 0), head = V(-1.3, 1.55, 0);
      this.frame[0].setEnds(bb, seat); this.frame[1].setEnds(seat, rear); this.frame[2].setEnds(bb, rear); this.frame[3].setEnds(head, bb);
    }
    const w = 1.4; this.bAng += w * dt; this.bk.crank.rotation.z = -this.bAng;
    this.bk.pedal.position.set(Lp, 0, 0.2); this.bk.pedal.rotation.z = this.bAng;
    const wr = this.bAng * (rf / rb); this.bk.rear.rotation.z = -wr; this.bk.front.rotation.z = -wr; this.bk.cog.rotation.z = -wr;
    const L = this.chainLen[this.chainLen.length - 1]; const off = (this.bAng * Rf) % L;
    this.links.forEach((l, i) => { let s = (i / this.links.length * L - off + L * 4) % L; let j = 1; while (j < this.chainLen.length - 1 && this.chainLen[j] < s) j++; const a = this.chainPts[j - 1], b = this.chainPts[j]; const f = (s - this.chainLen[j - 1]) / Math.max(1e-6, this.chainLen[j] - this.chainLen[j - 1]); l.position.lerpVectors(a, b, f); });
    const pedal = V(bb.x + Math.cos(-this.bAng) * Lp, bb.y + Math.sin(-this.bAng) * Lp, 0.25);
    this.bFe.set(pedal.clone().add(V(0, 0.45, 0)), V(0, -0.4, 0)); this.bFr.set(V(rear.x, 0.08, 0.3), V(-0.32, 0, 0));
    const IMA = (rb / rf) * (rp / rw); const MA = eff / 100 * IMA;
    this.bLab.setText(`IMA = (${plainNum(rb)}/${plainNum(rf)})·(${plainNum(rp)}/${plainNum(rw)}) = ${plainNum(IMA)}`);
    this.bkState = { IMA, MA, turns: rf / rb };
  }
  modeReadout() {
    if (this.mode === 3) { const s = this.waState || {}; return [['IMA = rₑ/rᵣ', plainNum(s.IMA)], ['MA = (e/100)·IMA', plainNum(s.MA)], ['القوة المسلّطة Fe', plainNum(s.Fe) + ' N'], ['قوة المقاومة Fr = MA·Fe', plainNum(s.Fr) + ' N']]; }
    if (this.mode === 4) { const s = this.bkState || {}; return [['IMA للدراجة', plainNum(s.IMA)], ['MA الفعلية', plainNum(s.MA)], ['دورات الإطار لكل دورة دوّاسة', plainNum(s.turns)], ['IMA أقل من 1', 'تكسب مسافة وسرعة على حساب القوة']]; }
    return super.modeReadout();
  }
  modeGraph() {
    if (this.mode === 3) { const s = this.waState; return s && [{ label: 'Fe', value: s.Fe, color: COLORS.force }, { label: 'Fr', value: s.Fr, color: COLORS.weight }]; }
    if (this.mode === 4) { const s = this.bkState; return s && [{ label: 'IMA', value: s.IMA, color: '#c9a7ff' }]; }
    return super.modeGraph();
  }
}

/* ═══════════ 5-1: المقلاع (طاقة الوضع المرونية) + القفز بالزانة ═══════════ */
export class Forms extends FormsM {
  constructor(ctx, defs) {
    super(ctx, defs);
    this.buildSling(this.group(3)); this.buildVault(this.group(4));
  }
  buildSling(Gr) {
    const M = this.M; const X = -1.6;
    const handle = mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.7, 16), M.anod('#8a5a34', 0.5)); handle.position.set(X, 0.35, 0);
    this.prongs = [-1, 1].map((s) => { const p = rod(M, 0.035, M.anod('#8a5a34', 0.5)); p.setEnds(V(X, 0.68, 0), V(X + s * 0.28, 1.15, 0)); Gr.add(p); return V(X + s * 0.28, 1.15, 0); });
    this.bands = [rod(M, 0.012, M.paint('#e8513a')), rod(M, 0.012, M.paint('#e8513a'))];
    this.sBall = mesh(new THREE.SphereGeometry(1, 28, 20), M.chrome);
    for (let k = 0; k <= 5; k++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.01, 0.02), M.led('#b48cf0', 1.8)); t.position.set(X - 0.55, 1.15 + k * 0.4, -0.1); Gr.add(t); }
    this.hLine = dashedLine([V(X - 0.5, 0, 0), V(X + 0.5, 0, 0)], COLORS.displacement); this.hLab = liveLabel(Gr, COLORS.displacement, 0.14);
    this.sv = new Arrow(COLORS.velocity, { label: 'v' });
    this.sTrail = this.trail(Gr, '#c9a7ff', 80, 0.035);
    Gr.add(handle, ...this.bands, this.sBall, this.hLine, this.sv); this.st = 0;
  }
  buildVault(Gr) {
    const M = this.M;
    const run = mesh(rbox(4.6, 0.04, 0.7, 0.02), M.anod('#c1440e', 0.6)); run.position.set(-1.2, 0.02, 0);
    const box = mesh(rbox(0.3, 0.06, 0.3, 0.02), M.chrome); box.position.set(0.3, 0.03, 0);
    const mat = mesh(rbox(1.5, 0.45, 1.3, 0.12), M.paint('#3f8fe0', 0.7)); mat.position.set(1.7, 0.225, 0);
    this.stds = [-1, 1].map((s) => { const p = mesh(rbox(0.06, 3, 0.06, 0.02), M.brushed); p.position.set(1.1, 1.5, s * 0.6); Gr.add(p); return p; });
    this.bar = mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.3, 10).rotateX(Math.PI / 2), M.paint('#ffd23f'));
    this.vaulter = person(M, '#ffd23f'); this.vaulter.scale.setScalar(0.62);
    this.pole = []; for (let i = 0; i < 10; i++) { const r = rod(M, 0.016, M.paint('#e6e6e6')); Gr.add(r); this.pole.push(r); }
    this.vLab = liveLabel(Gr, '#ffd23f', 0.15); this.vLab.position.set(-1.2, 2.85, 0);
    Gr.add(run, box, mat, this.bar, this.vaulter); this.vt = 0;
  }
  update(dt) {
    const m = this.mode; if (m < 3) return super.update(dt);
    this.applyMode([this.bars]);
    if (m === 3) return this.sling(dt);
    return this.vault(dt);
  }
  sling(dt) {
    const { Ee, mb } = this.p; const h = Ee / (mb * g), v0 = Math.sqrt(2 * Ee / mb); const k = Math.min(0.55, 2.0 / h); const X = -1.6;
    const tf = 2 * v0 / g, f = tf / 2.6; this.st += dt;
    const pull = 0.9, r = 0.05 + 0.03 * Math.cbrt(mb / 0.2); this.sBall.scale.setScalar(r);
    let y, vy, stretch = 0, PE = 0, KE = 0;
    if (this.st < pull) { stretch = ease(this.st / pull); y = 1.15 - 0.45 * stretch; vy = 0; this.sTrail.clear(); }
    else { const t = Math.min((this.st - pull) * f, tf); const yr = v0 * t - 0.5 * g * t * t; vy = v0 - g * t; y = 1.15 + yr * k; PE = mb * g * yr; KE = Math.max(0, Ee - PE); if (this.st - pull > 2.6 + 0.6) this.st = 0; this.sTrail.push(V(X, y, 0)); }
    this.sBall.position.set(X, y, 0);
    const pouch = this.st < pull ? V(X, y, 0) : V(X, 1.15, 0); this.prongs.forEach((p, i) => this.bands[i].setEnds(p, pouch));
    const yH = 1.15 + h * k; const hp = this.hLine.geometry.attributes.position; hp.setXYZ(0, X - 0.5, yH, 0); hp.setXYZ(1, X + 0.5, yH, 0); hp.needsUpdate = true; this.hLine.computeLineDistances();
    this.hLab.position.set(X + 0.85, yH, 0); this.hLab.setText(`h = ${plainNum(h)} m`);
    if (this.st >= pull) this.sv.set(V(X + 0.18, y, 0), V(0, Math.sign(vy) * Math.max(0.01, Math.abs(vlen(vy, 15, 0.8))), 0)); else this.sv.visible = false;
    const E = this.st < pull ? Ee * stretch : Ee;
    this.bars.set([PE, KE, E, 0], Ee * 1.05);
    this.slState = { h, v0, PE, KE, stored: this.st < pull ? Ee * stretch : 0 };
  }
  vault(dt) {
    const { vv } = this.p; const h = vv * vv / (2 * g); const k = Math.min(0.42, 2.2 / Math.max(h, 0.5));
    const y0 = 0.55, top = y0 + h * k; this.bar.position.set(1.1, top - 0.05, 0);
    this.vt += dt; const T1 = 1.4, T2 = 0.5, T3 = 0.8, T4 = 0.7, T = T1 + T2 + T3 + T4 + 0.8; if (this.vt > T) this.vt = 0; const t = this.vt;
    let x, y, bend = 0, phase; const m = 60;
    if (t < T1) { const u = t / T1; x = -3.0 + 3.0 * u; y = 0; phase = 0; }
    else if (t < T1 + T2) { const u = (t - T1) / T2; x = 0.0 + 0.4 * u; y = h * k * 0.25 * u; bend = Math.sin(u * Math.PI) * 0.5; phase = u; }
    else if (t < T1 + T2 + T3) { const u = (t - T1 - T2) / T3; x = 0.4 + 0.7 * u; y = h * k * (0.25 + 0.75 * Math.sin(u * Math.PI / 2)); phase = 1 + u; }
    else if (t < T1 + T2 + T3 + T4) { const u = (t - T1 - T2 - T3) / T4; x = 1.1 + 0.6 * u; y = (h * k) * (1 - u * u) + (0.45 / 1) * u * u * 0; phase = 2 + u; }
    else { x = 1.7; y = 0.45 - y0 + 0.1; phase = 3; }
    this.vaulter.position.set(x, Math.max(0, y), 0.0);
    this.vaulter.rotation.z = phase > 1 && phase < 3 ? -Math.min(1.3, (phase - 1) * 1.3) : 0;
    // الزانة
    const grip = V(x + 0.2, Math.max(0, y) + 0.7, 0.05);
    const tip = t < T1 ? V(x + 1.6, 0.25, 0.05) : V(0.3, 0.06, 0.05);
    const pts = []; for (let i = 0; i <= 10; i++) { const u = i / 10; const p = tip.clone().lerp(grip, u); p.x -= Math.sin(u * Math.PI) * bend * 0.8; pts.push(p); }
    this.pole.forEach((r, i) => { r.visible = phase < 1.6; r.setEnds(pts[i], pts[i + 1]); });
    const E = 0.5 * m * vv * vv; let KE, PE;
    if (phase === 0) { KE = E; PE = 0; } else if (phase <= 1) { KE = E * (1 - 0.8 * phase); PE = E * 0.25 * phase; } else if (phase <= 2) { const u = phase - 1; PE = E * (0.25 + 0.75 * Math.sin(u * Math.PI / 2)); KE = E - PE; } else { PE = 0; KE = 0; }
    this.bars.set([PE, KE, phase < 3 ? E : 0, phase > 0 && phase < 1 ? E * 0.6 * Math.sin(phase * Math.PI) : 0], E * 1.05);
    this.vLab.setText(`Δh = v²/2g = ${plainNum(h)} m`);
    this.vState = { h, E, KE, PE };
  }
  modeReadout() {
    if (this.mode === 3) { const s = this.slState || {}; return [['الطاقة المرونية المخزنة', plainNum(this.p.Ee) + ' J'], ['سرعة الانطلاق √(2E/m)', plainNum(s.v0) + ' m/s'], ['أقصى ارتفاع E/(mg)', plainNum(s.h) + ' m'], ['PE الجاذبية الآن', plainNum(s.PE) + ' J']]; }
    if (this.mode === 4) { const s = this.vState || {}; return [['سرعة الجري v', plainNum(this.p.vv) + ' m/s'], ['أقصى ارتفاع لمركز الكتلة', plainNum(s.h) + ' m'], ['الطاقة الحركية (60 kg)', plainNum(s.E) + ' J'], ['التحولات', 'حركية ← مرونية ← وضع']]; }
    return super.modeReadout();
  }
  modeGraph() {
    if (this.mode >= 3) { const s = this.mode === 3 ? this.slState : this.vState; return s && [{ label: 'PE', value: s.PE, color: '#4c8dff' }, { label: 'KE', value: s.KE, color: COLORS.velocity }]; }
    return super.modeGraph();
  }
}

/* ═══════════ 5-2: أنواع التصادمات + البندول ═══════════ */
export class Ramp extends RampM {
  constructor(ctx, defs) {
    super(ctx, defs);
    const M = this.M; const C = this.group(3);
    const rail = mesh(rbox(5.8, 0.08, 0.32, 0.03), M.brushed); rail.position.set(0, 0.5, 0);
    const glow = new THREE.Mesh(new THREE.BoxGeometry(5.7, 0.012, 0.012), M.led('#9b6bff', 2.2)); glow.position.set(0, 0.46, 0.17);
    this.kA = mesh(rbox(0.5, 0.2, 0.3, 0.05), M.paint('#3f8fe0')); this.kB = mesh(rbox(0.5, 0.2, 0.3, 0.05), M.paint('#e0613f'));
    this.coil = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 60 }, (_, i) => V(i / 59 * 0.14, Math.cos(i / 59 * 6 * TAU) * 0.05, Math.sin(i / 59 * 6 * TAU) * 0.05))), 120, 0.008, 5), M.chrome);
    this.kvA = new Arrow(COLORS.velocity, { label: 'v', sub: 'A' }); this.kvB = new Arrow(COLORS.velocity, { label: 'v', sub: 'B' });
    this.kFlash = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshBasicMaterial({ color: '#ffb36b', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.kLab = liveLabel(C, '#ffffff', 0.18); this.kLab.position.set(-1.4, 1.35, 0);
    C.add(rail, glow, this.kA, this.kB, this.coil, this.kvA, this.kvB, this.kFlash); this.kt = 0;
    const P = this.group(4);
    for (const s of [-1, 1]) { const post = mesh(rbox(0.1, 3.0, 0.1, 0.03), M.graphite); post.position.set(-1.3 + s * 1.3, 1.5, -0.35); P.add(post); }
    const beam = mesh(rbox(2.8, 0.1, 0.1, 0.03), M.graphite); beam.position.set(-1.3, 2.98, -0.35);
    const arm = mesh(rbox(0.08, 0.08, 0.4, 0.02), M.graphite); arm.position.set(-1.3, 2.95, -0.15);
    this.pRope = rod(M, 0.008, M.chrome); this.pBob = mesh(new THREE.SphereGeometry(0.13, 32, 24), M.gold);
    this.pRef = dashedLine([V(-2.4, 0, 0), V(-0.2, 0, 0)], '#ffffff', { opacity: 0.4 }); this.pTop = dashedLine([V(-2.4, 0, 0), V(-0.2, 0, 0)], COLORS.displacement);
    this.pv = new Arrow(COLORS.velocity, { label: 'v' }); this.pLab = liveLabel(P, COLORS.displacement, 0.14);
    this.pTrail = this.trail(P, '#ffd27a', 90, 0.03);
    P.add(beam, arm, this.pRope, this.pBob, this.pRef, this.pTop, this.pv); this.pt2 = 0;
  }
  onParam(k) { super.onParam?.(k); this.kt = 0; }
  update(dt) {
    const m = this.mode; if (m < 3) return super.update(dt);
    this.applyMode([this.bars]);
    if (m === 3) return this.types(dt);
    return this.pend(dt);
  }
  types(dt) {
    const { mA, vA, mB, vBf } = this.p; const vAf = (mA * vA - mB * vBf) / mA;
    const K1 = 0.5 * mA * vA * vA, K2 = 0.5 * mA * vAf * vAf + 0.5 * mB * vBf * vBf; const r = K2 / K1;
    const impossible = vAf > vBf + 0.05; const stick = Math.abs(vAf - vBf) < 0.05;
    const type = impossible ? 'غير ممكن: A يخترق B' : stick ? 'عديم المرونة (التحام)' : Math.abs(r - 1) < 0.02 ? 'مرن: KE محفوظة' : r < 1 ? 'غير مرن: فُقدت طاقة' : 'فوق المرن: طاقة مضافة (انفجاري)';
    const wA = 0.35 + 0.08 * mA, wB = 0.35 + 0.08 * mB; this.kA.scale.x = wA / 0.5; this.kB.scale.x = wB / 0.5;
    this.kt += dt; const xB0 = 0.4, s = 0.3; const tHit = (xB0 - wB / 2 - wA / 2 + 2.4) / (vA * s);
    let xA, xB, vNow; const after = this.kt >= tHit;
    if (!after) { xA = -2.4 + vA * s * this.kt; xB = xB0; vNow = [vA, 0]; }
    else { const tt = this.kt - tHit; xB = xB0 + vBf * s * tt; xA = xB0 - wB / 2 - wA / 2 + (impossible ? vBf : vAf) * s * tt; vNow = [vAf, vBf]; }
    if (Math.max(xA, xB) > 2.9 || xA < -2.95 || this.kt > tHit + 5) this.kt = 0;
    this.kA.position.set(xA, 0.64, 0); this.kB.position.set(xB, 0.64, 0); this.coil.position.set(xA + wA / 2 - 0.02, 0.64, 0);
    const fl = (v) => vlen(v, 6, 0.9);
    this.kvA.set(V(xA, 0.95, 0), V(fl(vNow[0]), 0, 0)); this.kvB.set(V(xB, 1.2, 0), V(fl(vNow[1]), 0, 0));
    const since = this.kt - tHit; this.kFlash.position.set(xB - wB / 2, 0.64, 0); this.kFlash.material.opacity = since > 0 && since < 0.5 ? (1 - since / 0.5) * (r > 1.02 ? 1 : 0.5) : 0;
    this.kFlash.material.color.set(r > 1.02 ? '#ffe36b' : '#ffb36b');
    this.kLab.setText(after ? type : 'قبل التصادم');
    const KE = after ? K2 : K1, Q = after ? Math.max(0, K1 - K2) : 0; const mx = Math.max(K1, K2) * 1.05;
    this.bars.set([0, KE, Q, after ? Math.max(K1, K2) : K1], mx);
    this.tyState = { vAf, K1, K2, type, KE, Q };
  }
  pend(dt) {
    const { Lp, th0, m } = this.p; const th = th0 * DEG; const Lv = 0.5 + 1.8 * Lp / 5; const piv = V(-1.3, 2.92, 0);
    this.pt2 += dt; const a = th * Math.cos(Math.sqrt(g / Lp) * this.pt2);
    const bob = V(piv.x + Math.sin(a) * Lv, piv.y - Math.cos(a) * Lv, 0);
    this.pRope.setEnds(piv, bob); this.pBob.position.copy(bob); this.pTrail.push(bob);
    const yl = piv.y - Lv, yt = piv.y - Lv * Math.cos(th);
    for (const [ln, y] of [[this.pRef, yl], [this.pTop, yt]]) { const p = ln.geometry.attributes.position; p.setXYZ(0, -2.5, y, -0.05); p.setXYZ(1, -0.1, y, -0.05); p.needsUpdate = true; ln.computeLineDistances(); }
    const h = Lp * (1 - Math.cos(th)); const hNow = Lp * (1 - Math.cos(a)); const v = Math.sqrt(Math.max(0, 2 * g * (h - hNow)));
    const dir = V(Math.cos(a), Math.sin(a), 0).multiplyScalar(-Math.sign(Math.sin(Math.sqrt(g / Lp) * this.pt2)) || 1);
    this.pv.set(bob.clone().add(V(0, 0, 0.2)), dir.multiplyScalar(Math.max(0.01, Math.abs(vlen(v, 6, 0.8)))));
    this.pLab.position.set(-0.05, (yl + yt) / 2, 0); this.pLab.setText(`h = ${plainNum(h)} m`);
    const PE = m * g * hNow, KE = m * g * (h - hNow); this.bars.set([PE, Math.max(0, KE), 0, m * g * h], m * g * h * 1.05);
    this.pState = { h, vmax: Math.sqrt(2 * g * h), v, PE, KE };
  }
  modeReadout() {
    if (this.mode === 3) { const s = this.tyState || {}; return [['سرعة A بعد التصادم', plainNum(s.vAf) + ' m/s'], ['KE قبل', plainNum(s.K1) + ' J'], ['KE بعد', plainNum(s.K2) + ' J'], ['نوع التصادم', s.type]]; }
    if (this.mode === 4) { const s = this.pState || {}; return [['ارتفاع البداية h = L(1−cosθ)', plainNum(s.h) + ' m'], ['السرعة عند القاع √(2gh)', plainNum(s.vmax) + ' m/s'], ['السرعة الآن', plainNum(s.v) + ' m/s'], ['PE + KE', plainNum(s.PE + s.KE) + ' J (ثابت)']]; }
    return super.modeReadout();
  }
  modeGraph() {
    if (this.mode === 3) { const s = this.tyState; return s && [{ label: 'KE', value: s.KE, color: COLORS.velocity }, { label: 'Q', value: s.Q, color: COLORS.weight }]; }
    if (this.mode === 4) { const s = this.pState; return s && [{ label: 'PE', value: s.PE, color: '#4c8dff' }, { label: 'KE', value: s.KE, color: COLORS.velocity }]; }
    return super.modeGraph();
  }
}

/* ═══════════ 6-1: طرق انتقال الحرارة ═══════════ */
export class Thermal extends withModes(ThermalB) {
  constructor(ctx, defs) {
    super(ctx, defs);
    const M = this.M; const Gr = this.group(1);
    const table = mesh(rbox(6.2, 0.1, 1.5, 0.03), M.anod('#2b3442', 0.4)); table.position.set(0, 0.6, 0); Gr.add(table);
    const flame = (x, y) => { const b = mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.18, 24), M.graphite); b.position.set(x, y + 0.09, 0); const f = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.0, 0.3), toneMapped: false, transparent: true, opacity: 0.85 })); f.position.set(x, y + 0.33, 0); Gr.add(b, f); return f; };
    // توصيل
    this.fl1 = flame(-2.65, 0.65);
    this.segs = []; for (let i = 0; i < 16; i++) { const s = mesh(new THREE.BoxGeometry(0.1, 0.08, 0.08), new THREE.MeshStandardMaterial({ color: '#8a8f99', roughness: 0.35, metalness: 0.8, emissive: '#000' })); s.position.set(-2.65 + i * 0.1, 1.15, 0); Gr.add(s); this.segs.push(s); }
    label(Gr, 'التوصيل', V(-2.0, 2.0, 0), '#ffb36b', 0.17); label(Gr, 'الطاقة تنتقل بتصادم الجسيمات', V(-2.0, 1.75, 0), '#cfd6e2', 0.1);
    // حمل
    this.fl2 = flame(0, 0.65);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.4, 0.8, 40, 1, true), M.glassTint('#dff0ff')); pot.position.set(0, 1.35, 0);
    const potB = mesh(new THREE.CylinderGeometry(0.41, 0.41, 0.03, 40), M.brushed); potB.position.set(0, 0.96, 0);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, 0.62, 40), new THREE.MeshStandardMaterial({ color: '#3d8bff', transparent: true, opacity: 0.18, depthWrite: false })); water.position.set(0, 1.28, 0);
    Gr.add(pot, potB, water);
    this.conv = []; for (let i = 0; i < 46; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff' })); Gr.add(p); this.conv.push({ p, ph: Math.random(), side: i % 2 ? 1 : -1, z: (Math.random() - 0.5) * 0.4 }); }
    label(Gr, 'الحمل', V(0, 2.0, 0), '#7fc4ff', 0.17); label(Gr, 'الماء الساخن يصعد والبارد يهبط', V(0, 1.75 + 0.05, 0.5), '#cfd6e2', 0.1);
    // إشعاع
    const heater = mesh(rbox(0.12, 0.7, 0.5, 0.03), M.graphite); heater.position.set(1.65, 1.1, 0);
    this.coilH = []; for (let k = 0; k < 5; k++) { const c = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 20), M.led('#ff6a2b', 2.4)); c.position.set(1.73, 0.85 + k * 0.12, 0); c.rotation.y = Math.PI / 2; Gr.add(c); this.coilH.push(c); }
    this.plate = mesh(rbox(0.06, 0.6, 0.5, 0.02), new THREE.MeshStandardMaterial({ color: '#555b66', roughness: 0.4, metalness: 0.6, emissive: '#000' })); this.plate.position.set(2.75, 1.1, 0);
    this.waves = []; for (let i = 0; i < 5; i++) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.008, 6, 48, Math.PI * 0.6), new THREE.MeshBasicMaterial({ color: '#ffb36b', transparent: true, opacity: 0.6, toneMapped: false })); w.rotation.set(0, Math.PI / 2, -Math.PI * 0.3); Gr.add(w); this.waves.push(w); }
    label(Gr, 'الإشعاع', V(2.2, 2.0, 0), '#ffd27a', 0.17); label(Gr, 'موجات كهرومغناطيسية لا تحتاج وسطاً', V(2.2, 1.75, 0), '#cfd6e2', 0.1);
    Gr.add(heater, this.plate);
    this.hLab = liveLabel(Gr, '#ffffff', 0.14); this.hLab.position.set(0, 2.55, 0);
    this.ht = 0;
  }
  update(dt) {
    const m = this.mode; this.applyMode([]);
    if (m === 0) return super.update(dt);
    const { mw, dT } = this.p; const Q = mw * 4180 * dT; this.ht += dt; const u = (this.ht % 7) / 7;
    [this.fl1, this.fl2].forEach((f) => { f.scale.set(1, 0.85 + 0.25 * Math.sin(this.t * 17 + f.position.x), 1); });
    const c = new THREE.Color();
    this.segs.forEach((s, i) => { const T = clamp(1 - (i / 16) / (0.08 + u * 1.1), 0, 1); heatColor(T, c); s.material.color.copy(c).lerp(new THREE.Color('#8a8f99'), 1 - T); s.material.emissive.copy(c).multiplyScalar(T * 0.5); s.position.y = 1.15 + Math.sin(this.t * 40 + i) * 0.006 * T; });
    const sp = 0.25 + dT / 160;
    this.conv.forEach((o) => {
      o.ph = (o.ph + dt * sp) % 1; const a = o.ph * TAU; const x = o.side * (0.18 - 0.16 * Math.cos(a));
      o.p.position.set(x, 1.28 + 0.26 * Math.sin(a), o.z); heatColor(1 - Math.abs(x) / 0.34, o.p.material.color);
    });
    this.waves.forEach((w, i) => { const f = ((this.t * 0.6 + i / 5) % 1); w.position.set(1.8 + f * 0.9, 1.1, 0); w.scale.setScalar(0.6 + f * 1.2); w.material.opacity = 0.7 * (1 - f); });
    const pl = clamp(u * 1.4, 0, 1); heatColor(pl * 0.9, c); this.plate.material.emissive.copy(c).multiplyScalar(pl * 0.4);
    this.hLab.setText(`لتسخين ${plainNum(mw)} kg من الماء بمقدار ${plainNum(dT)} K يلزم Q = ${plainNum(Q)} J`);
    this.htState = { Q, mw, dT };
  }
  modeReadout() { const s = this.htState || {}; return [['كتلة الماء m', plainNum(s.mw) + ' kg'], ['التغير في درجة الحرارة ΔT', plainNum(s.dT) + ' K'], ['الحرارة اللازمة Q = mCΔT', plainNum(s.Q) + ' J'], ['C للماء', '4180 J/kg·K']]; }
  modeGraph() { const s = this.htState; return s && [{ label: 'Q (kJ)', value: s.Q / 1000, color: '#ff8a5c' }]; }
}

/* ═══════════ 6-2: المحرك الحراري + الثلاجة والمضخة الحرارية ═══════════ */
export class Phase extends withModes(PhaseB) {
  constructor(ctx, defs) {
    super(ctx, defs);
    this.eng = [1, 2].map((m) => this.buildEngine(this.group(m), m === 2));
  }
  buildEngine(Gr, rev) {
    const M = this.M; const o = { rev };
    const res = (y, c, e, t) => { const b = mesh(rbox(2.2, 0.55, 1.0, 0.08), new THREE.MeshStandardMaterial({ color: c, emissive: e, emissiveIntensity: 0.7, roughness: 0.4 })); b.position.set(-0.6, y, -0.2); Gr.add(b); label(Gr, t, V(-0.6, y, 0.4), '#ffffff', 0.14); return b; };
    res(2.65, '#ff5a3c', '#a32008', 'المستودع الساخن  T_H'); res(0.35, '#3c8bff', '#0a2a80', 'المستودع البارد  T_L');
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.8, 32, 1, true), M.glassTint('#e8f2ff')); cyl.position.set(-0.6, 1.5, 0);
    o.piston = mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.12, 32), M.brushed);
    o.fly = new THREE.Group(); o.fly.position.set(0.25, 1.5, 0); const wheel = mesh(new THREE.TorusGeometry(0.32, 0.05, 12, 48), M.chrome); const sp = mesh(new THREE.BoxGeometry(0.64, 0.03, 0.03), M.graphite); o.fly.add(wheel, sp);
    o.link = rod(M, 0.015, M.chrome);
    Gr.add(cyl, o.piston, o.fly, o.link);
    // أشرطة تدفق الطاقة (عرضها يتناسب مع مقدار الطاقة)
    const band = (c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.04), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.2), transparent: true, opacity: 0.55, toneMapped: false, depthWrite: false })); Gr.add(m); return m; };
    o.bH = band('#ff6a3c'); o.bL = band('#4c9bff'); o.bW = band('#ffd23f');
    o.dots = []; for (let i = 0; i < 36; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' })); Gr.add(d); o.dots.push({ d, ph: i / 36, lane: i % 3 }); }
    o.load = mesh(weightGeo(), M.graphite); o.rope = rod(M, 0.01, M.chrome);
    o.plug = mesh(rbox(0.3, 0.22, 0.2, 0.04), M.paint('#2b3442')); const pin = mesh(rbox(0.04, 0.12, 0.03, 0.01), M.gold); pin.position.set(0.08, 0.16, 0); o.plug.add(pin);
    Gr.add(o.load, o.rope, o.plug);
    o.lab = liveLabel(Gr, '#ffd23f', 0.15); o.lab.position.set(1.6, 2.55, 0);
    label(Gr, rev ? 'W (شغل كهربائي داخل)' : 'W (شغل مفيد خارج)', V(1.55, 1.95, 0), '#ffd23f', 0.12);
    return o;
  }
  update(dt) {
    const m = this.mode; this.applyMode([]);
    if (m === 0) return super.update(dt);
    const o = this.eng[m - 1]; const rev = m === 2;
    let QH, QL, W;
    if (!rev) { QH = this.p.QH; W = Math.min(this.p.We, QH); QL = QH - W; } else { QL = this.p.QLr; W = this.p.Wr; QH = QL + W; }
    const s = 0.75 / Math.max(QH, 1); const wH = 0.08 + QH * s, wL = 0.04 + QL * s, wW = 0.04 + W * s;
    // الأشرطة: من/إلى المستودع الساخن (فوق) والبارد (تحت) والشغل (يمين)
    o.bH.scale.set(wH, 0.85, 1); o.bH.position.set(-0.6, 2.0, 0.3);
    o.bL.scale.set(wL, 0.75, 1); o.bL.position.set(-0.6, 0.98, 0.3);
    o.bW.scale.set(1.1, wW, 1); o.bW.position.set(0.55 + 0.1, 1.5, 0.32);
    const ang = this.t * 3; o.fly.rotation.z = rev ? ang : -ang; const py = 1.5 + Math.sin(ang) * 0.22; o.piston.position.set(-0.6, py, 0);
    o.link.setEnds(V(-0.6, py, 0.05), V(0.25 + Math.cos(ang) * 0.25, 1.5 + Math.sin(ang) * 0.25 * (rev ? -1 : 1), 0.05));
    const lanes = [[V(-0.6, 2.4, 0.33), V(-0.6, 1.62, 0.33), QH, '#ffb08a'], [V(-0.6, 1.36, 0.33), V(-0.6, 0.6, 0.33), QL, '#9fcaff'], [V(0.15, 1.5, 0.35), V(1.2, 1.5, 0.35), W, '#ffe68a']];
    o.dots.forEach((d) => {
      const [a, b, Q, c] = lanes[d.lane]; d.ph = (d.ph + dt * 0.35) % 1; const f = rev ? 1 - d.ph : d.ph;
      d.d.visible = Q > 1; d.d.position.lerpVectors(a, b, f); d.d.material.color.set(c);
    });
    o.load.visible = o.rope.visible = !rev; o.plug.visible = rev;
    if (!rev) { const ly = 0.9 + 0.35 * (0.5 + 0.5 * Math.sin(this.t * 0.8)); const sc = 0.18 + 0.12 * Math.cbrt(W / 1000); o.load.scale.setScalar(sc); o.load.position.set(1.45, ly, 0.3); o.rope.setEnds(V(1.45, 1.5, 0.3), V(1.45, ly + sc * 0.92, 0.3)); }
    else o.plug.position.set(1.4, 1.5, 0.35);
    const e = W / QH;
    o.lab.setText(rev ? `Q_H = Q_L + W = ${plainNum(QH)} J` : `الكفاءة e = W/Q_H = ${plainNum(e * 100)} %`);
    this.enState = { QH, QL, W, e, rev };
  }
  modeReadout() {
    const s = this.enState || {};
    if (!s.rev) return [['الحرارة الممتصة Q_H', plainNum(s.QH) + ' J'], ['الشغل المبذول W', plainNum(s.W) + ' J'], ['الحرارة الطاردة Q_L = Q_H − W', plainNum(s.QL) + ' J'], ['الكفاءة W/Q_H', plainNum(s.e * 100) + ' %']];
    return [['الحرارة المسحوبة من الداخل Q_L', plainNum(s.QL) + ' J'], ['الشغل الكهربائي W', plainNum(s.W) + ' J'], ['الحرارة الطاردة للخارج Q_H', plainNum(s.QH) + ' J'], ['القانون الثاني', 'الحرارة لا تنتقل من البارد للساخن تلقائياً']];
  }
  modeGraph() { const s = this.enState; return s && [{ label: 'Q_H', value: s.QH, color: '#ff6a3c' }, { label: 'W', value: s.W, color: '#ffd23f' }, { label: 'Q_L', value: s.QL, color: '#4c9bff' }]; }
}
