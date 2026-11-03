import { useState } from 'react';

export interface CollapsedModulesApi {
  /** The ids of the modules whose submodules the person collapsed. Nothing is collapsed at first. */
  readonly collapsed: ReadonlySet<number>;
  /** Collapses the module if it was expanded, and expands it if it was collapsed. */
  readonly toggle: (moduleId: number) => void;
  /** Makes sure the module is expanded (for example, a parent that has just received a module). */
  readonly expand: (moduleId: number) => void;
}

/**
 * Which parents of the tree are collapsed (FR-003, FR-004; research D6). It is state of the screen
 * only: it is not kept in the address nor in the browser, so every visit starts expanded.
 */
export function useCollapsedModules(): CollapsedModulesApi {
  const [collapsed, setCollapsed] = useState<ReadonlySet<number>>(new Set());

  return {
    collapsed,
    toggle: (moduleId) => {
      setCollapsed((current) => {
        const next = new Set(current);
        if (!next.delete(moduleId)) {
          next.add(moduleId);
        }
        return next;
      });
    },
    expand: (moduleId) => {
      setCollapsed((current) => {
        if (!current.has(moduleId)) {
          return current;
        }
        const next = new Set(current);
        next.delete(moduleId);
        return next;
      });
    },
  };
}
