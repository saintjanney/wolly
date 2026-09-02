import JSZip from 'jszip';

import { escapeXml, toXhtml, type BookNode } from './book-html';
import type { BookImage } from './ingest';
import type { Provenance } from './provenance';

export interface Chapter {
  title: string;
  nodes: Array<BookNode | string>;
}

/**
 * Splits the book tree into chapters on top-level headings.
 *
 * h1 boundaries first; if the manuscript has none, h2; if neither, the whole
 * text is one chapter. Content before the first heading becomes a front-matter
 * chapter so nothing is ever silently dropped.
 */
/**
 * What the split already knew and used to discard.
 *
 * `splitTag` was computed and thrown away on the next line. It is the single
 * most useful signal the report has about structure: without it every book
 * looks like one unmarked block, and a properly chaptered novel would be told
 * to go and mark its chapter titles.
 */
export interface ChapterStats {
  headingLevel: 'h1' | 'h2' | null;
  frontMatterChapter: boolean;
  emptyChapters: number;
  shortestChapterWords: number;
  longestChapterWords: number;
}

export function splitChaptersWithStats(
  nodes: BookNode[],
  fallbackTitle: string,
): { chapters: Chapter[]; stats: ChapterStats } {
  const headingLevel = nodes.some((n) => n.tag === 'h1')
    ? 'h1'
    : nodes.some((n) => n.tag === 'h2')
      ? 'h2'
      : null;
  const chapters = splitChapters(nodes, fallbackTitle);
  const counts = chapters.map((c) => {
    const text = plain(c.nodes as Array<BookNode | string>).trim();
    return text ? text.split(/\s+/).filter(Boolean).length : 0;
  });
  return {
    chapters,
    stats: {
      headingLevel,
      frontMatterChapter: headingLevel !== null && chapters.length > 0 && chapters[0].title === fallbackTitle,
      emptyChapters: counts.filter((n) => n === 0).length,
      shortestChapterWords: counts.length ? Math.min(...counts) : 0,
      longestChapterWords: counts.length ? Math.max(...counts) : 0,
    },
  };
}

export function splitChapters(nodes: BookNode[], fallbackTitle: string): Chapter[] {
  const splitTag = nodes.some((n) => n.tag === 'h1')
    ? 'h1'
    : nodes.some((n) => n.tag === 'h2')
      ? 'h2'
      : null;

  if (!splitTag) {
    return [{ title: fallbackTitle, nodes }];
  }

  const chapters: Chapter[] = [];
  let current: Chapter | null = null;
  const front: Array<BookNode | string> = [];

  for (const node of nodes) {
    if (node.tag === splitTag) {
      if (current) chapters.push(current);
      const title = plain(node.children).trim() || `Chapter ${chapters.length + 1}`;
      current = { title, nodes: [node] };
    } else if (current) {
      current.nodes.push(node);
    } else {
      front.push(node);
    }
  }
  if (current) chapters.push(current);
  if (front.length > 0) {
    chapters.unshift({ title: fallbackTitle, nodes: front });
  }
  return chapters;
}

function plain(children: Array<BookNode | string>): string {
  return children
    .map((c) => (typeof c === 'string' ? c : plain(c.children)))
    .join('');
}

const BOOK_CSS = `
body { font-family: serif; line-height: 1.6; margin: 1em; }
h1, h2, h3 { font-family: sans-serif; line-height: 1.25; }
h1 { font-size: 1.6em; margin: 1.4em 0 0.8em; }
h2 { font-size: 1.3em; margin: 1.2em 0 0.6em; }
p { margin: 0 0 0.9em; text-align: justify; }
blockquote { margin: 1em 2em; font-style: italic; }
img { max-width: 100%; }
table { border-collapse: collapse; margin: 1em 0; }
td, th { border: 1px solid #999; padding: 0.3em 0.6em; }
.colophon { font-family: sans-serif; font-size: 0.85em; color: #444; margin-top: 4em; }
`;

