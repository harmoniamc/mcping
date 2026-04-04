export function parseChat(chat: any): string {
  if (typeof chat === "string") return chat;
  if (!chat || typeof chat !== "object") return "";

  let text = "";

  // Minecraft legacy color code mapping in JSON
  const colorMap: Record<string, string> = {
    black: "0",
    dark_blue: "1",
    dark_green: "2",
    dark_aqua: "3",
    dark_red: "4",
    dark_purple: "5",
    gold: "6",
    gray: "7",
    dark_gray: "8",
    blue: "9",
    green: "a",
    aqua: "b",
    red: "c",
    light_purple: "d",
    yellow: "e",
    white: "f",
  };

  if (chat.color && colorMap[chat.color]) {
    text += `§${colorMap[chat.color]}`;
  }
  if (chat.bold) text += "§l";
  if (chat.italic) text += "§o";
  if (chat.underlined) text += "§n";
  if (chat.strikethrough) text += "§m";
  if (chat.obfuscated) text += "§k";

  text += chat.text || "";

  if (chat.extra && Array.isArray(chat.extra)) {
    for (const part of chat.extra) {
      text += parseChat(part);
    }
  }

  return text;
}
