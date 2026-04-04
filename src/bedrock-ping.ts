import * as dgram from "node:dgram";
import * as crypto from "node:crypto";

export interface BedrockRawResponse {
  edition: string;
  motdLine1: string;
  motdLine2: string;
  protocolVersion: number;
  versionName: string;
  playerCount: number;
  maxPlayerCount: number;
  serverUniqueId: string;
  gameMode: string;
  nintendoLimited: number;
  ipv4Port: number | null;
  ipv6Port: number | null;
}

const RAKNET_MAGIC = Buffer.from("00ffff00fefefefefdfdfdfd12345678", "hex");

export async function pingBedrock(
  host: string,
  port: number,
  timeout: number,
): Promise<BedrockRawResponse> {
  return new Promise((resolve, reject) => {
    const client = dgram.createSocket("udp4");
    const timeoutHandler = setTimeout(() => {
      client.close();
      reject(new Error(`Bedrock ping timed out after ${timeout}ms`));
    }, timeout);

    const startTime = BigInt(Date.now());
    const clientGUID = crypto.randomBytes(8);

    // Unconnected Ping (0x01)
    const packet = Buffer.alloc(1 + 8 + 16 + 8);
    packet.writeUInt8(0x01, 0); // Packet ID
    packet.writeBigInt64BE(startTime, 1); // Time
    RAKNET_MAGIC.copy(packet, 9); // Magic
    clientGUID.copy(packet, 25); // Client GUID

    client.send(packet, port, host);

    client.on("message", (msg) => {
      if (msg.readUInt8(0) === 0x1c) {
        // Unconnected Pong (0x1C)
        clearTimeout(timeoutHandler);
        client.close();

        const time = msg.readBigInt64BE(1);
        const serverGUID = msg.readBigInt64BE(9);
        const magic = msg.slice(17, 33);

        if (!magic.equals(RAKNET_MAGIC)) {
          reject(new Error("Invalid RakNet magic"));
          return;
        }

        const stringLength = msg.readUInt16BE(33);
        const body = msg.toString("utf8", 35, 35 + stringLength);

        const parts = body.split(";");
        const response: BedrockRawResponse = {
          edition: parts[0] || "MCPE",
          motdLine1: parts[1] || "",
          protocolVersion: parseInt(parts[2]) || 0,
          versionName: parts[3] || "",
          playerCount: parseInt(parts[4]) || 0,
          maxPlayerCount: parseInt(parts[5]) || 0,
          serverUniqueId: parts[6] || "",
          motdLine2: parts[7] || "",
          gameMode: parts[8] || "",
          nintendoLimited: parseInt(parts[9]) || 0,
          ipv4Port: parts[10] ? parseInt(parts[10]) : null,
          ipv6Port: parts[11] ? parseInt(parts[11]) : null,
        };
        resolve(response);
      }
    });

    client.on("error", (err) => {
      clearTimeout(timeoutHandler);
      client.close();
      reject(err);
    });
  });
}
