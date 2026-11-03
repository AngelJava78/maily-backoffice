import { MODULE_TYPE, type ModuleTypeId } from '../schemas/moduleActionCatalog';
import type { ModulesTypeFilter } from '../schemas/modulesLocation';
import type { ParentModuleRef, SystemModule } from '../schemas/systemModule';

/**
 * One row of the tree (data-model.md §3). A `context` row is the dimmed row of a parent that is
 * shown only to place a submodule: because the parent is not in the view (`otherView`, FR-009) or
 * because it does not match the search while one of its submodules does (`search`, FR-008).
 */
export type ModuleTreeRow =
  | { readonly kind: 'module'; readonly module: SystemModule; readonly childCount: number }
  | {
      readonly kind: 'submodule';
      readonly module: SystemModule;
      readonly childCount: number;
      readonly parent: ParentModuleRef;
    }
  | {
      readonly kind: 'context';
      readonly parent: ParentModuleRef;
      readonly reason: 'otherView' | 'search';
      readonly childCount: number;
    };

export interface ModuleTreeNode {
  readonly row: ModuleTreeRow;
  readonly children: readonly ModuleTreeNode[];
}

export interface ModuleTreeGroup {
  readonly typeId: ModuleTypeId;
  /** The real top-level modules of the group; context rows are not counted (FR-007). */
  readonly moduleCount: number;
  readonly submoduleCount: number;
  readonly nodes: readonly ModuleTreeNode[];
}

/** A row ready to be painted, with how deep it is in the tree (0 = top level). */
export interface ModuleTreeFlatRow {
  readonly row: ModuleTreeRow;
  readonly depth: number;
}

/** `full`: show everything under the node; `search`: only what matches the search (and its parents). */
type BuildMode = 'full' | 'search';

interface RootEntry {
  readonly node: ModuleTreeNode;
  readonly typeId: number;
  readonly sortOrder: number;
  readonly name: string;
}

function compareModules(a: SystemModule, b: SystemModule): number {
  return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'es');
}

function matchesType(module: SystemModule, type: ModulesTypeFilter): boolean {
  if (type === 'all') {
    return true;
  }
  return module.typeId === (type === 'system' ? MODULE_TYPE.SYSTEM : MODULE_TYPE.CLINIC);
}

function countRows(nodes: readonly ModuleTreeNode[]): { modules: number; submodules: number } {
  return nodes.reduce(
    (total, { row, children }) => {
      const below = countRows(children);
      return {
        modules: total.modules + below.modules + (row.kind === 'module' ? 1 : 0),
        submodules: total.submodules + below.submodules + (row.kind === 'submodule' ? 1 : 0),
      };
    },
    { modules: 0, submodules: 0 },
  );
}

/**
 * The catalog as a hierarchical tree, grouped by type (Sistema first): every submodule right under
 * its parent, with the type filter and the search applied without ever separating a submodule from
 * its parent (FR-001, FR-002, FR-005, FR-007 to FR-009; research D1, D3). Pure: the same list gives
 * the same tree.
 *
 * The service sends one level only, but an unexpected list (a submodule whose parent is itself a
 * submodule, even a cycle) is shown without failing: each module appears once.
 */
