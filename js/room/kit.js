// أدوات مشتركة لغرف المحاكاة: المواد (PBR)، المتجهات، اللافتات، القوام الإجرائي
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const COLORS = {
  force: '#ff4d5e',     // القوة
  velocity: '#35e08a',  // السرعة
  momentum: '#3fb8ff',  // الزخم
  displacement: '#ffd23f', // الإزاحة / المسافة
  torque: '#c77dff',    // العزم والزخم الزاوي
  weight: '#ff9f43',    // الوزن
  normal: '#e8ecff',    // القوة العمودية / الشد
  energy: '#7ef0ff',
};

const FONT = '"Plex Arabic", system-ui, sans-serif';

/* ─── قوام إجرائي ─── */
export function canvasTex(w, h, draw, { srgb = true, repeat = null } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}

function noise(g, w, h, n, a, light = false) {
  for (let i = 0; i < n; i++) {
    const v = light ? 255 : 0;
    g.fillStyle = `rgba(${v},${v},${v},${Math.random() * a})`;
    g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
}

export function makeMaterials(quality) {
  const floorMap = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#2a2d36'; g.fillRect(0, 0, w, h);
    const n = 4, s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const l = 38 + Math.random() * 10;
      g.fillStyle = `hsl(225, 8%, ${l * 0.42}%)`; g.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
      // عروق الحجر
      g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 1.2;
      for (let k = 0; k < 5; k++) { g.beginPath(); let x = i * s + Math.random() * s, y = j * s; g.moveTo(x, y); for (let q = 0; q < 8; q++) { x += (Math.random() - 0.5) * 50; y += s / 8; g.lineTo(x, y); } g.stroke(); }
    }
    noise(g, w, h, 30000, 0.06, true); noise(g, w, h, 30000, 0.12);
    g.fillStyle = '#15171d'; for (let i = 0; i <= n; i++) { g.fillRect(i * s - 2, 0, 4, h); g.fillRect(0, i * s - 2, w, 4); }
  }, { repeat: [3, 4.5] });
  const floorRough = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#4d4d4d'; g.fillRect(0, 0, w, h); noise(g, w, h, 8000, 0.25, true); noise(g, w, h, 8000, 0.25);
    g.fillStyle = '#d0d0d0'; for (let i = 0; i <= 1; i++) { g.fillRect(i * w - 2, 0, 4, h); g.fillRect(0, i * h - 2, w, 4); }
  }, { srgb: false, repeat: [12, 18] });

  const plaster = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#e9e4d8'; g.fillRect(0, 0, w, h); noise(g, w, h, 20000, 0.05); noise(g, w, h, 12000, 0.05, true); }, { repeat: [4, 2] });
  const wood = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#3b2618'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(${90 + Math.sin(y * 0.11) * 25},${55 + Math.sin(y * 0.07) * 12},30,.35)`; g.fillRect(0, y, w, 1); }
    noise(g, w, h, 6000, 0.1);
  }, { repeat: [6, 1] });

  const P = quality.high ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
  const cache = new Map();
  const memo = (k, f) => (cache.has(k) ? cache.get(k) : (cache.set(k, f()), cache.get(k)));
  return {
    /** طلاء لامع بطبقة شفافة (Clearcoat) */
    paint: (c, rough = 0.32) => memo('p' + c + rough, () => new P({ color: c, roughness: rough, metalness: 0.15, ...(quality.high ? { clearcoat: 1, clearcoatRoughness: 0.06 } : {}) })),
    /** معدن مؤكسد ملوّن */
    anod: (c, rough = 0.28) => memo('a' + c + rough, () => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: 0.85 })),
    /** مادة مضيئة (تتوهج مع Bloom) */
    emit: (c, i = 2.2) => memo('e' + c + i, () => new THREE.MeshStandardMaterial({ color: '#000', emissive: c, emissiveIntensity: i * 0.7, roughness: 0.5 })),
    /** ضوء خالص لخطوط LED */
    led: (c, i = 1) => memo('l' + c + i, () => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i * 0.65), toneMapped: false })),
    chrome: new THREE.MeshStandardMaterial({ color: '#e8ecf2', roughness: 0.08, metalness: 1 }),
    brushed: new THREE.MeshStandardMaterial({ color: '#aab2bf', roughness: 0.34, metalness: 1 }),
    gold: new THREE.MeshStandardMaterial({ color: '#d9ac5f', roughness: 0.22, metalness: 1 }),
    graphite: new P({ color: '#1c1f27', roughness: 0.55, metalness: 0.3 }),
    ceramic: new P({ color: '#f4f4f1', roughness: 0.25, metalness: 0, ...(quality.high ? { clearcoat: 0.8, clearcoatRoughness: 0.1 } : {}) }),
    glassTint: (c) => memo('g' + c, () => quality.high
      ? new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.08, metalness: 0, transmission: 0.9, thickness: 0.08, ior: 1.45, transparent: true })
      : new THREE.MeshStandardMaterial({ color: c, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.22, depthWrite: false })),
    floor: new THREE.MeshStandardMaterial({ map: floorMap, roughnessMap: floorRough, roughness: 0.55, metalness: 0.05, envMapIntensity: 0.9 }),
    wall: new THREE.MeshStandardMaterial({ map: plaster, roughness: 0.92, metalness: 0 }),
    wood: new THREE.MeshStandardMaterial({ map: wood, roughness: 0.45, metalness: 0.0 }),
    ceiling: new THREE.MeshStandardMaterial({ color: '#16181f', roughness: 0.95 }),
    marble: new THREE.MeshStandardMaterial({ color: '#f1efe9', roughness: 0.22, metalness: 0 }),
    brass: new THREE.MeshStandardMaterial({ color: '#c9a05a', roughness: 0.28, metalness: 1 }),
    steel: new THREE.MeshStandardMaterial({ color: '#b9c0cc', roughness: 0.25, metalness: 1 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: '#2b2f38', roughness: 0.4, metalness: 0.8 }),
    rubber: new THREE.MeshStandardMaterial({ color: '#1b1c20', roughness: 0.85 }),
    glass: quality.high
      ? new THREE.MeshPhysicalMaterial({ color: '#dfefff', roughness: 0.05, metalness: 0, transmission: 0.92, thickness: 0.05, transparent: true, opacity: 1, ior: 1.45 })
      : new THREE.MeshStandardMaterial({ color: '#cfe6ff', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.18, depthWrite: false }),
    lightPanel: new THREE.MeshBasicMaterial({ color: '#fff6e6' }),
  };
}

