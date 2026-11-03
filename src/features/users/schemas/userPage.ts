import { z } from 'zod';

import { userListItemSchema } from './userListItem';

/**
 * A page of the list of users (operation U1 of the users service, API 5.5.0). The service lists
 * the users of one status, active or blocked, of every type or of one, so `total` and `pages` count
 * only the users that answer the filters (feature 026). The DTO (snake_case) becomes the domain
 * model here, so components never see it (constitution II).
 */
export const userPageSchema = z
  .object({
    items: z.array(userListItemSchema),
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
