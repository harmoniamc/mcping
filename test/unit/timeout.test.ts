import { describe, it, expect, vi } from "vitest";

// DNS that never answers -- the timeout used to cover only the TCP connect,
// so a stuck lookup hung ping() indefinitely.
vi.mock("node:dns/promises", () => ({
  resolveSrv: () => new Promise(() => {}),
  lookup: () => new Promise(() => {}),
}));

const { ping } = await import("../../src/index.js");

describe("timeout covers DNS resolution", () => {
  it("rejects a java ping when DNS hangs", async () => {
    const started = Date.now();
    await expect(
      ping("stuck.example", { type: "java", timeout: 200 }),
    ).rejects.toThrow(/DNS resolution timed out after 200ms/);
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it("rejects a bedrock ping when DNS hangs", async () => {
    await expect(
      ping("stuck.example", { type: "bedrock", timeout: 200 }),
    ).rejects.toThrow(/DNS resolution timed out/);
  });

  it("gives each attempt its own budget in auto-detect mode", async () => {
    const started = Date.now();
    await expect(ping("stuck.example", { timeout: 200 })).rejects.toThrow(
      /Both Java and Bedrock pings failed/,
    );
    expect(Date.now() - started).toBeLessThan(1000);
  });
});
