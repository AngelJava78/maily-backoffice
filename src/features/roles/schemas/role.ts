import { z } from 'zod';

import { messages } from '@/shared/messages/es';

const statusSchema = z.object({ id: z.number().int(), name: z.string() });

const roleTypeSchema = z.object({
  id: z.union([z.literal(1), z.literal(2)]),
  name: z.string(),
});

export type RoleType = z.output<typeof roleTypeSchema>;

/** A role, with its type (feature 014): the permission matrix it can have depends on it. */
export const roleSchema = z
  .object({
    id: z.number().int().min(1),
    name: z.string().min(1).max(50),
    description: z.string().max(500).nullable(),
    created_at: z.iso.datetime({ offset: true }),
    status: statusSchema,
    type: roleTypeSchema,
  })
  .transform((dto) => ({
    id: dto.id,
    name: dto.name,
    description: dto.description,
    createdAt: dto.created_at,
    status: dto.status,
    type: dto.type,
  }));

export type Role = z.output<typeof roleSchema>;

export const rolesSchema = z.array(roleSchema);

/** What the alta/edición form needs, validated at the boundary (Principio II). */
export const roleCreateInputSchema = z.object({
  name: z.string().trim().min(1).max(50),
  description: z
    .string()
    .max(500)
    .nullable()
    .optional()
    .transform((value) => value ?? null),
  typeId: z.union([z.literal(1), z.literal(2)]),
});

export type RoleCreateInput = z.output<typeof roleCreateInputSchema>;

/**
 * What the detail form needs to rename/redescribe an existing role (FR-021): same name rule as
 * creating one, minus `typeId` (fixed since creation, not editable from this form). `description`
 * is a plain string here, unlike `Role.description`: the form has no separate "empty" state, an
 * empty string there simply means "no description" once it reaches `nameChanges` (research D6).
 */
export const roleEditInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, messages.roles.validation.nameRequired)
    .max(50, messages.roles.validation.nameTooLong),
  description: z.string().max(500),
});

export type RoleEditInput = z.output<typeof roleEditInputSchema>;

/** Only the fields of `RoleEditInput` that actually changed from `role`'s own (FR-010, FR-021):
 * what `useSaveRoleDetail`'s `nameChanges` needs. An empty/blank description means "none", same as
 * `Role.description` itself. */
export function nameChangesOf(
  values: RoleEditInput,
  role: Pick<Role, 'name' | 'description'>,
): { readonly name?: string; readonly description?: string | null } {
  const changes: { name?: string; description?: string | null } = {};
  if (values.name !== role.name) {
    changes.name = values.name;
  }
  const description = values.description.trim() === '' ? null : values.description.trim();
  if (description !== role.description) {
    changes.description = description;
  }
  return changes;
}

const MAX_NAME_LENGTH = 50;

/**
 * The name "Duplicar" (Historia 4, FR-014) offers for a copy of `originalName`, avoiding every
 * name in `existingNames` (case-insensitive, as the service compares them): `"X (copia)"`, then
 * `"X (copia 2)"`, `"X (copia 3)"`... The original is trimmed first if the suffix would not
 * otherwise fit in the 50-character limit every role name has.
 */
export function nextDuplicateName(
  originalName: string,
  existingNames: ReadonlySet<string>,
): string {
  let suffix = ' (copia)';
  for (let attempt = 2; ; attempt += 1) {
    const base = originalName.slice(0, Math.max(0, MAX_NAME_LENGTH - suffix.length));
    const candidate = `${base}${suffix}`;
    if (!existingNames.has(candidate.toLowerCase())) {
      return candidate;
    }
    suffix = ` (copia ${attempt})`;
  }
}
