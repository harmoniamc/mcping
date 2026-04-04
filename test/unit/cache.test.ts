import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ping } from "../../src/index.js";
import {
  createMockJavaServer,
  createMockBedrockServer,
  getServerPort,
} from "../utils.js";

describe("Caching integration tests", () => {
  it("should cache with lazy strategy", async () => {
    const server = await createMockJavaServer({
      version: { name: "1.20.1", protocol: 763 },
      players: { max: 100, online: 10 },
      description: "Cached Server",
    });

    const port = getServerPort(server);
    const target = `127.0.0.1:${port}`;

    // First ping - miss
    const res1 = await ping(target, {
      cache: { ttl: 1000, strategy: "lazy" },
    });
    expect(res1.cached).toBeFalsy();

    // Second ping - hit
    const res2 = await ping(target, {
      cache: { ttl: 1000, strategy: "lazy" },
    });
    expect(res2.cached).toBe(true);
    expect(res2.players.online).toBe(10);

    server.close();
  });

  it("should refresh with swr strategy", async () => {
    const server = await createMockJavaServer({
      version: { name: "1.20.1", protocol: 763 },
      players: { max: 100, online: 10 },
      description: "SWR Server",
    });

    const port = getServerPort(server);
    const target = `127.0.0.1:${port}`;

    // Mock Date.now to control time
    const now = Date.now();
    const dateSpy = vi.spyOn(Date, "now").mockReturnValue(now);

    // Initial ping
    await ping(target, { cache: { ttl: 50, strategy: "swr" } });

    // Fast-forward time manually by updating the spy
    dateSpy.mockReturnValue(now + 100);

    // SWR ping - should return stale (cached: true) and trigger background refresh
    const resSWR = await ping(target, { cache: { ttl: 50, strategy: "swr" } });
    expect(resSWR.cached).toBe(true);

    server.close();
    dateSpy.mockRestore();
  });
});
