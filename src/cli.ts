#!/usr/bin/env node
import { ping } from "./index.js";
import { mcToAnsi } from "./ansi.js";

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
};

/**
 * Poor man's argument parser
 */
function parseArgs(args: string[]) {
  const result: {
    target?: string;
    type?: "java" | "bedrock";
    timeout?: number;
  } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--type" || arg === "-t") {
      const val = args[++i]?.toLowerCase();
      if (val === "java" || val === "bedrock") {
        result.type = val;
      }
    } else if (arg === "--timeout") {
      const val = parseInt(args[++i]);
      if (!isNaN(val)) {
        result.timeout = val;
      }
    } else if (!result.target && !arg.startsWith("-")) {
      result.target = arg;
    }
  }
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const parsed = parseArgs(args);

  if (!parsed.target) {
    console.log(
      `\n${colors.bright}Usage:${colors.reset} mcping <host[:port]> [options]`,
    );
    console.log(`\n${colors.bright}Options:${colors.reset}`);
    console.log(`  --type, -t <java|bedrock>  Force protocol type`);
    console.log(
      `  --timeout <ms>             Connection timeout (default: 5000)`,
    );
    console.log(`\n${colors.bright}Examples:${colors.reset}`);
    console.log(`  mcping mc.hypixel.net`);
    console.log(`  mcping geo.hivebedrock.network --type bedrock`);
    console.log(`  mcping play.example.com --timeout 2000\n`);
    process.exit(1);
  }

  try {
    const res = await ping(parsed.target, {
      type: parsed.type,
      timeout: parsed.timeout,
    });

    // Header Line: Input -> IP:Port
    const resolvedStr = `${res.target.ip}:${res.target.port}`;
    const targetDisplay =
      parsed.target === resolvedStr
        ? parsed.target
        : `${parsed.target} ${colors.gray}→${colors.reset} ${resolvedStr}`;

    console.log(`\n ${colors.bright}${targetDisplay}${colors.reset}`);

    // Edition line
    const editionStr = `${colors.bright}${res.type.toUpperCase()}${colors.reset}`;
    const versionStr = `${colors.gray}${res.version.name}${colors.reset}`;
    const latencyStr =
      res.type === "java"
        ? ` ${colors.magenta}${res.latency}ms${colors.reset}`
        : "";

    console.log(
      ` ${editionStr} ${colors.gray}•${colors.reset} ${versionStr}${latencyStr}`,
    );

    // Players line
    console.log(
      ` ${colors.bright}${res.players.online}${colors.reset} ${colors.gray}/ ${res.players.max} players${colors.reset}`,
    );

    // MOTD with indent and colors
    const coloredMotd = mcToAnsi(res.motd);
    const cleanMotd = coloredMotd
      .trim()
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join(`\n `);

    console.log(`\n ${cleanMotd}${colors.reset}\n`);
  } catch (err: any) {
    console.error(`\n ${colors.yellow}Error:${colors.reset} ${err.message}\n`);
    process.exit(1);
  }
}

main();
