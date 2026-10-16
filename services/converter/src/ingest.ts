import mammoth from 'mammoth';
import { marked } from 'marked';

import { sanitizeHtml, type BookNode } from './book-html';

export interface BookImage {
  /** Internal EPUB path, e.g. images/img-1.png */
  path: string;
  contentType: string;
  data: Buffer;
}

/**
 * A warning with a machine-readable code.
 *
 * `warnings` is free text and mixes things the author can act on ("an image was
 * left out") with engine noise ("unrecognised paragraph style: Body Text 2").
 * The report can only score, and should only show, the former. Showing an author
 * a Word style name is how a report starts feeling like an exam it wrote itself.
 */
export interface WarningCode {
  code: string;
  count: number;
}

export interface IngestedManuscript {
  nodes: BookNode[];
  images: BookImage[];
  sourceFormat: 'docx' | 'markdown' | 'text';
  /** Non-fatal things worth telling the author, e.g. dropped legacy fields. */
  warnings: string[];
  /** The same events, classified, for the publishing report. */
  warningCodes: WarningCode[];
  imageCount: number;
  droppedImageCount: number;
}

/** Formats the press accepts today. */
export type ManuscriptKind = 'docx' | 'markdown' | 'text';

export class UnsupportedManuscriptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedManuscriptError';
  }
}

/**
 * Decides how to read a manuscript, by extension with a magic-byte check.
 *
 * A .docx is a ZIP (PK\x03\x04); a legacy binary .doc starts with the OLE
 * signature D0 CF 11 E0. The distinction matters because mammoth silently
 * produces garbage for .doc, and the author deserves "save as .docx" rather
 * than a mangled book.
 */
export function detectKind(fileName: string, data: Buffer): ManuscriptKind {
  const ext = fileName.toLowerCase().split('.').pop() ?? '';

  if (ext === 'docx' || ext === 'doc') {
    if (data.length >= 4 && data[0] === 0x50 && data[1] === 0x4b) return 'docx';
    if (data.length >= 4 && data[0] === 0xd0 && data[1] === 0xcf) {
      throw new UnsupportedManuscriptError(
        'This is a legacy .doc file. Please save it as .docx (Word 2007 or later) and upload again.',
      );
    }
    throw new UnsupportedManuscriptError(
      'This file has a Word extension but is not a valid Word document.',
    );
  }
  if (ext === 'md' || ext === 'markdown') return 'markdown';
  if (ext === 'txt') return 'text';
  if (ext === 'pdf') {
    throw new UnsupportedManuscriptError(
      'This manuscript is already a PDF. Upload the source document (.docx, .md or .txt) so Wolly can typeset both formats.',
    );
  }
  throw new UnsupportedManuscriptError(
    `Unsupported manuscript format ".${ext}". Upload .docx, .md or .txt.`,
  );
}

const IMAGE_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

