'use client';

import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useServerFeatures } from '@/lib/serverFeatures';

/**
 * A banner that appears only while the server half of Wolly is not answering.
 *
 * Rendered by screens whose main action needs a function, so the author reads
 * it before clicking rather than after. `title` is the first sentence, naming
 * the thing that will not work here, in the author's words.
 */
export function ServerUnavailableNotice({ title }: { title: string }) {
  const state = useServerFeatures();
  if (state !== 'unavailable') return null;
  return (
    <div
      role="status"
      className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
    >
      <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1">
          Everything you write and upload here is saved. Please try this step again later.
        </p>
      </div>
    </div>
  );
}
