/**
 * The press, tested against a real corpus.
 *
 * "Must work flawlessly" is only meaningful if it is checked, so these tests
 * assert on the actual bytes produced: the EPUB is unzipped and its container
 * invariants verified, every content document is parsed as XML, and the PDF is
 * re-loaded and its metadata read back. `epub.validate.test.js` then runs the
 * output through epubcheck, which is the authority the readers themselves
 * follow.
 *
 * Fixtures are generated, never checked in as binaries. See fixtures.js.
 */

const assert = require('node:assert/strict');
const { mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { after, describe, it } = require('node:test');

const JSZip = require('jszip');
const { XMLValidator } = require('fast-xml-parser');
const { PDFDocument } = require('pdf-lib');

const { convertManuscript, EmptyManuscriptError } = require('../lib/convert');
const { UnsupportedManuscriptError } = require('../lib/ingest');
const { sanitizeHtml, toXhtml, toPlainText } = require('../lib/book-html');
const { splitChapters } = require('../lib/epub');
const { ingest } = require('../lib/ingest');

const fixtures = require('./fixtures');

/** Where generated books land so epubcheck (and a human) can open them. */
const OUT_DIR = join(__dirname, 'out');
mkdirSync(OUT_DIR, { recursive: true });

const BASE = {
  bookId: 'book-test-1',
  title: 'The Harbour',
  author: 'Mara Vance',
  language: 'en',
  description: 'A story about the sea.',
};

/** Converts and also writes the artefacts out for the validation pass. */
async function press(name, fileName, manuscript, extra = {}) {
  const result = await convertManuscript({
    ...BASE,
    manuscriptFileName: fileName,
    manuscript,
    ...extra,
  });
  writeFileSync(join(OUT_DIR, `${name}.epub`), result.epub);
  writeFileSync(join(OUT_DIR, `${name}.pdf`), result.pdf);
  return result;
}

/** Reads every entry of a generated EPUB. */
async function openEpub(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const text = async (path) => {
    const file = zip.file(path);
    assert.ok(file, `EPUB is missing ${path}`);
    return file.async('string');
  };
  return { zip, text, names: Object.keys(zip.files) };
}

// ────────────────────────────────────────────────────────────────────────────
describe('sanitizer (security boundary)', () => {
  it('drops scripts, styles, iframes, objects and svg with their contents', () => {
    const nodes = sanitizeHtml(
      `<p>keep</p><script>steal()</script><style>x{}</style>` +
        `<iframe src="https://a.example"></iframe><object data="x"></object>` +
        `<svg onload="alert(1)"><desc>hidden</desc></svg>`,
    );
    const xhtml = toXhtml(nodes);
    assert.match(xhtml, /keep/);
    for (const forbidden of ['steal', 'script', 'iframe', 'object', 'svg', 'hidden', 'x{}']) {
      assert.ok(!xhtml.includes(forbidden), `"${forbidden}" survived sanitization: ${xhtml}`);
    }
  });

  it('strips event handlers and inline styles but keeps the text', () => {
    const xhtml = toXhtml(
      sanitizeHtml(`<p onclick="alert(1)" style="position:fixed" class="x">Text</p>`),
    );
    assert.equal(xhtml, '<p>Text</p>');
  });

  it('allows only http, https and mailto on links', () => {
    const cases = [
      ['https://example.org/a', true],
      ['http://example.org/a', true],
      ['mailto:a@example.org', true],
      ['javascript:alert(1)', false],
      ['data:text/html,<script>alert(1)</script>', false],
      ['vbscript:msgbox(1)', false],
      ['file:///etc/passwd', false],
    ];
    for (const [href, allowed] of cases) {
      const xhtml = toXhtml(sanitizeHtml(`<a href="${href}">link</a>`));
      assert.equal(
        xhtml.includes('href='),
        allowed,
        `${href} should ${allowed ? 'survive' : 'be dropped'}, got: ${xhtml}`,
      );
      assert.match(xhtml, /link/, 'link text must always survive');
    }
  });

  it('drops remote images so an opened book never phones home', () => {
    const xhtml = toXhtml(
      sanitizeHtml(`<img src="https://attacker.example/pixel.png" alt="a"><p>after</p>`),
    );
    assert.ok(!xhtml.includes('attacker.example'), xhtml);
    assert.ok(!xhtml.includes('<img'), xhtml);
    assert.match(xhtml, /after/);
  });

  it('keeps internal image paths minted by the press', () => {
    const xhtml = toXhtml(sanitizeHtml(`<img src="images/img-1.png" alt="fine">`));
    assert.match(xhtml, /<img src="images\/img-1\.png" alt="fine"\/>/);
  });

  it('unwraps unknown tags without losing the author\'s words', () => {
    const xhtml = toXhtml(sanitizeHtml(`<div><section><p>Hello <mark>there</mark></p></section></div>`));
    assert.equal(xhtml, '<p>Hello there</p>');
  });

  it('escapes XML metacharacters and removes illegal control characters', () => {
    const xhtml = toXhtml(sanitizeHtml(`<p>a &amp; b &lt; c \u0000\u0008 d</p>`));
    assert.match(xhtml, /a &amp; b &lt; c/);
    assert.ok(!/[\u0000-\u0008]/.test(xhtml), 'control characters must not reach XHTML');
  });

  it('survives malformed and mismatched nesting', () => {
    // Unclosed and crossed tags must not throw or lose text.
    const xhtml = toXhtml(sanitizeHtml('<p><strong>bold <em>both</strong> italic</em><p>next'));
    assert.match(xhtml, /bold/);
    assert.match(xhtml, /both/);
    assert.match(xhtml, /next/);
  });

  it('neutralises the whole hostile fixture', async () => {
    const { nodes } = await ingest('hostile.md', Buffer.from(fixtures.HOSTILE_MARKDOWN));
    const xhtml = toXhtml(nodes);
    for (const forbidden of [
      'attacker.example',
      'javascript:',
      'onerror',
      'onload',
      'onclick',
      '<script',
      '<iframe',
      '<object',
      '<style',
      'alert(1)',
    ]) {
      assert.ok(!xhtml.includes(forbidden), `hostile content survived: ${forbidden}\n${xhtml}`);
    }
    assert.match(xhtml, /Text that must survive/);
    assert.match(xhtml, /Legitimate closing paragraph/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('ingest', () => {
  it('rejects a legacy .doc with an instruction the author can act on', async () => {
    await assert.rejects(
      () => ingest('old.doc', fixtures.LEGACY_DOC),
      (error) => {
        assert.ok(error instanceof UnsupportedManuscriptError);
        assert.match(error.message, /save it as \.docx/i);
        return true;
      },
    );
  });

  it('rejects a PDF upload and explains why', async () => {
    await assert.rejects(
      () => ingest('book.pdf', fixtures.FAKE_PDF),
      (error) => {
        assert.match(error.message, /already a PDF/i);
        return true;
      },
    );
  });

  it('rejects an unknown extension', async () => {
    await assert.rejects(
      () => ingest('book.pages', Buffer.from('x')),
      /Unsupported manuscript format/,
    );
  });

  it('reads plain text as paragraphs and escapes markup characters', async () => {
    const { nodes, sourceFormat } = await ingest('notes.txt', Buffer.from(fixtures.PLAIN_TEXT));
    assert.equal(sourceFormat, 'text');
    const xhtml = toXhtml(nodes);
    assert.match(xhtml, /&lt;angle brackets&gt;/, 'literal angle brackets must survive as text');
    assert.match(xhtml, /&amp; ampersand/);
    // The wrapped source lines must join into one paragraph.
    assert.match(xhtml, /<p>This is the first paragraph of a plain text manuscript\. It is wrapped/);
  });

  it('extracts docx images to real files rather than data URIs', async () => {
    const { images, nodes } = await ingest('novel.docx', await fixtures.novelDocx());
    assert.equal(images.length, 1, 'the embedded PNG should be extracted');
    assert.match(images[0].path, /^images\/img-1\.png$/);
    assert.ok(images[0].data.length > 0);
    // Attribute order is a serializer detail, not a contract; match on the tag.
    assert.match(toXhtml(nodes), /<img[^>]*src="images\/img-1\.png"/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('chapter splitting', () => {
  it('splits on h1 when present', () => {
    const nodes = sanitizeHtml('<h1>One</h1><p>a</p><h1>Two</h1><p>b</p>');
    const chapters = splitChapters(nodes, 'Fallback');
    assert.deepEqual(chapters.map((c) => c.title), ['One', 'Two']);
  });

  it('falls back to h2 when there is no h1', () => {
    const nodes = sanitizeHtml('<h2>A</h2><p>a</p><h2>B</h2><p>b</p>');
    assert.deepEqual(splitChapters(nodes, 'Fallback').map((c) => c.title), ['A', 'B']);
  });

  it('produces one chapter when the manuscript has no headings', () => {
    const chapters = splitChapters(sanitizeHtml('<p>a</p><p>b</p>'), 'Fallback');
    assert.equal(chapters.length, 1);
    assert.equal(chapters[0].title, 'Fallback');
  });

  it('keeps content that appears before the first heading', () => {
    const nodes = sanitizeHtml('<p>front matter</p><h1>One</h1><p>a</p>');
    const chapters = splitChapters(nodes, 'Fallback');
    assert.equal(chapters.length, 2);
    assert.equal(chapters[0].title, 'Fallback');
    assert.match(toPlainText(chapters[0].nodes), /front matter/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('pressing a novel (docx -> epub + pdf)', () => {
  let result;
  let epub;

  it('converts without error', async () => {
    result = await press('novel', 'novel.docx', await fixtures.novelDocx(), {
      cover: { data: fixtures.PNG_1PX, contentType: 'image/png' },
    });
    assert.equal(result.sourceFormat, 'docx');
    assert.ok(result.wordCount > 40, `word count too low: ${result.wordCount}`);
    assert.equal(result.chapterCount, 4, 'front matter + three chapters');
  });

  it('mints a provenance fingerprint and a content hash', () => {
    assert.match(result.provenance.fingerprint, /^wolly-[0-9a-f-]{36}$/);
    assert.match(result.contentSha256, /^[0-9a-f]{64}$/);
  });

  it('writes mimetype first and uncompressed, per OCF', async () => {
    // Readers identify an EPUB by reading these exact bytes at a fixed offset,
    // so this is not a formality: get it wrong and some readers reject the file.
    const raw = result.epub;
    assert.equal(raw.subarray(0, 4).toString('latin1'), 'PK\u0003\u0004');
    assert.equal(raw.subarray(30, 38).toString('latin1'), 'mimetype');
    assert.equal(
      raw.subarray(38, 58).toString('latin1'),
      'application/epub+zip',
      'mimetype content must sit immediately after the name, i.e. STORED not DEFLATED',
    );
  });

  it('contains every part a reader needs', async () => {
    epub = await openEpub(result.epub);
    for (const required of [
      'mimetype',
      'META-INF/container.xml',
      'OEBPS/content.opf',
      'OEBPS/nav.xhtml',
      'OEBPS/toc.ncx',
      'OEBPS/style.css',
      'OEBPS/colophon.xhtml',
      'OEBPS/images/img-1.png',
    ]) {
      assert.ok(epub.names.includes(required), `missing ${required}`);
    }
  });

  it('emits well-formed XML for every content document', async () => {
    for (const name of epub.names) {
      if (!/\.(xhtml|opf|ncx|xml)$/.test(name)) continue;
      const xml = await epub.zip.file(name).async('string');
      const verdict = XMLValidator.validate(xml);
      assert.equal(verdict, true, `${name} is not well-formed XML: ${JSON.stringify(verdict)}`);
    }
  });

  it('carries the provenance record in the package metadata', async () => {
    const opf = await epub.text('OEBPS/content.opf');
    assert.ok(opf.includes(result.provenance.fingerprint), 'fingerprint missing from OPF');
    assert.match(opf, /<dc:publisher>Wolly<\/dc:publisher>/);
    assert.match(opf, /<dc:rights>/);
    assert.match(opf, /property="wolly:fingerprint"/);
    assert.match(opf, /<dc:identifier id="pub-id">urn:wolly:book-test-1:/);
  });

  it('uses one identifier in both the OPF and the NCX', async () => {
    // EPUB 3.3 requires these to be byte-identical (epubcheck NCX-001). They
    // were not, in every book the press produced, and no structural test here
    // caught it because the invariant spans two files.
    const opf = await epub.text('OEBPS/content.opf');
    const ncx = await epub.text('OEBPS/toc.ncx');
    const opfId = opf.match(/<dc:identifier id="pub-id">([^<]+)<\/dc:identifier>/)?.[1];
    const ncxId = ncx.match(/name="dtb:uid" content="([^"]+)"/)?.[1];
    assert.ok(opfId, 'OPF has no unique identifier');
    assert.equal(ncxId, opfId);
  });

  it('carries a human-readable colophon', async () => {
    const colophon = await epub.text('OEBPS/colophon.xhtml');
    assert.ok(colophon.includes(result.provenance.fingerprint));
    assert.match(colophon, /Published by Wolly|published by Wolly/i);
  });

  it('preserves the author\'s formatting and content', async () => {
    const chapter = await epub.text('OEBPS/ch2.xhtml');
    assert.match(chapter, /Chapter One: The Harbour/);
    assert.match(chapter, /<em>quiet<\/em>/);
    assert.match(chapter, /<strong>perfectly still<\/strong>/);
    assert.match(chapter, /<img[^>]*src="images\/img-1\.png"/);
  });

  it('preserves lists and tables', async () => {
    const all = await Promise.all(
      epub.names.filter((n) => /ch\d+\.xhtml$/.test(n)).map((n) => epub.zip.file(n).async('string')),
    );
    const joined = all.join('');
    assert.match(joined, /<ul>/, 'a Word bullet list must become a real list');
    assert.match(joined, /<li>Names of the ships<\/li>/);
    assert.match(joined, /<table>/);
    assert.match(joined, /Kestrel/);
  });

  it('keeps the external link and drops nothing legitimate', async () => {
    const all = await Promise.all(
      epub.names.filter((n) => /ch\d+\.xhtml$/.test(n)).map((n) => epub.zip.file(n).async('string')),
    );
    assert.match(all.join(''), /href="https:\/\/example\.org\/archive"/);
  });

  it('produces a PDF that parses, has pages, and carries the fingerprint', async () => {
    assert.equal(result.pdf.subarray(0, 5).toString('latin1'), '%PDF-');
    const doc = await PDFDocument.load(result.pdf);
    assert.ok(doc.getPageCount() >= 2, `expected a multi-page book, got ${doc.getPageCount()}`);
    assert.equal(doc.getTitle(), BASE.title);
    assert.equal(doc.getAuthor(), BASE.author);
    assert.ok(
      doc.getSubject().includes(result.provenance.fingerprint),
      'PDF Subject must carry the pressing fingerprint',
    );
    assert.ok(doc.getKeywords().includes(result.provenance.fingerprint));
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('the rest of the corpus', () => {
  it('presses markdown, splitting on its headings', async () => {
    const result = await press('markdown', 'guide.md', Buffer.from(fixtures.MARKDOWN));
    assert.equal(result.sourceFormat, 'markdown');
    assert.equal(result.chapterCount, 2);
    const epub = await openEpub(result.epub);
    const joined = (
      await Promise.all(
        epub.names.filter((n) => /ch\d+\.xhtml$/.test(n)).map((n) => epub.zip.file(n).async('string')),
      )
    ).join('');
    assert.match(joined, /The Cartographer/);
    assert.match(joined, /<li>Observe the water<\/li>/);
    assert.match(joined, /<blockquote>/);
    assert.match(joined, /Sextant/);
    // The remote image in the markdown must not survive.
    assert.ok(!joined.includes('example.org/remote.png'), 'remote image leaked into the book');
  });

  it('presses a manuscript in Ghanaian languages', async () => {
    // Regression: the bundled fonts carried Google's `latin` subset only, so
    // every Twi, Ewe, Ga and Dagbani character and the cedi sign rendered as a
    // .notdef box in the author's PDF. test/pdf.test.js asserts they come back
    // out of the pressed file; this only has to press it.
    const result = await press('ghanaian', 'akwaaba.md', Buffer.from(fixtures.GHANAIAN_MARKDOWN));
    assert.equal(result.sourceFormat, 'markdown');
    assert.ok(result.chapterCount >= 1);
  });

  it('presses plain text', async () => {
    const result = await press('text', 'notes.txt', Buffer.from(fixtures.PLAIN_TEXT));
    assert.equal(result.sourceFormat, 'text');
    assert.equal(result.chapterCount, 1);
  });

  it('presses a messy Word document', async () => {
    const result = await press('messy', 'messy.docx', await fixtures.messyDocx());
    const epub = await openEpub(result.epub);
    const joined = (
      await Promise.all(
        epub.names.filter((n) => /ch\d+\.xhtml$/.test(n)).map((n) => epub.zip.file(n).async('string')),
      )
    ).join('');
    assert.match(joined, /smart quote/);
    assert.match(joined, /Ampersands &amp; angle &lt; brackets &gt;/);
    assert.match(joined, /Split across several runs\./);
  });

  it('presses a document with no headings as a single chapter', async () => {
    const result = await press('no-headings', 'flat.docx', await fixtures.noHeadingsDocx());
    assert.equal(result.chapterCount, 1);
  });

  it('presses a document with only h2 headings', async () => {
    const result = await press('h2-only', 'sections.docx', await fixtures.h2OnlyDocx());
    assert.equal(result.chapterCount, 2);
  });

  it('refuses an empty manuscript instead of publishing a blank book', async () => {
    const manuscript = await fixtures.emptyDocx();
    await assert.rejects(
      () =>
        convertManuscript({
          ...BASE,
          manuscriptFileName: 'empty.docx',
          manuscript,
        }),
      (error) => {
        assert.ok(error instanceof EmptyManuscriptError);
        assert.match(error.message, /no readable text/i);
        return true;
      },
    );
  });

  it('refuses a manuscript over the size ceiling', async () => {
    await assert.rejects(
      () =>
        convertManuscript({
          ...BASE,
          manuscriptFileName: 'huge.docx',
          manuscript: Buffer.alloc(51 * 1024 * 1024),
        }),
      /larger than 50MB/,
    );
  });
});

after(() => {
  console.log(`\nGenerated books are in ${OUT_DIR} for epubcheck and manual inspection.`);
});