function xhtmlDocument(title: string, body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
<title>${escapeXml(title)}</title>
<link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
${body}
</body>
</html>
`;
}

export interface EpubInput {
  title: string;
  author: string;
  language: string;
  description?: string;
  chapters: Chapter[];
  images: BookImage[];
  cover?: { data: Buffer; contentType: string } | null;
  provenance: Provenance;
}

/**
 * Builds an EPUB 3 file, from scratch, deterministically.
 *
 * Hand-built rather than delegated to a library for one load-bearing reason:
 * the provenance record must live inside the container (OPF metadata plus a
 * colophon page), and owning the packaging is what guarantees it is present in
 * every pressing rather than depending on a library's extension points.
 *
 * Container invariants the tests enforce:
 *  - `mimetype` is the FIRST entry and is STORED uncompressed (OCF 3.0 §3.3;
 *    readers identify an EPUB by reading those bytes at a fixed offset).
 *  - every content document is well-formed XHTML;
 *  - both EPUB 3 nav and EPUB 2 NCX are present, because epub_view's parser
 *    (epubx) and older readers use the NCX while modern readers use nav.
 */
export async function buildEpub(input: EpubInput): Promise<Buffer> {
  const zip = new JSZip();
  const { provenance } = input;

  // Derived ONCE and used in both the OPF and the NCX. EPUB 3.3 requires the
  // NCX's dtb:uid to be byte-identical to the OPF's unique identifier
  // (epubcheck NCX-001); computing it twice is how they drift apart.
  const uniqueIdentifier = `urn:wolly:${provenance.bookId}:${provenance.fingerprint}`;

  // ORDER MATTERS: first entry, stored, no compression.
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
`,
  );

  zip.file('OEBPS/style.css', BOOK_CSS);

  // ── Chapters ─────────────────────────────────────────────────────────────
  const chapterFiles = input.chapters.map((chapter, i) => ({
    id: `ch${i + 1}`,
    href: `ch${i + 1}.xhtml`,
    title: chapter.title,
  }));

  input.chapters.forEach((chapter, i) => {
    zip.file(
      `OEBPS/${chapterFiles[i].href}`,
      xhtmlDocument(chapter.title, toXhtml(chapter.nodes)),
    );
  });

  // ── Colophon: the human-readable provenance page ─────────────────────────
  const colophon = `<div class="colophon">
<h2>Colophon</h2>
<p>${escapeXml(input.title)} by ${escapeXml(input.author)}.</p>
<p>Typeset and published by ${escapeXml(provenance.publisher)} on ${escapeXml(provenance.pressedAt.slice(0, 10))}.</p>
<p>${escapeXml(provenance.rights)}</p>
<p>Pressing: ${escapeXml(provenance.fingerprint)}</p>
</div>`;
  zip.file('OEBPS/colophon.xhtml', xhtmlDocument('Colophon', colophon));

  // ── Images ───────────────────────────────────────────────────────────────
  for (const image of input.images) {
    zip.file(`OEBPS/${image.path}`, image.data);
  }
  const coverExt = input.cover?.contentType === 'image/png' ? 'png' : 'jpg';
  if (input.cover) {
    zip.file(`OEBPS/cover.${coverExt}`, input.cover.data);
  }

  // ── Navigation (EPUB 3 nav + EPUB 2 NCX) ─────────────────────────────────
  const navItems = chapterFiles
    .map((c) => `<li><a href="${c.href}">${escapeXml(c.title)}</a></li>`)
    .join('\n');
  zip.file(
    'OEBPS/nav.xhtml',
    xhtmlDocument(
      'Contents',
      `<nav epub:type="toc" id="toc"><h2>Contents</h2><ol>
${navItems}
<li><a href="colophon.xhtml">Colophon</a></li>
</ol></nav>`,
    ),
  );

  const ncxPoints = chapterFiles
    .map(
      (c, i) => `<navPoint id="${c.id}" playOrder="${i + 1}">
<navLabel><text>${escapeXml(c.title)}</text></navLabel>
<content src="${c.href}"/>
</navPoint>`,
    )
    .join('\n');
  zip.file(
    'OEBPS/toc.ncx',
    `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
<head><meta name="dtb:uid" content="${escapeXml(uniqueIdentifier)}"/></head>
<docTitle><text>${escapeXml(input.title)}</text></docTitle>
<navMap>
${ncxPoints}
</navMap>
</ncx>
`,
  );

  // ── Package document ─────────────────────────────────────────────────────
  const imageItems = input.images
    .map(
      (img, i) =>
        `<item id="img${i + 1}" href="${img.path}" media-type="${img.contentType}"/>`,
    )
    .join('\n');
  const coverItem = input.cover
    ? `<item id="cover-image" href="cover.${coverExt}" media-type="${input.cover.contentType}" properties="cover-image"/>`
    : '';
  const chapterItems = chapterFiles
    .map(
      (c) =>
        `<item id="${c.id}" href="${c.href}" media-type="application/xhtml+xml"/>`,
    )
    .join('\n');
  const spineRefs = chapterFiles
    .map((c) => `<itemref idref="${c.id}"/>`)
    .join('\n');

  zip.file(
    'OEBPS/content.opf',
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id" prefix="wolly: https://wolly-blog.web.app/ns/provenance#">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="pub-id">${escapeXml(uniqueIdentifier)}</dc:identifier>
<dc:title>${escapeXml(input.title)}</dc:title>
<dc:creator>${escapeXml(input.author)}</dc:creator>
<dc:language>${escapeXml(input.language)}</dc:language>
<dc:publisher>${escapeXml(provenance.publisher)}</dc:publisher>
<dc:rights>${escapeXml(provenance.rights)}</dc:rights>
${input.description ? `<dc:description>${escapeXml(input.description)}</dc:description>` : ''}
<meta property="dcterms:modified">${escapeXml(provenance.pressedAt.replace(/\.\d+Z$/, 'Z'))}</meta>
<meta property="wolly:fingerprint">${escapeXml(provenance.fingerprint)}</meta>
<meta property="wolly:bookId">${escapeXml(provenance.bookId)}</meta>
${input.cover ? '<meta name="cover" content="cover-image"/>' : ''}
</metadata>
<manifest>
<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
<item id="css" href="style.css" media-type="text/css"/>
<item id="colophon" href="colophon.xhtml" media-type="application/xhtml+xml"/>
${coverItem}
${chapterItems}
${imageItems}
</manifest>
<spine toc="ncx">
${spineRefs}
<itemref idref="colophon"/>
</spine>
</package>
`,
  );

  return zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}
