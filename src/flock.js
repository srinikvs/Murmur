const {
  mergeParams,
  wrapDelta,
  wrapPosition,
  limitSpeed,
  seesNeighbor,
  decayPanic,
  spawnBoids,
  fitFlockSize,
  SpatialHash,
} = globalThis.MurmurMath;

const KEY = "murmur.params";

function loadParams() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return mergeParams(null);
    return mergeParams(JSON.parse(raw));
  } catch {
    return mergeParams(null);
  }
}

function saveParams(p) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

class Flock {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.params = loadParams();
    this.boids = [];
    this.hash = new SpatialHash(48);
    this.neighbors = [];
    this.pointer = { x: 0, y: 0, on: false, panic: 0 };
    this.paused = false;
    this.last = performance.now();
    this.resize();
    this.respawn();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.floor(this.w * dpr);
    this.canvas.height = Math.floor(this.h * dpr);
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  respawn() {
    this.boids = spawnBoids(this.params.count, this.w, this.h, this.params.speed);
  }

  setCount(n) {
    this.params.count = n;
    this.boids = fitFlockSize(this.boids, n, this.w, this.h);
    saveParams(this.params);
  }

  scatter() {
    this.pointer.panic = 0.7;
    const cx = this.pointer.on ? this.pointer.x : this.w / 2;
    const cy = this.pointer.on ? this.pointer.y : this.h / 2;
    for (const b of this.boids) {
      let dx = wrapDelta(b.x - cx, this.w);
      let dy = wrapDelta(b.y - cy, this.h);
      const m = Math.hypot(dx, dy) || 1;
      b.vx += (dx / m) * 280;
      b.vy += (dy / m) * 280;
    }
  }

  tick(dt) {
    const p = this.params;
    const maxSpeed = p.speed;
    const vis = 56;
    const sepR = 22;
    const avoidR = 110;
    this.hash.clear();
    for (const b of this.boids) this.hash.insert(b);

    if (this.pointer.panic > 0) this.pointer.panic = decayPanic(this.pointer.panic, dt);

    for (const b of this.boids) {
      this.hash.query(b.x, b.y, vis, this.w, this.h, this.neighbors);
      let sx = 0, sy = 0, ax = 0, ay = 0, cx = 0, cy = 0, n = 0, ns = 0;

      for (const o of this.neighbors) {
        if (o === b) continue;
        const dx = wrapDelta(o.x - b.x, this.w);
        const dy = wrapDelta(o.y - b.y, this.h);
        const d2 = dx * dx + dy * dy;
        if (d2 > vis * vis || d2 === 0) continue;
        const d = Math.sqrt(d2);
        if (!seesNeighbor(b.vx, b.vy, dx, dy, d)) continue;
        n++;
        ax += o.vx;
        ay += o.vy;
        cx += dx;
        cy += dy;
        if (d < sepR) {
          const f = (sepR - d) / sepR;
          sx -= (dx / d) * f;
          sy -= (dy / d) * f;
          ns++;
        }
      }

      let fx = 0, fy = 0;
      if (ns) {
        fx += (sx / ns) * p.separation * 220;
        fy += (sy / ns) * p.separation * 220;
      }
      if (n) {
        ax /= n;
        ay /= n;
        const am = Math.hypot(ax, ay) || 1;
        fx += (ax / am * maxSpeed - b.vx) * p.alignment * 2.2;
        fy += (ay / am * maxSpeed - b.vy) * p.alignment * 2.2;
        cx /= n;
        cy /= n;
        const cm = Math.hypot(cx, cy) || 1;
        fx += (cx / cm) * p.cohesion * 40;
        fy += (cy / cm) * p.cohesion * 40;
      }

      if (this.pointer.on || this.pointer.panic > 0) {
        const dx = wrapDelta(b.x - this.pointer.x, this.w);
        const dy = wrapDelta(b.y - this.pointer.y, this.h);
        const d = Math.hypot(dx, dy) || 1;
        const reach = avoidR * (1 + this.pointer.panic * 1.8);
        if (d < reach) {
          const f = ((reach - d) / reach) * p.avoid * 320 * (1 + this.pointer.panic * 2);
          fx += (dx / d) * f;
          fy += (dy / d) * f;
        }
      }

      b.vx += fx * dt;
      b.vy += fy * dt;
      const limited = limitSpeed(b.vx, b.vy, maxSpeed);
      b.vx = limited.vx;
      b.vy = limited.vy;
      const wrapped = wrapPosition(b.x + b.vx * dt, b.y + b.vy * dt, this.w, this.h);
      b.x = wrapped.x;
      b.y = wrapped.y;
    }
  }

