import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useId, useMemo } from 'react';

import { messages } from '@/shared/messages/es';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { Icon } from '@/shared/ui/Icon';
import { PageLoader } from '@/shared/ui/PageLoader';
import { useFocusOnMount } from '@/shared/ui/useFocusOnMount';

import type { ModuleCapabilities } from '..';
import { useModulesCatalog } from '../hooks/useModulesCatalog';
import { useModulesLocation } from '../hooks/useModulesLocation';
import { filterModules } from '../policy/filterModules';
import { MODULE_STATUS } from '../schemas/moduleActionCatalog';
import { ModuleCreatePanel } from './ModuleCreatePanel';
import { ModuleEditPanel } from './ModuleEditPanel';
import { ModuleFormDialog } from './ModuleFormDialog';
import { ModulesFilters } from './ModulesFilters';
import { ModulesTable } from './ModulesTable';

const text = messages.modules;

interface ModulesPageProps {
  /** What the operator may do in the section (decided in `app` with the policies of `auth`). */
  readonly capabilities: ModuleCapabilities;
}

/**
 * The Módulos screen: the catalog grouped by type, with its filters and search (research D6),
 * using the full width of the page. "Nuevo módulo"/"Editar" open their form in a modal over this
 * same screen instead of a separate route (spec 017, superseding research D10's panel).
 */
export function ModulesPage({ capabilities }: ModulesPageProps) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const titleId = useId();
  const { location, setType, setStatus, setSearch, openEdit, openCreate, closePanel } =
    useModulesLocation();
  const statusId = location.status === 'blocked' ? MODULE_STATUS.BLOCKED : MODULE_STATUS.ACTIVE;
  const query = useModulesCatalog(statusId);
  const loaded = query.data !== undefined;

  const filtered = useMemo(
    () => filterModules(query.data ?? [], { type: location.type, search: location.search }),
    [query.data, location.type, location.search],
  );
  // research D13: the default order is global (every type together), computed from whatever is
  // already loaded — only a display hint, the server computes the value it actually uses.
  const nextSortOrder = useMemo(
    () => Math.max(0, ...(query.data ?? []).map((module) => module.sortOrder)) + 10,
    [query.data],
  );

  function emptyMessage(): string {
    if (location.search !== '') {
      return text.count.noResults;
    }
    return location.status === 'blocked' ? text.count.noneBlocked : text.count.noneActive;
  }

  function list() {
    if (query.isError && !loaded) {
      return (
        <ErrorState
          title={text.loadError.title}
          message={text.loadError.message}
          onRetry={() => {
            void query.refetch();
          }}
        />
      );
    }
    if (!loaded) {
      return <PageLoader />;
    }
    if (filtered.length === 0) {
      return <EmptyState message={emptyMessage()} />;
    }
    const countLabel =
      location.status === 'blocked'
        ? text.count.blocked(filtered.length)
        : text.count.active(filtered.length);
    return (
      <Stack spacing={2}>
        <Typography color="text.secondary">{countLabel}</Typography>
        <ModulesTable
          modules={filtered}
          canEdit={capabilities.canEdit}
          onEdit={(moduleId) => {
            openEdit(moduleId);
          }}
        />
      </Stack>
    );
  }

  function panel() {
    const panelState = location.panel;
    if (panelState.kind === 'create') {
      return (
        <ModuleCreatePanel
          nextSortOrder={nextSortOrder}
          titleId={titleId}
          onCreated={openEdit}
          onCancel={closePanel}
        />
      );
    }
    if (panelState.kind === 'edit') {
      // The row already has the module loaded by the list query (research D10): no request of its
      // own to open the panel.
      const editing = (query.data ?? []).find((module) => module.id === panelState.moduleId);
      if (editing !== undefined) {
        return (
          <ModuleEditPanel
            module={editing}
            capabilities={capabilities}
            titleId={titleId}
            onDeleted={closePanel}
          />
        );
      }
      return loaded ? <EmptyState message={text.errors.notFound} /> : <PageLoader />;
    }
    // FR-003: nothing to show when no modal is open — there is no panel column to keep filled.
    return null;
  }

  return (
    <Stack spacing={3}>
      <Stack
        direction="row"
        useFlexGap
        sx={{ gap: 2, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Stack spacing={1}>
          <Typography variant="h4" component="h1" ref={headingRef} tabIndex={-1}>
            {text.title}
          </Typography>
          <Typography color="text.secondary">{text.subtitle}</Typography>
        </Stack>
        {capabilities.canCreate && (
          <Button
            variant="contained"
            startIcon={<Icon name="add" decorative />}
            onClick={openCreate}
          >
            {text.newAction}
          </Button>
        )}
      </Stack>
      <ModulesFilters
        type={location.type}
        status={location.status}
        search={location.search}
        onTypeChange={setType}
        onStatusChange={setStatus}
        onSearchChange={setSearch}
      />
      {list()}
      <ModuleFormDialog open={location.panel.kind !== 'none'} onClose={closePanel} titleId={titleId}>
        {panel()}
      </ModuleFormDialog>
    </Stack>
  );
}
