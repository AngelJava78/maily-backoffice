import { z } from 'zod';

import { messages } from '@/shared/messages/es';

const text = messages.users.validation;

/** The pattern of an email that the users service accepts (contracts/users-service.md, UserCreate). */
export const EMAIL_PATTERN =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:[.][A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

/** The rule of an email, shared by the creation form and the search by email. */
export const emailFieldSchema = z
  .string()
  .trim()
  .min(1, text.emailRequired)
  .max(255, text.emailTooLong)
  .regex(EMAIL_PATTERN, text.emailInvalid);

function nameSchema(required: string, tooLong: string) {
  return z.string().trim().min(1, required).max(100, tooLong);
}

// None of these schemas transforms its value (`trim` does not change the type), so what the form
// holds and what it submits have the same type.
export const createUserFormSchema = z.object({
  email: emailFieldSchema,
  firstName: nameSchema(text.firstNameRequired, text.firstNameTooLong),
  paternalLastName: nameSchema(text.paternalLastNameRequired, text.paternalLastNameTooLong),
  maternalLastName: z.string().trim().max(100, text.maternalLastNameTooLong),
  // The policy of the passwords belongs to Auth0: the client only asks for one, and it does not
  // trim it (a space can be part of it).
  password: z.string().min(1, text.passwordRequired),
  roleIds: z.array(z.number().int().min(1)).min(1, text.rolesRequired),
});

/** Editing changes the name and the last names; the email is shown but cannot be changed. */
export const editUserFormSchema = createUserFormSchema.pick({
  firstName: true,
  paternalLastName: true,
  maternalLastName: true,
});

export type CreateUserFormValues = z.infer<typeof createUserFormSchema>;
export type EditUserFormValues = z.infer<typeof editUserFormSchema>;

/** The body of `POST /api/v1/users` (U4). The roles are assigned afterwards, one by one. */
export interface CreateUserBody {
  readonly email: string;
  readonly password: string;
  readonly first_name: string;
  readonly paternal_last_name: string;
  readonly maternal_last_name?: string;
}

/** The body of `PATCH /api/v1/users/{id}` (U5): always the three fields of the form. */
export interface UpdateUserBody {
  readonly first_name: string;
  readonly paternal_last_name: string;
  readonly maternal_last_name: string | null;
}

export function toCreateUserBody(values: CreateUserFormValues): CreateUserBody {
  const maternalLastName = values.maternalLastName.trim();
  return {
    email: values.email.trim(),
    password: values.password,
    first_name: values.firstName.trim(),
    paternal_last_name: values.paternalLastName.trim(),
    ...(maternalLastName === '' ? {} : { maternal_last_name: maternalLastName }),
  };
}

export function toUpdateUserBody(values: EditUserFormValues): UpdateUserBody {
  const maternalLastName = values.maternalLastName.trim();
  return {
    first_name: values.firstName.trim(),
    paternal_last_name: values.paternalLastName.trim(),
    maternal_last_name: maternalLastName === '' ? null : maternalLastName,
  };
}
