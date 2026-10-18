import { z } from 'zod';

import { platformUserSchema } from './user';

/**
 * A page of the list of users (operation U1 of the users service). The service lists only the
 * active users, so `total` and `pages` leave out the blocked and the deleted ones. The DTO
 * (snake_case) becomes the domain model here, so components never see it (constitution II).
 */
export const userPageSchema = z
  .object({
    items: z.array(platformUserSchema),
    total: z.number().int().min(0),
    page: z.number().int().min(1),
    page_size: z.number().int().min(1).max(100),
    pages: z.number().int().min(0),
  })
  .transform((dto) => ({
    items: dto.items,
    total: dto.total,
    page: dto.page,
    pageSize: dto.page_size,
    pages: dto.pages,
  }));

export type UserPage = z.output<typeof userPageSchema>;
