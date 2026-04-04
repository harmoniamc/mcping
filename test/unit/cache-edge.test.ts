import { describe, it, expect, vi } from "vitest";
import { ping } from "../../src/index.js";
import { createMockJavaServer, getServerPort } from "../utils.js";

describe("Caching Edge Cases", () => {
  it("should not cache error responses", async () => {
    // Port 1 usually fails quickly with ECONNREFUSED or ETIMEDOUT on localhost
    const target = "127.0.0.1:1";

    // First ping - fail
    await expect(
      ping(target, {
        timeout: 500,
        cache: { ttl: 5000, strategy: "lazy" },
      }),
    ).rejects.toThrow();

    // Second ping - should still fail (not serve a "cached error")
    await expect(
      ping(target, {
        timeout: 500,
        cache: { ttl: 5000, strategy: "lazy" },
      }),
    ).rejects.toThrow();
  });

  it("should handle server going offline in SWR strategy", async () => {
    const server = await createMockJavaServer({
      version: { name: "1.20.1", protocol: 763 },
      players: { max: 100, online: 10 },
      description: "SWR Offline Test",
    });

    const port = getServerPort(server);
    const target = `127.0.0.1:${port}`;
    const now = Date.now();
    const dateSpy = vi.spyOn(Date, "now").mockReturnValue(now);

    // 1. Initial success - cache populated
    const res1 = await ping(target, {
      timeout: 1000,
      cache: { ttl: 1000, strategy: "swr" },
    });
    expect(res1.cached).toBeFalsy();

    // 2. Server goes offline
    server.close();

    // 3. Fast forward time to expiration
    dateSpy.mockReturnValue(now + 2000);

    // 4. Ping with SWR - should still return STALE data from cache
    const resSWR = await ping(target, {
      timeout: 1000,
      cache: { ttl: 1000, strategy: "swr" },
    });
    expect(resSWR.cached).toBe(true);
    expect(resSWR.players.online).toBe(10);

    dateSpy.mockRestore();
  });

  it("should fail when cache is expired and server is offline in lazy strategy", async () => {
    const server = await createMockJavaServer({
      version: { name: "1.20.1", protocol: 763 },
      players: { max: 100, online: 5 },
      description: "Lazy Offline Test",
    });

    const port = getServerPort(server);
    const target = `127.0.0.1:${port}`;
    const now = Date.now();
    const dateSpy = vi.spyOn(Date, "now").mockReturnValue(now);

    // 1. Success
    await ping(target, {
      timeout: 1000,
      cache: { ttl: 500, strategy: "lazy" },
    });

    // 2. Offline
    server.close();

    // 3. Expire cache
    dateSpy.mockReturnValue(now + 1000);

    // 4. Lazy ping - should fail (miss + network error)
    await expect(
      ping(target, {
        timeout: 500,
        cache: { ttl: 500, strategy: "lazy" },
      }),
    ).rejects.toThrow();

    dateSpy.mockRestore();
  });
});
