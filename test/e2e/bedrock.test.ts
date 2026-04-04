import { describe, it, expect } from "vitest";
import { ping } from "../../src/index.js";

describe("Bedrock Edition Live Servers", () => {
  it("should ping geo.hivebedrock.network", async () => {
    const res = await ping("geo.hivebedrock.network", {
      type: "bedrock",
      timeout: 10000,
    });
    expect(res.type).toBe("bedrock");
    expect(res.version.name).toBe("1.0");
  });

  it("should auto-detect bedrock servers", async () => {
    const res = await ping("geo.hivebedrock.network", { timeout: 10000 });
    expect(res.type).toBe("bedrock");
  }, 15000);
});
