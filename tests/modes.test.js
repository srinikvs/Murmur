import assert from "node:assert/strict";
import test from "node:test";
import { createSim, MODE_CAP } from "../src/engine.js";

test("M1 menu modes are exclusive and capped", () => {
  const sim = createSim({ width: 400, height: 400, mode: "cursors", count: 180 });
  assert.equal(sim.mode, "cursors");
  assert.equal(sim.setMode("koya"), "koya");
  assert.equal(sim.mode, "koya");
  assert.ok(sim.agents.length <= MODE_CAP.koya);
  assert.equal(sim.agents.length, 20);
  sim.setCount(400);
  assert.equal(sim.agents.length, 20);
  sim.setMode("diwali");
  assert.equal(sim.mode, "diwali");
  assert.ok(sim.agents.every((a) => a.kind === "rocket"));
  assert.ok(sim.agents.length <= 20);
  sim.setMode("cursors");
  assert.equal(sim.mode, "cursors");
  assert.ok(sim.agents.every((a) => a.kind === "cursor"));
});

test("M2 Koya never exceed 20, cozy toward a moving pointer, disperse after 2s still", () => {
  const sim = createSim({ width: 480, height: 320, mode: "koya", count: 80 });
  assert.equal(sim.agents.length, 20);
  for (const fish of sim.agents) {
    fish.x = 40;
    fish.y = 160;
    fish.vx = 0;
    fish.vy = 0;
  }
  sim.setPointer(420, 160, 0, true);
  const start = sim.meanDistanceToPointer();
  for (let i = 0; i < 90; i++) {
    const t = (i + 1) / 30;
    sim.setPointer(420 - i * 0.4, 160 + Math.sin(i / 6) * 4, t, true);
    sim.tick(1 / 30, t);
    assert.ok(sim.agents.length <= 20);
  }
  const cozy = sim.meanDistanceToPointer();
  assert.ok(cozy < start - 40, `expected fish to close on pointer (${start} -> ${cozy})`);

  const beforeDisperse = sim.meanDistanceToPointer();
  const holdAt = sim.time;
  for (let i = 0; i < 80; i++) {
    const t = holdAt + (i + 1) / 30;
    sim.tick(1 / 30, t);
  }
  assert.ok(sim.still());
  assert.ok(sim.time - holdAt >= 2);
  const dispersed = sim.meanDistanceToPointer();
  assert.ok(dispersed > beforeDisperse + 15, `expected disperse after 2s still (${beforeDisperse} -> ${dispersed})`);
  assert.ok(sim.agents.length <= 20);
});

test("M3 rockets never exceed 20 and burst at an edge and on pointer contact", () => {
  const sim = createSim({ width: 300, height: 200, mode: "diwali", count: 50 });
  assert.equal(sim.agents.length, 20);
  sim.agents[0].x = 4;
  sim.agents[0].y = 100;
  sim.agents[0].vx = -10;
  sim.agents[0].vy = 0;
  sim.tick(1 / 30, 0.05);
  assert.ok(sim.bursts.some((b) => b.reason === "edge"), "edge contact should burst");
  assert.ok(sim.agents.length <= 20);

  const target = sim.agents[0];
  sim.pointerDown(target.x, target.y, sim.time);
  assert.ok(sim.bursts.some((b) => b.reason === "pointer"), "pointer contact should burst");
  assert.ok(sim.agents.length <= 20);
  sim.setCount(400);
  assert.equal(sim.agents.length, 20);
});
