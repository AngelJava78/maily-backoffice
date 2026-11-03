import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router';

import { messages } from '@/shared/messages/es';
import { ErrorState } from '@/shared/ui/ErrorState';
import { LiveStatus } from '@/shared/ui/LiveStatus';
import { useFocusOnMount } from '@/shared/ui/useFocusOnMount';

import { useUserSearch } from '../hooks/useUserSearch';
import { useUsersLocation } from '../hooks/useUsersLocation';
import type { UserCapabilities } from '../policy/availableActions';
import { emailFieldSchema } from '../schemas/userForm';
import { UserSearchForm } from './UserSearchForm';
import { UserSearchResult } from './UserSearchResult';
import { UsersFilters } from './UsersFilters';
import { UsersList } from './UsersList';

/**
 * The result of a search by email. A screen reader is told that a user was found through a status
 * region that is already in the page; "not found" and an email that is not valid, such as one typed
 * by hand in the address, are alerts, which are announced when they appear.
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
    // A failed refresh keeps the result that was already shown.
    if (query.isError && query.data === undefined) {
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

  return (
    <Box>
      {content()}
      <LiveStatus>{valid && query.data ? messages.users.search.found : ''}</LiveStatus>
    </Box>
  );
}

/**
 * The section of users: the paginated list filtered by Tipo and Estatus (feature 026) and the
 * search by email, which finds a user of any status and type. The state lives in the address
 * (constitution III), so it can be shared, reloaded and gone back to.
 */
export function UsersListPage({ capabilities }: { readonly capabilities: UserCapabilities }) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const { location, search, setPage, setPageSize, setType, setStatus, searchEmail, clearSearch } =
    useUsersLocation();
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
      {/* The filters right above the search, whose help text would not let both share a row
          aligned; the groups wrap on a narrow screen (FR-001, FR-017). */}
      <Stack spacing={2}>
        <UsersFilters
          type={location.type}
          status={location.status}
          onTypeChange={setType}
          onStatusChange={setStatus}
        />
        <UserSearchForm initialEmail={searchedEmail} onSearch={searchEmail} onClear={clearSearch} />
      </Stack>
      {location.mode === 'search' ? (
        <SearchResults email={location.email} listSearch={search} />
      ) : (
        <UsersList
          page={location.page}
          pageSize={location.pageSize}
          type={location.type}
          status={location.status}
          listSearch={search}
          emptyAction={createAction}
          setPage={setPage}
          setPageSize={setPageSize}
        />
      )}
    </Stack>
  );
}
