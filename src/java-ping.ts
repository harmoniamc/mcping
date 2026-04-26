import * as net from "node:net";
import {
  encodeVarInt,
  encodeString,
  decodeVarInt,
  decodeString,
} from "./varint.js";

export interface JavaRawResponse {
  version: { name: string; protocol: number };
  players: {
    max: number;
    online: number;
    sample?: { name: string; id: string }[];
  };
  description: any;
  favicon?: string;
  enforcesSecureChat?: boolean;
  previewsChat?: boolean;
}

export async function pingJava(
  host: string,
  port: number,
  timeout: number,
): Promise<{ response: JavaRawResponse; latency: number }> {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let startTime: number;
    let response: JavaRawResponse;

    const timeoutHandler = setTimeout(() => {
      client.destroy();
      reject(new Error(`Connection timed out after ${timeout}ms`));
    }, timeout);

    client.connect(port, host, () => {
      // 1. Handshake
      const protocolVersion = encodeVarInt(763); // 1.20.1
      const serverAddress = encodeString(host);
      const serverPort = Buffer.alloc(2);
      serverPort.writeUInt16BE(port);
      const nextState = encodeVarInt(1);

      const handshakePayload = Buffer.concat([
        protocolVersion,
        serverAddress,
        serverPort,
        nextState,
      ]);
      const packetIdBuffer = encodeVarInt(0);
      const handshake = Buffer.concat([
        encodeVarInt(handshakePayload.length + packetIdBuffer.length),
        packetIdBuffer,
        handshakePayload,
      ]);

      client.write(handshake);

      // 2. Status Request
      const statusRequest = Buffer.concat([encodeVarInt(1), encodeVarInt(0)]);
      client.write(statusRequest);
      startTime = Date.now();
    });

    let data = Buffer.alloc(0);
    client.on("data", (chunk: Buffer) => {
      data = Buffer.concat([data, chunk]);

      while (data.length > 0) {
        try {
          // Read packet length
          const { value: packetLen, length: varIntLen } = decodeVarInt(data, 0);
          if (data.length < packetLen + varIntLen) return; // Wait for more data

          const packet = data.subarray(varIntLen, varIntLen + packetLen);
          data = data.subarray(varIntLen + packetLen); // Consume packet

          // Read packet ID
          const { value: packetId, length: idLen } = decodeVarInt(packet, 0);

          if (packetId === 0) {
            const { value: jsonStr } = decodeString(packet, idLen);
            response = JSON.parse(jsonStr);

            // 3. Ping
            const pingPayload = Buffer.alloc(8);
            pingPayload.writeBigInt64BE(BigInt(startTime));
            const pingPacket = Buffer.concat([
              encodeVarInt(9),
              encodeVarInt(1),
              pingPayload,
            ]);
            client.write(pingPacket);
          } else if (packetId === 1) {
            const latency = Date.now() - startTime;
            clearTimeout(timeoutHandler);
            client.destroy();
            resolve({ response, latency });
            return;
          }
        } catch (e) {
          if (e instanceof RangeError) return; // partial data, wait for more
          clearTimeout(timeoutHandler);
          client.destroy();
          reject(e);
          return;
        }
      }
    });

    client.on("error", (err) => {
      clearTimeout(timeoutHandler);
      reject(err);
    });
  });
}
