import { z } from 'zod';

const userStatusSchema = z.object({ id: z.number().int(), name: z.string() });

const dateTimeSchema = z.iso.datetime({ offset: true });

/**
 * A person registered in the platform. It parses the DTO of the users service (snake_case) into
 * the domain model (camelCase), so components never see the DTO (constitution II).
 */
export const platformUserSchema = z
  .object({
    id: z.uuid(),
    auth0_id: z.string().min(1),
    email: z.string().min(1),
    first_name: z.string().min(1),
    paternal_last_name: z.string().min(1),
    maternal_last_name: z.string().nullable(),
    status: userStatusSchema,
    created_at: dateTimeSchema,
    updated_at: dateTimeSchema,
  })
  .transform((dto) => ({
    id: dto.id,
    auth0Id: dto.auth0_id,
    email: dto.email,
    firstName: dto.first_name,
    paternalLastName: dto.paternal_last_name,
    maternalLastName: dto.maternal_last_name,
    status: dto.status,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  }));

export type PlatformUser = z.output<typeof platformUserSchema>;

/** Name shown in the header: first name and paternal last name. */
export function getDisplayName(user: Pick<PlatformUser, 'firstName' | 'paternalLastName'>): string {
  return `${user.firstName} ${user.paternalLastName}`;
}

/** Name as the list and the detail show it: first name and both last names, if there are two. */
export function getFullName(
  user: Pick<PlatformUser, 'firstName' | 'paternalLastName' | 'maternalLastName'>,
): string {
  return [user.firstName, user.paternalLastName, user.maternalLastName]
    .filter((part): part is string => part !== null)
    .join(' ');
}

/** First letter, in upper case, of each of the first two words. */
export function getInitials(displayName: string): string {
  return displayName
    .split(/\s+/)
    .filter((word) => word !== '')
    .slice(0, 2)
    .map((word) => Array.from(word)[0]?.toUpperCase() ?? '')
    .join('');
}
