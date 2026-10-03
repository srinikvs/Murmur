/** @typedef {'cursors' | 'koya' | 'diwali'} Mode */

export const MODES = ["cursors", "koya", "diwali"];
export const MODE_CAP = { cursors: 400, koya: 20, diwali: 20 };
const STILL_S = 2;

function rand(a, b) {
  return a + Math.random() * (b - a);
}

function wrapDelta(d, size) {
  if (d > size * 0.5) return d - size;
  if (d < -size * 0.5) return d + size;
  return d;
}

function clampCount(mode, count) {
  const cap = MODE_CAP[mode] ?? 20;
  const min = mode === "cursors" ? 20 : 4;
  return Math.max(min, Math.min(cap, Math.round(count)));
}

export function createSim(opts = {}) {
  const sim = {
    w: opts.width ?? 800,
    h: opts.height ?? 600,
    mode: MODES.includes(opts.mode) ? opts.mode : "cursors",
    speed: opts.speed ?? 140,
    separation: opts.separation ?? 1.35,
    alignment: opts.alignment ?? 1,
    cohesion: opts.cohesion ?? 0.85,
    avoid: opts.avoid ?? 2.4,
    requestedCount: opts.count ?? 20,
    agents: [],
    sparks: [],
    bursts: [],
    pointer: { x: 400, y: 300, on: false, lastMove: -STILL_S, panic: 0 },
    time: 0,
  };

  function spawnCursor() {
    const a = rand(0, Math.PI * 2);
    const s = sim.speed * rand(0.7, 1.1);
    return { kind: "cursor", x: rand(0, sim.w), y: rand(0, sim.h), vx: Math.cos(a) * s, vy: Math.sin(a) * s };
  }

  function spawnFish() {
    const ang = rand(0, Math.PI * 2);
    return {
      kind: "koya",
      x: rand(48, Math.max(49, sim.w - 48)),
      y: rand(48, Math.max(49, sim.h - 48)),
      vx: Math.cos(ang) * 36,
      vy: Math.sin(ang) * 36,
      hue: rand(168, 198),
    };
  }

  function spawnRocket() {
    return {
      kind: "rocket",
      x: rand(40, Math.max(41, sim.w - 40)),
      y: sim.h - rand(28, 90),
      vx: rand(-26, 26),
      vy: -rand(100, 168),
      hue: rand(8, 46),
    };
  }

  function spawnBurst(x, y, hue, reason) {
    sim.bursts.push({ x, y, hue, reason, t: sim.time });
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2;
      const sp = rand(50, 170);
      sim.sparks.push({
        x,
        y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        hue: (hue + rand(-24, 48) + 360) % 360,
        life: rand(0.4, 0.85),
      });
    }
  }

  function fill() {
    const n = clampCount(sim.mode, sim.requestedCount);
    sim.agents = [];
    for (let i = 0; i < n; i++) {
      if (sim.mode === "koya") sim.agents.push(spawnFish());
      else if (sim.mode === "diwali") sim.agents.push(spawnRocket());
      else sim.agents.push(spawnCursor());
    }
  }

  sim.cap = () => MODE_CAP[sim.mode];
  sim.still = () => sim.time - sim.pointer.lastMove >= STILL_S;

  sim.setMode = (mode) => {
    if (!MODES.includes(mode)) return sim.mode;
    if (mode === sim.mode) return sim.mode;
    sim.mode = mode;
    sim.sparks = [];
    fill();
    return sim.mode;
  };

  sim.setCount = (n) => {
    sim.requestedCount = n;
    const target = clampCount(sim.mode, n);
    const spawn = sim.mode === "koya" ? spawnFish : sim.mode === "diwali" ? spawnRocket : spawnCursor;
    while (sim.agents.length < target) sim.agents.push(spawn());
    if (sim.agents.length > target) sim.agents.length = target;
  };

  sim.resize = (w, h) => {
    sim.w = w;
    sim.h = h;
  };

  sim.setPointer = (x, y, time = sim.time, moving = true) => {
    const moved = moving && Math.hypot(x - sim.pointer.x, y - sim.pointer.y) > 0.5;
    sim.pointer.x = x;
    sim.pointer.y = y;
    sim.pointer.on = true;
    sim.time = Math.max(sim.time, time);
    if (moved) sim.pointer.lastMove = sim.time;
  };

  sim.explode = (agent, reason) => {
    const i = sim.agents.indexOf(agent);
    if (i < 0) return;
    spawnBurst(agent.x, agent.y, agent.hue ?? 28, reason);
    sim.agents.splice(i, 1);
    if (sim.mode === "diwali" && sim.agents.length < clampCount(sim.mode, sim.requestedCount)) {
      sim.agents.push(spawnRocket());
    }
  };

  sim.blastAt = (x, y) => {
    for (const a of [...sim.agents]) {
      if (a.kind === "rocket" && Math.hypot(a.x - x, a.y - y) < 42) sim.explode(a, "pointer");
    }
  };

  sim.pointerDown = (x, y, time = sim.time) => {
    sim.setPointer(x, y, time, true);
    sim.pointer.panic = 0.35;
    if (sim.mode === "diwali") sim.blastAt(x, y);
  };

  sim.scatter = () => {
    sim.pointer.panic = 0.7;
    if (sim.mode === "diwali") {
      for (const a of [...sim.agents]) sim.explode(a, "pointer");
      return;
    }
    const cx = sim.pointer.on ? sim.pointer.x : sim.w / 2;
    const cy = sim.pointer.on ? sim.pointer.y : sim.h / 2;
    for (const a of sim.agents) {
      const dx = wrapDelta(a.x - cx, sim.w);
      const dy = wrapDelta(a.y - cy, sim.h);
      const m = Math.hypot(dx, dy) || 1;
      a.vx += (dx / m) * 280;
      a.vy += (dy / m) * 280;
    }
  };

  sim.meanDistanceToPointer = () => {
    if (!sim.agents.length) return 0;
    let s = 0;
    for (const a of sim.agents) s += Math.hypot(a.x - sim.pointer.x, a.y - sim.pointer.y);
    return s / sim.agents.length;
  };

  function tickCursors(dt) {
    const maxSpeed = sim.speed;
    const minSpeed = maxSpeed * 0.35;
    const vis = 56;
    const sepR = 22;
    const avoidR = 110;
    for (const b of sim.agents) {
      let sx = 0, sy = 0, ax = 0, ay = 0, cx = 0, cy = 0, n = 0, ns = 0;
      for (const o of sim.agents) {
        if (o === b) continue;
        const dx = wrapDelta(o.x - b.x, sim.w);
        const dy = wrapDelta(o.y - b.y, sim.h);
        const d2 = dx * dx + dy * dy;
        if (d2 > vis * vis || d2 === 0) continue;
        const d = Math.sqrt(d2);
        if (b.vx * dx + b.vy * dy < -0.15 * Math.hypot(b.vx, b.vy) * d) continue;
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
        fx += (sx / ns) * sim.separation * 220;
        fy += (sy / ns) * sim.separation * 220;
      }
      if (n) {
        ax /= n;
        ay /= n;
        const am = Math.hypot(ax, ay) || 1;
        fx += ((ax / am) * maxSpeed - b.vx) * sim.alignment * 2.2;
        fy += ((ay / am) * maxSpeed - b.vy) * sim.alignment * 2.2;
        cx /= n;
        cy /= n;
        const cm = Math.hypot(cx, cy) || 1;
        fx += (cx / cm) * sim.cohesion * 40;
        fy += (cy / cm) * sim.cohesion * 40;
      }
      if (sim.pointer.on || sim.pointer.panic > 0) {
        const dx = wrapDelta(b.x - sim.pointer.x, sim.w);
        const dy = wrapDelta(b.y - sim.pointer.y, sim.h);
        const d = Math.hypot(dx, dy) || 1;
        const reach = avoidR * (1 + sim.pointer.panic * 1.8);
        if (d < reach) {
          const f = ((reach - d) / reach) * sim.avoid * 320 * (1 + sim.pointer.panic * 2);
          fx += (dx / d) * f;
          fy += (dy / d) * f;
        }
      }
      b.vx += fx * dt;
      b.vy += fy * dt;
      let spd = Math.hypot(b.vx, b.vy);
      if (spd > maxSpeed) {
        b.vx = (b.vx / spd) * maxSpeed;
        b.vy = (b.vy / spd) * maxSpeed;
      } else if (spd < minSpeed && spd > 0) {
        b.vx = (b.vx / spd) * minSpeed;
        b.vy = (b.vy / spd) * minSpeed;
      }
      b.x = (b.x + b.vx * dt + sim.w) % sim.w;
      b.y = (b.y + b.vy * dt + sim.h) % sim.h;
    }
  }

  function tickKoya(dt) {
    const cozy = sim.pointer.on && !sim.still();
    for (const fish of sim.agents) {
      let fx = 0;
      let fy = 0;
      for (const o of sim.agents) {
        if (o === fish) continue;
        const dx = o.x - fish.x;
        const dy = o.y - fish.y;
        const d = Math.hypot(dx, dy);
        if (d > 0 && d < 28) {
          fx -= (dx / d) * 70;
          fy -= (dy / d) * 70;
        }
      }
      const dx = sim.pointer.x - fish.x;
      const dy = sim.pointer.y - fish.y;
      const d = Math.hypot(dx, dy) || 1;
      if (cozy) {
        const pull = Math.min(240, 50 + d * 0.9);
        fx += (dx / d) * pull;
        fy += (dy / d) * pull;
      } else {
        fx -= (dx / d) * 170;
        fy -= (dy / d) * 170;
      }
      fish.vx += fx * dt;
      fish.vy += fy * dt;
      const spd = Math.hypot(fish.vx, fish.vy) || 1;
      const cap = cozy ? 160 : 100;
      if (spd > cap) {
        fish.vx = (fish.vx / spd) * cap;
        fish.vy = (fish.vy / spd) * cap;
      }
      fish.x = Math.max(8, Math.min(sim.w - 8, fish.x + fish.vx * dt));
      fish.y = Math.max(8, Math.min(sim.h - 8, fish.y + fish.vy * dt));
    }
  }

  function tickRockets(dt) {
    for (const rocket of [...sim.agents]) {
      rocket.vy -= 16 * dt;
      rocket.x += rocket.vx * dt;
      rocket.y += rocket.vy * dt;
      const edge = rocket.x <= 10 || rocket.x >= sim.w - 10 || rocket.y <= 10 || rocket.y >= sim.h - 10;
      if (edge) sim.explode(rocket, "edge");
    }
  }

  function tickSparks(dt) {
    sim.sparks = sim.sparks.filter((s) => {
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 36 * dt;
      return s.life > 0;
    });
    if (sim.pointer.panic > 0) sim.pointer.panic = Math.max(0, sim.pointer.panic - dt);
  }

  sim.tick = (dt, time) => {
    const step = Math.min(0.05, dt);
    sim.time = time ?? sim.time + step;
    if (sim.mode === "koya") tickKoya(step);
    else if (sim.mode === "diwali") tickRockets(step);
    else tickCursors(step);
    tickSparks(step);
    if (sim.agents.length > MODE_CAP[sim.mode]) sim.agents.length = MODE_CAP[sim.mode];
  };

  fill();
  return sim;
}
