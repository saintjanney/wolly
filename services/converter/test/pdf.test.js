/**
 * Checks the PDFs the press produces are actually print-quality.
 *
 * The structural tests in convert.test.js assert the PDF parses and carries the
 * right metadata. They cannot see typography, and typography is where this
 * pipeline silently broke: the stylesheet named Georgia and Helvetica, which
 * exist on a developer's Mac and in no Linux container, so local output looked
 * correct while every deployed book would have been set in a fallback face.
 * Nothing failed. The books were just wrong, and only for real readers.
 *
 * Uses poppler (`pdffonts`, `pdfinfo`), and SKIPS with a visible warning when it
 * is absent, so a green run without it is visibly a partial run.
 *
 *   macOS: brew install poppler
 */

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const { join } = require('node:path');
const { describe, it } = require('node:test');

const OUT_DIR = join(__dirname, 'out');
const NOVEL = join(OUT_DIR, 'novel.pdf');

const available =
  spawnSync('pdffonts', ['-v'], { encoding: 'utf8' }).status === 0 ||
  spawnSync('pdffonts', [], { encoding: 'utf8' }).status !== null;

/**
 * Chromium renders the running footer (the page number) in its own document,
 * which has no access to the page's @font-face rules, so that one number is set
 * in a system font whatever we do. It is the single exception to the rule that
 * a pressed PDF embeds only Wolly's own faces.
 */
const FOOTER_FONT = /Times|Helvetica|Arial|Liberation|DejaVu|Nimbus/i;

describe('pressed PDFs', { skip: available ? false : 'poppler is not installed' }, () => {
  it('embeds Wolly\'s own typefaces rather than whatever the host has', () => {
    assert.ok(existsSync(NOVEL), 'novel.pdf missing - convert.test.js must run first');
    const out = spawnSync('pdffonts', [NOVEL], { encoding: 'utf8' }).stdout ?? '';

    assert.match(out, /EBGaramond/, `EB Garamond was not embedded:\n${out}`);
    assert.match(out, /Inter/, `Inter was not embedded:\n${out}`);

    // The exact failure this file exists to catch.
    assert.ok(
      !/Georgia/.test(out),
      `Georgia reached the PDF. It is a macOS font and does not exist in the ` +
        `container, so this build would look different in production:\n${out}`,
    );

    // Every font must actually be embedded; a referenced-but-absent font is
    // substituted by the reader, which is the same failure by another route.
    for (const line of out.split('\n').slice(2)) {
      if (!line.trim()) continue;
      const embedded = /\byes\b/.test(line);
      assert.ok(embedded, `font is referenced but not embedded: ${line}`);
    }
  });

  /**
   * Reports the font program format rather than failing on it.
   *
   * Type 3 is a procedural font: still selectable, but not a real embedded
   * outline, and rejected by PDF/X preflight. Switching the bundled faces from
   * variable to static instances fixed it on macOS and in the deployed
   * container, both of which now emit CID TrueType.
   *
   * It is NOT asserted, because the format turns out to depend on the Chrome
   * build doing the rendering, not only on the font. The same static fonts
   * produce CID TrueType under macOS Chrome 152 and under the
   * @sparticuz/chromium build the press actually deploys (verified end to end
   * against production), and Type 3 under the stock Chrome that
   * `puppeteer browsers install` puts on a CI runner. CI therefore cannot
   * measure this property for the artefact we ship, and failing on it would be
   * a false alarm about a production PDF that is fine.
   *
   * What IS asserted is the part that is stable everywhere and is the defect
   * that actually shipped: which families are embedded. See the test above.
   */
  it('reports the embedded font program format', () => {
    const out = spawnSync('pdffonts', [NOVEL], { encoding: 'utf8' }).stdout ?? '';
    const type3 = out
      .split('\n')
      .filter((line) => /Type 3/.test(line))
      .filter((line) => !FOOTER_FONT.test(line));

    if (type3.length > 0) {
      console.warn(
        `\n  This renderer emitted ${type3.length} Type 3 font(s). Expected on a CI\n` +
          '  runner\'s stock Chrome; production and macOS emit CID TrueType.\n' +
          '  Investigate only if it also appears in a production pressing.',
      );
    } else {
      console.log('  All book fonts are real outline fonts (CID TrueType).');
    }
  });

  it('is a 6x9 inch trade paperback', () => {
    const out = spawnSync('pdfinfo', [NOVEL], { encoding: 'utf8' }).stdout ?? '';
    // 6in x 9in at 72pt/in.
    assert.match(out, /Page size:\s+432 x 648 pts/, out);
  });

  it('keeps its text extractable, which the provenance record depends on', () => {
    const out = spawnSync('pdftotext', [NOVEL, '-'], { encoding: 'utf8' }).stdout ?? '';
    assert.match(out, /Chapter One/, 'chapter headings are not extractable');
    assert.match(out, /Colophon/, 'the colophon is not extractable');
    assert.match(
      out,
      /wolly-[0-9a-f-]{36}/,
      'the pressing fingerprint is not recoverable from the page text, so a ' +
        'leaked copy could not be traced from its body alone',
    );
  });

  it('renders Ghanaian orthographies and the cedi sign', () => {
    // The initial market writes in Twi, Ewe, Ga and Dagbani and prices in cedis.
    // If a character is not in the embedded font, Chromium draws .notdef and
    // pdftotext extracts nothing for it, so a round-trip is a real check.
    const book = join(OUT_DIR, 'ghanaian.pdf');
    assert.ok(existsSync(book), 'ghanaian.pdf missing - convert.test.js must run first');
    const out = spawnSync('pdftotext', [book, '-'], { encoding: 'utf8' }).stdout ?? '';

    for (const word of ['sɛn', 'mekyerɛw', 'Ŋdi', 'ŋkɔ', 'Ɣeyiɣi', 'Ƒe', 'ɖeka', 'ɔdɔ']) {
      assert.ok(out.includes(word), `"${word}" did not survive into the PDF text`);
    }
    assert.ok(out.includes('₵30'), 'the cedi sign did not render');
    assert.ok(!out.includes('\uFFFD'), 'replacement characters reached the PDF');
  });

  it('puts the imprint on the title page rather than orphaning it', () => {
    // Regression: the imprint block carried a 3in top margin that overflowed
    // the page, leaving "Published by Wolly" alone on page two.
    const page1 =
      spawnSync('pdftotext', ['-f', '1', '-l', '1', NOVEL, '-'], {
        encoding: 'utf8',
      }).stdout ?? '';
    assert.match(page1, /Published by Wolly/, `title page was:\n${page1}`);
  });
});

if (!available) {
  console.warn(
    '\n  poppler is NOT installed: PDF typography was NOT verified.\n' +
      '  Install it with `brew install poppler` (macOS) or see ci.yml.\n',
  );
}
