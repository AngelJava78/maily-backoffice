import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';
import { monitoredComponentDto } from '@/test/factories';
import { uuidOf } from '@/test/ids';
import { renderWithProviders } from '@/test/renderWithProviders';

import { monitoredComponentSchema, type MonitoredComponent } from '../schemas/monitoredComponent';
import { ComponentsGrid } from './ComponentsGrid';

const text = messages.health.registry;

/** `count` registered components, the second a frontend and the third disabled. */
function componentsOf(count: number): MonitoredComponent[] {
  return Array.from({ length: count }, (_, index) =>
    monitoredComponentSchema.parse(
      monitoredComponentDto({
        id: uuidOf(100 + index),
        code: `servicio-${String(index + 1)}`,
        name: `Servicio ${String(index + 1)}`,
        sort_order: index,
        ...(index === 1 ? { kind: 'frontend', ready_path: null } : {}),
        ...(index === 2 ? { enabled: false } : {}),
      }),
    ),
  );
}

function rowOf(name: string): HTMLElement {
  const row = screen.getByRole('link', { name }).closest<HTMLElement>('[role="row"]');
  if (row === null) {
    throw new Error(`There is no row for ${name}`);
  }
  return row;
}

function renderGrid(props: Partial<Parameters<typeof ComponentsGrid>[0]> = {}) {
  const onPaginationChange = vi.fn<(page: number, pageSize: number) => void>();
  const view = renderWithProviders(
    <ComponentsGrid
      components={componentsOf(10)}
      total={30}
      page={1}
      pageSize={10}
      loading={false}
      onPaginationChange={onPaginationChange}
      {...props}
    />,
  );
  return { ...view, onPaginationChange };
}

describe('ComponentsGrid', () => {
  it('shows the name, the code, the kind, the base URL, whether it is enabled and the order', () => {
    renderGrid();

    const grid = screen.getByRole('grid', { name: text.gridLabel });
    expect(
      within(grid)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual([
      text.columns.name,
      text.columns.code,
      text.columns.kind,
      text.columns.baseUrl,
      text.columns.enabled,
      text.columns.sortOrder,
    ]);
    const first = within(rowOf('Servicio 1'));
    expect(first.getByText('servicio-1')).toBeInTheDocument();
    expect(first.getByText('Microservicio')).toBeInTheDocument();
    expect(first.getByText(text.enabled)).toBeInTheDocument();
    expect(within(rowOf('Servicio 2')).getByText('Frontend')).toBeInTheDocument();
    expect(within(rowOf('Servicio 3')).getByText(text.disabled)).toBeInTheDocument();
  });

  it('shows the base URL as a text, never as a link (FR-007)', () => {
    renderGrid();

    const row = within(rowOf('Servicio 1'));
    expect(row.getByText('http://mailysoft-usuarios:8000')).toBeInTheDocument();
    expect(row.getAllByRole('link')).toHaveLength(1);
  });

  it('links the name to the detail', () => {
    renderGrid();

    expect(screen.getByRole('link', { name: 'Servicio 1' })).toHaveAttribute(
      'href',
      `/health/components/${uuidOf(100)}`,
    );
  });

  it('keeps the order received', () => {
    renderGrid();

    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual(
      componentsOf(10).map((component) => component.name),
    );
  });

  it('never shows more rows than the size of the page, with the total and the controls in Spanish', () => {
    renderGrid();

    expect(screen.getAllByRole('link')).toHaveLength(10);
    expect(screen.getByText(/filas por página/i)).toBeInTheDocument();
    expect(screen.getByText('1–10 de 30')).toBeInTheDocument();
  });

  it('asks for the next page, counting from 1 outside the grid', async () => {
    const { user, onPaginationChange } = renderGrid();

    await user.click(screen.getByRole('button', { name: 'Ir a la página siguiente' }));

    expect(onPaginationChange).toHaveBeenCalledWith(2, 10);
  });

  it('offers 10, 25 and 50 components per page', async () => {
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

  it('says there is nothing registered yet when there are no components, accessibly', async () => {
    const { container } = renderGrid({ components: [], total: 0 });

    expect(screen.getByText(text.empty)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderGrid();

    expect(await axe(container)).toHaveNoViolations();
  });
});
