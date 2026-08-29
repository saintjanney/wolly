import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The house typefaces, embedded rather than named.
 *
 * WHY THIS FILE EXISTS: the print stylesheet used to ask for Georgia and
 * Helvetica. On a developer's Mac both exist, so local PDFs embedded them and
 * looked right. Neither exists in the serverless Linux container the press
 * actually runs in, so every deployed book would have been typeset in whatever
 * Chromium fell back to. Nothing would have failed; the books would just have
 * been wrong, and only on the copies real readers received.
 *
 * Embedding removes the question. The same three files are used everywhere, so
 * a PDF pressed on a laptop is byte-comparable with one pressed in production.
 *
 * STATIC INSTANCES, NOT VARIABLE FONTS. Google Fonts now ships EB Garamond and
 * Inter only as weight-variable files, and Chromium writes a variable face into
 * a PDF as a Type 3 font: legal, and still selectable, but procedural rather
 * than a real embedded outline font, and rejected by PDF/X preflight in print
 * workflows. Instancing each family at 400 and 700 before embedding gives
 * ordinary CID TrueType output. See NOTICE.md for how these were produced.
 *
 * They are inlined as data URIs because the print HTML is handed to Chromium
 * via setContent, which gives the document no base URL to resolve a relative
 * font path against.
 *
 * LICENCE: EB Garamond and Inter are both SIL Open Font License 1.1, which
 * permits embedding in documents, subsetting, and commercial use. See NOTICE.md
 * in this directory.
 */

/** Resolved from the compiled `lib/` directory, so `fonts/` is a sibling. */
const FONT_DIR = join(__dirname, '..', 'fonts');

function dataUri(file: string): string {
  const bytes = readFileSync(join(FONT_DIR, file));
  return `data:font/woff2;base64,${bytes.toString('base64')}`;
}

/**
 * Read once per process, not once per book. A warm function instance presses
 * many manuscripts, and re-encoding 118KB of font for each one is waste.
 */
let cached: string | null = null;

export function fontFaceCss(): string {
  if (cached !== null) return cached;

  cached = `
@font-face {
  font-family: 'Wolly Serif';
  src: url('${dataUri('EBGaramond-Regular.woff2')}') format('woff2');
  font-weight: 400;
  font-style: normal;
}
@font-face {
  font-family: 'Wolly Serif';
  src: url('${dataUri('EBGaramond-Bold.woff2')}') format('woff2');
  font-weight: 700;
  font-style: normal;
}
@font-face {
  font-family: 'Wolly Serif';
  src: url('${dataUri('EBGaramond-Italic.woff2')}') format('woff2');
  font-weight: 400;
  font-style: italic;
}
@font-face {
  font-family: 'Wolly Sans';
  src: url('${dataUri('Inter-Regular.woff2')}') format('woff2');
  font-weight: 400;
  font-style: normal;
}
@font-face {
  font-family: 'Wolly Sans';
  src: url('${dataUri('Inter-Bold.woff2')}') format('woff2');
  font-weight: 700;
  font-style: normal;
}
`;
  return cached;
}

/**
 * Fallbacks after the embedded families.
 *
 * They should never be reached. They are named anyway so that a missing font
 * file degrades to a readable book rather than to Chromium's last-resort face,
 * and so the intent is legible to whoever reads the stylesheet next.
 */
export const SERIF_STACK = `'Wolly Serif', Georgia, 'Times New Roman', serif`;
export const SANS_STACK = `'Wolly Sans', Helvetica, Arial, sans-serif`;
