/**
 * TipTap/ProseMirror JSON to HTML.
 *
 * THIS FILE IS A SECURITY BOUNDARY. The blog website injects the HTML produced
 * here with `dangerouslySetInnerHTML`, on an origin shared by every
 * publication, so anything that escapes this renderer becomes stored XSS
 * against other creators' readers, and against paid-subscriber sessions once
 * Phase 2 adds session cookies.
 *
 * It is written as an explicit allowlist rather than as a sanitiser over
 * arbitrary HTML, and deliberately has no dependencies. A node type or mark
 * that is not handled below is DROPPED, not passed through, so the set of tags
 * that can ever reach a reader is exactly the set enumerated here. Nothing the
 * client sends is echoed into the output except text (escaped) and a small
 * number of validated attributes.
 *
 * Adding a node type is a security-relevant change. Escape every value that
 * comes from the document, and validate every URL through `safeUrl()`.
 */

// ── Document types (the subset we accept) ──────────────────────────────────

export interface ProseMirrorMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface ProseMirrorNode {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: ProseMirrorMark[];
  content?: ProseMirrorNode[];
}

export interface ProseMirrorDoc {
  type: string;
  content?: ProseMirrorNode[];
}

/** The node type the composer inserts to mark where the paywall falls. */
export const PAYWALL_NODE = 'paywall';

// ── Escaping and URL validation ────────────────────────────────────────────

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Returns a safe absolute URL, or null.
 *
 * Only http, https and mailto survive. This is what stops `javascript:`,
 * `data:` and `vbscript:` hrefs, which are the direct route from a link mark to
 * script execution. Relative URLs are rejected too: post HTML is rendered on
 * the blog origin and also mailed out, where a relative URL is meaningless.
 */
function safeUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) return null;
  return parsed.toString();
}

function attr(name: string, value: string | null): string {
  return value === null ? '' : ` ${name}="${escapeHtml(value)}"`;
}

/** Reads a string attribute, capped so a hostile client cannot bloat a doc. */
function stringAttr(
  node: ProseMirrorNode,
  key: string,
  maxLength = 500,
): string | null {
  const value = node.attrs?.[key];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed || null;
}

// ── Marks ──────────────────────────────────────────────────────────────────

/** Inline marks. Anything not listed is dropped. */
function applyMarks(text: string, marks: ProseMirrorMark[] | undefined): string {
  if (!marks?.length) return text;

  return marks.reduce((acc, mark) => {
    switch (mark.type) {
      case 'bold':
      case 'strong':
        return `<strong>${acc}</strong>`;
      case 'italic':
      case 'em':
        return `<em>${acc}</em>`;
      case 'strike':
        return `<s>${acc}</s>`;
      case 'code':
        return `<code>${acc}</code>`;
      case 'link': {
        const href = safeUrl(mark.attrs?.href);
        if (!href) return acc; // unsafe scheme: keep the text, drop the link
        // noopener/noreferrer on every outbound link; these are creator-authored.
        return `<a href="${escapeHtml(href)}" rel="nofollow noopener noreferrer" target="_blank">${acc}</a>`;
      }
      default:
        return acc;
    }
  }, text);
}

// ── Nodes ──────────────────────────────────────────────────────────────────

function renderChildren(nodes: ProseMirrorNode[] | undefined): string {
  if (!nodes?.length) return '';
  return nodes.map(renderNode).join('');
}

