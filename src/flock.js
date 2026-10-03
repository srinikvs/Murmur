import { createSim, MODES } from "./engine.js";

const KEY = "murmur.params";
const DEFAULTS = {
  count: 180,
  speed: 140,
  separation: 1.35,
  alignment: 1,
  cohesion: 0.85,
  avoid: 2.4,
  trail: 0.18,
  mode: "cursors",
};

function loadParams() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveParams(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

function isUiTarget(target) {
  return target instanceof Element && Boolean(target.closest("button, input, a, label, select, textarea, [data-ui]"));
}

function drawCursor(ctx, b) {
  const ang = Math.atan2(b.vy, b.vx);
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(7.5, 0);
  ctx.lineTo(-5.5, 3.4);
  ctx.lineTo(-3.2, 0);
  ctx.lineTo(-5.5, -3.4);
  ctx.closePath();
  ctx.fillStyle = "#9fd8d0";
  ctx.fill();
  ctx.restore();
}

function drawFish(ctx, fish) {
  const ang = Math.atan2(fish.vy, fish.vx);
  ctx.save();
  ctx.translate(fish.x, fish.y);
  ctx.rotate(ang);
  ctx.fillStyle = `hsl(${fish.hue}, 62%, 62%)`;
  ctx.beginPath();
  ctx.ellipse(0, 0, 9, 4.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-7, 0);
  ctx.lineTo(-13, 4);
  ctx.lineTo(-13, -4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#102026";
  ctx.beginPath();
  ctx.arc(4, -1, 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawRocket(ctx, rocket) {
  const ang = Math.atan2(rocket.vy, rocket.vx);
  ctx.save();
  ctx.translate(rocket.x, rocket.y);
  ctx.rotate(ang);
  ctx.fillStyle = `hsl(${rocket.hue}, 85%, 58%)`;
  ctx.fillRect(-6, -2, 12, 4);
  ctx.beginPath();
  ctx.moveTo(6, -2);
  ctx.lineTo(11, 0);
  ctx.lineTo(6, 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 196, 92, .85)";
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.lineTo(-12, 2.4);
  ctx.lineTo(-12, -2.4);
  ctx.fill();
  ctx.restore();
}

function drawSparks(ctx, sparks) {
  for (const s of sparks) {
    ctx.beginPath();
    ctx.fillStyle = `hsla(${s.hue}, 90%, 62%, ${Math.max(0, s.life)})`;
    ctx.arc(s.x, s.y, 2.4 + s.life * 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function bootMurmur(canvas) {
  const params = loadParams();
  const sim = createSim({
    width: window.innerWidth,
    height: window.innerHeight,
    mode: params.mode,
    count: params.count,
    speed: params.speed,
    separation: params.separation,
    alignment: params.alignment,
    cohesion: params.cohesion,
    avoid: params.avoid,
  });
  const ctx = canvas.getContext("2d");
  let paused = false;
  let last = performance.now();

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    sim.resize(window.innerWidth, window.innerHeight);
    canvas.width = Math.floor(sim.w * dpr);
    canvas.height = Math.floor(sim.h * dpr);
    canvas.style.width = `${sim.w}px`;
    canvas.style.height = `${sim.h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function syncModeUi() {
    for (const mode of MODES) {
      const el = document.getElementById(`mode-${mode}`);
      if (el) el.checked = sim.mode === mode;
    }
    document.body.dataset.mode = sim.mode;
    const hint = document.getElementById("mode-hint");
    if (hint) {
      hint.textContent = sim.mode === "koya"
        ? "Koya cozy into a moving pointer, then disperse after 2s still. Max 20."
        : sim.mode === "diwali"
          ? "Rockets burst at an edge or on pointer contact. Max 20."
          : "Cursors avoid the pointer.";
    }
  }

  function bindSlider(id, key) {
    const el = document.getElementById(id);
    const out = document.getElementById(`${id}-val`);
    if (!el || !out) return;
    el.value = params[key];
    out.textContent = key === "count" || key === "speed" ? String(Math.round(params[key])) : Number(params[key]).toFixed(2);
    el.addEventListener("input", () => {
      const v = Number(el.value);
      params[key] = v;
      sim[key] = v;
      out.textContent = key === "count" || key === "speed" ? String(Math.round(v)) : v.toFixed(2);
      if (key === "count") sim.setCount(v);
      saveParams(params);
    });
  }

  bindSlider("sep", "separation");
  bindSlider("ali", "alignment");
  bindSlider("coh", "cohesion");
  bindSlider("avo", "avoid");
  bindSlider("spd", "speed");
  bindSlider("pop", "count");

  document.querySelectorAll("[data-mode]").forEach((el) => {
    el.addEventListener("change", () => {
      const mode = el.getAttribute("data-mode");
      if (!el.checked) {
        el.checked = true;
        return;
      }
      params.mode = sim.setMode(mode);
      saveParams(params);
      syncModeUi();
    });
  });

  const pause = document.getElementById("pause");
  if (pause) pause.addEventListener("click", () => {
    paused = !paused;
    pause.textContent = paused ? "Resume" : "Pause";
  });
  document.getElementById("reset")?.addEventListener("click", () => sim.setMode(sim.mode) || sim.setCount(params.count));
  document.getElementById("scatter")?.addEventListener("click", () => sim.scatter());

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", (e) => {
    sim.setPointer(e.clientX, e.clientY, sim.time, true);
  });
  window.addEventListener("pointerdown", (e) => {
    if (isUiTarget(e.target)) return;
    sim.pointerDown(e.clientX, e.clientY, sim.time);
  });
  window.addEventListener("pointerleave", () => { sim.pointer.on = false; });
  window.addEventListener("keydown", (e) => {
    if (isUiTarget(e.target)) return;
    if (e.code === "Space") {
      e.preventDefault();
      paused = !paused;
      if (pause) pause.textContent = paused ? "Resume" : "Pause";
    }
    if (e.key === "r" || e.key === "R") sim.setCount(params.count);
    if (e.key === "s" || e.key === "S") sim.scatter();
  });

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!paused) sim.tick(dt);
    ctx.fillStyle = `rgba(7, 8, 12, ${1 - params.trail * 0.55})`;
    ctx.fillRect(0, 0, sim.w, sim.h);
    if (sim.mode === "cursors" && (sim.pointer.on || sim.pointer.panic > 0)) {
      ctx.beginPath();
      ctx.arc(sim.pointer.x, sim.pointer.y, 110, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(159, 216, 208, .18)";
      ctx.stroke();
    }
    for (const a of sim.agents) {
      if (a.kind === "koya") drawFish(ctx, a);
      else if (a.kind === "rocket") drawRocket(ctx, a);
      else drawCursor(ctx, a);
    }
    drawSparks(ctx, sim.sparks);
    requestAnimationFrame(frame);
  }

  resize();
  syncModeUi();
  window.__murmur = sim;
  requestAnimationFrame(frame);
  return sim;
}

const canvas = document.getElementById("stage");
if (canvas) bootMurmur(canvas);
