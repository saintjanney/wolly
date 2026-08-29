/**
 * Runs the generated books through epubcheck, the W3C reference validator.
 *
 * This exists because the structural tests in convert.test.js did not catch a
 * real defect: the NCX and OPF carried different unique identifiers, which is
 * an error in every EPUB the press produced. Hand-written assertions check the
 * invariants someone thought of; epubcheck checks the specification.
 *
 * Reads test/out, which convert.test.js fills. Node's runner executes test FILES
 * concurrently, so the directory is enumerated inside the test rather than at
 * require time, and `npm test` passes --test-concurrency=1 to order the two
 * files. Enumerating at require time raced the writer and validated stale books.
 *
 * If epubcheck is missing the suite SKIPS rather than passing silently, so a
 * green run without it is visibly a partial run.
 *
 *   macOS:  brew install epubcheck
 *   CI:     see .github/workflows/ci.yml
 */

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { existsSync, readdirSync } = require('node:fs');
const { join } = require('node:path');
const { describe, it } = require('node:test');

const OUT_DIR = join(__dirname, 'out');

const available = spawnSync('epubcheck', ['--version'], { encoding: 'utf8' }).status === 0;

describe('epubcheck', { skip: available ? false : 'epubcheck is not installed' }, () => {
  it('every pressed book validates against the EPUB specification', () => {
    assert.ok(existsSync(OUT_DIR), 'test/out is missing - convert.test.js must run first');
    const books = readdirSync(OUT_DIR).filter((name) => name.endsWith('.epub'));
    assert.ok(books.length > 0, 'no EPUBs in test/out - convert.test.js must run first');

    const failures = [];
    const warned = [];

    for (const book of books) {
      const result = spawnSync('epubcheck', [join(OUT_DIR, book)], { encoding: 'utf8' });
      const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
      if (result.status !== 0) {
        const detail = output
          .split('\n')
          .filter((line) => /ERROR|FATAL/.test(line))
          .join('\n');
        failures.push(`${book}:\n${detail || output}`);
      } else if (!/0 warnings/.test(output)) {
        warned.push(`${book}: ${output.match(/Messages:.*/)?.[0] ?? 'warnings'}`);
      }
    }

    if (warned.length > 0) {
      console.warn(`\n  Validated with warnings:\n    ${warned.join('\n    ')}`);
    }
    assert.equal(
      failures.length,
      0,
      `epubcheck rejected ${failures.length} of ${books.length} books:\n\n${failures.join('\n\n')}`,
    );
    console.log(`  epubcheck: ${books.length} books validated clean.`);
  });
});

if (!available) {
  console.warn(
    '\n  epubcheck is NOT installed: EPUB validity was NOT verified.\n' +
      '  Install it with `brew install epubcheck` (macOS) or see ci.yml.\n',
  );
}
