import { describe, it, expect } from "vitest";
import * as net from "node:net";
import * as dgram from "node:dgram";
import { ping } from "../../src/index.js";

function getPort(server: net.Server | dgram.Socket): number {
  const addr = server.address();
  if (addr && typeof addr === "object") return addr.port;
  throw new Error("Server not bound");
}

async function bindTcp(
  handler?: (socket: net.Socket) => void,
): Promise<net.Server> {
  const server = net.createServer((s) => handler?.(s));
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

async function bindUdp(
  handler?: (msg: Buffer, rinfo: dgram.RemoteInfo) => void,
): Promise<dgram.Socket> {
  const sock = dgram.createSocket("udp4");
  if (handler) sock.on("message", handler);
  return new Promise((resolve) => sock.bind(0, "127.0.0.1", () => resolve(sock)));
}

describe("ping() error handling", () => {
  describe("Java", () => {
    it("rejects on connection refused", async () => {
      // Get a port then free it so nothing is listening
      const server = await bindTcp();
      const port = getPort(server);
      await new Promise<void>((r) => server.close(() => r()));

      await expect(
        ping(`127.0.0.1:${port}`, { type: "java", timeout: 2000 }),
      ).rejects.toThrow();
    });

    it("rejects with timeout when server accepts but never responds", async () => {
      const server = await bindTcp(); // accepts connections, sends nothing
      const port = getPort(server);
      try {
        await expect(
          ping(`127.0.0.1:${port}`, { type: "java", timeout: 300 }),
        ).rejects.toThrow(/timed out/i);
      } finally {
        server.close();
      }
    });

    it("rejects when server sends garbage data (times out)", async () => {
      const server = await bindTcp((socket) => {
        socket.write(Buffer.from("not minecraft at all!!"));
      });
      const port = getPort(server);
      try {
        await expect(
          ping(`127.0.0.1:${port}`, { type: "java", timeout: 300 }),
        ).rejects.toThrow();
      } finally {
        server.close();
      }
    });

    it("rejects immediately with SyntaxError when server sends valid frame but invalid JSON", async () => {
      const server = await bindTcp((socket) => {
        // Varint-framed packet with id=0 but body is not valid JSON
        const body = Buffer.from("not json!!!");
        const strLen = Buffer.from([body.length]);
        const packetId = Buffer.from([0x00]);
        const payload = Buffer.concat([packetId, strLen, body]);
        const packetLen = Buffer.from([payload.length]);
        socket.write(Buffer.concat([packetLen, payload]));
      });
      const port = getPort(server);
      try {
        const err = await ping(`127.0.0.1:${port}`, { type: "java", timeout: 5000 }).catch(
          (e) => e,
        );
        expect(err).toBeInstanceOf(SyntaxError);
      } finally {
        server.close();
      }
    });
  });

  describe("Bedrock", () => {
    it("rejects with timeout when UDP server does not respond", async () => {
      const sock = await bindUdp(); // binds but never replies
      const port = getPort(sock);
      try {
        await expect(
          ping(`127.0.0.1:${port}`, { type: "bedrock", timeout: 300 }),
        ).rejects.toThrow(/timed out/i);
      } finally {
        sock.close();
      }
    });

    it("rejects when server sends invalid RakNet magic", async () => {
      const WRONG_MAGIC = Buffer.alloc(16, 0xde);
      const sock = await bindUdp((msg, rinfo) => {
        if (msg.readUInt8(0) !== 0x01) return;
        const body = "MCPE;Test;800;1.20.0;0;100;12345;Test;Survival;1;19132;19133;";
        const pong = Buffer.alloc(35 + body.length);
        pong.writeUInt8(0x1c, 0);
        pong.writeBigInt64BE(msg.readBigInt64BE(1), 1);
        pong.writeBigInt64BE(BigInt(0), 9);
        WRONG_MAGIC.copy(pong, 17);
        pong.writeUInt16BE(body.length, 33);
        pong.write(body, 35);
        sock.send(pong, rinfo.port, rinfo.address);
      });
      const port = getPort(sock);
      try {
        await expect(
          ping(`127.0.0.1:${port}`, { type: "bedrock", timeout: 2000 }),
        ).rejects.toThrow(/invalid raknet magic/i);
      } finally {
        sock.close();
      }
    });
  });

  describe("Auto-detect (type unspecified)", () => {
    it("rejects with combined message when both Java and Bedrock fail", async () => {
      // Java gets ECONNREFUSED; Bedrock goes to same port via UDP and times out
      const server = await bindTcp();
      const port = getPort(server);
      await new Promise<void>((r) => server.close(() => r()));

      await expect(
        ping(`127.0.0.1:${port}`, { timeout: 400 }),
      ).rejects.toThrow(/both java and bedrock/i);
    }, 5000);
  });

  describe("catch() safety", () => {
    it("rejects with an Error instance and .then().catch() returns null", async () => {
      const server = await bindTcp();
      const port = getPort(server);
      await new Promise<void>((r) => server.close(() => r()));

      const err = await ping(`127.0.0.1:${port}`, { type: "java", timeout: 1000 }).catch((e) => e);
      expect(err).toBeInstanceOf(Error);
      expect(err.message.length).toBeGreaterThan(0);

      const result = await ping(`127.0.0.1:${port}`, { type: "java", timeout: 1000 })
        .then((v) => v.players)
        .catch(() => null);
      expect(result).toBeNull();
    });

    it.each([
      // 192.0.2.x is TEST-NET-1 (RFC 5737), never routable
      ["non-existent IP", "192.0.2.1:25565"],
      // .invalid is guaranteed by RFC 2606 to never resolve
      ["non-existent domain (.invalid)", "nonexistent.invalid"],
      // valid TLD but unregistered — ISP hijacking may redirect NXDOMAIN, timeout handles it
      ["valid but unregistered domain", "mc.this-server-does-not-exist-mcping.com"],
    ])(".then().catch() returns null for %s", async (_, target) => {
      const result = await ping(target, { timeout: 500 })
        .then((v) => v.players)
        .catch(() => null);
      expect(result).toBeNull();
    }, 5000);
  });
});
