// تحكم موحّد لكل الأجهزة:
//  • الكمبيوتر: WASD/الأسهم + سحب الماوس للنظر + العجلة للتقريب + النقر للتفتيش
//  • الجوال والأيباد: عصا عائمة تظهر حيث تلمس في النصف الأيسر، سحب في بقية الشاشة للنظر، قرص بإصبعين للتقريب، لمسة للتفتيش
// تُلتقط كل المدخلات بطبقة شفافة واحدة فوق المشهد، فلا يحجبها أي عنصر في أي غرفة.
import * as THREE from 'three';

const STICK_R = 52;

export class WalkControls {
  constructor(camera, host, { onTap, isTouch }) {
    this.cam = camera; this.host = host; this.onTap = onTap; this.isTouch = isTouch;
    this.yaw = 0; this.pitch = -0.08; this.keys = new Set(); this.move = new THREE.Vector2();
    this.vel = new THREE.Vector3(); this.enabled = true; this.fov = camera.fov;
    this.pointers = new Map(); this.stick = null; this.lookIds = [];
    this.colliders = []; this.bounds = { x0: -5.5, x1: 5.5, z0: -8.4, z1: 8.4 };
    this._kd = (e) => { if (!this.enabled || e.target.closest?.('input,textarea')) return; this.keys.add(e.code); if (e.code.startsWith('Arrow')) e.preventDefault(); };
    this._ku = (e) => this.keys.delete(e.code);
    this._blur = () => { this.keys.clear(); this.releaseAll(); };
    addEventListener('keydown', this._kd); addEventListener('keyup', this._ku); addEventListener('blur', this._blur);
    this.buildLayer();
  }

  buildLayer() {
    const L = this.layer = document.createElement('div');
    L.className = 'touch-layer'; L.setAttribute('aria-hidden', 'true');
    L.innerHTML = `<div class="stick-home"><span>تحرّك</span></div><div class="stick"><div class="stick-knob"></div></div>`;
    this.host.appendChild(L);
    this.stickEl = L.querySelector('.stick'); this.knob = L.querySelector('.stick-knob'); this.home = L.querySelector('.stick-home');
    if (!this.isTouch) this.home.style.display = 'none';
    const opts = { passive: false };
    L.addEventListener('pointerdown', (e) => this.down(e), opts);
    L.addEventListener('pointermove', (e) => this.moveEvt(e), opts);
    L.addEventListener('pointerup', (e) => this.up(e), opts);
    L.addEventListener('pointercancel', (e) => this.up(e, true), opts);
    L.addEventListener('lostpointercapture', (e) => this.up(e, true));
    L.addEventListener('wheel', (e) => { e.preventDefault(); if (!this.enabled && this.onZoom) return this.onZoom(Math.exp(e.deltaY * 0.0012)); this.fov = THREE.MathUtils.clamp(this.fov * Math.exp(e.deltaY * 0.001), 35, 85); }, opts);
    L.addEventListener('contextmenu', (e) => e.preventDefault());
    // منع سلوك المتصفح الافتراضي (تمرير/تكبير) على iOS
    ['touchstart', 'touchmove', 'gesturestart'].forEach((t) => L.addEventListener(t, (e) => e.preventDefault(), opts));
  }

