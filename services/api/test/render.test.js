/**
 * Adversarial tests for the post renderer.
 *
 * The renderer's output is injected into the blog with dangerouslySetInnerHTML
 * on an origin shared by every publication, so these tests are the evidence
 * that a hostile document cannot get script onto that page. Treat a failure
 * here as a security incident, not a broken unit test.
 *
 * Run: npm --workspace @wolly/api run build && node --test services/api/test/
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  renderToHtml,
  renderToPlainText,
  splitAtPaywall,
  deriveExcerpt,
  countWords,
  readingTimeMinutes,
  slugify,
} = require('../lib/render.js');

const doc = (...content) => ({ type: 'doc', content });
const para = (...content) => ({ type: 'paragraph', content });
const text = (t, marks) => ({ type: 'text', text: t, ...(marks ? { marks } : {}) });

/**
 * Asserts the output is inert.
 *
 * A naive substring scan is the wrong test: `<p>&lt;img onerror=x&gt;</p>` and
 * `alt="&quot; onerror=&quot;"` both contain the literal text "onerror=" while
 * being perfectly safe, because the angle brackets and quotes are entities. It
 * would fail on correct output and, worse, pass on output that smuggled a
 * payload past the substring list.
 *
 * What actually matters is which TAGS and ATTRIBUTES the renderer emits. Every
 * `<` originating from document text is escaped, so any literal `<` left in the
 * output was emitted by the renderer itself. Parse those out and hold them to
 * the allowlist.
 */
const ALLOWED_TAGS = new Set([
  'p', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'hr', 'br',
  'img', 'figure', 'figcaption', 'a', 'strong', 'em', 's',
]);
const ALLOWED_ATTRS = new Set(['href', 'rel', 'target', 'src', 'alt', 'loading', 'class']);

function assertInert(html, label) {
  const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^>]*)?)>/g;
  let match;
  while ((match = tagPattern.exec(html)) !== null) {
    const [, tagName, rawAttrs] = match;
    assert.ok(
      ALLOWED_TAGS.has(tagName.toLowerCase()),
      `${label}: emitted disallowed tag <${tagName}> -> ${html}`,
    );

    // Attribute names, read only from OUTSIDE quoted values, so an escaped
    // quote inside a value cannot be mistaken for a new attribute.
    const withoutValues = rawAttrs.replace(/"[^"]*"/g, '""');
    for (const [, attrName] of withoutValues.matchAll(/([a-zA-Z-]+)\s*=/g)) {
      const name = attrName.toLowerCase();
      assert.ok(
        !name.startsWith('on'),
        `${label}: emitted event handler ${name} -> ${html}`,
      );
      assert.ok(
        ALLOWED_ATTRS.has(name),
        `${label}: emitted disallowed attribute ${name} -> ${html}`,
      );
    }
  }

  // Dangerous URL schemes must never survive into an attribute value.
  for (const [, value] of html.matchAll(/(?:href|src)="([^"]*)"/g)) {
    const scheme = value.trim().toLowerCase();
    assert.ok(
      !/^(javascript|vbscript|data):/.test(scheme),
      `${label}: dangerous URL scheme in ${value}`,
    );
  }
}

// ── Escaping ───────────────────────────────────────────────────────────────

test('script tags in text are escaped, not emitted', () => {
  const html = renderToHtml(doc(para(text('<script>alert(1)</script>'))));
  assertInert(html, 'script in text');
  assert.equal(html, '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
});

test('img onerror payload in text is escaped', () => {
  const html = renderToHtml(doc(para(text('<img src=x onerror=alert(1)>'))));
  assertInert(html, 'img onerror');
});

test('quotes in text cannot break out of an attribute context', () => {
  const html = renderToHtml(doc(para(text('" onmouseover="alert(1)'))));
  assertInert(html, 'quote breakout');
  assert.ok(html.includes('&quot;'));
});

// ── Link marks ─────────────────────────────────────────────────────────────

test('javascript: href is dropped but the text survives', () => {
  const html = renderToHtml(
    doc(para(text('click me', [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }]))),
  );
  assertInert(html, 'javascript href');
  assert.equal(html, '<p>click me</p>');
});

test('data: and vbscript: hrefs are dropped', () => {
  for (const href of ['data:text/html;base64,PHNjcmlwdD4=', 'vbscript:msgbox(1)', 'JaVaScRiPt:alert(1)']) {
    const html = renderToHtml(doc(para(text('x', [{ type: 'link', attrs: { href } }]))));
    assertInert(html, `href ${href}`);
    assert.equal(html, '<p>x</p>', `href ${href} should have been dropped`);
  }
});

test('https links are kept, with rel hardening', () => {
  const html = renderToHtml(
    doc(para(text('ok', [{ type: 'link', attrs: { href: 'https://example.com/a?b=1&c=2' } }]))),
  );
  assert.ok(html.includes('rel="nofollow noopener noreferrer"'));
  assert.ok(html.includes('href="https://example.com/a?b=1&amp;c=2"'));
});

test('mailto links are kept', () => {
  const html = renderToHtml(doc(para(text('mail', [{ type: 'link', attrs: { href: 'mailto:a@b.com' } }]))));
  assert.ok(html.includes('href="mailto:a@b.com"'));
});

// ── Images ─────────────────────────────────────────────────────────────────