  draw() {
    const { ctx, w, h } = this;
    ctx.fillStyle = `rgba(7, 8, 12, ${1 - this.params.trail * 0.55})`;
    ctx.fillRect(0, 0, w, h);

    if (this.pointer.on || this.pointer.panic > 0) {
      const r = 110 * (1 + this.pointer.panic * 1.8);
      ctx.beginPath();
      ctx.arc(this.pointer.x, this.pointer.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(159, 216, 208, ${0.12 + this.pointer.panic * 0.35})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    for (const b of this.boids) {
      const ang = Math.atan2(b.vy, b.vx);
      const hue = ((ang * 180) / Math.PI + 360) % 360;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(7.5, 0);
      ctx.lineTo(-5.5, 3.4);
      ctx.lineTo(-3.2, 0);
      ctx.lineTo(-5.5, -3.4);
      ctx.closePath();
      ctx.fillStyle = `hsl(${170 + hue * 0.12}, 38%, ${62 + Math.min(18, Math.hypot(b.vx, b.vy) / 12)}%)`;
      ctx.fill();
      ctx.restore();
    }
  }

  frame(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!this.paused) this.tick(dt);
    this.draw();
    requestAnimationFrame((t) => this.frame(t));
  }
}

const canvas = document.getElementById("stage");
const flock = new Flock(canvas);

function bindSlider(id, key, map = (v) => Number(v)) {
  const el = document.getElementById(id);
  const out = document.getElementById(`${id}-val`);
  el.value = flock.params[key];
  out.textContent = key === "count" ? String(Math.round(flock.params[key])) : Number(flock.params[key]).toFixed(2);
  el.addEventListener("input", () => {
    const v = map(el.value);
    flock.params[key] = v;
    out.textContent = key === "count" ? String(Math.round(v)) : Number(v).toFixed(2);
    if (key === "count") flock.setCount(v);
    else saveParams(flock.params);
  });
}

bindSlider("sep", "separation");
bindSlider("ali", "alignment");
bindSlider("coh", "cohesion");
bindSlider("avo", "avoid");
bindSlider("spd", "speed");
bindSlider("pop", "count");

document.getElementById("pause").addEventListener("click", () => {
  flock.paused = !flock.paused;
  document.getElementById("pause").textContent = flock.paused ? "Resume" : "Pause";
});
document.getElementById("reset").addEventListener("click", () => flock.respawn());
document.getElementById("scatter").addEventListener("click", () => flock.scatter());

window.addEventListener("resize", () => flock.resize());
window.addEventListener("pointermove", (e) => {
  flock.pointer.x = e.clientX;
  flock.pointer.y = e.clientY;
  flock.pointer.on = true;
});
window.addEventListener("pointerdown", (e) => {
  flock.pointer.x = e.clientX;
  flock.pointer.y = e.clientY;
  flock.pointer.on = true;
  flock.pointer.panic = 0.35;
});
window.addEventListener("pointerleave", () => {
  flock.pointer.on = false;
});
window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    flock.paused = !flock.paused;
    document.getElementById("pause").textContent = flock.paused ? "Resume" : "Pause";
  }
  if (e.key === "r" || e.key === "R") flock.respawn();
  if (e.key === "s" || e.key === "S") flock.scatter();
});

requestAnimationFrame((t) => flock.frame(t));