function renderNode(node: ProseMirrorNode): string {
  switch (node.type) {
    case 'text':
      return applyMarks(escapeHtml(node.text ?? ''), node.marks);

    case 'paragraph': {
      const inner = renderChildren(node.content);
      return inner ? `<p>${inner}</p>` : '';
    }

    case 'heading': {
      // Only h2/h3 are offered: h1 is the post title, and deeper levels are
      // not in the composer.
      const level = node.attrs?.level;
      const tag = level === 3 ? 'h3' : 'h2';
      return `<${tag}>${renderChildren(node.content)}</${tag}>`;
    }

    case 'bulletList':
      return `<ul>${renderChildren(node.content)}</ul>`;

    case 'orderedList':
      return `<ol>${renderChildren(node.content)}</ol>`;

    case 'listItem':
      return `<li>${renderChildren(node.content)}</li>`;

    case 'blockquote':
      return `<blockquote>${renderChildren(node.content)}</blockquote>`;

    case 'codeBlock': {
      // Language is echoed into a class, so constrain it hard rather than
      // trusting the attribute.
      const raw = stringAttr(node, 'language', 24) ?? '';
      const language = /^[a-z0-9+#-]+$/i.test(raw) ? raw : '';
      const cls = language ? ` class="language-${escapeHtml(language)}"` : '';
      const text = (node.content ?? []).map((c) => c.text ?? '').join('');
      return `<pre><code${cls}>${escapeHtml(text)}</code></pre>`;
    }

    case 'horizontalRule':
      return '<hr>';

    case 'hardBreak':
      return '<br>';

    case 'image': {
      const src = safeUrl(node.attrs?.src);
      if (!src) return '';
      const alt = stringAttr(node, 'alt', 300) ?? '';
      const caption = stringAttr(node, 'caption', 500);
      const img = `<img src="${escapeHtml(src)}"${attr('alt', alt)} loading="lazy">`;
      return caption
        ? `<figure>${img}<figcaption>${escapeHtml(caption)}</figcaption></figure>`
        : img;
    }

    case PAYWALL_NODE:
      // Never rendered. splitAtPaywall() consumes it before rendering, so
      // reaching here means a stray marker; emit nothing.
      return '';

    default:
      // Unknown node: drop the node, keep any renderable children so text is
      // not silently lost.
      return renderChildren(node.content);
  }
}

export function renderToHtml(doc: ProseMirrorDoc | null | undefined): string {
  if (!doc || typeof doc !== 'object') return '';
  return renderChildren(doc.content);
}

// ── Plain text, for excerpts, search and word counts ───────────────────────

export function renderToPlainText(doc: ProseMirrorDoc | null | undefined): string {
  if (!doc) return '';

  const walk = (nodes: ProseMirrorNode[] | undefined): string[] => {
    if (!nodes?.length) return [];
    return nodes.flatMap((node) => {
      if (node.type === 'text') return [node.text ?? ''];
      if (node.type === 'hardBreak') return [' '];
      const children = walk(node.content);
      // Block-level nodes get a separator so words do not run together.
      return ['paragraph', 'heading', 'listItem', 'blockquote', 'codeBlock'].includes(node.type)
        ? [...children, '\n']
        : children;
    });
  };

  return walk(doc.content).join('').replace(/\n{2,}/g, '\n').trim();
}

// ── The paywall split ──────────────────────────────────────────────────────

export interface SplitDoc {
  free: ProseMirrorDoc;
  paid: ProseMirrorDoc | null;
}

/**
 * Splits a document at the first top-level paywall marker.
 *
 * Everything before the marker is free, everything after is paid. A document
 * with no marker is entirely free and `paid` is null, which is what makes
 * `hasPaywall` false on the post and means no paid content document is written
 * at all.
 */
export function splitAtPaywall(doc: ProseMirrorDoc | null | undefined): SplitDoc {
  const content = doc?.content ?? [];
  const index = content.findIndex((node) => node.type === PAYWALL_NODE);

  if (index === -1) {
    return { free: { type: 'doc', content }, paid: null };
  }

  return {
    free: { type: 'doc', content: content.slice(0, index) },
    paid: { type: 'doc', content: content.slice(index + 1) },
  };
}

// ── Derived metadata ───────────────────────────────────────────────────────

export function countWords(plainText: string): number {
  const trimmed = plainText.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** 220 wpm, rounded up, never zero for a post with any words in it. */
export function readingTimeMinutes(wordCount: number): number {
  return wordCount === 0 ? 0 : Math.max(1, Math.ceil(wordCount / 220));
}

/**
 * Derives an excerpt from the free portion of a post.
 *
 * Cuts on a word boundary rather than mid-word, since this text becomes the
 * meta description, the OpenGraph description, the JSON-LD `description` and the
 * email preheader.
 *
 * Angle brackets and ampersands are stripped first. Plain text extracted from a
 * post preserves whatever the author typed, so a post whose body literally
 * contains "<script>" would otherwise put that string into a `<meta>` attribute
 * and a JSON-LD value. Those are safely escaped by the renderers that emit
 * them, so this is not an injection, but a meta description reading
 * "&lt;script&gt;" is junk. An excerpt is a summary, not a verbatim copy, so
 * dropping markup characters loses nothing real.
 */
export function deriveExcerpt(plainText: string, maxLength = 200): string {
  const flat = plainText
    .replace(/[<>]/g, '') // never let markup characters into a description
    .replace(/&(?![a-z]+;|#\d+;)/gi, '') // bare ampersands, keep real entities
    .replace(/\s+/g, ' ')
    .trim();
  if (flat.length <= maxLength) return flat;

  const cut = flat.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** URL-safe slug. Falls back to a stable placeholder for non-Latin titles. */
export function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
  return slug || 'post';
}
