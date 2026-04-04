/**
 * VarInt encoding and decoding for Minecraft protocol.
 * Based on the specification at https://wiki.vg/Protocol#VarInt_and_VarLong
 */

export function encodeVarInt(value: number): Buffer {
  const bytes: number[] = [];
  let temp = value >>> 0;

  while (temp >= 0x80) {
    bytes.push((temp & 0x7f) | 0x80);
    temp >>>= 7;
  }
  bytes.push(temp);
  return Buffer.from(bytes);
}

export function decodeVarInt(
  buffer: Buffer,
  offset = 0,
): { value: number; length: number } {
  let value = 0;
  let length = 0;
  let currentByte: number;

  while (true) {
    currentByte = buffer.readUInt8(offset + length);
    value |= (currentByte & 0x7f) << (length * 7);
    length++;
    if (length > 5) throw new Error("VarInt is too big");
    if ((currentByte & 0x80) !== 0x80) break;
  }

  return { value: value | 0, length };
}

export function encodeString(str: string): Buffer {
  const content = Buffer.from(str, "utf8");
  return Buffer.concat([encodeVarInt(content.length), content]);
}

export function decodeString(
  buffer: Buffer,
  offset = 0,
): { value: string; length: number } {
  const { value: strLen, length: varIntLen } = decodeVarInt(buffer, offset);
  const value = buffer.toString(
    "utf8",
    offset + varIntLen,
    offset + varIntLen + strLen,
  );
  return { value, length: varIntLen + strLen };
}
