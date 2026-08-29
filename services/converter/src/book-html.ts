/**
 * The book content model: a minimal HTML tree with a CLOSED allowlist.
 *
 * THIS FILE IS A SECURITY BOUNDARY, with the same posture as the blog's
 * render.ts. Manuscript-derived HTML ends up in EPUB XHTML rendered by the
 * reader app and in Chromium during PDF generation, so an unhandled tag or
 * attribute is DROPPED, never passed through. Author text survives; markup is
 * reduced to exactly the set enumerated here.
 *
 * The tree is parsed with a small hand-rolled tokenizer rather than a
 * dependency: mammoth and marked both emit machine-generated, well-nested HTML
 * (not arbitrary web pages), and owning the parser means the escaping rules and
 * the XHTML serializer can never disagree with a third party's ideas.
 */

export interface BookNode {
  tag: string;
  attrs: Record<string, string>;
  children: Array<BookNode | string>;
}

/** Tags a book may contain. Anything else is unwrapped to its children. */
const ALLOWED: Record<string, ReadonlySet<string>> = {
  h1: new Set(), h2: new Set(), h3: new Set(),
  p: new Set(), br: new Set(), hr: new Set(),
  strong: new Set(), em: new Set(), b: new Set(), i: new Set(),
  u: new Set(), s: new Set(), sup: new Set(), sub: new Set(),
  blockquote: new Set(), pre: new Set(), code: new Set(),
  ul: new Set(), ol: new Set(), li: new Set(),
  table: new Set(), thead: new Set(), tbody: new Set(),
  tr: new Set(), td: new Set(['colspan', 'rowspan']), th: new Set(['colspan', 'rowspan']),
  a: new Set(['href']),
  img: new Set(['src', 'alt']),
};

const VOID_TAGS = new Set(['br', 'hr', 'img']);

/** Only these URL schemes survive on <a href>. */
function safeHref(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim());
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Image sources must be internal EPUB paths minted by US (images/img-N.ext) or
 * data URIs from mammoth that ingest has not yet extracted. Remote images are
 * dropped: a book must not phone external servers when opened.
 */
function safeImgSrc(raw: string | undefined): string | null {
  if (!raw) return null;
  if (/^images\/img-\d+\.(png|jpe?g|gif|webp)$/.test(raw)) return raw;
  if (/^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(raw)) return raw;
  return null;
}

// ── Tokenizer ──────────────────────────────────────────────────────────────

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  mdash: '—', ndash: '–', hellip: '…',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body.startsWith('#x') || body.startsWith('#X')) {
      const code = parseInt(body.slice(2), 16);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : whole;
    }
    if (body.startsWith('#')) {
      const code = parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[body] ?? whole;
  });
}

interface Token {
  kind: 'open' | 'close' | 'self' | 'text';
  tag?: string;
  attrs?: Record<string, string>;
  text?: string;
}