  down(e) {
    e.preventDefault();
    try { this.layer.setPointerCapture(e.pointerId); } catch {}
    const r = this.layer.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top;
    const p = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: 0, kind: 'look', type: e.pointerType };
    const touchLike = e.pointerType !== 'mouse';
    if (touchLike && this.enabled && !this.stick && x < r.width * 0.45 && y > r.height * 0.25) {
      p.kind = 'stick'; this.stick = { id: e.pointerId, cx: e.clientX, cy: e.clientY };
      this.stickEl.style.transform = `translate(${x}px, ${y}px)`; this.stickEl.classList.add('on'); this.home.classList.add('hide');
      this.knob.style.transform = '';
    } else {
      this.lookIds.push(e.pointerId);
      if (this.lookIds.length === 2) { const [a, b] = this.lookIds.map((id) => this.pointers.get(id) || p); this.pinchD = Math.hypot(a.x - b.x, a.y - b.y) || 1; }
    }
    this.pointers.set(e.pointerId, p);
  }

  moveEvt(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p) { this.hoverX = e.clientX; this.hoverY = e.clientY; return; }
    e.preventDefault();
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; p.moved += Math.abs(dx) + Math.abs(dy);
    if (p.kind === 'stick') {
      let ox = e.clientX - this.stick.cx, oy = e.clientY - this.stick.cy; const L = Math.hypot(ox, oy);
      if (L > STICK_R) { ox *= STICK_R / L; oy *= STICK_R / L; }
      this.knob.style.transform = `translate(${ox}px, ${oy}px)`;
      const dz = 0.12, mag = Math.min(1, L / STICK_R);
      this.move.set(ox / STICK_R, -oy / STICK_R); if (mag < dz) this.move.set(0, 0);
      return;
    }
    if (this.lookIds.length >= 2) {
      const [a, b] = this.lookIds.slice(0, 2).map((id) => this.pointers.get(id)); if (!a || !b) return;
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      if (!this.enabled && this.onZoom) this.onZoom(this.pinchD / d); else this.fov = THREE.MathUtils.clamp(this.fov * (this.pinchD / d), 35, 85);
      this.pinchD = d; return;
    }
    if (!this.enabled) { this.onOrbit?.(dx, dy); return; }
    const k = p.type === 'mouse' ? 0.0042 : 0.0058;
    this.yaw -= dx * k; this.pitch = THREE.MathUtils.clamp(this.pitch - dy * k, -1.2, 1.0);
  }

  up(e, cancelled = false) {
    const p = this.pointers.get(e.pointerId); if (!p) return;
    this.pointers.delete(e.pointerId);
    if (p.kind === 'stick') { this.stick = null; this.move.set(0, 0); this.stickEl.classList.remove('on'); this.home.classList.remove('hide'); }
    else this.lookIds = this.lookIds.filter((id) => id !== e.pointerId);
    if (!cancelled && p.moved < 10 && performance.now() - p.t < 450 && this.pointers.size === 0) this.onTap?.(e.clientX, e.clientY);
  }

  releaseAll() { this.pointers.clear(); this.lookIds = []; this.stick = null; this.move.set(0, 0); this.stickEl?.classList.remove('on'); }

  setEnabled(v) { this.enabled = v; if (!v) { this.releaseAll(); this.keys.clear(); } this.layer.classList.toggle('off', !v); }

  lookAt(target) {
    const p = this.cam.position; const dx = target.x - p.x, dy = target.y - p.y, dz = target.z - p.z;
    this.yaw = Math.atan2(-dx, -dz); this.pitch = Math.atan2(dy, Math.hypot(dx, dz));
  }

  update(dt) {
    dt = Math.min(dt, 0.1); // حركة مستقلة عن معدل الإطارات حتى على الأجهزة البطيئة
    const k = this.keys;
    let f = this.move.y, s = this.move.x;
    if (this.enabled) {
      if (k.has('KeyW') || k.has('ArrowUp')) f += 1;
      if (k.has('KeyS') || k.has('ArrowDown')) f -= 1;
      if (k.has('KeyD') || k.has('ArrowRight')) s += 1;
      if (k.has('KeyA') || k.has('ArrowLeft')) s -= 1;
    } else { f = 0; s = 0; }
    const run = k.has('ShiftLeft') || k.has('ShiftRight') || this.move.length() > 0.92;
    const speed = run ? 3.8 : 2.4;
    const L = Math.hypot(f, s); if (L > 1) { f /= L; s /= L; }
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw), rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
    const tx = (fx * f + rx * s) * speed, tz = (fz * f + rz * s) * speed;
    const a = 1 - Math.exp(-dt * 10);
    this.vel.x += (tx - this.vel.x) * a; this.vel.z += (tz - this.vel.z) * a;
    const p = this.cam.position;
    p.x += this.vel.x * dt; p.z += this.vel.z * dt;
    if (!this.noCollide) this.collide(p);
    this.cam.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    this.cam.fov += (this.fov - this.cam.fov) * a; this.cam.updateProjectionMatrix();
  }

  collide(p) {
    const b = this.bounds;
    if (b.r) { // غرفة دائرية
      const d = Math.hypot(p.x - (b.cx || 0), p.z - (b.cz || 0));
      if (d > b.r) { p.x = (b.cx || 0) + (p.x - (b.cx || 0)) * b.r / d; p.z = (b.cz || 0) + (p.z - (b.cz || 0)) * b.r / d; }
    } else { p.x = THREE.MathUtils.clamp(p.x, b.x0, b.x1); p.z = THREE.MathUtils.clamp(p.z, b.z0, b.z1); }
    for (const c of this.colliders) {
      if (c.rect) { // مستطيل: ادفع إلى أقرب حافة
        const [x0, x1, z0, z1] = c.rect;
        if (p.x > x0 && p.x < x1 && p.z > z0 && p.z < z1) {
          const d = [p.x - x0, x1 - p.x, p.z - z0, z1 - p.z]; const m = Math.min(...d);
          if (m === d[0]) p.x = x0; else if (m === d[1]) p.x = x1; else if (m === d[2]) p.z = z0; else p.z = z1;
        }
        continue;
      }
      const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz);
      if (d < c.r && d > 1e-4) { p.x = c.x + (dx / d) * c.r; p.z = c.z + (dz / d) * c.r; }
    }
  }

  dispose() {
    removeEventListener('keydown', this._kd); removeEventListener('keyup', this._ku); removeEventListener('blur', this._blur);
    this.layer?.remove();
  }
}
