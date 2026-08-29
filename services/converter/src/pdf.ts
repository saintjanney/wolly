import { PDFDocument } from 'pdf-lib';

import { escapeXml, toXhtml } from './book-html';
import { SANS_STACK, SERIF_STACK, fontFaceCss } from './fonts';
import type { Chapter } from './epub';
import type { BookImage } from './ingest';
import type { Provenance } from './provenance';

/**
 * Typesets the book as a print-quality PDF.
 *
 * Chromium's print engine does the layout: real text shaping, widow/orphan
 * handling, page breaks at headings, running footers with page numbers. The
 * alternative (drawing text manually with a PDF library) produces measurably
 * worse books, and a publisher's PDF is the product.
 *
 * Chromium cannot write document metadata, so pdf-lib post-processes the bytes
 * to stamp the provenance record into the PDF info dictionary. The fingerprint
 * goes in Subject and Keywords, where forensic matching can find it with any
 * PDF tool.
 */
export interface PdfInput {
  title: string;
  author: string;
  chapters: Chapter[];
  images: BookImage[];
  provenance: Provenance;
}

const PRINT_CSS = `
@page { size: 6in 9in; margin: 0.75in 0.7in; }
body { font-family: ${SERIF_STACK}; font-size: 11pt; line-height: 1.55; margin: 0; }
h1 { font-family: ${SANS_STACK}; font-size: 20pt; page-break-before: always; margin: 2em 0 1em; }
h2 { font-family: ${SANS_STACK}; font-size: 14pt; margin: 1.4em 0 0.6em; }
p { margin: 0 0 0.6em; text-align: justify; orphans: 2; widows: 2; }
blockquote { margin: 1em 2em; font-style: italic; }
img { max-width: 100%; }
table { border-collapse: collapse; margin: 1em 0; }
td, th { border: 1pt solid #888; padding: 3pt 6pt; }
/* The title page must hold ALL of its own content. The imprint line used to
   carry a 3in top margin on top of the h1's inherited 2em, which overflowed the
   6x9 page and left "Published by Wolly" orphaned alone on page two. Margins
   here are reset explicitly rather than inherited from the body rules. */
.title-page { page-break-after: always; text-align: center; padding-top: 2.2in; }
.title-page h1 { page-break-before: avoid; font-size: 26pt; margin: 0 0 0.5em; }
.title-page .author { font-size: 14pt; margin-top: 0; }
.title-page .press { margin-top: 1.8in; font-family: ${SANS_STACK}; font-size: 10pt; color: #555; }
.colophon { page-break-before: always; font-family: ${SANS_STACK}; font-size: 8.5pt; color: #444; }
`;

function buildPrintHtml(input: PdfInput): string {
  const chapters = input.chapters
    .map((chapter) => toXhtml(chapter.nodes))
    .join('\n');

  // Chromium resolves images against the document; inline them as data URIs so
  // printing needs no filesystem or network.
  const withInlineImages = input.images.reduce((html, image) => {
    const dataUri = `data:${image.contentType};base64,${image.data.toString('base64')}`;
    return html.split(`src="${image.path}"`).join(`src="${dataUri}"`);
  }, chapters);

  const p = input.provenance;
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>${fontFaceCss()}${PRINT_CSS}</style></head>
<body>
<div class="title-page">
  <h1>${escapeXml(input.title)}</h1>
  <div class="author">${escapeXml(input.author)}</div>
  <div class="press">Published by ${escapeXml(p.publisher)}</div>
</div>
${withInlineImages}
<div class="colophon">
  <h2>Colophon</h2>
  <p>${escapeXml(input.title)} by ${escapeXml(input.author)}.
  Typeset and published by ${escapeXml(p.publisher)} on ${escapeXml(p.pressedAt.slice(0, 10))}.</p>
  <p>${escapeXml(p.rights)}</p>
  <p>Pressing: ${escapeXml(p.fingerprint)}</p>
</div>
</body>
</html>`;
}

/**
 * Deterministic rendering, and survival inside a container.
 *
 * `--disable-dev-shm-usage` is not optional in serverless: /dev/shm is a few MB
 * there, and Chromium crashes mid-render without it rather than failing to start.
 */
const BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--font-render-hinting=none',
];

/**
 * Finds a Chromium to run, in a declared order, and says so when it cannot.
 *
 * The order is explicit rather than try/catch-and-fall-through. An earlier
 * version caught every failure and fell back to the serverless Linux binary,
 * so a broken local browser surfaced as "Malformed Mach-o file" from a binary
 * that was never going to run on macOS, instead of naming the real problem.
 *
 *   1. PUPPETEER_EXECUTABLE_PATH  - an operator-supplied browser. CI and any
 *      machine whose puppeteer download was blocked use this.
 *   2. K_SERVICE / FUNCTION_TARGET - set by Cloud Functions and Cloud Run, so
 *      the deployed press uses @sparticuz/chromium's serverless build.
 *   3. the `puppeteer` devDependency and its bundled browser, for local dev.
 *
 * `puppeteer` is a devDependency precisely so it is absent in production; step 2
 * is what runs there, and step 3 must never be reached.
 */
async function launchBrowser() {
  const explicitPath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (explicitPath) {
    const core = await import('puppeteer-core');
    return core.default.launch({
      args: BROWSER_ARGS,
      executablePath: explicitPath,
      headless: true,
    });
  }

  if (process.env.K_SERVICE || process.env.FUNCTION_TARGET) {
    const chromium = (await import('@sparticuz/chromium')).default;
    const core = await import('puppeteer-core');
    return core.default.launch({
      args: [...chromium.args, '--font-render-hinting=none'],
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  try {
    const local = await import('puppeteer');
    return await local.default.launch({ args: BROWSER_ARGS });
  } catch (error) {
    throw new Error(
      'Could not start a browser to typeset the PDF. Set PUPPETEER_EXECUTABLE_PATH ' +
        'to a Chrome or Chromium binary, or run `npx puppeteer browsers install chrome`. ' +
        `Underlying error: ${(error as Error).message}`,
    );
  }
}

export async function buildPdf(input: PdfInput): Promise<Buffer> {
  const browser = await launchBrowser();
  let printed: Uint8Array;
  try {
    const page = await browser.newPage();
    await page.setContent(buildPrintHtml(input), { waitUntil: 'load', timeout: 120_000 });
    printed = await page.pdf({
      printBackground: false,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: `<div style="width:100%;text-align:center;font-size:8pt;font-family:sans-serif;color:#666;">
        <span class="pageNumber"></span></div>`,
      margin: { top: '0.75in', bottom: '0.75in', left: '0.7in', right: '0.7in' },
      // @page size in CSS controls the sheet; preferCSSPageSize honours it.
      preferCSSPageSize: true,
      timeout: 120_000,
    });
  } finally {
    await browser.close();
  }

  // Stamp provenance into the document info dictionary.
  const doc = await PDFDocument.load(printed);
  const p = input.provenance;
  doc.setTitle(input.title);
  doc.setAuthor(input.author);
  doc.setProducer(`${p.publisher} Press`);
  doc.setCreator(p.publisher);
  doc.setSubject(`Published by ${p.publisher}. Pressing ${p.fingerprint}. ${p.rights}`);
  doc.setKeywords([p.fingerprint, `wolly-book-${p.bookId}`]);
  doc.setCreationDate(new Date(p.pressedAt));
  doc.setModificationDate(new Date(p.pressedAt));
  return Buffer.from(await doc.save());
}