export function buildModuleTree(
  modules: readonly SystemModule[],
  { type, search }: { readonly type: ModulesTypeFilter; readonly search: string },
): ModuleTreeGroup[] {
  const typed = modules.filter((module) => matchesType(module, type));
  const loadedIds = new Set(typed.map((module) => module.id));
  const childrenOf = new Map<number, SystemModule[]>();
  for (const module of typed) {
    if (module.parentModule !== null) {
      childrenOf.set(module.parentModule.id, [
        ...(childrenOf.get(module.parentModule.id) ?? []),
        module,
      ]);
    }
  }
  for (const siblings of childrenOf.values()) {
    siblings.sort(compareModules);
  }

  const needle = search.trim().toLowerCase();
  const matches = (module: SystemModule): boolean =>
    needle === '' ||
    module.name.toLowerCase().includes(needle) ||
    module.key.toLowerCase().includes(needle);
  const placed = new Set<number>();

  function build(module: SystemModule, mode: BuildMode): ModuleTreeNode | null {
    placed.add(module.id);
    const allKids = childrenOf.get(module.id) ?? [];
    // A module that matches shows all of its submodules (FR-008); one that does not, only the ones that do.
    const ownMode: BuildMode = mode === 'full' || matches(module) ? 'full' : 'search';
    const children = allKids
      .filter((kid) => !placed.has(kid.id))
      .flatMap((kid) => {
        const node = build(kid, ownMode);
        return node === null ? [] : [node];
      });
    if (ownMode === 'search') {
      if (children.length === 0) {
        return null;
      }
      const { id, key, name } = module;
      return {
        row: {
          kind: 'context',
          parent: { id, key, name },
          reason: 'search',
          childCount: children.length,
        },
        children,
      };
    }
    const row: ModuleTreeRow =
      module.parentModule === null
        ? { kind: 'module', module, childCount: allKids.length }
        : { kind: 'submodule', module, childCount: allKids.length, parent: module.parentModule };
    return { row, children };
  }

  const rootMode: BuildMode = needle === '' ? 'full' : 'search';
  const entries: RootEntry[] = [];

  const roots = typed.filter((module) => module.parentModule === null);
  for (const root of roots) {
    const node = build(root, rootMode);
    if (node !== null) {
      entries.push({ node, typeId: root.typeId, sortOrder: root.sortOrder, name: root.name });
    }
  }

  // Submodules whose parent is not in the list (it belongs to another view): grouped under a context row.
  const orphansByParent = new Map<number, SystemModule[]>();
  for (const module of typed) {
    if (module.parentModule !== null && !loadedIds.has(module.parentModule.id)) {
      orphansByParent.set(module.parentModule.id, [
        ...(orphansByParent.get(module.parentModule.id) ?? []),
        module,
      ]);
    }
  }
  for (const orphans of orphansByParent.values()) {
    const [first] = orphans;
    const parent = first?.parentModule ?? null;
    if (first === undefined || parent === null) {
      continue;
    }
    const children = orphans.flatMap((orphan) => {
      const node = build(orphan, rootMode);
      return node === null ? [] : [node];
    });
    if (children.length > 0) {
      entries.push({
        node: {
          row: { kind: 'context', parent, reason: 'otherView', childCount: children.length },
          children,
        },
        typeId: first.typeId,
        sortOrder: Math.min(...orphans.map((orphan) => orphan.sortOrder)),
        name: parent.name,
      });
    }
  }
  entries.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'es'));

  // A cycle has no top-level module to start from: whatever no root reaches goes at the end, once.
  const reachable = new Set<number>();
  const pending = typed.filter(
    (module) => module.parentModule === null || !loadedIds.has(module.parentModule.id),
  );
  while (pending.length > 0) {
    const next = pending.pop();
    if (next !== undefined && !reachable.has(next.id)) {
      reachable.add(next.id);
      pending.push(...(childrenOf.get(next.id) ?? []));
    }
  }
  for (const stray of typed.filter((module) => !reachable.has(module.id))) {
    const node = placed.has(stray.id) ? null : build(stray, rootMode);
    if (node !== null) {
      entries.push({ node, typeId: stray.typeId, sortOrder: stray.sortOrder, name: stray.name });
    }
  }

  return [MODULE_TYPE.SYSTEM, MODULE_TYPE.CLINIC].flatMap((typeId) => {
    const nodes = entries.filter((entry) => entry.typeId === typeId).map((entry) => entry.node);
    if (nodes.length === 0) {
      return [];
    }
    const { modules: moduleCount, submodules: submoduleCount } = countRows(nodes);
    return [{ typeId, moduleCount, submoduleCount, nodes }];
  });
}

/**
 * The tree as a flat list of rows to paint. The descendants of a collapsed module are left out,
 * except while a search is active: then everything shows (FR-004). A context row never collapses.
 */
export function flattenModuleTree(
  nodes: readonly ModuleTreeNode[],
  {
    collapsed,
    searching,
  }: { readonly collapsed: ReadonlySet<number>; readonly searching: boolean },
): ModuleTreeFlatRow[] {
  const rows: ModuleTreeFlatRow[] = [];
  function visit(node: ModuleTreeNode, depth: number): void {
    rows.push({ row: node.row, depth });
    const folded = !searching && node.row.kind !== 'context' && collapsed.has(node.row.module.id);
    if (!folded) {
      node.children.forEach((child) => {
        visit(child, depth + 1);
      });
    }
  }
  nodes.forEach((node) => {
    visit(node, 0);
  });
  return rows;
}
