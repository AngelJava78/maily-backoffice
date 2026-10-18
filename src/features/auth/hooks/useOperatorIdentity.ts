import { getDisplayName, getInitials } from '@/features/users';

import type { AccessRole } from '../schemas/myAccess';
import { useGrantedAccess } from './useGrantedAccess';

/** Who the operator is, as the platform knows them; nothing here comes from Auth0. */
export interface OperatorIdentity {
  /** First name and paternal last name, as shown in the header. */
  readonly displayName: string;
  readonly firstName: string;
  readonly paternalLastName: string;
  readonly maternalLastName: string | null;
  readonly email: string;
  readonly initials: string;
  /** Every active role, authorized or not. */
  readonly roles: readonly AccessRole[];
}

export function useOperatorIdentity(): OperatorIdentity {
  const { user, roles } = useGrantedAccess();
  const displayName = getDisplayName(user);

  return {
    displayName,
    firstName: user.firstName,
    paternalLastName: user.paternalLastName,
    maternalLastName: user.maternalLastName,
    email: user.email,
    initials: getInitials(displayName),
    roles,
  };
}
