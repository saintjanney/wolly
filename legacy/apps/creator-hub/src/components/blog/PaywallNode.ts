import { Node, mergeAttributes } from '@tiptap/core';

/**
 * The paywall divider.
 *
 * A block node the author inserts once to mark where free reading stops. It
 * carries no content and renders as a labelled rule in the composer.
 *
 * The node name here must stay in sync with `PAYWALL_NODE` in
 * services/api/src/render.ts, which is what actually splits the document into
 * the `free` and `paid` content records at publish time. Rename it in one place
 * only and posts silently stop being paywalled, which is a security-relevant
 * failure rather than a cosmetic one: the paid half would be written into the
 * free record and served to everyone.
 */
export const PAYWALL_NODE_NAME = 'paywall';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    paywall: {
      setPaywall: () => ReturnType;
      removePaywall: () => ReturnType;
    };
  }
}

export const PaywallNode = Node.create({
  name: PAYWALL_NODE_NAME,
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  parseHTML() {
    return [{ tag: 'div[data-paywall]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-paywall': '',
        class: 'wolly-paywall-divider',
      }),
      // Rendered only inside the composer. The published post never contains
      // this node: the server consumes it when splitting the document.
      ['span', {}, 'Paid subscribers only, below this line'],
    ];
  },

  addCommands() {
    return {
      setPaywall:
        () =>
        ({ commands, state }) => {
          // One divider per post. A second would be ignored by the server's
          // split (it takes the first), so refuse rather than let the author
          // believe they have created two tiers of content.
          let existing = 0;
          state.doc.forEach((node) => {
            if (node.type.name === PAYWALL_NODE_NAME) existing += 1;
          });
          if (existing > 0) return false;

          return commands.insertContent({ type: PAYWALL_NODE_NAME });
        },

      removePaywall:
        () =>
        ({ tr, state, dispatch }) => {
          let removedAt: number | null = null;
          state.doc.forEach((node, pos) => {
            if (removedAt === null && node.type.name === PAYWALL_NODE_NAME) {
              removedAt = pos;
            }
          });
          if (removedAt === null) return false;
          if (dispatch) dispatch(tr.delete(removedAt, removedAt + 1));
          return true;
        },
    };
  },
});

/** Whether a TipTap document currently contains a paywall divider. */
export function docHasPaywall(doc: { content?: Array<{ type?: string }> } | null): boolean {
  return (doc?.content ?? []).some((node) => node.type === PAYWALL_NODE_NAME);
}
