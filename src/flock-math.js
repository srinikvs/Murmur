// Pure flock helpers. Loaded as a classic script by index.html and imported by node:test.
globalThis.MurmurMath = (() => {
  const COUNT_MIN = 20;
  const COUNT_MAX = 500;

  const DEFAULTS = {
    count: 180,
    speed: 140,
    separation: 1.35,
    alignment: 1.0,
    cohesion: 0.85,
    avoid: 2.4,
    trail: 0.18,
  };

  function clampCount(n) {
    return Math.max(COUNT_MIN, Math.min(COUNT_MAX, Math.round(n)));
  }

  function mergeParams(stored) {
    if (!stored || typeof stored !== "object")   return { ...DEFAULTS };
    return { ...DEFAULTS, ...stored };
  }

  function wrapDelta(d, size) {
    if (d > size * 0.5) return d - size;
    if (d < -size * 0.5) return d + size;
    return d;
  }

  function wrapPosition(x, y, w, h) {
    return {
      x: (x + w) % w,
      y: (y + h) % h,
    };
  }

  function limitSpeed(vx, vy, maxSpeed) {
    const minSpeed = maxSpeed * 0.35;
    const spd = Math.hypot(vx, vy);
    if (spd > maxSpeed) {
      return { vx: (vx / spd) * maxSpeed, vy: (vy / spd) * maxSpeed };
    }
    if (spd < minSpeed && spd > 0) {
      return { vx: (vx / spd) * minSpeed, vy: (vy / spd) * minSpeed };
    }
    return { vx, vy };
  }

  function seesNeighbor(hx, hy, dx, dy, dist) {
    return hx * dx + hy * dy >= -0.15 * Math.hypot(hx, hy) * dist;
  }

  function decayPanic(panic, dt) {
    return Math.max(0, panic - dt);
  }

  function spawnBoids(count, w, h, speed, random = Math.random) {
    const n = clampCount(count);
    const next = (a, b) => a + random() * (b - a);
    return Array.from({ length: n }, () => {
      const a = next(0, Math.PI * 2);
      const s = speed * next(0.7, 1.1);
      return {
        x: next(0, w),
        y: next(0, h),
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
      };
    });
  }

  function fitFlockSize(boids, count, w, h, random = Math.random) {
    const target = clampCount(count);
    const next = boids.slice();
    const r = (a, b) => a + random() * (b - a);
    while (next.length < target) {
      const donor = next[next.length - 1] || { x: w / 2, y: h / 2, vx: 20, vy: 0 };
      next.push({
        x: donor.x + r(-12, 12),
        y: donor.y + r(-12, 12),
        vx: donor.vx + r(-8, 8),
        vy: donor.vy + r(-8, 8),
      });
    }
    if (next.length > target) next.length = target;
    return next;
  }

  class SpatialHash {
    constructor(cell) {
      this.cell = cell;
      this.map = new Map();
    }
    key(x, y) {
      return `${x},${y}`;
    }
    clear() {
      this.map.clear();
    }
    insert(boid) {
      const cx = Math.floor(boid.x / this.cell);
      const cy = Math.floor(boid.y / this.cell);
      const k = this.key(cx, cy);
      let bin = this.map.get(k);
      if (!bin) {
        bin = [];
        this.map.set(k, bin);
      }
      bin.push(boid);
    }
    query(x, y, range, w, h, out) {
      out.length = 0;
      const c = this.cell;
      const x0 = Math.floor((x - range) / c);
      const x1 = Math.floor((x + range) / c);
      const y0 = Math.floor((y - range) / c);
      const y1 = Math.floor((y + range) / c);
      const maxX = Math.ceil(w / c);
      const maxY = Math.ceil(h / c);
      for (let ix = x0; ix <= x1; ix++) {
        for (let iy = y0; iy <= y1; iy++) {
          const bin = this.map.get(this.key(((ix % maxX) + maxX) % maxX, ((iy % maxY) + maxY) % maxY));
          if (bin) for (const b of bin) out.push(b);
        }
      }
      return out;
    }
  }

  return {
    COUNT_MIN,
    COUNT_MAX,
    DEFAULTS,
    clampCount,
    mergeParams,
    wrapDelta,
    wrapPosition,
    limitSpeed,
    seesNeighbor,
    decayPanic,
    spawnBoids,
    fitFlockSize,
    SpatialHash,
  };
})();