function tokenize(html: string): Token[] {
  const tokens: Token[] = [];
  const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9]*)((?:\s+[a-zA-Z-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|<!--[\s\S]*?-->/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = tagRe.exec(html)) !== null) {
    if (match.index > last) {
      tokens.push({ kind: 'text', text: decodeEntities(html.slice(last, match.index)) });
    }
    last = tagRe.lastIndex;
    if (match[0].startsWith('<!--')) continue; // comments vanish
    const tag = (match[1] ?? '').toLowerCase();
    if (match[0].startsWith('</')) {
      tokens.push({ kind: 'close', tag });
      continue;
    }
    const attrs: Record<string, string> = {};
    const attrRe = /([a-zA-Z-]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let attrMatch: RegExpExecArray | null;
    while ((attrMatch = attrRe.exec(match[2] ?? '')) !== null) {
      const value = attrMatch[3] ?? attrMatch[4] ?? attrMatch[5] ?? '';
      attrs[attrMatch[1].toLowerCase()] = decodeEntities(value);
    }
    tokens.push({
      kind: match[3] === '/' || VOID_TAGS.has(tag) ? 'self' : 'open',
      tag,
      attrs,
    });
  }
  if (last < html.length) {
    tokens.push({ kind: 'text', text: decodeEntities(html.slice(last)) });
  }
  return tokens;
}

/**
 * Parses HTML into a sanitized tree.
 *
 * Disallowed ELEMENT bodies that could execute or confuse (`script`, `style`,
 * `iframe`, `object`, `embed`) are removed entirely, contents included. Any
 * other unknown tag is unwrapped: the tag disappears, the author's words stay.
 */
export function sanitizeHtml(html: string): BookNode[] {
  const DROP_WITH_CONTENT = new Set(['script', 'style', 'iframe', 'object', 'embed', 'svg', 'head', 'title']);
  const root: BookNode = { tag: '#root', attrs: {}, children: [] };
  const stack: Array<{ node: BookNode; realTag: string }> = [
    { node: root, realTag: '#root' },
  ];
  let dropDepth = 0;

  for (const token of tokenize(html)) {
    const top = stack[stack.length - 1];

    if (token.kind === 'text') {
      if (dropDepth === 0 && token.text) top.node.children.push(token.text);
      continue;
    }

    const tag = token.tag ?? '';

    if (token.kind === 'close') {
      if (DROP_WITH_CONTENT.has(tag) && dropDepth > 0) {
        dropDepth -= 1;
        continue;
      }
      // Pop to the matching open tag if it is on the stack; ignore strays.
      for (let i = stack.length - 1; i > 0; i -= 1) {
        if (stack[i].realTag === tag) {
          stack.length = i;
          break;
        }
      }
      continue;
    }

    if (DROP_WITH_CONTENT.has(tag)) {
      if (token.kind === 'open') dropDepth += 1;
      continue;
    }
    if (dropDepth > 0) continue;

    const allowedAttrs = ALLOWED[tag];
    if (allowedAttrs === undefined) {
      // Unknown tag: unwrap. An open tag still needs a stack entry so its
      // close pops correctly, but it contributes no node.
      if (token.kind === 'open') {
        stack.push({ node: top.node, realTag: tag });
      }
      continue;
    }

    const attrs: Record<string, string> = {};
    for (const [name, value] of Object.entries(token.attrs ?? {})) {
      if (!allowedAttrs.has(name)) continue;
      if (tag === 'a' && name === 'href') {
        const href = safeHref(value);
        if (href) attrs.href = href;
        continue;
      }
      if (tag === 'img' && name === 'src') {
        const src = safeImgSrc(value);
        if (src) attrs.src = src;
        continue;
      }
      if (name === 'colspan' || name === 'rowspan') {
        if (/^\d{1,3}$/.test(value)) attrs[name] = value;
        continue;
      }
      attrs[name] = value;
    }

    // An image whose src did not survive is dropped outright.
    if (tag === 'img' && !attrs.src) continue;

    const node: BookNode = { tag, attrs, children: [] };
    top.node.children.push(node);
    if (token.kind === 'open') {
      stack.push({ node, realTag: tag });
    }
  }

  // Stray top-level text (legal in the tree, ugly in a book) becomes a
  // paragraph, so the function's contract is "a list of block elements".
  return root.children
    .filter((child) => typeof child !== 'string' || child.trim().length > 0)
    .map((child): BookNode =>
      typeof child === 'string'
        ? { tag: 'p', attrs: {}, children: [child.trim()] }
        : child,
    );
}

// ── XHTML serialization ────────────────────────────────────────────────────

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    // Control characters are not legal in XML 1.0 and break strict readers.
    // Tab (09), LF (0A) and CR (0D) are the permitted exceptions.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

/**
 * Serializes the sanitized tree as WELL-FORMED XHTML.
 *
 * EPUB 3 content documents are XML, not HTML: every element closes, void
 * elements self-close, every attribute is quoted and escaped. A reader that
 * uses a strict XML parser (several do) rejects anything less.
 */
export function toXhtml(nodes: Array<BookNode | string>): string {
  return nodes
    .map((node) => {
      if (typeof node === 'string') return escapeXml(node);
      const attrs = Object.entries(node.attrs)
        .map(([name, value]) => ` ${name}="${escapeXml(value)}"`)
        .join('');
      if (VOID_TAGS.has(node.tag)) return `<${node.tag}${attrs}/>`;
      return `<${node.tag}${attrs}>${toXhtml(node.children)}</${node.tag}>`;
    })
    .join('');
}

/** Plain text of the tree, for word counts and emptiness checks. */
export function toPlainText(nodes: Array<BookNode | string>): string {
  return nodes
    .map((node) => {
      if (typeof node === 'string') return node;
      const inner = toPlainText(node.children);
      return ['p', 'h1', 'h2', 'h3', 'li', 'blockquote', 'tr'].includes(node.tag)
        ? `${inner}\n`
        : inner;
    })
    .join('')
    .replace(/\n{2,}/g, '\n')
    .trim();
}
