import { useEffect, type ReactNode } from 'react';

import { messages } from '@/shared/messages/es';
import { ErrorState } from '@/shared/ui/ErrorState';
import { LiveStatus } from '@/shared/ui/LiveStatus';

import type { UsersLocationApi } from '../hooks/useUsersLocation';
import { useUsersPage } from '../hooks/useUsersPage';
import {
  emptyUsersMessage,
  type UsersStatusFilter,
  type UsersTypeFilter,
} from '../schemas/usersLocation';
import { UsersGrid } from './UsersGrid';

/**
 * The zone of the table: one page of the users that the filters ask for, with its loading, empty
 * and error states, which never hide the filters, the search or the title (FR-013). A page past the
 * last one is replaced by the last (FR-001).
 */
export function UsersList({
  page,
  pageSize,
  type,
  status,
  listSearch,
  emptyAction,
  setPage,
  setPageSize,
}: {
  readonly page: number;
  readonly pageSize: number;
  readonly type: UsersTypeFilter;
  readonly status: UsersStatusFilter;
  readonly listSearch: string;
  /** Offered when no active user answers the filters, such as creating one; never for blocked ones. */
  readonly emptyAction?: ReactNode;
  readonly setPage: UsersLocationApi['setPage'];
  readonly setPageSize: UsersLocationApi['setPageSize'];
}) {
  const query = useUsersPage({ page, pageSize, type, status });
  const data = query.isPlaceholderData ? undefined : query.data;
  const lastPage = data?.pages ?? 1;
  // The page asked for does not exist (for example, the last user of the last page was blocked).
  const pastTheLastPage = data?.items.length === 0 && data.pages > 0 && page > lastPage;

  useEffect(() => {
    if (pastTheLastPage) {
      setPage(lastPage, { replace: true });
    }
  }, [pastTheLastPage, lastPage, setPage]);

  if (query.isError && query.data === undefined) {
    return (
      <ErrorState
        title={messages.users.list.loadError.title}
        message={messages.users.list.loadError.message}
        onRetry={() => {
          void query.refetch();
        }}
      />
    );
  }

  const firstShown = (page - 1) * pageSize + 1;
  const emptyMessage = emptyUsersMessage(type, status);

  /**
   * What a screen reader is told when the rows change: which users are shown or, once a filter
   * leaves the list empty, that it is (FR-014). Nothing while it loads or corrects the page.
   */
  function announcement(): string {
    if (data === undefined || pastTheLastPage) {
      return '';
    }
    if (data.items.length === 0) {
      return emptyMessage;
    }
    return messages.users.list.pageStatus(
      firstShown,
      firstShown + data.items.length - 1,
      data.total,
    );
  }

  return (
    <>
      <UsersGrid
        users={query.data?.items ?? []}
        total={query.data?.total ?? 0}
        // The grid is shown on a page that exists, so it never has to correct the address itself.
        page={pastTheLastPage ? lastPage : page}
        pageSize={pageSize}
        loading={query.isFetching}
        listSearch={listSearch}
        emptyMessage={emptyMessage}
        // Creating a user is no answer to «there are no blocked users» (US2-5).
        emptyAction={status === 'active' ? emptyAction : undefined}
        onPaginationChange={(nextPage, nextPageSize) => {
          if (nextPageSize === pageSize) {
            setPage(nextPage, { replace: pastTheLastPage });
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
