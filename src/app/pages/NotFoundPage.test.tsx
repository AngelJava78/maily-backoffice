import { screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import { renderWithProviders } from '@/test/renderWithProviders';

import { NotFoundPage } from './NotFoundPage';

describe('NotFoundPage', () => {
  it('says the address does not exist and offers a way back (FR-016)', () => {
    renderWithProviders(
      [
        { path: '/', element: <p>Home screen</p> },
        { path: '*', element: <NotFoundPage /> },
      ],
      { route: '/does-not-exist' },
    );

    const heading = screen.getByRole('heading', { level: 1, name: messages.notFound.title });
    expect(heading).toHaveFocus();
    expect(screen.getByText(messages.notFound.message)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: messages.notFound.backHome })).toHaveAttribute(
      'href',
      '/',
    );
  });

  it('takes the person to the home page with the link', async () => {
    const { user, router } = renderWithProviders(
      [
        { path: '/', element: <p>Home screen</p> },
        { path: '*', element: <NotFoundPage /> },
      ],
      { route: '/does-not-exist' },
    );

    await user.click(screen.getByRole('link', { name: messages.notFound.backHome }));

    expect(router.state.location.pathname).toBe('/');
    expect(screen.getByText('Home screen')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderWithProviders(<NotFoundPage />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
