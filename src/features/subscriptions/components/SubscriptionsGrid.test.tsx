import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';
import { subscriptionDto } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

import { subscriptionSchema, type Subscription } from '../schemas/subscription';
import { SubscriptionsGrid } from './SubscriptionsGrid';

const text = messages.subscriptions.list;

function tenSubscriptions(): Subscription[] {
  return Array.from({ length: 10 }, (_, index) =>
    subscriptionSchema.parse(
      subscriptionDto({
        id: index + 1,
        name: `Plan ${index + 1}`,
        monthly_price: index === 0 ? '4500.00' : `${(index + 1) * 100}.00`,
        status: index === 1 ? { id: 3, name: 'Bloqueada' } : { id: 1, name: 'Activa' },
        clinics_count: index === 2 ? null : index,
      }),
    ),
  );
}

/** The row of the grid that holds the link with this name. */
function rowOf(name: string): HTMLElement {
  const row = screen.getByRole('link', { name }).closest<HTMLElement>('[role="row"]');
  if (row === null) {
    throw new Error(`There is no row for ${name}`);
  }
  return row;
}

function renderGrid(props: Partial<Parameters<typeof SubscriptionsGrid>[0]> = {}) {
  const onPaginationChange = vi.fn<(page: number, pageSize: number) => void>();
  const view = renderWithProviders(
    <SubscriptionsGrid
      subscriptions={tenSubscriptions()}
      total={20}
      page={1}
      pageSize={10}
      loading={false}
      listSearch="?page=2&page_size=25"
      onPaginationChange={onPaginationChange}
      {...props}
    />,
  );
  return { ...view, onPaginationChange };
}

describe('SubscriptionsGrid', () => {
  it('shows the name, the monthly price, the status and the clinics of each subscription', () => {
    renderGrid();

    const grid = screen.getByRole('grid', { name: text.gridLabel });
    expect(
      within(grid)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual([
      text.columns.name,
      text.columns.monthlyPrice,
      text.columns.status,
      text.columns.clinics,
    ]);
  });

  it('shows the price in Mexican pesos per month', () => {
    renderGrid();

    expect(within(rowOf('Plan 1')).getByText('$4,500.00/mes')).toBeInTheDocument();
    expect(within(rowOf('Plan 2')).getByText('$200.00/mes')).toBeInTheDocument();
  });

  it('shows the status as a text', () => {
    renderGrid();

    expect(screen.getAllByText(messages.subscriptions.status.active)).toHaveLength(9);
    expect(screen.getByText(messages.subscriptions.status.blocked)).toBeInTheDocument();
  });

  it('shows the clinics, and «No disponible» but never 0 when they are not known', () => {
    renderGrid();

    const unknown = within(rowOf('Plan 3'));
    expect(unknown.getByText(messages.subscriptions.clinics.notAvailable)).toBeInTheDocument();
    expect(unknown.queryByText('0')).not.toBeInTheDocument();
    expect(within(rowOf('Plan 1')).getByText('0')).toBeInTheDocument();
  });

  it('links the name to the detail, carrying the search of the list to come back to it (US1-8)', async () => {
    const { user, router } = renderGrid();
    const link = screen.getByRole('link', { name: 'Plan 1' });
    expect(link).toHaveAttribute('href', '/subscriptions/1');

    await user.click(link);

    expect(router.state.location.pathname).toBe('/subscriptions/1');
    expect(router.state.location.state).toEqual({ listSearch: '?page=2&page_size=25' });
  });

  it('has the footer in Spanish with the total it receives', () => {
    renderGrid();

    expect(screen.getByText(/filas por página/i)).toBeInTheDocument();
    expect(screen.getByText('1–10 de 20')).toBeInTheDocument();
  });

  it('asks for the next page, counting from 1 outside the grid', async () => {
    const { user, onPaginationChange } = renderGrid();

    await user.click(screen.getByRole('button', { name: 'Ir a la página siguiente' }));

    expect(onPaginationChange).toHaveBeenCalledWith(2, 10);
  });

  it('offers 10, 25 and 50 subscriptions per page', async () => {
    const { user, onPaginationChange } = renderGrid();

    await user.click(screen.getByLabelText(/filas por página/i));
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      '10',
      '25',
      '50',
    ]);
    await user.click(screen.getByRole('option', { name: '25' }));

    expect(onPaginationChange).toHaveBeenCalledWith(1, 25);
  });

  it('neither sorts nor has a menu of columns: the order is fixed', async () => {
    const { user } = renderGrid();
    const header = screen.getByRole('columnheader', { name: text.columns.monthlyPrice });
    const namesBefore = screen.getAllByRole('link').map((link) => link.textContent);
    const sortBefore = header.getAttribute('aria-sort');

    await user.click(header);
    await user.click(header);

    expect(header.getAttribute('aria-sort')).toBe(sortBefore);
    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual(namesBefore);
    expect(screen.queryByRole('button', { name: /menú|ordenar/i })).not.toBeInTheDocument();
  });

  it('does not dim any row: only the chip tells the status (WCAG 1.4.3)', () => {
    renderGrid();

    for (const row of screen.getAllByRole('row')) {
      expect(getComputedStyle(row).opacity).not.toMatch(/^0\./);
    }
  });

  it('indicates that it is loading', () => {
    renderGrid({ loading: true });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows the empty state with the action it is given when there are no subscriptions', () => {
    renderGrid({
      subscriptions: [],
      total: 0,
      emptyAction: <button type="button">Nueva suscripción</button>,
    });

    expect(screen.getByText(text.empty)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nueva suscripción' })).toBeInTheDocument();
  });

  it('shows the empty state alone when it has no action to offer', () => {
    renderGrid({ subscriptions: [], total: 0 });

    expect(screen.getByText(text.empty)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nueva suscripción' })).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderGrid();

    expect(await axe(container)).toHaveNoViolations();
  });
});
