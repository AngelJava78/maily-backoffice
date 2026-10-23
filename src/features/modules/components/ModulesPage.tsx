import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMemo } from 'react';

import { messages } from '@/shared/messages/es';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { PageLoader } from '@/shared/ui/PageLoader';
import { useFocusOnMount } from '@/shared/ui/useFocusOnMount';

import type { ModuleCapabilities } from '..';
import { useModulesCatalog } from '../hooks/useModulesCatalog';
import { useModulesLocation } from '../hooks/useModulesLocation';
import { filterModules } from '../policy/filterModules';
import { MODULE_STATUS } from '../schemas/moduleActionCatalog';
import { ModulesFilters } from './ModulesFilters';
import { ModulesTable } from './ModulesTable';

const text = messages.modules;

interface ModulesPageProps {
  /** What the operator may do in the section (decided in `app` with the policies of `auth`). */
  readonly capabilities: ModuleCapabilities;
}

/**
 * The Módulos screen (US1): the catalog grouped by type, with its filters and search (research
 * D6). The panel of the right (Editar/Nuevo módulo) is not part of this story yet.
 */
export function ModulesPage({ capabilities }: ModulesPageProps) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const { location, setType, setStatus, setSearch, openEdit } = useModulesLocation();
  const statusId = location.status === 'blocked' ? MODULE_STATUS.BLOCKED : MODULE_STATUS.ACTIVE;
  const query = useModulesCatalog(statusId);
  const loaded = query.data !== undefined;

  const filtered = useMemo(
    () => filterModules(query.data ?? [], { type: location.type, search: location.search }),
    [query.data, location.type, location.search],
  );

  function emptyMessage(): string {
    if (location.search !== '') {
      return text.count.noResults;
    }
    return location.status === 'blocked' ? text.count.noneBlocked : text.count.noneActive;
  }

  function content() {
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
      location.status === 'blocked' ? text.count.blocked(filtered.length) : text.count.active(filtered.length);
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

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" component="h1" ref={headingRef} tabIndex={-1}>
          {text.title}
        </Typography>
        <Typography color="text.secondary">{text.subtitle}</Typography>
      </Stack>
      <ModulesFilters
        type={location.type}
        status={location.status}
        search={location.search}
        onTypeChange={setType}
        onStatusChange={setStatus}
        onSearchChange={setSearch}
      />
      {content()}
    </Stack>
  );
}
