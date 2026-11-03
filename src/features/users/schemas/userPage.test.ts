import { describe, expect, it } from 'vitest';

import { userDto, userListItemDto as itemDto } from '@/test/factories';

import { userPageSchema } from './userPage';
import { uuidOf } from '@/test/ids';

function pageDto(overrides: Record<string, unknown> = {}) {
  return { items: [itemDto()], total: 1, page: 1, page_size: 10, pages: 1, ...overrides };
}

describe('userPageSchema', () => {
  it('turns the DTO of the service into the domain model, with its users already parsed', () => {
    const page = userPageSchema.parse(
      pageDto({
        items: [
          itemDto(),
          itemDto({ id: uuidOf(122), email: 'beto@clinica.com', first_name: 'Beto' }, [
            { id: 2, name: 'Clínica' },
          ]),
        ],
        total: 34,
        page: 3,
        page_size: 25,
        pages: 2,
      }),
    );

    expect(page.items.map((user) => user.firstName)).toEqual(['Ana', 'Beto']);
    expect(page.items[0]?.paternalLastName).toBe('Pérez');
    expect(page.items.map((user) => user.roleTypes)).toEqual([[], [{ id: 2, name: 'Clínica' }]]);
    expect(page).toMatchObject({ total: 34, page: 3, pageSize: 25, pages: 2 });
    expect(page).not.toHaveProperty('page_size');
  });

  it('accepts a page to which no user answers the filters', () => {
    const page = userPageSchema.parse(
      pageDto({ items: [], total: 0, page: 1, page_size: 50, pages: 0 }),
    );

    expect(page.items).toEqual([]);
    expect(page.pages).toBe(0);
  });

  it('accepts a page past the last one, which the service answers with no items', () => {
    expect(
      userPageSchema.safeParse(pageDto({ items: [], total: 34, page: 9, pages: 4 })).success,
    ).toBe(true);
  });

  it.each([1, 100])('accepts a page size of %i, the limits of the service', (pageSize) => {
    expect(userPageSchema.parse(pageDto({ page_size: pageSize })).pageSize).toBe(pageSize);
  });

  it.each([
    ['a negative total', { total: -1 }],
    ['a total that is not an integer', { total: 1.5 }],
    ['page 0', { page: 0 }],
    ['a page that is not an integer', { page: 1.5 }],
    ['a page size of 0', { page_size: 0 }],
    ['a page size above 100', { page_size: 101 }],
    ['a negative number of pages', { pages: -1 }],
    ['items that are not a list', { items: 'ana' }],
    ['a user without an email', { items: [itemDto({ email: '' })] }],
    // An API older than 5.5.0 would ignore the filters: its answer must not pass (research D2).
    ['a user without role_types', { items: [userDto()] }],
  ])('rejects %s', (_label, overrides) => {
    expect(userPageSchema.safeParse(pageDto(overrides)).success).toBe(false);
  });

  it.each(['items', 'total', 'page', 'page_size', 'pages'])('rejects a page without %s', (key) => {
    const dto = Object.fromEntries(Object.entries(pageDto()).filter(([name]) => name !== key));

    expect(userPageSchema.safeParse(dto).success).toBe(false);
  });
});
