import { useEffect, type ReactNode } from 'react';

import { messages } from '@/shared/messages/es';
import { ErrorState } from '@/shared/ui/ErrorState';
import { LiveStatus } from '@/shared/ui/LiveStatus';

import { useRolePermissionCounts } from '../hooks/useRolePermissionCounts';
import type { RolePermissionsLocationApi } from '../hooks/useRolePermissionsLocation';
import { useVisibleRoles } from '../hooks/useVisibleRoles';
import {
  emptyRolesMessage,
  lastPageOf,
  pageOfRoles,
  type RolesStatusFilter,
  type RolesTypeFilter,
} from '../schemas/rolePermissionsLocation';
import { RolesGrid } from './RolesGrid';

const text = messages.roles.list;

interface RolesTableProps {
  readonly type: RolesTypeFilter;
  readonly status: RolesStatusFilter;
  readonly page: number;
  readonly pageSize: number;
  /** The search of the table (`?type=sistema&page=2`), for the links to the detail of each role. */
  readonly listSearch: string;
  /** Offered when no active role answers the filters, such as creating one; never for blocked ones. */
  readonly emptyAction?: ReactNode;
  readonly setPage: RolePermissionsLocationApi['setPage'];
  readonly setPageSize: RolePermissionsLocationApi['setPageSize'];
}

/**
 * The zone of the table: one page of the roles that the filters ask for, with its loading, empty
 * and error states, which never hide the filters, the button of creating or the title (FR-009).
 * The service gives every role of a status at once, so the page is cut here (research D4), and
 * the total of permissions is asked for only the roles of that page, and only the active ones: a
 * blocked role's permissions are not available.
 */
export function RolesTable({
  type,
  status,
  page,
  pageSize,
  listSearch,
  emptyAction,
  setPage,
  setPageSize,
}: RolesTableProps) {
  const { query, roles } = useVisibleRoles({ type, status });
  const lastPage = lastPageOf(roles.length, pageSize);
  // The page of the address does not exist (a hand-written address, or the last role of the last page
  // was blocked from another session). The roles are what tells how many pages there are, so it is
  // only judged with them at hand and not while they refresh (FR-018).
  const pastTheLastPage = query.isSuccess && !query.isFetching && page > lastPage;
  const shownPage = pastTheLastPage ? lastPage : page;
  const pageRoles = pageOfRoles(roles, shownPage, pageSize);
  const counts = useRolePermissionCounts(
    status === 'active' ? pageRoles.map((role) => role.id) : [],
  );

  // The address is an external system, and the entry that had the wrong page is replaced.
  useEffect(() => {
    if (pastTheLastPage) {
      setPage(lastPage, { replace: true });
    }
  }, [pastTheLastPage, lastPage, setPage]);

  if (query.isError && query.data === undefined) {
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

  const emptyMessage = emptyRolesMessage(type, status);

  /**
   * What a screen reader is told when the rows change: which roles are shown or, once the filters
   * leave the table empty, that it is (FR-021). Nothing while it loads or corrects the page.
   */
  function announcement(): string {
    if (!query.isSuccess || pastTheLastPage) {
      return '';
    }
    if (roles.length === 0) {
      return emptyMessage;
    }
    if (pageRoles.length === 0) {
      // A page that is not there yet, in the list that is being refreshed.
      return '';
    }
    const firstShown = (shownPage - 1) * pageSize + 1;
    return text.pageStatus(firstShown, firstShown + pageRoles.length - 1, roles.length);
  }

  return (
    <>
      <RolesGrid
        roles={pageRoles}
        permissionCounts={counts}
        total={roles.length}
        // The grid is shown on a page that exists, so it never has to correct the address itself.
        page={shownPage}
        pageSize={pageSize}
        loading={query.isFetching}
        listSearch={listSearch}
        emptyMessage={emptyMessage}
        // Creating a role is no answer to «there are no blocked roles» (US1-9).
        emptyAction={status === 'active' ? emptyAction : undefined}
        onPaginationChange={(nextPage, nextPageSize) => {
          if (nextPageSize === pageSize) {
            setPage(nextPage);
          } else {
            setPageSize(nextPageSize);
          }
        }}
      />
      {/* Changing the page or a filter changes only the rows: a screen reader is told about them. */}
      <LiveStatus>{announcement()}</LiveStatus>
    </>
  );
}
