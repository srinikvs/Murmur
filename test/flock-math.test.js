import assert from "node:assert/strict";
import { describe, it } from "node:test";
import "../src/flock-math.js";

const {
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
} = globalThis.MurmurMath;

describe("spawn count bounds", () => {
  it("clamps the flock to 20..500", () => {
    assert.equal(COUNT_MIN, 20);
    assert.equal(COUNT_MAX, 500);
    assert.equal(clampCount(0), 20);
    assert.equal(clampCount(19.4), 20);
    assert.equal(clampCount(20), 20);
    assert.equal(clampCount(20.5), 21);
    assert.equal(clampCount(180), 180);
    assert.equal(clampCount(499.6), 500);
    assert.equal(clampCount(500), 500);
    assert.equal(clampCount(900), 500);
  });

  it("spawns a bounded flock without a browser", () => {
    const low = spawnBoids(1, 800, 600, 140, () => 0);
    const high = spawnBoids(900, 800, 600, 140, () => 0);
    const mid = spawnBoids(DEFAULTS.count, 800, 600, 140, () => 0);
    assert.equal(low.length, 20);
    assert.equal(high.length, 500);
    assert.equal(mid.length, 180);
    assert.equal(low[0].x, 0);
    assert.equal(low[0].y, 0);
    assert.ok(Math.abs(low[0].vx - 140 * 0.7) < 1e-9);
    assert.equal(low[0].vy, 0);
  });

  it("grows and shrinks an existing flock to the clamped size", () => {
    const seed = spawnBoids(30, 400, 300, 100, () => 0.25);
    assert.equal(fitFlockSize(seed, 10, 400, 300).length, 20);
    assert.equal(fitFlockSize(seed, 25, 400, 300).length, 25);
    assert.equal(fitFlockSize(seed, 40, 400, 300).length, 40);
    assert.equal(fitFlockSize(seed, 5000, 400, 300).length, 500);
    assert.equal(seed.length, 30);
  });
});

describe("toroidal wrap", () => {
  it("picks the short delta across the seam", () => {
    assert.equal(wrapDelta(10, 100), 10);
    assert.equal(wrapDelta(50, 100), 50);
    assert.equal(wrapDelta(60, 100), -40);
    assert.equal(wrapDelta(-50, 100), -50);
    assert.equal(wrapDelta(-60, 100), 40);
  });

  it("wraps positions with the same modulo the simulation uses", () => {
    assert.deepEqual(wrapPosition(10, 20, 100, 80), { x: 10, y: 20 });
    assert.deepEqual(wrapPosition(-5, 10, 100, 80), { x: 95, y: 10 });
    assert.deepEqual(wrapPosition(150, 90, 100, 80), { x: 50, y: 10 });
  });
});

describe("speed clamp exclusivity", () => {
  it("applies only the max bound, only the min bound, or neither", () => {
    const max = 140;
    const min = max * 0.35;
    assert.deepEqual(limitSpeed(0, 0, max), { vx: 0, vy: 0 });
    assert.deepEqual(limitSpeed(200, 0, max), { vx: max, vy: 0 });
    assert.deepEqual(limitSpeed(10, 0, max), { vx: min, vy: 0 });
    assert.deepEqual(limitSpeed(80, 0, max), { vx: 80, vy: 0 });

    const diagonal = limitSpeed(100, 100, max);
    const sped = Math.hypot(diagonal.vx, diagonal.vy);
    assert.ok(Math.abs(sped - max) < 1e-9);

    for (const [vx, vy] of [[0, 0], [10, -4], [49, 20], [140, 0], [200, 50], [-300, 10]]) {
      const out = limitSpeed(vx, vy, max);
      const before = Math.hypot(vx, vy);
      const after = Math.hypot(out.vx, out.vy);
      if (before === 0) {
        assert.equal(after, 0);
        continue;
      }
      assert.ok(after <= max + 1e-9);
      assert.ok(after + 1e-9 >= min);
      const raised = before < min;
      const lowered = before > max;
      assert.equal(raised && lowered, false);
    }
  });
});

describe("neighbor vision", () => {
  it("keeps birds ahead and drops birds behind the cone", () => {
    assert.equal(seesNeighbor(1, 0, 10, 0, 10), true);
    assert.equal(seesNeighbor(1, 0, -10, 0, 10), false);
    const edge = Math.sqrt(1 - 0.15 * 0.15);
    assert.equal(seesNeighbor(1, 0, -0.15, edge, 1), true);
    assert.equal(seesNeighbor(1, 0, -0.16, Math.sqrt(1 - 0.16 * 0.16), 1), false);
  });

  it("queries wrapped grid cells", () => {
    const hash = new SpatialHash(48);
    const nearSeam = { x: 192, y: 10 };
    const far = { x: 100, y: 100 };
    hash.insert(nearSeam);
    hash.insert(far);
    const found = hash.query(10, 10, 30, 200, 200, []);
    assert.ok(found.includes(nearSeam));
    assert.equal(found.includes(far), false);
  });
});

describe("saved params and panic", () => {
  it("fills missing keys from defaults and leaves defaults intact", () => {
    const merged = mergeParams({ count: 40 });
    assert.equal(merged.count, 40);
    assert.equal(merged.speed, DEFAULTS.speed);
    assert.equal(DEFAULTS.count, 180);
    assert.equal(mergeParams(null).count, 180);
  });

  it("decays scatter panic to zero and not below", () => {
    assert.equal(decayPanic(0.75, 0.25), 0.5);
    assert.equal(decayPanic(0.25, 0.5), 0);
    assert.equal(decayPanic(0, 0.25), 0);
  });
});
