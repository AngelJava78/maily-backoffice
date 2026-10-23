import { getDisplayName } from '@/features/users';

import type { AccessRole } from '../schemas/myAccess';
import { useGrantedAccess } from './useGrantedAccess';

/** Who the operator is, as the platform knows them; nothing here comes from Auth0. */
export interface OperatorIdentity {
  /** The platform user's own id (011-profile-avatar-menu): Avatar's deterministic colour tone. */
  readonly id: string;
  /** First name and paternal last name, as shown in the header. */
  readonly displayName: string;
  readonly firstName: string;
  readonly paternalLastName: string;
  readonly maternalLastName: string | null;
  readonly email: string;
  /** Every active role, authorized or not. */
  readonly roles: readonly AccessRole[];
}

export function useOperatorIdentity(): OperatorIdentity {
  const { user, roles } = useGrantedAccess();
  const displayName = getDisplayName(user);

  return {
    id: user.id,
    displayName,
    firstName: user.firstName,
    paternalLastName: user.paternalLastName,
    maternalLastName: user.maternalLastName,
    email: user.email,
    roles,
  };
}
