import { CacheProvider } from '@emotion/react';
import { useState, type ReactNode } from 'react';

import { createStyleCache } from './styleCache';

/**
 * Gives MUI an Emotion cache whose `<style>` elements carry the nonce of the Content Security
 * Policy of the page, when it has one. It wraps everything the application renders.
 */
export function StyleCacheProvider({ children }: { readonly children: ReactNode }) {
  const [cache] = useState(() => createStyleCache());

  return <CacheProvider value={cache}>{children}</CacheProvider>;
}
