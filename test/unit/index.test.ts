import { describe, it, expect } from "vitest";
import { ping } from "../../src/index.js";
import {
  createMockJavaServer,
  createMockBedrockServer,
  getServerPort,
} from "../utils.js";

describe("Unified Ping API (local mocks)", () => {
  it("should ping a mock java server", async () => {
    const server = await createMockJavaServer({
      version: { name: "1.20.1", protocol: 763 },
      players: { max: 100, online: 5 },
      description: "Local Mock Server",
    });

    const port = getServerPort(server);
    const res = await ping(`127.0.0.1:${port}`);

    expect(res.type).toBe("java");
    expect(res.version.name).toBe("1.20.1");
    expect(res.players.online).toBe(5);
    expect(res.motd).toBe("Local Mock Server");

    server.close();
  });

  it("should ping a mock bedrock server", async () => {
    // Bedrock response string format: MCPE;MOTD;Protocol;Version;Online;Max;ServerID;SubMOTD;GameMode
    const bedrockString = `MCPE;Bedrock Mock;500;1.19.0;10;50;12345;Survival;1`;
    const server = await createMockBedrockServer(bedrockString);

    const port = getServerPort(server);
    const res = await ping(`127.0.0.1:${port}`, { type: "bedrock" });

    expect(res.type).toBe("bedrock");
    expect(res.players.online).toBe(10);
    expect(res.motd).toBe("Bedrock Mock\nSurvival");

    server.close();
  });

  it("should handle connection errors", async () => {
    // Port that is unlikely to be open
    await expect(ping("127.0.0.1:12345", { timeout: 100 })).rejects.toThrow();
  });
});
