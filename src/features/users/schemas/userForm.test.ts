import { describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';

import {
  createUserFormSchema,
  editUserFormSchema,
  emailFieldSchema,
  toCreateUserBody,
  toUpdateUserBody,
  type CreateUserFormValues,
} from './userForm';

const validation = messages.users.validation;

function createValues(overrides: Partial<CreateUserFormValues> = {}): CreateUserFormValues {
  return {
    email: 'ana@clinica.com',
    firstName: 'Ana',
    paternalLastName: 'Pérez',
    maternalLastName: 'Gómez',
    password: 'Segura-123',
    roleIds: [4],
    ...overrides,
  };
}

/** The messages the schema gives for a field, in the order of its issues. */
function issuesOf(
  schema: typeof createUserFormSchema | typeof editUserFormSchema,
  values: unknown,
  field: string,
): string[] {
  const result = schema.safeParse(values);
  if (result.success) {
    return [];
  }
  return result.error.issues
    .filter((issue) => issue.path[0] === field)
    .map((issue) => issue.message);
}

describe('emailFieldSchema', () => {
  it.each(['ana@clinica.com', '  Ana@Clinica.com  ', 'qa+002-1@dominio.mx'])(
    'accepts %j, and trims it',
    (email) => {
      expect(emailFieldSchema.parse(email)).toBe(email.trim());
    },
  );

  it.each(['ana', 'ana@', 'ana@clinica', 'a b@c.com', 'ñ@c.com', 'no-es-correo'])(
    'rejects %j as not being an email',
    (email) => {
      expect(emailFieldSchema.safeParse(email).error?.issues[0]?.message).toBe(
        validation.emailInvalid,
      );
    },
  );

  it('asks for the email when it is empty or only spaces, before saying it is not valid', () => {
    for (const email of ['', '   ']) {
      expect(emailFieldSchema.safeParse(email).error?.issues[0]?.message).toBe(
        validation.emailRequired,
      );
    }
  });

  it('rejects an email of more than 255 characters', () => {
    const email = `${'a'.repeat(250)}@clinica.com`;

    expect(emailFieldSchema.safeParse(email).error?.issues.map((issue) => issue.message)).toEqual([
      validation.emailTooLong,
    ]);
  });
});

describe('createUserFormSchema', () => {
  it('accepts a complete user and trims the texts', () => {
    const parsed = createUserFormSchema.parse(
      createValues({ email: ' ana@clinica.com ', firstName: ' Ana ', maternalLastName: ' ' }),
    );

    expect(parsed).toMatchObject({
      email: 'ana@clinica.com',
      firstName: 'Ana',
      maternalLastName: '',
    });
  });

  it('keeps the password exactly as it was typed, spaces included', () => {
    expect(createUserFormSchema.parse(createValues({ password: '  x y ' })).password).toBe(
      '  x y ',
    );
  });

  it.each([
    ['firstName', { firstName: '  ' }, validation.firstNameRequired],
    ['firstName', { firstName: 'N'.repeat(101) }, validation.firstNameTooLong],
    ['paternalLastName', { paternalLastName: '' }, validation.paternalLastNameRequired],
    ['paternalLastName', { paternalLastName: 'P'.repeat(101) }, validation.paternalLastNameTooLong],
    ['maternalLastName', { maternalLastName: 'M'.repeat(101) }, validation.maternalLastNameTooLong],
    ['password', { password: '' }, validation.passwordRequired],
    ['roleIds', { roleIds: [] }, validation.rolesRequired],
  ])('reports %s with its own message', (field, overrides, message) => {
    expect(issuesOf(createUserFormSchema, createValues(overrides), field)).toEqual([message]);
  });

  it('accepts names of exactly 100 characters and no maternal last name', () => {
    const result = createUserFormSchema.safeParse(
      createValues({ firstName: 'N'.repeat(100), maternalLastName: '' }),
    );

    expect(result.success).toBe(true);
  });

  it('rejects role ids that are not whole numbers from 1', () => {
    expect(createUserFormSchema.safeParse(createValues({ roleIds: [0] })).success).toBe(false);
    expect(createUserFormSchema.safeParse(createValues({ roleIds: [1.5] })).success).toBe(false);
  });

  it('does not transform: the type of what is typed is the type of what is read', () => {
    const values = createValues();

    expect(createUserFormSchema.parse(values)).toEqual(values);
  });
});

describe('editUserFormSchema', () => {
  const values = { firstName: 'Ana', paternalLastName: 'Pérez', maternalLastName: 'Gómez' };

  it('accepts the three name fields with the same rules as the creation', () => {
    expect(editUserFormSchema.parse({ ...values, firstName: ' Ana ' })).toEqual(values);
    expect(issuesOf(editUserFormSchema, { ...values, firstName: '' }, 'firstName')).toEqual([
      validation.firstNameRequired,
    ]);
    expect(
      issuesOf(editUserFormSchema, { ...values, paternalLastName: ' ' }, 'paternalLastName'),
    ).toEqual([validation.paternalLastNameRequired]);
    expect(
      issuesOf(
        editUserFormSchema,
        { ...values, maternalLastName: 'M'.repeat(101) },
        'maternalLastName',
      ),
    ).toEqual([validation.maternalLastNameTooLong]);
  });

  it('has no email: it cannot be changed', () => {
    expect(editUserFormSchema.parse({ ...values, email: 'otro@clinica.com' })).not.toHaveProperty(
      'email',
    );
  });
});

describe('toCreateUserBody', () => {
  it('builds the body of the service, without roles or auth0_id', () => {
    expect(toCreateUserBody(createValues())).toEqual({
      email: 'ana@clinica.com',
      password: 'Segura-123',
      first_name: 'Ana',
      paternal_last_name: 'Pérez',
      maternal_last_name: 'Gómez',
    });
  });

  it('leaves the maternal last name out when it is empty', () => {
    const body = toCreateUserBody(createValues({ maternalLastName: '  ' }));

    expect(body).not.toHaveProperty('maternal_last_name');
  });

  it('trims the texts but not the password', () => {
    const body = toCreateUserBody(
      createValues({ email: ' ana@clinica.com ', firstName: ' Ana ', password: ' p ' }),
    );

    expect(body).toMatchObject({ email: 'ana@clinica.com', first_name: 'Ana', password: ' p ' });
  });
});

describe('toUpdateUserBody', () => {
  it('always sends the three fields of the form, and never the email', () => {
    expect(
      toUpdateUserBody({ firstName: 'Ana', paternalLastName: 'Pérez', maternalLastName: 'Gómez' }),
    ).toEqual({ first_name: 'Ana', paternal_last_name: 'Pérez', maternal_last_name: 'Gómez' });
  });

  it('sends null to erase the maternal last name', () => {
    expect(
      toUpdateUserBody({ firstName: 'Ana', paternalLastName: 'Pérez', maternalLastName: ' ' }),
    ).toEqual({ first_name: 'Ana', paternal_last_name: 'Pérez', maternal_last_name: null });
  });
});