export function pbr(color, rough = 0.4, metal = 0, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
}

/* ─── اللافتات النصية ─── */
export function textSprite(text, { sub = '', color = '#ffffff', size = 0.22, bg = 'rgba(10,14,28,.72)', italic = true } = {}) {
  const fs = 96;
  const c = document.createElement('canvas'); const g = c.getContext('2d');
  const mainFont = `${italic ? 'italic ' : ''}600 ${fs}px "Times New Roman", serif`;
  const subFont = `600 ${fs * 0.55}px "Times New Roman", serif`;
  g.font = mainFont; const w1 = g.measureText(text).width; g.font = subFont; const w2 = sub ? g.measureText(sub).width + 6 : 0;
  c.width = Math.ceil(w1 + w2 + 48); c.height = 140;
  g.fillStyle = bg; const r = 40; g.beginPath(); g.roundRect(3, 6, c.width - 6, 128, r); g.fill(); g.strokeStyle = color; g.globalAlpha = 0.85; g.lineWidth = 5; g.stroke(); g.globalAlpha = 1;
  g.fillStyle = color; g.font = mainFont; g.textBaseline = 'middle'; g.fillText(text, 24, 70);
  if (sub) { g.font = subFont; g.fillText(sub, 24 + w1 + 4, 98); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.renderOrder = 10; s.scale.set(size * c.width / c.height, size, 1);
  return s;
}

/** لوحة نصية عربية متعددة الأسطر */
export function panelTexture(w, h, draw) {
  return canvasTex(w, h, (g) => { g.direction = 'rtl'; g.textBaseline = 'top'; draw(g, w, h); });
}

export function wrapText(g, text, maxW) {
  const words = text.split(/\s+/); const lines = []; let cur = '';
  for (const wd of words) { const t = cur ? cur + ' ' + wd : wd; if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = wd; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}
export { FONT };

/* ─── المتجهات ─── */
const shaftGeo = new THREE.CylinderGeometry(1, 1, 1, 16, 1); shaftGeo.translate(0, 0.5, 0);
// رأس سهم عصري بقاعدة مقعّرة (شكل الريشة) بدل المخروط البسيط
const headGeo = new THREE.LatheGeometry([[0, -0.78], [0.5, -0.86], [1, -1], [0.62, -0.42], [0, 0]].map(([x, y]) => new THREE.Vector2(x, y)), 24);
const tailGeo = new THREE.SphereGeometry(1, 16, 12);
const UP = new THREE.Vector3(0, 1, 0);

/** متجه ثلاثي الأبعاد: ساق أسطوانية ورأس مخروطي ولافتة رمز */
export class Arrow extends THREE.Group {
  static hidden = false;
  constructor(color, { label = '', sub = '', radius = 0.028, labelSize = 0.2, dashed = false } = {}) {
    super();
    this.mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: dashed ? 0.45 : 0.85, roughness: 0.3, metalness: 0.1, transparent: dashed, opacity: dashed ? 0.55 : 1, side: THREE.DoubleSide });
    this.shaft = new THREE.Mesh(shaftGeo, this.mat); this.head = new THREE.Mesh(headGeo, this.mat);
    this.shaft.castShadow = true; this.head.castShadow = true;
    // نقطة التأثير (كرة صغيرة عند ذيل المتجه) وغلاف متوهج خفيف حول الساق
    this.tail = new THREE.Mesh(tailGeo, this.mat); this.tail.scale.setScalar(radius * 1.7);
    this.sheath = new THREE.Mesh(shaftGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: dashed ? 0.06 : 0.14, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.radius = radius; this.add(this.shaft, this.head, this.tail, this.sheath);
    if (label) { this.label = textSprite(label, { sub, color, size: labelSize }); this.add(this.label); }
    this.dir = new THREE.Vector3(); this.q = new THREE.Quaternion();
  }
  /** origin: نقطة البداية، vec: المتجه (الطول = المقدار بالمتر) */
  set(origin, vec) {
    const L = vec.length();
    this.visible = !Arrow.hidden && L > 0.02;
    if (!this.visible) return this;
    this.position.copy(origin);
    this.dir.copy(vec).divideScalar(L);
    this.q.setFromUnitVectors(UP, this.dir);
    const hl = Math.min(L * 0.38, this.radius * 7), hr = this.radius * 2.6;
    this.shaft.quaternion.copy(this.q); this.shaft.scale.set(this.radius, Math.max(L - hl * 0.8, 0.001), this.radius);
    this.sheath.quaternion.copy(this.q); this.sheath.scale.set(this.radius * 2.3, Math.max(L - hl, 0.001), this.radius * 2.3);
    this.head.quaternion.copy(this.q); this.head.position.copy(this.dir).multiplyScalar(L); this.head.scale.set(hr, hl, hr);
    if (this.label) this.label.position.copy(this.dir).multiplyScalar(L + 0.16).add(new THREE.Vector3(0, 0.08, 0));
    return this;
  }
}

/** ربط مقدار فيزيائي بطول مرئي مقروء (تحجيم لوغاريتمي ناعم) */
export const vlen = (x, ref, max = 1.6) => {
  const s = Math.sign(x), a = Math.abs(x) / ref;
  return s * max * (a / (1 + a)) * 1.6;
};

export function damp(cur, target, lambda, dt) { return cur + (target - cur) * (1 - Math.exp(-lambda * dt)); }

/** خط منقط (لمسارات المدارات والأذرع) */
export function dashedLine(points, color, { dash = 0.08, gap = 0.06, opacity = 0.8 } = {}) {
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(geo, new THREE.LineDashedMaterial({ color, dashSize: dash, gapSize: gap, transparent: true, opacity }));
  line.computeLineDistances(); return line;
}

/** لون من الأزرق (بارد) إلى الأحمر (ساخن) */
export function heatColor(t, out = new THREE.Color()) {
  t = Math.max(0, Math.min(1, t));
  return out.setHSL(0.62 - 0.62 * t, 0.85, 0.55);
}

/** تحويل LaTeX مبسط إلى نص مقروء للوحات الجدارية */
export function latexPlain(s) {
  const SUB = { 0: '₀', 1: '₁', 2: '₂', A: 'ₐ', B: 'ᵦ', E: 'ₑ', M: 'ₘ', P: 'ₚ', i: 'ᵢ', f: 'f', r: 'ᵣ', e: 'ₑ', v: 'ᵥ', K: 'K', C: 'C' };
  const SUP = { 2: '²', 3: '³', '-': '⁻' };
  let t = s;
  const rep = [[/\\dfrac\{([A-Za-z0-9_^\\ ]{1,12})\}\{([A-Za-z0-9_^{}\\ ]{1,10})\}/g, '$1 / $2'], [/\\dfrac\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, '($1)/($2)'], [/\\tfrac12|\\tfrac\{1\}\{2\}/g, '½'],
    [/\\left|\\right/g, ''], [/\\sqrt\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, '√($1)'], [/\\omega/g, 'ω'], [/\\alpha/g, 'α'], [/\\theta/g, 'θ'], [/\\tau/g, 'τ'],
    [/\\Delta/g, 'Δ'], [/\\pi/g, 'π'], [/\\sum/g, 'Σ'], [/\\sin/g, 'sin'], [/\\cos/g, 'cos'], [/\\qquad/g, ' QQ '], [/\\quad|\\;|\\,/g, ' '], [/\\times/g, '×'], [/\\Rightarrow/g, '⇒']];
  for (const [a, b] of rep) for (let k = 0; k < 3; k++) t = t.replace(a, b);
  t = t.replace(/\^\{?([0-9-]+)\}?/g, (_, d) => [...d].map((ch) => SUP[ch] || ch).join(''));
  t = t.replace(/_\{([^}]*)\}/g, (_, d) => (d.length <= 2 && [...d].every((ch) => SUB[ch]) ? [...d].map((ch) => SUB[ch]).join('') : d));
  t = t.replace(/_([A-Za-z0-9])/g, (_, d) => SUB[d] || d);
  t = t.replace(/[{}\\]/g, '').replace(/\s+/g, ' ').replace(/Δ /g, 'Δ').replace(/\(([^\s()]{1,3})\)/g, '$1');
  return t.replace(/ QQ /g, '        ').trim();
}

