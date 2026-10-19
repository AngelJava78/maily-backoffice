import createCache, { type EmotionCache } from '@emotion/cache';

/** The `<meta>` where the server writes, on each response, the nonce of its Content Security Policy. */
const NONCE_META = 'meta[property="csp-nonce"]';

/**
 * The nonce that the server put in `index.html`, or `undefined` when there is none (development, or
 * a deployment whose policy does not use nonces).
 */
export function readCspNonce(root: ParentNode = document): string | undefined {
  const nonce = root.querySelector<HTMLMetaElement>(NONCE_META)?.content.trim();
  return nonce === undefined || nonce === '' ? undefined : nonce;
}

/**
 * The Emotion cache of MUI. Emotion adds `<style>` elements at run time: under a policy that limits
 * `style-src` to nonces, each of them must carry the nonce of the response or the browser drops it.
 */
export function createStyleCache(nonce: string | undefined = readCspNonce()): EmotionCache {
  return createCache(nonce === undefined ? { key: 'css' } : { key: 'css', nonce });
}
