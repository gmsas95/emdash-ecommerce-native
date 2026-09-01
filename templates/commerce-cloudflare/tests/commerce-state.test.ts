import { describe, expect, it } from "vitest";
import { clampQuantity } from "../src/components/commerce/commerce-state";

describe("clampQuantity", () => {
  it.each([
    [0, 1],
    [1, 1],
    [99, 99],
    [100, 99],
    [Number.NaN, 1],
    [3.8, 3],
    [-4.2, 1],
  ])("normalizes %s to %s", (value, expected) => {
    expect(clampQuantity(value)).toBe(expected);
  });
});
