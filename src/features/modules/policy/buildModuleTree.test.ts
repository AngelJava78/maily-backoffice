import { describe, expect, it } from 'vitest';

import { MODULE_TYPE } from '../schemas/moduleActionCatalog';
import type { SystemModule } from '../schemas/systemModule';
import {
  buildModuleTree,
  flattenModuleTree,
  type ModuleTreeGroup,
  type ModuleTreeRow,
} from './buildModuleTree';

function module(overrides: Partial<SystemModule> = {}): SystemModule {
  return {
    id: 1,
    key: 'patients',
    name: 'Pacientes',
    description: null,
    sortOrder: 10,
    createdAt: '2026-10-22T00:00:00Z',
    statusId: 1,
    typeId: MODULE_TYPE.CLINIC,
    activePermissionsCount: 0,
    parentModule: null,
    actions: new Set(),
    permissionIdByAction: new Map(),
    ...overrides,
  };
}

/** A submodule of `parent`, of the parent's type. */
function sub(
  id: number,
  parent: SystemModule,
  overrides: Partial<SystemModule> = {},
): SystemModule {
  return module({
    id,
    key: `sub_${id}`,
    name: `Submódulo ${id}`,
    typeId: parent.typeId,
    parentModule: { id: parent.id, key: parent.key, name: parent.name },
    ...overrides,
  });
}

function label(row: ModuleTreeRow): string {
  switch (row.kind) {
    case 'module':
      return `module ${row.module.name}`;
    case 'submodule':
      return `sub ${row.module.name}`;
    case 'context':
      return `context(${row.reason}) ${row.parent.name}`;
  }
}

/** The painted rows of every group, one string each, indented by depth. */
function outline(
  groups: readonly ModuleTreeGroup[],
  { collapsed = new Set<number>(), searching = false } = {},
): string[][] {
  return groups.map((group) =>
    flattenModuleTree(group.nodes, { collapsed, searching }).map(
      ({ row, depth }) => `${'  '.repeat(depth)}${label(row)}`,
    ),
  );
}

const NO_SEARCH = { type: 'all', search: '' } as const;

