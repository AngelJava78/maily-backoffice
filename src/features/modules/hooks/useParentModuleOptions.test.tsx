import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { catalogModule, createModulesCatalogMock } from '@/test/handlers/modulesCatalog';
import { renderWithProviders } from '@/test/renderWithProviders';

import { MODULE_TYPE, type ModuleTypeId } from '../schemas/moduleActionCatalog';
import { useParentModuleOptions } from './useParentModuleOptions';

function Options({
  typeId,
  excludeModuleId = null,
}: {
  readonly typeId: ModuleTypeId;
  readonly excludeModuleId?: number | null;
}) {
  const { options, isLoading, isError } = useParentModuleOptions({ typeId, excludeModuleId });
  return (
    <div>
      <p>{isLoading ? 'loading' : 'loaded'}</p>
      <p>{isError ? 'error' : 'no error'}</p>
      <ul aria-label="options">
        {options.map((option) => (
          <li key={option.id}>{option.key}</li>
        ))}
      </ul>
    </div>
  );
}

function optionKeys(): string[] {
  return screen
    .queryAllByRole('listitem')
    .map((item) => item.textContent)
    .filter((text) => text !== '');
}

describe('useParentModuleOptions', () => {
  function seed() {
    const mock = createModulesCatalogMock({ initial: { modules: [], permissions: [] } });
    mock.addModule(catalogModule({ id: 1, key: 'patients', name: 'Pacientes', sortOrder: 20 }));
    mock.addModule(catalogModule({ id: 2, key: 'inventory', name: 'Inventario', sortOrder: 10 }));
    mock.addModule(catalogModule({ id: 3, key: 'prescriptions', parentModuleId: 1 }));
    mock.addModule(catalogModule({ id: 4, key: 'reports', typeId: MODULE_TYPE.SYSTEM }));
    mock.addModule(catalogModule({ id: 5, key: 'users', typeId: MODULE_TYPE.SYSTEM }));
    mock.addModule(catalogModule({ id: 6, key: 'blocked_one', statusId: 2 }));
    return mock;
  }

  it('offers the Active top-level modules of the type, in order', async () => {
    seed();
    renderWithProviders(<Options typeId={MODULE_TYPE.CLINIC} />);

    await screen.findByText('loaded');
    expect(optionKeys()).toEqual(['inventory', 'patients']);
  });

  it('follows the type: other options for Sistema, and never a base module', async () => {
    seed();
    renderWithProviders(<Options typeId={MODULE_TYPE.SYSTEM} />);

    await screen.findByText('loaded');
    expect(optionKeys()).toEqual(['reports']);
  });

  it('leaves out the module being edited', async () => {
    seed();
    renderWithProviders(<Options typeId={MODULE_TYPE.CLINIC} excludeModuleId={2} />);

    await screen.findByText('loaded');
    expect(optionKeys()).toEqual(['patients']);
  });

  it('does not offer a Blocked module, nor a submodule', async () => {
    seed();
    renderWithProviders(<Options typeId={MODULE_TYPE.CLINIC} />);

    await screen.findByText('loaded');
    expect(optionKeys()).not.toContain('blocked_one');
    expect(optionKeys()).not.toContain('prescriptions');
  });

  it('says it is loading, and then that it is not', async () => {
    seed();
    renderWithProviders(<Options typeId={MODULE_TYPE.CLINIC} />);

    expect(screen.getByText('loading')).toBeInTheDocument();
    expect(await screen.findByText('loaded')).toBeInTheDocument();
  });

  it('reports an error when the catalog cannot be loaded and there is nothing to offer', async () => {
    const mock = seed();
    mock.failAll(500);
    renderWithProviders(<Options typeId={MODULE_TYPE.CLINIC} />);

    expect(await screen.findByText('error')).toBeInTheDocument();
    expect(optionKeys()).toEqual([]);
  });
});
