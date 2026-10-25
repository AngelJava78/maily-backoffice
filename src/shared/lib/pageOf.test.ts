import { describe, expect, it } from 'vitest';

import { pageOf } from './pageOf';

/** The numbers from 1 to `count`, in order. */
function numbers(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index + 1);
}

describe('pageOf', () => {
  it('gives the page asked for, with the total and the number of pages', () => {
    const page = pageOf(numbers(20), 2, 10);

    expect(page.items).toEqual(numbers(20).slice(10));
    expect(page).toMatchObject({ total: 20, pages: 2, page: 2, pageWasClamped: false });
  });

  it('gives at most the size of the page, and what is left on the last one', () => {
    expect(pageOf(numbers(20), 1, 25).items).toHaveLength(20);
    expect(pageOf(numbers(20), 1, 25)).toMatchObject({ pages: 1, page: 1 });
    expect(pageOf(numbers(13), 2, 10).items).toEqual([11, 12, 13]);
  });

  it('gives the last page instead of one after it, and says so', () => {
    const page = pageOf(numbers(20), 99, 10);

    expect(page).toMatchObject({ page: 2, pages: 2, pageWasClamped: true });
    expect(page.items).toHaveLength(10);
  });

  it('gives the first page, without pages, for an empty list', () => {
    expect(pageOf([], 1, 10)).toEqual({
      items: [],
      total: 0,
      pages: 0,
      page: 1,
      pageWasClamped: false,
    });
    expect(pageOf([], 3, 10)).toMatchObject({ page: 1, pageWasClamped: true });
  });

  it('does not change the list it receives', () => {
    const items = numbers(5);

    pageOf(items, 1, 2);

    expect(items).toEqual(numbers(5));
  });
});
