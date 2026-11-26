import { test, expect } from "bun:test";
import {
  resolveWaterParams,
  waterBleed,
  waterDefaults,
  waterMultilineDefaults,
} from "../src/lib/water-title";

const element = (attributes) => ({
  getAttribute: (name) => attributes[name] ?? null,
});

test("water params read data attributes and apply multiline overrides only past one line", () => {
  const root = element({
    "data-water-amplitude": "0.03",
    "data-water-hover-strength": "2",
    "data-water-multiline-frequency": "6",
    "data-water-speed": "nope",
  });
  const single = resolveWaterParams(root, 1);
  expect(single.amplitude).toBe(0.03);
  expect(single.hoverStrength).toBe(2);
  expect(single.frequency).toBe(waterDefaults.frequency);
  expect(single.speed).toBe(waterDefaults.speed);

  const double = resolveWaterParams(root, 2);
  expect(double.amplitude).toBe(waterMultilineDefaults.amplitude);
  expect(double.frequency).toBe(6);
  expect(double.hoverStrength).toBe(2);
});

test("safe area covers the largest wave and shrinks vertically per line", () => {
  const params = { ...waterDefaults, hoverRipple: 0 };
  const one = waterBleed(params, 1, 3);
  const two = waterBleed(params, 2, 3);
  expect(one.x).toBeCloseTo(params.amplitude * (1 + params.hoverStrength));
  expect(two.y).toBeCloseTo(one.y / 2);
  expect(waterBleed({ ...params, hoverStrength: 0 }, 1, 3).x).toBeCloseTo(params.amplitude);
});