describe('buildModuleTree', () => {
  const patients = module({ id: 1, key: 'patients', name: 'Pacientes', sortOrder: 100 });

  it('shows every submodule right under its parent, and none as a top-level module', () => {
    const list = [
      patients,
      sub(2, patients, { name: 'Expediente clínico', sortOrder: 10 }),
      sub(3, patients, { name: 'Signos vitales', sortOrder: 20 }),
      sub(4, patients, { name: 'Recetas', sortOrder: 30 }),
      sub(5, patients, { name: 'Diagnósticos', sortOrder: 40 }),
    ];

    expect(outline(buildModuleTree(list, NO_SEARCH))).toEqual([
      [
        'module Pacientes',
        '  sub Expediente clínico',
        '  sub Signos vitales',
        '  sub Recetas',
        '  sub Diagnósticos',
      ],
    ]);
  });

  it('keeps the groups by type, Sistema first, and puts each submodule in the group of its parent', () => {
    const reports = module({ id: 7, key: 'reports', name: 'Reportes', typeId: MODULE_TYPE.SYSTEM });
    const list = [patients, sub(2, patients), reports, sub(8, reports, { name: 'Uso' })];

    const groups = buildModuleTree(list, NO_SEARCH);

    expect(groups.map((group) => group.typeId)).toEqual([MODULE_TYPE.SYSTEM, MODULE_TYPE.CLINIC]);
    expect(outline(groups)).toEqual([
      ['module Reportes', '  sub Uso'],
      ['module Pacientes', '  sub Submódulo 2'],
    ]);
  });

  it('leaves out a group that has no rows', () => {
    const groups = buildModuleTree([patients], NO_SEARCH);

    expect(groups.map((group) => group.typeId)).toEqual([MODULE_TYPE.CLINIC]);
  });

  it('orders the top-level modules and the siblings by order and then by name', () => {
    const alfa = module({ id: 2, key: 'alfa', name: 'Alfa', sortOrder: 100 });
    const first = module({ id: 3, key: 'first', name: 'Primero', sortOrder: 5 });
    const list = [
      patients,
      alfa,
      first,
      sub(10, patients, { name: 'Zeta', sortOrder: 1 }),
      sub(11, patients, { name: 'Beta', sortOrder: 1 }),
      sub(12, patients, { name: 'Alfa hija', sortOrder: 0 }),
    ];

    expect(outline(buildModuleTree(list, NO_SEARCH))).toEqual([
      [
        'module Primero',
        'module Alfa',
        'module Pacientes',
        '  sub Alfa hija',
        '  sub Beta',
        '  sub Zeta',
      ],
    ]);
  });

  it('counts the modules and the submodules of each group, and not the context rows', () => {
    const inventory = module({ id: 2, key: 'inventory', name: 'Inventario', sortOrder: 200 });
    const orphan = module({
      id: 9,
      key: 'orphan',
      name: 'Huérfano',
      sortOrder: 50,
      parentModule: { id: 99, key: 'elsewhere', name: 'En otra vista' },
    });
    const list = [patients, sub(3, patients), sub(4, patients), inventory, orphan];

    const [group] = buildModuleTree(list, NO_SEARCH);

    expect(group).toMatchObject({ moduleCount: 2, submoduleCount: 3 });
  });

  it('tells each module how many submodules it has in the loaded list', () => {
    const list = [patients, sub(2, patients), sub(3, patients), module({ id: 4, name: 'Solo' })];

    const rows = buildModuleTree(list, NO_SEARCH).flatMap((group) =>
      flattenModuleTree(group.nodes, { collapsed: new Set(), searching: false }),
    );

    expect(
      rows.map(({ row }) => (row.kind === 'module' ? [row.module.name, row.childCount] : null)),
    ).toEqual(
      expect.arrayContaining([
        ['Pacientes', 2],
        ['Solo', 0],
      ]),
    );
  });

  describe('filter by type', () => {
    const reports = module({ id: 7, key: 'reports', name: 'Reportes', typeId: MODULE_TYPE.SYSTEM });
    const list = [patients, sub(2, patients), reports, sub(8, reports, { name: 'Uso' })];

    it('keeps everything with "all"', () => {
      expect(buildModuleTree(list, { type: 'all', search: '' })).toHaveLength(2);
    });

    it('keeps only the modules of the type, and a submodule never loses its parent', () => {
      expect(outline(buildModuleTree(list, { type: 'clinic', search: '' }))).toEqual([
        ['module Pacientes', '  sub Submódulo 2'],
      ]);
      expect(outline(buildModuleTree(list, { type: 'system', search: '' }))).toEqual([
        ['module Reportes', '  sub Uso'],
      ]);
    });
  });

  describe('search', () => {
    const list = [
      patients,
      sub(2, patients, { key: 'prescriptions', name: 'Recetas' }),
      sub(3, patients, { key: 'vitals', name: 'Signos vitales' }),
      module({ id: 4, key: 'inventory', name: 'Inventario', sortOrder: 200 }),
    ];

    it('shows a parent that matches with all of its submodules', () => {
      expect(outline(buildModuleTree(list, { type: 'all', search: 'pacientes' }))).toEqual([
        ['module Pacientes', '  sub Recetas', '  sub Signos vitales'],
      ]);
    });

    it('shows a parent that does not match as context when one of its submodules does', () => {
      expect(outline(buildModuleTree(list, { type: 'all', search: 'recetas' }))).toEqual([
        ['context(search) Pacientes', '  sub Recetas'],
      ]);
    });

    it('searches the key as well as the name, ignoring case and surrounding spaces', () => {
      expect(outline(buildModuleTree(list, { type: 'all', search: '  VITALS ' }))).toEqual([
        ['context(search) Pacientes', '  sub Signos vitales'],
      ]);
    });

    it('shows nothing for a search that matches nothing', () => {
      expect(buildModuleTree(list, { type: 'all', search: 'zzz' })).toEqual([]);
    });

    it('does not count the context row of the search', () => {
      const [group] = buildModuleTree(list, { type: 'all', search: 'recetas' });

      expect(group).toMatchObject({ moduleCount: 0, submoduleCount: 1 });
    });
  });

  describe('a submodule whose parent is not in the list (another view)', () => {
    const orphan = (id: number, sortOrder: number, name: string) =>
      module({
        id,
        key: `orphan_${id}`,
        name,
        sortOrder,
        statusId: 2,
        parentModule: { id: 99, key: 'patients', name: 'Pacientes' },
      });

    it('goes under a context row of its parent, built from its own reference to it', () => {
      expect(outline(buildModuleTree([orphan(5, 10, 'Recetas')], NO_SEARCH))).toEqual([
        ['context(otherView) Pacientes', '  sub Recetas'],
      ]);
    });

    it('groups the submodules of the same missing parent under one context row', () => {
      expect(
        outline(buildModuleTree([orphan(5, 10, 'Recetas'), orphan(6, 20, 'Vitales')], NO_SEARCH)),
      ).toEqual([['context(otherView) Pacientes', '  sub Recetas', '  sub Vitales']]);
    });

    it('places the context row among the top-level modules by the least order of its submodules', () => {
      const first = module({ id: 1, key: 'first', name: 'Primero', sortOrder: 5 });
      const last = module({ id: 2, key: 'last', name: 'Último', sortOrder: 500 });

      expect(outline(buildModuleTree([last, orphan(5, 100, 'Recetas'), first], NO_SEARCH))).toEqual(
        [['module Primero', 'context(otherView) Pacientes', '  sub Recetas', 'module Último']],
      );
    });

    it('shows, under the search, only the submodules that match', () => {
      expect(
        outline(
          buildModuleTree([orphan(5, 10, 'Recetas'), orphan(6, 20, 'Vitales')], {
            type: 'all',
            search: 'vitales',
          }),
        ),
      ).toEqual([['context(otherView) Pacientes', '  sub Vitales']]);
    });

    it('is not a module of the group: it is not counted', () => {
      const [group] = buildModuleTree([orphan(5, 10, 'Recetas')], NO_SEARCH);

      expect(group).toMatchObject({ moduleCount: 0, submoduleCount: 1 });
    });
  });

  describe('unexpected data', () => {
    it('shows a submodule whose parent is a submodule under its direct parent', () => {
      const child = sub(2, patients, { name: 'Hija' });
      const grandchild = sub(3, child, { name: 'Nieta' });

      expect(outline(buildModuleTree([patients, child, grandchild], NO_SEARCH))).toEqual([
        ['module Pacientes', '  sub Hija', '    sub Nieta'],
      ]);
    });

    it('does not fail with a cycle, and shows each module once', () => {
      const a = module({
        id: 1,
        name: 'A',
        parentModule: { id: 2, key: 'b', name: 'B' },
      });
      const b = module({
        id: 2,
        key: 'b',
        name: 'B',
        parentModule: { id: 1, key: 'a', name: 'A' },
      });

      const rows = outline(buildModuleTree([a, b], NO_SEARCH)).flat();

      expect(rows.map((row) => row.trim()).sort()).toEqual(['sub A', 'sub B']);
    });
  });
});

