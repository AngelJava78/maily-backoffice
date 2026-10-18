import { describe, expect, it } from 'vitest';

import { AUTHORIZED_ROLE_NAMES, isAuthorizedRoleName } from './authorizedRoles';

describe('AUTHORIZED_ROLE_NAMES', () => {
  it('lists the four system roles that may enter the backoffice', () => {
    expect([...AUTHORIZED_ROLE_NAMES]).toEqual([
      'Administrator',
      'Developer',
      'Marketing',
      'Billing',
    ]);
  });
});

describe('isAuthorizedRoleName', () => {
  it.each(['Administrator', 'Developer', 'Marketing', 'Billing'])('accepts %s', (name) => {
    expect(isAuthorizedRoleName(name)).toBe(true);
  });

  it.each([' marketing ', 'ADMINISTRATOR', 'developer', '\tBilling\n', 'mArKeTiNg'])(
    'ignores case and surrounding spaces in %j',
    (name) => {
      expect(isAuthorizedRoleName(name)).toBe(true);
    },
  );

  it.each(['Owner', 'Support', 'Doctor', 'Nurse', 'Receptionist', '', ' ', 'Market ing', 'Admin'])(
    'rejects %j',
    (name) => {
      expect(isAuthorizedRoleName(name)).toBe(false);
    },
  );
});
