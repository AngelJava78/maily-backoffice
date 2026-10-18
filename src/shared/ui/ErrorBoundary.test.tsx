import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { logger } from '@/shared/lib/logger';

import { ErrorBoundary } from './ErrorBoundary';

function Bomb(): never {
  throw new Error('render failed');
}

describe('ErrorBoundary', () => {
  it('renders its children while nothing fails', () => {
    render(
      <ErrorBoundary fallback={<p>Fallback</p>}>
        <p>Content</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.queryByText('Fallback')).not.toBeInTheDocument();
  });

  it('shows the fallback and logs the error when a child throws', () => {
    // React reports caught errors through console.error as well.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const logged = vi.spyOn(logger, 'error').mockImplementation(() => undefined);

    render(
      <ErrorBoundary fallback={<p>Fallback</p>}>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Fallback')).toBeInTheDocument();
    expect(logged).toHaveBeenCalledOnce();
    const call = logged.mock.calls[0];
    expect(call?.[0]).toEqual(expect.any(String));
    expect(call?.[1]).toHaveProperty('error.message', 'render failed');
  });

  it('keeps what is outside of the boundary working', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(logger, 'error').mockImplementation(() => undefined);

    render(
      <>
        <header>Header</header>
        <ErrorBoundary fallback={<p>Fallback</p>}>
          <Bomb />
        </ErrorBoundary>
      </>,
    );

    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Fallback')).toBeInTheDocument();
  });
});