describe('flattenModuleTree', () => {
  const patients = module({ id: 1, key: 'patients', name: 'Pacientes', sortOrder: 100 });
  const list = [
    patients,
    sub(2, patients, { name: 'Recetas', sortOrder: 1 }),
    sub(3, patients, { name: 'Vitales', sortOrder: 2 }),
    module({ id: 4, key: 'inventory', name: 'Inventario', sortOrder: 200 }),
  ];
  const [group] = buildModuleTree(list, NO_SEARCH);

  it('gives the depth of each row', () => {
    const rows = flattenModuleTree(group?.nodes ?? [], { collapsed: new Set(), searching: false });

    expect(rows.map(({ depth }) => depth)).toEqual([0, 1, 1, 0]);
  });

  it('leaves out the descendants of a collapsed module, and nothing else', () => {
    expect(outline(group === undefined ? [] : [group], { collapsed: new Set([1]) })).toEqual([
      ['module Pacientes', 'module Inventario'],
    ]);
  });

  it('ignores what is collapsed while a search is active', () => {
    expect(
      outline(group === undefined ? [] : [group], { collapsed: new Set([1]), searching: true }),
    ).toEqual([['module Pacientes', '  sub Recetas', '  sub Vitales', 'module Inventario']]);
  });

  it('never collapses a context row', () => {
    const orphan = module({
      id: 5,
      name: 'Recetas',
      parentModule: { id: 99, key: 'patients', name: 'Pacientes' },
    });
    const [contextGroup] = buildModuleTree([orphan], NO_SEARCH);

    expect(
      outline(contextGroup === undefined ? [] : [contextGroup], { collapsed: new Set([99]) }),
    ).toEqual([['context(otherView) Pacientes', '  sub Recetas']]);
  });
});