test('image with javascript src renders nothing', () => {
  const html = renderToHtml(doc({ type: 'image', attrs: { src: 'javascript:alert(1)' } }));
  assertInert(html, 'image js src');
  assert.equal(html, '');
});

test('extra image attributes are never echoed', () => {
  const html = renderToHtml(
    doc({
      type: 'image',
      attrs: { src: 'https://cdn/x.png', onerror: 'alert(1)', onload: 'alert(2)', srcdoc: '<script>' },
    }),
  );
  assertInert(html, 'image extra attrs');
  assert.equal(html, '<img src="https://cdn/x.png" alt="" loading="lazy">');
});

test('image alt and caption are escaped', () => {
  const html = renderToHtml(
    doc({ type: 'image', attrs: { src: 'https://cdn/x.png', alt: '" onerror="alert(1)', caption: '<script>x</script>' } }),
  );
  assertInert(html, 'image alt/caption');
});

// ── Unknown nodes and marks ────────────────────────────────────────────────

test('unknown node types are dropped, their text preserved', () => {
  const html = renderToHtml(
    doc({ type: 'rawHtml', attrs: { html: '<script>alert(1)</script>' }, content: [text('kept')] }),
  );
  assertInert(html, 'unknown node');
  assert.equal(html, 'kept');
});

test('unknown marks are ignored', () => {
  const html = renderToHtml(doc(para(text('hi', [{ type: 'evil', attrs: { onclick: 'alert(1)' } }]))));
  assertInert(html, 'unknown mark');
  assert.equal(html, '<p>hi</p>');
});

test('codeBlock language attribute cannot inject', () => {
  const html = renderToHtml(
    doc({ type: 'codeBlock', attrs: { language: 'js" onload="alert(1)' }, content: [text('x')] }),
  );
  assertInert(html, 'codeBlock language');
  assert.equal(html, '<pre><code>x</code></pre>');
});

test('codeBlock contents are escaped', () => {
  const html = renderToHtml(doc({ type: 'codeBlock', content: [text('<script>alert(1)</script>')] }));
  assertInert(html, 'codeBlock body');
});

test('heading levels are clamped to h2/h3', () => {
  assert.equal(renderToHtml(doc({ type: 'heading', attrs: { level: 1 }, content: [text('a')] })), '<h2>a</h2>');
  assert.equal(renderToHtml(doc({ type: 'heading', attrs: { level: 3 }, content: [text('a')] })), '<h3>a</h3>');
  assert.equal(renderToHtml(doc({ type: 'heading', attrs: { level: 9 }, content: [text('a')] })), '<h2>a</h2>');
});

test('malformed input does not throw', () => {
  for (const input of [null, undefined, {}, { type: 'doc' }, { type: 'doc', content: null }]) {
    assert.doesNotThrow(() => renderToHtml(input));
  }
});

// ── Paywall split ──────────────────────────────────────────────────────────

test('splits at the paywall marker', () => {
  const d = doc(para(text('free')), { type: 'paywall' }, para(text('paid')));
  const { free, paid } = splitAtPaywall(d);
  assert.equal(renderToHtml(free), '<p>free</p>');
  assert.equal(renderToHtml(paid), '<p>paid</p>');
});

test('no marker means everything is free and paid is null', () => {
  const { free, paid } = splitAtPaywall(doc(para(text('all free'))));
  assert.equal(paid, null);
  assert.equal(renderToHtml(free), '<p>all free</p>');
});

test('a stray paywall node never renders', () => {
  assert.equal(renderToHtml(doc({ type: 'paywall' }, para(text('x')))), '<p>x</p>');
});

test('only the FIRST marker splits, later ones vanish', () => {
  const d = doc(para(text('a')), { type: 'paywall' }, para(text('b')), { type: 'paywall' }, para(text('c')));
  const { free, paid } = splitAtPaywall(d);
  assert.equal(renderToHtml(free), '<p>a</p>');
  assert.equal(renderToHtml(paid), '<p>b</p><p>c</p>');
});

// ── Derived metadata ───────────────────────────────────────────────────────

test('plain text extraction separates blocks', () => {
  const plain = renderToPlainText(doc(para(text('one')), para(text('two'))));
  assert.equal(countWords(plain), 2);
});

test('excerpt cuts on a word boundary and never mid-word', () => {
  const long = 'word '.repeat(100).trim();
  const excerpt = deriveExcerpt(long, 50);
  assert.ok(excerpt.length <= 51, excerpt);
  assert.ok(excerpt.endsWith('…'));
  assert.ok(!excerpt.includes('wor…'));
});

test('short text is not truncated', () => {
  assert.equal(deriveExcerpt('short one', 200), 'short one');
});

test('reading time is never zero for a non-empty post', () => {
  assert.equal(readingTimeMinutes(0), 0);
  assert.equal(readingTimeMinutes(1), 1);
  assert.equal(readingTimeMinutes(220), 1);
  assert.equal(readingTimeMinutes(221), 2);
});

test('slugify handles punctuation, spaces and non-Latin titles', () => {
  assert.equal(slugify('Hello, World! How are you?'), 'hello-world-how-are-you');
  assert.equal(slugify('  --Trim--  '), 'trim');
  assert.equal(slugify('日本語'), 'post');
  assert.ok(slugify('a'.repeat(200)).length <= 60);
});
