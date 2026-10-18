import { screen, within } from '@testing-library/react';
import { Outlet, type RouteObject } from 'react-router';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';

import { logger } from '@/shared/lib/logger';
import { messages } from '@/shared/messages/es';
import { renderWithProviders } from '@/test/renderWithProviders';

import { RouteErrorBoundary } from './RouteErrorBoundary';
import { appRoutes } from './routes';

function Layout() {
  return (
    <>
      <header>Header of the layout</header>
      <Outlet />
    </>
  );
}

function BrokenPage(): never {
  throw new Error('page failed');
}

function renderBrokenPage() {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const logged = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
  const routes: RouteObject[] = [
    {
      Component: Layout,
      children: [{ path: '/', Component: BrokenPage, ErrorBoundary: RouteErrorBoundary }],
    },
  ];
  return { logged, ...renderWithProviders(routes) };
}

function pageRoutes(routes: readonly RouteObject[]): RouteObject[] {
  return routes.flatMap((route) => [
    ...(route.path !== undefined || route.index === true ? [route] : []),
    ...pageRoutes(route.children ?? []),
  ]);
}

describe('RouteErrorBoundary', () => {
  it('shows a friendly error where the page was, keeping the layout around it', () => {
    renderBrokenPage();

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(messages.errors.routeTitle);
    expect(alert).toHaveTextContent(messages.errors.unexpected);
    expect(screen.getByText('Header of the layout')).toBeInTheDocument();
  });

  it('logs the error through the logger without any data of the person', () => {
    const { logged } = renderBrokenPage();

    expect(logged).toHaveBeenCalled();
    const call = logged.mock.calls[0];
    expect(call?.[0]).toEqual(expect.any(String));
    expect(call?.[1]).toHaveProperty('error.message', 'page failed');
    expect(Object.keys(call?.[1] ?? {})).toEqual(['error']);
  });

  it('has no accessibility violations', async () => {
    const { container } = renderBrokenPage();

    expect(await axe(container)).toHaveNoViolations();
    expect(within(container).getByRole('alert')).toBeInTheDocument();
  });
});

describe('the routes of the application', () => {
  it('define a route error boundary at the root and in every page', () => {
    expect(appRoutes).toHaveLength(1);
    expect(appRoutes[0]?.ErrorBoundary).toBe(RouteErrorBoundary);

    const pages = pageRoutes(appRoutes);
    expect(pages.length).toBeGreaterThan(0);
    for (const page of pages) {
      expect(page.ErrorBoundary, `route ${page.path ?? 'index'}`).toBe(RouteErrorBoundary);
    }
  });
});
