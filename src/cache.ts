import type { PingResponse } from "./index.js";

export interface CacheOptions {
  ttl: number;
  strategy: "lazy" | "swr";
}

interface CacheEntry {
  response: PingResponse;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

export function getCache(
  target: string,
  options: CacheOptions,
): PingResponse | null {
  const entry = cache.get(target);
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  const isExpired = age > options.ttl;

  if (!isExpired || options.strategy === "swr") {
    return { ...entry.response, cached: true };
  }

  return null;
}

export function setCache(target: string, response: PingResponse): void {
  // Only cache successful, non-cached results
  if (response.cached) return;
  cache.set(target, { response, timestamp: Date.now() });
}

export function isExpired(target: string, options: CacheOptions): boolean {
  const entry = cache.get(target);
  if (!entry) return true;
  return Date.now() - entry.timestamp > options.ttl;
}
