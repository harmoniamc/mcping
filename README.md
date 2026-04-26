# mcping

Robust, and well-typed Minecraft server ping library for Node.js. Supports both **Java Edition** (1.7.x - 1.21+) and **Bedrock Edition**.

Also includes a [Modern CLI](#cli-usage) for quick server status checks directly from your terminal.

> **Migrated from `@deitylamb/mcping`** — if you're on the old package, run:
> ```bash
> npm install mcping
> ```

## Features

- **Unified API**: One simple function `ping(target, options)` for all protocols.
- **Auto-Detect**: Automatically detects if a server is Java or Bedrock.
- **High Performance Caching**: Built-in support for multiple caching strategies.
- **Modern & Typed**: Written in TypeScript with full ESM and CJS support.
- **SRV Support**: Native DNS SRV record resolution (`_minecraft._tcp` and `_minecraft._udp`).
- **Real IP Resolution**: Always resolves and returns the final physical IP address.
- **Rich Responses**: Includes normalized MOTD (handling JSON and colors), player counts, versions, and latency.
- **Legacy & Modded**: Verified compatibility with 1.7.10+, Forge, and modded network proxies.

## Installation

```bash
npm install mcping
```

## Usage

### Simple Ping (Auto-detect)

```typescript
import { ping } from "mcping";

const res = await ping("mc.hypixel.net");
console.log(`${res.players.online}/${res.players.max} players online.`);
console.log(`Resolved IP: ${res.target.ip}:${res.target.port}`);
```

### Caching Strategies

The library supports two main caching strategies to optimize performance and reduce network overhead:

1.  **`lazy` (Cache-Aside)**: Checks for a fresh cached result before making a network request.
2.  **`swr` (Stale-While-Revalidate)**: Returns cached data immediately (even if stale) while refreshing the cache in the background.

```typescript
const res = await ping("mc.hypixel.net", {
  cache: {
    ttl: 30000, // 30 seconds
    strategy: "swr", // 'lazy' | 'swr'
  },
});

console.log(res.cached ? "(From Cache)" : "(Live)");
```

### Specific Protocol

```typescript
const res = await ping("geo.hivebedrock.network", { type: "bedrock" });
```

### Options

```typescript
const res = await ping("example.com", {
  timeout: 3000, // default: 5000ms
  type: "java", // 'java' | 'bedrock' | null (auto-detect)
});
```

## Response Schema

```typescript
{
  type: "java" | "bedrock";
  version: {
    name: string;
    protocol: number;
  };
  players: {
    online: number;
    max: number;
  };
  motd: string;        // Cleaned string with formatting preserved as § codes
  latency: number;     // Round-trip time in ms (Java only, 0 for Bedrock)
  target: {
    host: string;      // Resolved hostname (e.g. from SRV)
    port: number;      // Final port
    ip: string;        // Physical IP address
  };
  raw: any;            // The original raw response from the server
  cached?: boolean;    // True if the response was served from cache
}
```

## CLI Usage

The library includes a Neofetch-inspired command-line interface for quick status checks.

```bash
# Using npx
npx mcping mc.hypixel.net

# Options
npx mcping mc.hypixel.net --timeout 1000
npx mcping play.cubecraft.net --type bedrock

# Or install globally
npm install -g mcping
mcping mc.hypixel.net
```

## License

MIT © HarmoniaMC
