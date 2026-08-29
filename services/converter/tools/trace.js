#!/usr/bin/env node
/**
 * Traces a book found in the wild back to the pressing that produced it.
 *
 *   npm --workspace @wolly/converter run trace -- /path/to/found.epub
 *   npm --workspace @wolly/converter run trace -- /path/to/found.pdf --resolve
 *
 * Runs every probe it has, reports what each one found, and returns ONE of
 * three verdicts:
 *
 *   IDENTIFIED  a copyId resolving to a specific issued copy (needs per-copy
 *               marking, which is designed but not yet built - see RIGHTS.md)
 *   ATTRIBUTED  a pressing fingerprint: this is the book and the typesetting
 *               run, but NOT who downloaded it
 *   NO CALL     nothing decoded
 *
 * There is deliberately no best-guess verdict. A forensic tool that produces a
 * confident answer from weak evidence gets a real person accused, and the marks
 * most likely to be present in a mangled file are also the ones most likely to
 * have been corrupted by whatever mangled it. If nothing decodes, it says so.
 *
 * `--resolve` additionally looks the fingerprint up in Firestore, which needs
 * Application Default Credentials. Without it the tool is entirely offline and
 * reads only the file you hand it.
 */

const { createHash } = require('node:crypto');
const { readFileSync, existsSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const { basename } = require('node:path');

const JSZip = require('jszip');

/** The shape minted by provenance.ts. */
const FINGERPRINT = /wolly-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
const BOOK_ID = /urn:wolly:([A-Za-z0-9_-]+):(wolly-[0-9a-f-]{36})/;

function uniq(values) {
  return [...new Set(values)].filter(Boolean);
}

/** One probe's result. `where` is human-facing; it goes in the report. */
function probe(where, text) {
  return { where, found: uniq(String(text ?? '').match(FINGERPRINT) ?? []) };
}

async function traceEpub(bytes) {
  const probes = [];
  let zip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch (error) {
    return { probes, note: `not a readable ZIP container: ${error.message}` };
  }

  const names = Object.keys(zip.files);
  let bookId = null;

  for (const name of names) {
    if (!/\.(opf|ncx|xhtml|html|xml)$/i.test(name)) continue;
    const text = await zip.file(name).async('string');
    const result = probe(`${name}`, text);
    if (result.found.length > 0) probes.push(result);
    const idMatch = text.match(BOOK_ID);
    if (idMatch && !bookId) bookId = idMatch[1];
  }

  return { probes, bookId, note: null };
}

/**
 * PDF probes.
 *
 * Metadata first because it is exact, then the page text, because the colophon
 * survives things the metadata does not: `exiftool -all=` clears the info
 * dictionary in one command, while removing a printed colophon page means
 * editing the book.
 */
function tracePdf(path, bytes) {
  const probes = [];
  const poppler = spawnSync('pdfinfo', [path], { encoding: 'utf8' });

  if (poppler.status === 0) {
    const meta = probe('PDF metadata (Subject / Keywords)', poppler.stdout);
    if (meta.found.length > 0) probes.push(meta);

    const text = spawnSync('pdftotext', [path, '-'], { encoding: 'utf8' });
    if (text.status === 0) {
      const body = probe('page text (colophon)', text.stdout);
      if (body.found.length > 0) probes.push(body);
    }
  }

  // Raw scan, which catches an uncompressed info dictionary even when poppler
  // is unavailable or the file is too damaged for it to parse.
  const raw = probe('raw bytes', bytes.toString('latin1'));
  if (raw.found.length > 0) probes.push(raw);

  return {
    probes,
    note: poppler.status === 0 ? null : 'poppler not installed: metadata and page text were not read (brew install poppler)',
  };
}

async function main() {
  const args = process.argv.slice(2);
  const path = args.find((a) => !a.startsWith('--'));
  const resolve = args.includes('--resolve');
  const asJson = args.includes('--json');

  if (!path) {
    console.error('usage: trace <file.epub|file.pdf> [--resolve] [--json]');
    process.exit(2);
  }
  if (!existsSync(path)) {
    console.error(`no such file: ${path}`);
    process.exit(2);
  }

  const bytes = readFileSync(path);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const isEpub = bytes.subarray(0, 2).toString('latin1') === 'PK';
  const isPdf = bytes.subarray(0, 5).toString('latin1') === '%PDF-';

  let result = { probes: [], note: 'unrecognised file type (not a ZIP or a PDF)' };
  if (isEpub) result = await traceEpub(bytes);
  else if (isPdf) result = tracePdf(path, bytes);

  const fingerprints = uniq(result.probes.flatMap((p) => p.found));
  const verdict = fingerprints.length === 1 ? 'ATTRIBUTED' : fingerprints.length > 1 ? 'AMBIGUOUS' : 'NO CALL';

  const report = {
    file: basename(path),
    bytes: bytes.length,
    sha256,
    format: isEpub ? 'epub' : isPdf ? 'pdf' : 'unknown',
    verdict,
    fingerprints,
    bookId: result.bookId ?? null,
    probes: result.probes,
    note: result.note,
  };

  if (resolve && fingerprints.length === 1) {
    report.record = await resolveFingerprint(fingerprints[0]);
  }

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    print(report, resolve);
  }
  process.exit(verdict === 'NO CALL' ? 1 : 0);
}