/** Reads a manuscript into the sanitized book tree. */
export async function ingest(
  fileName: string,
  data: Buffer,
): Promise<IngestedManuscript> {
  const kind = detectKind(fileName, data);
  const warnings: string[] = [];
  const images: BookImage[] = [];
  const codes = new Map<string, number>();
  const note = (code: string) => codes.set(code, (codes.get(code) ?? 0) + 1);
  let droppedImageCount = 0;

  if (kind === 'docx') {
    let imageIndex = 0;
    const result = await mammoth.convertToHtml(
      { buffer: data },
      {
        // Images are extracted to real files inside the EPUB rather than left
        // as data URIs: several readers refuse data URIs, and a 20MB base64
        // blob inline in a chapter destroys pagination.
        convertImage: mammoth.images.imgElement(async (image) => {
          const ext = IMAGE_TYPES[image.contentType];
          if (!ext) {
            warnings.push(`An image of type ${image.contentType} was left out.`);
            note('image_dropped');
            droppedImageCount += 1;
            return { src: '' };
          }
          imageIndex += 1;
          const path = `images/img-${imageIndex}.${ext}`;
          const buffer = await image.readAsBuffer();
          images.push({ path, contentType: image.contentType, data: buffer });
          return { src: path };
        }),
      },
    );
    for (const message of result.messages) {
      if (message.type === 'warning') {
        warnings.push(message.message);
        // Everything mammoth reports is engine noise unless we recognise it.
        note('engine_note');
      }
    }
    return finish(sanitizeHtml(result.value), 'docx');
  }

  const decoded = decodeText(data);
  const text = decoded.text;
  if (decoded.usedFallback) {
    note('encoding_fallback');
    warnings.push(
      'This file was not saved as UTF-8, so Wolly read it as Windows text. ' +
      'Check any accented or Ghanaian-language characters in the finished book. ' +
      'Re-saving the file as UTF-8 removes the guesswork.',
    );
  }
  if (decoded.hasReplacementChars) {
    note('mojibake');
    warnings.push(
      'Some characters in this file were already damaged before it reached Wolly ' +
      'and show as \u2026 marks. Only the original file can fix them.',
    );
  }

  if (kind === 'markdown') {
    const html = await marked.parse(text, { async: true });
    return finish(sanitizeHtml(html), 'markdown');
  }

  // Plain text: blank-line-separated paragraphs; a lone short line followed by
  // a blank line reads as a chapter heading often enough that we do NOT guess.
  // Every block is a paragraph; authors who want chapters use markdown or Word.
  const paragraphs = text
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.replace(/\s*\r?\n\s*/g, ' ').trim())
    .filter(Boolean);
  const html = paragraphs.map((p) => `<p>${escapeForParse(p)}</p>`).join('\n');
  return finish(sanitizeHtml(html), 'text');

  function finish(
    nodes: BookNode[],
    sourceFormat: 'docx' | 'markdown' | 'text',
  ): IngestedManuscript {
    return {
      nodes,
      images,
      sourceFormat,
      warnings,
      warningCodes: [...codes].map(([code, count]) => ({ code, count })),
      imageCount: images.length,
      droppedImageCount,
    };
  }
}

/**
 * Decodes a manuscript's bytes, and says so when it could not do it cleanly.
 *
 * `data.toString('utf8')` substitutes U+FFFD for every byte it cannot read and
 * reports nothing, so a .txt saved as Windows-1252 (what an older Notepad
 * writes, and what a great deal of text prepared on second-hand machines still
 * is) lost every non-ASCII character in silence.
 *
 * On this platform that is not a cosmetic loss. E, O and N with their marks are
 * different letters in Twi, Ewe, Ga and Dagbani, not decorated versions of
 * Latin ones, so a silent substitution changes words rather than blurring them.
 * The author received a book full of replacement characters and a report that
 * said the manuscript converted cleanly.
 *
 * Windows-1252 is the fallback because it maps all 256 bytes and therefore
 * cannot itself fail, and because it is overwhelmingly what produced the file.
 * A guess that is recorded and shown to the author beats a silent loss.
 */
export function decodeText(data: Buffer): {
  text: string;
  usedFallback: boolean;
  hasReplacementChars: boolean;
} {
  let text: string;
  let usedFallback = false;
  try {
    // `fatal` is the whole point: it throws instead of quietly substituting.
    // TextDecoder also strips a UTF-8 BOM, which toString('utf8') left behind
    // as a stray character at the top of every Windows-saved file.
    text = new TextDecoder('utf-8', { fatal: true }).decode(data);
  } catch {
    usedFallback = true;
    text = new TextDecoder('windows-1252').decode(data);
  }
  // Valid UTF-8 that already carries replacement characters was corrupted
  // before it reached us. Nothing here can recover it, but the author is the
  // only person who still has the original, so they are the one to tell.
  return { text, usedFallback, hasReplacementChars: text.includes('\uFFFD') };
}

/**
 * Plain text goes through the same sanitizer as everything else, so literal
 * angle brackets in a txt manuscript must be pre-escaped or the tokenizer
 * would read them as markup and strip them.
 */
function escapeForParse(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