/* ─── هندسة عصرية ─── */
export function rbox(w, h, d, r = 0.04, seg = 3) {
  return new RoundedBoxGeometry(w, h, d, seg, Math.max(0.001, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3)));
}
/** مجسم دوراني من مقطع جانبي [[نصف القطر، الارتفاع]...] */
export function lathe(pts, segs = 48) {
  return new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), segs);
}
/** ثقل معايرة مصقول (للكتل) */
export function weightGeo() {
  return lathe([[0, 0], [0.42, 0], [0.5, 0.06], [0.5, 0.52], [0.42, 0.6], [0.16, 0.62], [0.12, 0.7], [0.18, 0.78], [0.18, 0.86], [0.1, 0.92], [0, 0.92]], 40);
}
export function mesh(geo, mat, shadow = true) {
  const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; m.receiveShadow = true; return m;
}

/** أثر حركة متوهج يتلاشى تدريجياً (يُضاف إلى نفس المجموعة التي يتحرك فيها الجسم) */
export class Trail extends THREE.Group {
  constructor(color, n = 140, size = 0.035) {
    super(); this.n = n; this.count = 0; this.enabled = true;
    this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 3); this.c = new THREE.Color(color);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    geo.setDrawRange(0, 0); this.geo = geo;
    this.line = new THREE.Line(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.dots = new THREE.Points(geo, new THREE.PointsMaterial({ size, vertexColors: true, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
    this.line.frustumCulled = this.dots.frustumCulled = false;
    this.add(this.line, this.dots); this.last = null; this.minStep = 0.012;
  }
  push(v) {
    if (!this.enabled) return;
    if (this.last && this.last.distanceToSquared(v) < this.minStep * this.minStep) return;
    this.last = v.clone();
    this.pos.copyWithin(3, 0, (this.n - 1) * 3); this.pos[0] = v.x; this.pos[1] = v.y; this.pos[2] = v.z;
    this.count = Math.min(this.n, this.count + 1);
    for (let i = 0; i < this.count; i++) { const f = (1 - i / this.n) ** 1.6; this.col[i * 3] = this.c.r * f; this.col[i * 3 + 1] = this.c.g * f; this.col[i * 3 + 2] = this.c.b * f; }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.color.needsUpdate = true; this.geo.setDrawRange(0, this.count);
  }
  clear() { this.count = 0; this.last = null; this.geo.setDrawRange(0, 0); }
  setEnabled(v) { this.enabled = v; this.visible = v; if (!v) this.clear(); }
}
