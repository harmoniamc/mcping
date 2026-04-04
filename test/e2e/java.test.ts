import { describe, it, expect } from "vitest";
import { ping } from "../../src/index.js";

describe("Java Edition Live Servers", () => {
  it("should ping mc.hypixel.net", async () => {
    const res = await ping("mc.hypixel.net", { timeout: 10000 });
    expect(res.type).toBe("java");
    expect(res.players.max).toBeGreaterThan(0);
  });

  it("should resolve SRV for play.talonmc.net", async () => {
    const res = await ping("play.talonmc.net", { timeout: 10000 });
    expect(res.type).toBe("java");
    expect(res.target.ip).toBeTruthy();
  });

  it("should ping mc.rencorner.co (Forge/Modded)", async () => {
    const res = await ping("mc.rencorner.co", { timeout: 10000 });
    expect(res.type).toBe("java");
    expect(res.motd).toBeTruthy();
  });

  it("should ping play.mc-complex.com (Fabric/Proxy)", async () => {
    const res = await ping("play.mc-complex.com", { timeout: 10000 });
    expect(res.type).toBe("java");
    expect(res.motd).toBeTruthy();
  });
});
