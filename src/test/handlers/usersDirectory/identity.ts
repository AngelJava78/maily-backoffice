import type { IdentityFailures } from './behaviors';
import { DirectoryError } from './model';

/**
 * The failures of Auth0 that the operations of the service can run into. They are checked last,
 * after the permission, the validation and the rules of business (contracts/users-service.md):
 * the service only calls the provider once everything else is in order.
 */

/** The provider does not answer in time (503) or refuses the operation (502). */
export function failIfProviderDown(identity: IdentityFailures): void {
  if (identity.unavailable) {
    throw new DirectoryError(
      503,
      'identity_provider_unavailable',
      'No se pudo actualizar la cuenta de acceso por ahora.',
    );
  }
  if (identity.rejected) {
    throw new DirectoryError(
      502,
      'identity_provider_error',
      'El sistema de cuentas de acceso rechazó la operación.',
    );
  }
}

/** Creating the access account: the provider can be down, already know the email or refuse the password. */
export function checkNewAccount(identity: IdentityFailures, email: string): void {
  failIfProviderDown(identity);
  if (identity.existingAccounts.has(email.trim().toLowerCase())) {
    throw new DirectoryError(
      409,
      'auth0_account_already_exists',
      'Ya existe una cuenta de acceso con ese correo.',
    );
  }
  if (identity.passwordRejected) {
    throw new DirectoryError(
      422,
      'password_rejected',
      'La contraseña no cumple los requisitos de seguridad.',
    );
  }
}

/** Enabling an access account (unblock, reactivate): without the account the person could not sign in. */
export function checkAccountToEnable(identity: IdentityFailures, userId: string): void {
  failIfProviderDown(identity);
  if (identity.missingAccounts.has(userId)) {
    throw new DirectoryError(
      409,
      'auth0_account_not_found',
      'La persona no tiene una cuenta de acceso.',
    );
  }
}

/** Disabling an access account (block, delete): a missing account is not an obstacle. */
export function checkAccountToDisable(identity: IdentityFailures): void {
  failIfProviderDown(identity);
}
