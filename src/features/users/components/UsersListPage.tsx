import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';

import { messages } from '@/shared/messages/es';
import { ErrorState } from '@/shared/ui/ErrorState';
import { useFocusOnMount } from '@/shared/ui/useFocusOnMount';

import { useUserSearch } from '../hooks/useUserSearch';
import { useUsersLocation, type UsersLocationApi } from '../hooks/useUsersLocation';
import { useUsersPage } from '../hooks/useUsersPage';
import type { UserCapabilities } from '../policy/availableActions';
import { emailFieldSchema } from '../schemas/userForm';
import { UserSearchForm } from './UserSearchForm';
import { UserSearchResult } from './UserSearchResult';
import { UsersGrid } from './UsersGrid';

/** One page of the active users. A page past the last one is replaced by the last (FR-001). */
function UsersList({
  page,
  pageSize,
  listSearch,
  emptyAction,
  setPage,
  setPageSize,
}: {
  readonly page: number;
  readonly pageSize: number;
  readonly listSearch: string;
  readonly emptyAction?: ReactNode;
  readonly setPage: UsersLocationApi['setPage'];
  readonly setPageSize: UsersLocationApi['setPageSize'];
}) {
  const query = useUsersPage({ page, pageSize });
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

  return (
    <UsersGrid
      users={query.data?.items ?? []}
      total={query.data?.total ?? 0}
      // The grid is shown on a page that exists, so it never has to correct the address itself.
      page={pastTheLastPage ? lastPage : page}
      pageSize={pageSize}
      loading={query.isFetching}
      listSearch={listSearch}
      emptyAction={emptyAction}
      onPaginationChange={(nextPage, nextPageSize) => {
        if (nextPageSize === pageSize) {
          setPage(nextPage, { replace: pastTheLastPage });
        } else {
          setPageSize(nextPageSize);
        }
      }}
    />
  );
}

/**
 * The result of a search by email, in a live region so that a screen reader announces it. An email
 * that is not valid, such as one typed by hand in the address, is told instead of being asked.
 */
function SearchResults({
  email,
  listSearch,
}: {
  readonly email: string;
  readonly listSearch: string;
}) {
  const valid = emailFieldSchema.safeParse(email).success;
  const query = useUserSearch(valid ? email : null);

  function content() {
    if (!valid) {
      return <Alert severity="info">{messages.users.validation.emailInvalid}</Alert>;
    }
    if (query.isError) {
      return (
        <ErrorState
          title={messages.users.search.loadError.title}
          message={messages.users.search.loadError.message}
          onRetry={() => {
            void query.refetch();
          }}
        />
      );
    }
    if (query.data === undefined) {
      return <CircularProgress aria-label={messages.common.loading} />;
    }
    if (query.data === null) {
      return <Alert severity="info">{messages.users.search.notFound}</Alert>;
    }
    return <UserSearchResult user={query.data} listSearch={listSearch} />;
  }

  return <Box aria-live="polite">{content()}</Box>;
}

/**
 * The section of users: the paginated list of the active ones and the search by email, which
 * finds a user of any status. The state lives in the address (constitution III), so it can be
 * shared, reloaded and gone back to.
 */
export function UsersListPage({ capabilities }: { readonly capabilities: UserCapabilities }) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const { location, search, setPage, setPageSize, searchEmail, clearSearch } = useUsersLocation();
  const searchedEmail = location.mode === 'search' ? location.email : undefined;
  // Creating a user needs three permissions (FR-025); the application works that out.
  const createAction = capabilities.canCreate ? (
    <Button
      variant="contained"
      component={RouterLink}
      to="/users/new"
      state={{ listSearch: search }}
    >
      {messages.users.list.createAction}
    </Button>
  ) : undefined;

  return (
    <Stack spacing={3}>
      <Stack
        direction="row"
        useFlexGap
        spacing={2}
        sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}
      >
        <Typography variant="h4" component="h1" ref={headingRef} tabIndex={-1}>
          {messages.users.title}
        </Typography>
        {createAction}
      </Stack>
      <UserSearchForm
        key={searchedEmail ?? ''}
        initialEmail={searchedEmail}
        onSearch={searchEmail}
        onClear={clearSearch}
      />
      {location.mode === 'search' ? (
        <SearchResults email={location.email} listSearch={search} />
      ) : (
        <UsersList
          page={location.page}
          pageSize={location.pageSize}
          listSearch={search}
          emptyAction={createAction}
          setPage={setPage}
          setPageSize={setPageSize}
        />
      )}
    </Stack>
  );
}
