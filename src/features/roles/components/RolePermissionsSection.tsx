import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

import { messages } from '@/shared/messages/es';
import { ErrorState } from '@/shared/ui/ErrorState';

import type { ActionKey, PermissionMatrix } from '../schemas/permissionMatrix';
import { PermissionsList } from './PermissionsList';

const text = messages.roles.detail;

interface RolePermissionsSectionProps {
  readonly roleName: string;
  /** The permissions catalog failed: only this section shows it, with a retry (FR-020 of 014). */
  readonly isError: boolean;
  readonly onRetry: () => void;
  /** `undefined` while the catalog or the role's permissions are still loading. */
  readonly matrix: PermissionMatrix | undefined;
  /** A save is running or the person cannot edit: the buttons are shown but not operable. */
  readonly pending: boolean;
  readonly onToggle: (moduleId: number, actionKey: ActionKey, checked: boolean) => void;
  readonly onToggleAll: (moduleId: number, checked: boolean) => void;
}

/**
 * The permissions of an active role, below its own fields (feature 023), taken out of
 * `RoleDetailPanel` as it was (feature 025, research D9) so that component stays small.
 */
export function RolePermissionsSection({
  roleName,
  isError,
  onRetry,
  matrix,
  pending,
  onToggle,
  onToggleAll,
}: RolePermissionsSectionProps) {
  return (
    <div>
      <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
        {text.matrixTitle(roleName)}
      </Typography>
      {isError ? (
        <ErrorState
          title={messages.errors.routeTitle}
          message={text.matrixError}
          onRetry={onRetry}
        />
      ) : matrix === undefined ? (
        <CircularProgress aria-label={messages.common.loading} />
      ) : (
        <PermissionsList
          label={text.matrixTitle(roleName)}
          matrix={matrix}
          pending={pending}
          onToggle={onToggle}
          onToggleAll={onToggleAll}
        />
      )}
    </div>
  );
}
