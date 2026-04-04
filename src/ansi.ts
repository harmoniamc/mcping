const mcColorMap: Record<string, string> = {
  "0": "\x1b[30m", // black
  "1": "\x1b[34m", // dark_blue
  "2": "\x1b[32m", // dark_green
  "3": "\x1b[36m", // dark_aqua
  "4": "\x1b[31m", // dark_red
  "5": "\x1b[35m", // dark_purple
  "6": "\x1b[33m", // gold
  "7": "\x1b[37m", // gray
  "8": "\x1b[90m", // dark_gray
  "9": "\x1b[94m", // blue
  a: "\x1b[92m", // green
  b: "\x1b[96m", // aqua
  c: "\x1b[91m", // red
  d: "\x1b[95m", // light_purple
  e: "\x1b[93m", // yellow
  f: "\x1b[97m", // white
  l: "\x1b[1m", // bold
  m: "\x1b[9m", // strikethrough
  n: "\x1b[4m", // underline
  o: "\x1b[3m", // italic
  r: "\x1b[0m", // reset
};

/**
 * Converts Minecraft color codes (§) to ANSI terminal colors.
 */
export function mcToAnsi(text: string): string {
  const reset = "\x1b[0m";
  let result = "";
  const parts = text.split("§");

  result += parts[0];

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (part.length === 0) continue;

    const code = part[0].toLowerCase();
    const ansi = mcColorMap[code];

    if (ansi) {
      result += ansi + part.substring(1);
    } else {
      result += "§" + part;
    }
  }

  return result + reset;
}
