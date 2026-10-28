import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';
import { subscriptionDto } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

import { subscriptionSchema, type Subscription } from '../schemas/subscription';
import { DEFAULT_SORT, type SubscriptionsSort } from '../schemas/subscriptionsLocation';
import { SubscriptionsGrid } from './SubscriptionsGrid';

const text = messages.subscriptions.list;

function tenSubscriptions(): Subscription[] {
  return Array.from({ length: 10 }, (_, index) =>
    subscriptionSchema.parse(
      subscriptionDto({
        id: index + 1,
        name: `Plan ${index + 1}`,
        subscription_type:
          index === 3 ? { id: 2, name: 'Empresarial' } : { id: 1, name: 'Individual' },
        monthly_price: index === 0 ? '4500.00' : `${(index + 1) * 100}.00`,
        annual_price: index === 0 ? '45000.00' : `${(index + 1) * 1000}.00`,
        consulting_rooms_limit: index + 1,
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
  const onSortChange = vi.fn<(sort: SubscriptionsSort) => void>();
  const view = renderWithProviders(
    <SubscriptionsGrid
      subscriptions={tenSubscriptions()}
      total={20}
      page={1}
      pageSize={10}
      loading={false}
      listSearch="?page=2&page_size=25"
      sort={DEFAULT_SORT}
      onSortChange={onSortChange}
      onPaginationChange={onPaginationChange}
      {...props}
    />,
  );
  return { ...view, onPaginationChange, onSortChange };
}

describe('SubscriptionsGrid', () => {
  it('shows the seven columns, in order: Nombre, Tipo, Clínicas, Consultorios, Precio mensual, Precio anual, Estatus (020, FR-004)', () => {
    renderGrid();

    const grid = screen.getByRole('grid', { name: text.gridLabel });
    expect(
      within(grid)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual([
      text.columns.name,
      text.columns.subscriptionType,
      text.columns.clinics,
      text.columns.consultingRoomsLimit,
      text.columns.monthlyPrice,
      text.columns.annualPrice,
      text.columns.status,
    ]);
  });

  it('shows the subscription type of each row (020)', () => {
    renderGrid();

    expect(within(rowOf('Plan 1')).getByText('Individual')).toBeInTheDocument();
    expect(within(rowOf('Plan 4')).getByText('Empresarial')).toBeInTheDocument();
  });

  it('shows the consulting rooms limit of each row (020)', () => {
    renderGrid();

    expect(within(rowOf('Plan 1')).getByText('1')).toBeInTheDocument();
    expect(within(rowOf('Plan 2')).getByText('2')).toBeInTheDocument();
  });

  it('shows the price in Mexican pesos per month', () => {
    renderGrid();

    expect(within(rowOf('Plan 1')).getByText('$4,500.00/mes')).toBeInTheDocument();
    expect(within(rowOf('Plan 2')).getByText('$200.00/mes')).toBeInTheDocument();
  });

  it('shows the annual price in Mexican pesos per year, with the same format as the monthly price (020)', () => {
    renderGrid();

    expect(within(rowOf('Plan 1')).getByText('$45,000.00/año')).toBeInTheDocument();
    expect(within(rowOf('Plan 2')).getByText('$2,000.00/año')).toBeInTheDocument();
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

  const columnHeader = (name: string) =>
    screen.getByRole('columnheader', { name: new RegExp(`^${name}`) });

  it('opens sorted as its sort prop says, and is reorderable by any column (020, FR-006)', () => {
    renderGrid({ sort: { field: 'monthlyPrice', direction: 'asc' } });

    expect(columnHeader(text.columns.monthlyPrice).getAttribute('aria-sort')).toBe('ascending');
    expect(columnHeader(text.columns.annualPrice).getAttribute('aria-sort')).toBe('none');
  });

  it('asks to sort by another column, ascending, on its first click (020)', async () => {
    const { user, onSortChange } = renderGrid({ sort: DEFAULT_SORT });

    await user.click(columnHeader(text.columns.annualPrice));

    expect(onSortChange).toHaveBeenCalledWith({ field: 'annualPrice', direction: 'asc' });
  });

  it('asks to flip the direction of the sorted column on a second click, never reaching an unsorted state (020)', async () => {
    const { user, onSortChange } = renderGrid({
      sort: { field: 'annualPrice', direction: 'asc' },
    });

    await user.click(columnHeader(text.columns.annualPrice));

    expect(onSortChange).toHaveBeenCalledWith({ field: 'annualPrice', direction: 'desc' });
  });

  it('has no menu of columns', () => {
    renderGrid();

    expect(screen.queryByRole('button', { name: /menú/i })).not.toBeInTheDocument();
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
