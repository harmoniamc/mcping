import * as dns from "node:dns/promises";

export interface Target {
  host: string;
  port: number;
  protocol: "java" | "bedrock";
  ip: string;
}

/**
 * Resolves host and port, handling SRV records and lookups.
 */
export async function resolveTarget(
  targetStr: string,
  type: "java" | "bedrock" | null,
): Promise<Target> {
  let host = targetStr;
  let port = type === "bedrock" ? 19132 : 25565;
  const parts = targetStr.split(":");

  if (parts.length === 2 && !isNaN(parseInt(parts[1]))) {
    host = parts[0];
    port = parseInt(parts[1]);
    const ip = await resolveIp(host);
    return { host, port, protocol: type === null ? "java" : type, ip };
  }

  // Attempt SRV resolution
  if (type !== "bedrock") {
    try {
      const srv = await dns.resolveSrv(`_minecraft._tcp.${host}`);
      if (srv && srv.length > 0) {
        const srvHost = srv[0].name;
        const srvPort = srv[0].port;
        const ip = await resolveIp(srvHost);
        return { host: srvHost, port: srvPort, protocol: "java", ip };
      }
    } catch (e) {}
  }

  if (type === "bedrock" && parts.length === 1) {
    try {
      const srv = await dns.resolveSrv(`_minecraft._udp.${host}`);
      if (srv && srv.length > 0) {
        const srvHost = srv[0].name;
        const srvPort = srv[0].port;
        const ip = await resolveIp(srvHost);
        return { host: srvHost, port: srvPort, protocol: "bedrock", ip };
      }
    } catch (e) {}
  }

  const ip = await resolveIp(host);
  return { host, port, protocol: type || "java", ip };
}

async function resolveIp(host: string): Promise<string> {
  try {
    const addresses = await dns.lookup(host);
    return addresses.address;
  } catch (e) {
    // If lookup fails, return the host itself as a fallback
    return host;
  }
}
