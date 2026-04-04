import { resolveTarget } from "./target.js";
import { pingJava, JavaRawResponse } from "./java-ping.js";
import { pingBedrock, BedrockRawResponse } from "./bedrock-ping.js";
import { parseChat } from "./chat.js";
import * as cache from "./cache.js";

export interface PingOptions {
  timeout?: number;
  type?: "java" | "bedrock" | null;
  cache?: cache.CacheOptions;
}

export interface PingResponse {
  type: "java" | "bedrock";
  version: {
    name: string;
    protocol: number;
  };
  players: {
    online: number;
    max: number;
  };
  motd: string;
  latency: number;
  target: {
    host: string;
    port: number;
    ip: string;
  };
  raw: JavaRawResponse | BedrockRawResponse;
  cached?: boolean;
}

export async function ping(
  target: string,
  options?: PingOptions,
): Promise<PingResponse> {
  const timeout = options?.timeout || 5000;
  const type = options?.type || null;
  const cacheOptions = options?.cache;

  if (cacheOptions) {
    const cached = cache.getCache(target, cacheOptions);
    if (cached) {
      if (
        cacheOptions.strategy === "swr" &&
        cache.isExpired(target, cacheOptions)
      ) {
        // Refresh in background
        pingServer(target, timeout, type)
          .then((refreshed) => cache.setCache(target, refreshed))
          .catch(() => {});
      }
      return cached;
    }
  }

  const result = await pingServer(target, timeout, type);
  if (cacheOptions) {
    cache.setCache(target, result);
  }

  return result;
}

async function pingServer(
  target: string,
  timeout: number,
  type: "java" | "bedrock" | null,
): Promise<PingResponse> {
  const resolved = await resolveTarget(target, type);

  let javaError: any;
  if (type === "java" || type === null) {
    try {
      const { response, latency } = await pingJava(
        resolved.host,
        resolved.port,
        timeout,
      );
      return {
        type: "java",
        version: {
          name: response.version.name,
          protocol: response.version.protocol,
        },
        players: {
          online: response.players.online,
          max: response.players.max,
        },
        motd: parseChat(response.description),
        latency,
        target: {
          host: resolved.host,
          port: resolved.port,
          ip: resolved.ip,
        },
        raw: response,
      };
    } catch (e) {
      javaError = e;
      if (type === "java") throw e;
    }
  }

  try {
    const bedrockResolved =
      type === "bedrock" ? resolved : await resolveTarget(target, "bedrock");
    const response = await pingBedrock(
      bedrockResolved.host,
      bedrockResolved.port,
      timeout,
    );
    return {
      type: "bedrock",
      version: {
        name: response.versionName,
        protocol: response.protocolVersion,
      },
      players: {
        online: response.playerCount,
        max: response.maxPlayerCount,
      },
      motd: response.motdLine2
        ? `${response.motdLine1}\n${response.motdLine2}`
        : response.motdLine1,
      latency: 0,
      target: {
        host: bedrockResolved.host,
        port: bedrockResolved.port,
        ip: bedrockResolved.ip,
      },
      raw: response,
    };
  } catch (bedrockErr: any) {
    if (type === null && javaError) {
      throw new Error(
        `Both Java and Bedrock pings failed. Java: ${javaError.message}. Bedrock: ${bedrockErr.message}`,
      );
    }
    throw bedrockErr;
  }
}
