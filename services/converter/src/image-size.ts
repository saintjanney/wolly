/**
 * Pixel dimensions of a cover, read from the file header.
 *
 * The report needs to tell an author whether their cover will look sharp at
 * thumbnail size, which needs width and height. Both are in the first few bytes
 * of the formats Wolly accepts, so this reads them directly rather than adding
 * an image library to a function that already carries a Chromium.
 *
 * Returns null for anything it does not recognise. A cover whose size cannot be
 * measured is not a failure: `cover_quality` treats an unmeasured cover as fine
 * rather than inventing a complaint about it.
 */
export interface ImageSize {
  width: number;
  height: number;
}

export function imageSize(data: Buffer): ImageSize | null {
  return pngSize(data) ?? jpegSize(data) ?? null;
}

/** PNG: an 8-byte signature, then an IHDR chunk whose first 8 bytes are the size. */
function pngSize(data: Buffer): ImageSize | null {
  if (data.length < 24) return null;
  const signature = '\x89PNG\r\n\x1a\n';
  if (data.subarray(0, 8).toString('latin1') !== signature) return null;
  if (data.subarray(12, 16).toString('latin1') !== 'IHDR') return null;
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

/**
 * JPEG: a chain of segments. Walk them to the start-of-frame marker, which is
 * the only place the dimensions appear.
 *
 * SOF0/1/2/3, 5-7 and 9-11, 13-15 are all frame headers carrying the size.
 * C4, C8 and CC are Huffman/extension markers that sit in the same numeric
 * range and must be skipped rather than read as a frame.
 */
function jpegSize(data: Buffer): ImageSize | null {
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) return null;

  let offset = 2;
  while (offset + 9 < data.length) {
    if (data[offset] !== 0xff) {
      offset += 1; // Resynchronise across padding rather than giving up.
      continue;
    }
    const marker = data[offset + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) return null; // End, or entropy data.

    const length = data.readUInt16BE(offset + 2);
    const isFrame =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isFrame) {
      return { height: data.readUInt16BE(offset + 5), width: data.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}