/** Optional Firestore lookup. Requires Application Default Credentials. */
async function resolveFingerprint(fingerprint) {
  try {
    const { initializeApp, applicationDefault } = require('firebase-admin/app');
    const { getFirestore } = require('firebase-admin/firestore');
    initializeApp({ credential: applicationDefault() });
    const snap = await getFirestore()
      .collection('epubs')
      .where('conversion.fingerprint', '==', fingerprint)
      .limit(1)
      .get();
    if (snap.empty) return { matched: false };
    const doc = snap.docs[0];
    const book = doc.data();
    return {
      matched: true,
      bookId: doc.id,
      title: book.title,
      author: book.author,
      ownerUserId: book.ownerUserId,
      rightsStatus: book.rightsStatus ?? 'clear',
      pressedAt: book.conversion?.pressedAt,
    };
  } catch (error) {
    return { matched: false, error: error.message };
  }
}

function print(report, resolve) {
  const line = '─'.repeat(64);
  console.log(line);
  console.log(`  ${report.file}   ${report.bytes.toLocaleString()} bytes   ${report.format}`);
  console.log(`  sha256 ${report.sha256}`);
  console.log(line);

  if (report.probes.length === 0) {
    console.log('  No Wolly mark found by any probe.');
  } else {
    console.log('  Marks found:\n');
    for (const p of report.probes) {
      console.log(`    ${p.where}`);
      for (const f of p.found) console.log(`      ${f}`);
    }
  }

  if (report.note) console.log(`\n  Note: ${report.note}`);

  console.log(`\n  VERDICT: ${report.verdict}`);
  if (report.verdict === 'ATTRIBUTED') {
    console.log(`    Pressing ${report.fingerprints[0]}`);
    if (report.bookId) console.log(`    Book     ${report.bookId}`);
    console.log('    This identifies the book and the typesetting run.');
    console.log('    It does NOT identify who downloaded it: per-copy marking');
    console.log('    is not yet built. See RIGHTS.md section 2.');
  } else if (report.verdict === 'AMBIGUOUS') {
    console.log('    More than one distinct fingerprint is present, so this file');
    console.log('    was assembled from multiple pressings. Treat with care.');
  } else {
    console.log('    Nothing decoded. This file either did not come from Wolly,');
    console.log('    or every mark was stripped. No guess is offered.');
  }

  if (report.record) {
    console.log('');
    if (report.record.matched) {
      console.log(`    Title    ${report.record.title}`);
      console.log(`    Author   ${report.record.author}`);
      console.log(`    Owner    ${report.record.ownerUserId}`);
      console.log(`    Rights   ${report.record.rightsStatus}`);
      console.log(`    Pressed  ${report.record.pressedAt}`);
    } else {
      console.log(`    Firestore lookup did not match${report.record.error ? `: ${report.record.error}` : ''}`);
    }
  } else if (resolve) {
    console.log('\n    (--resolve needs exactly one fingerprint and credentials)');
  }
  console.log('');
}

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
