/**
 * Rejects if `promise` hasn't settled within `ms`. The underlying work isn't
 * cancelled (dns/promises has no per-call abort), its result is just ignored.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Time left out of a `budget` that started at `startedAt`, never below 1ms. */
export function remaining(startedAt: number, budget: number): number {
  return Math.max(1, budget - (Date.now() - startedAt));
}
