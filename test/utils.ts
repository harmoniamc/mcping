import * as net from "node:net";
import * as dgram from "node:dgram";

export async function createMockJavaServer(response: any): Promise<net.Server> {
  const server = net.createServer((socket) => {
    let state = "handshake";
    socket.on("data", (data: Buffer) => {
      let offset = 0;
      while (offset < data.length) {
        if (state === "handshake") {
          // Handshake packet length + data
          const handshakeLen = data[offset];
          offset += 1 + handshakeLen;
          state = "status";
          continue;
        }

        if (state === "status") {
          offset += 2; // [0x01, 0x00]
          const responseBuffer = Buffer.from(JSON.stringify(response), "utf8");
          const stringLen = Buffer.from([responseBuffer.length]);
          const packetId = Buffer.from([0x00]);
          const payload = Buffer.concat([packetId, stringLen, responseBuffer]);
          const packetLen = Buffer.from([payload.length]);
          socket.write(Buffer.concat([packetLen, payload]));
          state = "ping";
          continue;
        }

        if (state === "ping") {
          const rest = data.subarray(offset + 2);
          const pong = Buffer.concat([
            Buffer.from([0x09, 0x01]),
            rest.subarray(0, 8),
          ]);
          socket.write(pong);
          offset += 10;
        }
      }
    });
  });

  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve(server)),
  );
}

export async function createMockBedrockServer(
  body: string,
): Promise<dgram.Socket> {
  const udpServer = dgram.createSocket("udp4");
  const RAKNET_MAGIC = Buffer.from("00ffff00fefefefefdfdfdfd12345678", "hex");

  udpServer.on("message", (msg, rinfo) => {
    if (msg.readUInt8(0) === 0x01) {
      const pong = Buffer.alloc(35 + body.length);
      pong.writeUInt8(0x1c, 0);
      pong.writeBigInt64BE(msg.readBigInt64BE(1), 1);
      pong.writeBigInt64BE(BigInt(12345), 9);
      RAKNET_MAGIC.copy(pong, 17);
      pong.writeUInt16BE(body.length, 33);
      pong.write(body, 35);
      udpServer.send(pong, rinfo.port, rinfo.address);
    }
  });

  return new Promise((resolve) =>
    udpServer.bind(0, "127.0.0.1", () => resolve(udpServer)),
  );
}

export function getServerPort(server: net.Server | dgram.Socket): number {
  const addr = server.address();
  if (addr && typeof addr === "object") {
    return addr.port;
  }
  throw new Error("Server not listening");
}
