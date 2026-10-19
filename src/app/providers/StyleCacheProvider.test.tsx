import Button from '@mui/material/Button';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { StyleCacheProvider } from './StyleCacheProvider';
import { createStyleCache, readCspNonce } from './styleCache';

/** Puts the `<meta>` that the server writes in `index.html`. */
function addNonceMeta(content: string): void {
  const meta = document.createElement('meta');
  meta.setAttribute('property', 'csp-nonce');
  meta.setAttribute('content', content);
  document.head.append(meta);
}

function emotionStyles(): Element[] {
  return [...document.head.querySelectorAll('style[data-emotion]')];
}

afterEach(() => {
  document.head
    .querySelectorAll('meta[property="csp-nonce"], style[data-emotion]')
    .forEach((node) => {
      node.remove();
    });
});

describe('readCspNonce', () => {
  it('is undefined when the page has no nonce', () => {
    expect(readCspNonce()).toBeUndefined();
  });

  it('is undefined when the server left the meta empty, as it does without a policy', () => {
    addNonceMeta('');

    expect(readCspNonce()).toBeUndefined();
  });

  it('is undefined when the meta only holds spaces', () => {
    addNonceMeta('   ');

    expect(readCspNonce()).toBeUndefined();
  });

  it('is the nonce that the server wrote', () => {
    addNonceMeta(' n0nc3-V4lue ');

    expect(readCspNonce()).toBe('n0nc3-V4lue');
  });
});

describe('createStyleCache', () => {
  it('uses the nonce it is given', () => {
    expect(createStyleCache('given').nonce).toBe('given');
  });

  it('reads the nonce of the page by default', () => {
    addNonceMeta('from-page');

    expect(createStyleCache().nonce).toBe('from-page');
  });

  it('has no nonce when there is none', () => {
    expect(createStyleCache().nonce).toBeUndefined();
  });
});

describe('StyleCacheProvider', () => {
  it('stamps every style element that Emotion adds with the nonce of the page', () => {
    addNonceMeta('abc123');

    render(
      <StyleCacheProvider>
        <Button>Guardar</Button>
      </StyleCacheProvider>,
    );

    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
    const styles = emotionStyles();
    expect(styles.length).toBeGreaterThan(0);
    expect(styles.map((style) => style.getAttribute('nonce'))).toEqual(styles.map(() => 'abc123'));
  });

  it('adds no nonce when the page has none', () => {
    render(
      <StyleCacheProvider>
        <Button>Guardar</Button>
      </StyleCacheProvider>,
    );

    const styles = emotionStyles();
    expect(styles.length).toBeGreaterThan(0);
    expect(styles.some((style) => style.hasAttribute('nonce'))).toBe(false);
  });
});
