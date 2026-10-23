import { z } from 'zod';

import { messages } from '@/shared/messages/es';

const text = messages.roles.validation;

// None of these fields transforms its value or narrows its type (`trim` does not change the
// type, and the required check on `typeId` is a `superRefine` issue, not a `refine` predicate):
// what the form holds and what it submits have the same shape, converted explicitly by
// `toCreateRoleVariables` (same convention as `features/users/schemas/userForm.ts`). Narrowing
// `typeId` to `1 | 2` here would give `useForm` a type that cannot represent "not chosen yet",
// its real value until the person picks one.
export const roleFormSchema = z
  .object({
    name: z.string().trim().min(1, text.nameRequired).max(50, text.nameTooLong),
    description: z.string().max(500),
    typeId: z.union([z.literal(1), z.literal(2), z.null()]),
    /** "Copiar permisos de" (FR-012): optional, `null` while nothing is chosen. */
    copyPermissionsFromRoleId: z.number().int().min(1).nullable(),
  })
  .superRefine((values, ctx) => {
    if (values.typeId === null) {
      ctx.addIssue({ code: 'custom', message: text.typeRequired, path: ['typeId'] });
    }
  });

export type RoleFormValues = z.infer<typeof roleFormSchema>;

/**
 * The form's values, as `useCreateRole` (and so `useDuplicateRole`) needs them — `null` only if
 * called before `typeId` was actually chosen, which `roleFormSchema`'s validation already blocks
 * from reaching here through a submit.
 */
export function toCreateRoleVariables(values: RoleFormValues): {
  readonly name: string;
  readonly description: string | null;
  readonly typeId: 1 | 2;
  readonly copyPermissionsFromRoleId?: number;
} | null {
  if (values.typeId === null) {
    return null;
  }
  const description = values.description.trim();
  return {
    name: values.name,
    description: description === '' ? null : description,
    typeId: values.typeId,
    ...(values.copyPermissionsFromRoleId === null
      ? {}
      : { copyPermissionsFromRoleId: values.copyPermissionsFromRoleId }),
  };
}
