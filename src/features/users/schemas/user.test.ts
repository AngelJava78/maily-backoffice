import { describe, expect, it } from 'vitest';

import { getDisplayName, getFullName, getInitials, platformUserSchema } from './user';
import { isActiveStatus, USER_STATUS } from './userStatus';
import { uuidOf } from '@/test/ids';

const validDto = {
  id: uuidOf(121),
  auth0_id: 'auth0|abc123',
  email: 'ana@clinica.com',
  first_name: 'Ana',
  paternal_last_name: 'Pérez',
  maternal_last_name: 'Gómez',
  status: { id: 1, name: 'Activo' },
  created_at: '2026-10-15T14:20:11.032Z',
  updated_at: '2026-10-16T09:00:00+02:00',
};

describe('platformUserSchema', () => {
  it('converts the snake_case DTO into the camelCase domain model', () => {
    expect(platformUserSchema.parse(validDto)).toEqual({
      id: uuidOf(121),
      auth0Id: 'auth0|abc123',
      email: 'ana@clinica.com',
      firstName: 'Ana',
      paternalLastName: 'Pérez',
      maternalLastName: 'Gómez',
      status: { id: 1, name: 'Activo' },
      createdAt: '2026-10-15T14:20:11.032Z',
      updatedAt: '2026-10-16T09:00:00+02:00',
    });
  });

  it('accepts a missing maternal last name expressed as null', () => {
    const user = platformUserSchema.parse({ ...validDto, maternal_last_name: null });

    expect(user.maternalLastName).toBeNull();
  });

  it('accepts any status id, because the access decision is made elsewhere', () => {
    expect(
      platformUserSchema.parse({ ...validDto, status: { id: 99, name: 'Otro' } }).status,
    ).toEqual({ id: 99, name: 'Otro' });
  });

  it.each([
    ['an id that is a whole number', { id: 121 }],
    ['a textual id that is not a UUID', { id: '121' }],
    ['an id without hyphens', { id: 'e7d3f1a24b5c4d6e8f9a0b1c2d3e4f5a' }],
    ['an empty id', { id: '' }],
    ['an empty auth0_id', { auth0_id: '' }],
    ['a missing auth0_id', { auth0_id: undefined }],
    ['an empty first_name', { first_name: '' }],
    ['an empty paternal_last_name', { paternal_last_name: '' }],
    ['a missing maternal_last_name', { maternal_last_name: undefined }],
    ['an empty email', { email: '' }],
    ['a missing status', { status: undefined }],
    ['a status with a fractional id', { status: { id: 1.5, name: 'Activo' } }],
    ['a status without name', { status: { id: 1 } }],
    ['a date without time', { created_at: '2026-10-15' }],
    ['a date without time zone', { updated_at: '2026-10-15T14:20:11' }],
    ['a text that is not a date', { created_at: 'yesterday' }],
  ])('rejects %s', (_label, override) => {
    expect(platformUserSchema.safeParse({ ...validDto, ...override }).success).toBe(false);
  });

  it('rejects a value that is not an object', () => {
    expect(platformUserSchema.safeParse(null).success).toBe(false);
    expect(platformUserSchema.safeParse('user').success).toBe(false);
  });
});

describe('getDisplayName', () => {
  it('joins the first name and the paternal last name', () => {
    const user = platformUserSchema.parse(validDto);

    expect(getDisplayName(user)).toBe('Ana Pérez');
  });

  it('does not include the maternal last name', () => {
    const user = platformUserSchema.parse({ ...validDto, maternal_last_name: 'Gómez' });

    expect(getDisplayName(user)).not.toContain('Gómez');
  });
});

describe('getFullName', () => {
  it('joins the first name and both last names', () => {
    const user = platformUserSchema.parse(validDto);

    expect(getFullName(user)).toBe('Ana Pérez Gómez');
  });

  it('leaves out the maternal last name when the user has none', () => {
    const user = platformUserSchema.parse({ ...validDto, maternal_last_name: null });

    expect(getFullName(user)).toBe('Ana Pérez');
  });
});

describe('getInitials', () => {
  it.each([
    ['Ana Pérez', 'AP'],
    ['  ana   pérez  ', 'AP'],
    ['María José García', 'MJ'],
    ['Ana', 'A'],
    ['Álvaro Núñez', 'ÁN'],
    ['', ''],
    ['   ', ''],
  ])('turns %j into %j', (displayName, initials) => {
    expect(getInitials(displayName)).toBe(initials);
  });
});

describe('user status', () => {
  it('defines the three ids of the users service', () => {
    expect(USER_STATUS).toEqual({ ACTIVE: 1, BLOCKED: 2, DELETED: 3 });
  });

  it('treats only the active status as active', () => {
    expect(isActiveStatus(USER_STATUS.ACTIVE)).toBe(true);
    expect(isActiveStatus(USER_STATUS.BLOCKED)).toBe(false);
    expect(isActiveStatus(USER_STATUS.DELETED)).toBe(false);
  });

  it.each([0, -1, 4, 99])('treats the unknown id %i as not active', (id) => {
    expect(isActiveStatus(id)).toBe(false);
  });
});
