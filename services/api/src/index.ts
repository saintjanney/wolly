/**
 * Wolly server tier.
 *
 * Everything here runs with the Admin SDK, which bypasses security rules, so
 * each entry point is responsible for its own authorisation. See BLOG_SPEC.md
 * section 4.1 for what else lands here: the Paystack webhook, the newsletter
 * sender, the scheduled publisher and the comment counters.
 */

import { initializeApp } from 'firebase-admin/app';

initializeApp({ storageBucket: 'wolly-1133d.appspot.com' });

export { publishPost } from './publish';
export { getBookDownloadUrl } from './download';
export { paystackWebhook } from './paystack-webhook';
