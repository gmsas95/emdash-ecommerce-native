export function clampQuantity(value: number): number {
  return Math.max(1, Math.min(99, Number.isFinite(value) ? Math.trunc(value) : 1));
}
