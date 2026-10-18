import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';

import { useDocumentTitle } from './useDocumentTitle';

describe('useDocumentTitle', () => {
  it('names the document after the screen and the application (WCAG 2.4.2)', () => {
    renderHook(() => {
      useDocumentTitle('Mi perfil');
    });

    expect(document.title).toBe(`Mi perfil — ${messages.common.appName}`);
  });

  it('uses the name of the application alone when the screen has no title', () => {
    document.title = 'Something else';

    renderHook(() => {
      useDocumentTitle(undefined);
    });

    expect(document.title).toBe(messages.common.appName);
  });

  it('follows the title when the screen changes it', () => {
    const initialProps: { title: string | undefined } = { title: 'Inicio' };
    const { rerender } = renderHook(
      ({ title }: { title: string | undefined }) => {
        useDocumentTitle(title);
      },
      { initialProps },
    );
    expect(document.title).toBe(`Inicio — ${messages.common.appName}`);

    rerender({ title: 'Mi perfil' });
    expect(document.title).toBe(`Mi perfil — ${messages.common.appName}`);

    rerender({ title: undefined });
    expect(document.title).toBe(messages.common.appName);
  });
});
