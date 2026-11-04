import { expect, test, type Page } from '@playwright/test';

import { messages } from '../src/shared/messages/es';
import { account, hasAccounts } from './fixtures/accounts';
import { signIn } from './fixtures/signIn';

/**
 * The manual walkthrough of feature 027 (quickstart §2, V1 to V28) as a spec, against the real
 * services. It needs A1 (Administrator) and nothing else, so it leaves out what asks for someone
 * else: V3 (the look next to Users, by eye), V14 and the second half of V8 (a person without
 * `roles:update` or `roles:write`) and the screen reader of V26. A reload of the page (V23) is not
 * here either: the tokens live in memory, so a reload goes through the identity provider again.
 *
 * It reads whatever roles the environment has, so it asserts relations (a page holds at most its
 * size, a filter shows only its type, what the footer says adds up) and never names or totals. The
 * only role it creates is «QA role 027 <time>»: it duplicates, blocks, unblocks and deletes it, and a
 * `finally` removes what is left of it even when a step fails.
 *
 * It moves around the application without reloading it (`visit` changes the address through the
 * history, which is what a link does), because a reload would lose the tokens.
 */
const text = messages.roles;

const PAGE_SIZE = 10;
/** `GET /roles/{id}/permissions`: the request that gives the number of permissions of a row. */
const PERMISSIONS_URL = /\/api\/v1\/roles\/(\d+)\/permissions$/;
/** `GET /roles` and `GET /roles?status_id=2`: the lists of the active and of the blocked roles. */
const LIST_PATH = '/api/v1/roles';
const LIST_ROUTE = /\/api\/v1\/roles(\?.*)?$/;
const BLOCK_URL = /\/api\/v1\/roles\/\d+\/block$/;
const DELETE_URL = /\/api\/v1\/roles\/\d+$/;

const heading = (page: Page) => page.getByRole('heading', { level: 1, name: text.title });
const grid = (page: Page) => page.getByRole('grid', { name: text.list.gridLabel });
const dataRows = (page: Page) => grid(page).locator('[role="row"][data-id]');
const roleLink = (page: Page, name: string) => grid(page).getByRole('link', { name, exact: true });
const cell = (page: Page, name: string, field: 'status' | 'type' | 'permissions') =>
  grid(page)
    .locator('[role="row"]', { has: page.getByRole('link', { name, exact: true }) })
    .locator(`[data-field="${field}"]`);
const filterButton = (page: Page, group: string, name: string) =>
  page.getByRole('group', { name: group }).getByRole('button', { name, exact: true });
const typeFilter = (page: Page, name: string) => filterButton(page, text.filters.typeLabel, name);
const statusFilter = (page: Page, name: string) =>
  filterButton(page, text.filters.statusLabel, name);
const rangeLabel = (page: Page) => page.locator('.MuiTablePagination-displayedRows');
const nextPage = (page: Page) => page.getByRole('button', { name: 'Ir a la página siguiente' });
const previousPage = (page: Page) => page.getByRole('button', { name: 'Ir a la página anterior' });
const pageSizeSelect = (page: Page) => page.getByRole('combobox', { name: /Filas por página/ });
const nameField = (page: Page) => page.getByLabel(text.detail.fields.name);
const newRoleButton = (page: Page) => page.getByRole('button', { name: text.newRole });
const backToList = (page: Page) => page.getByRole('link', { name: text.detail.backToList });
const unsavedDialog = (page: Page) =>
  page.getByRole('dialog', { name: text.detail.unsavedChangesTitle });

/** The path and the search of the address, which is how the quickstart writes them. */
function address(page: Page): string {
  const url = new URL(page.url());
  return url.pathname + url.search;
}

/** Goes to an address of the application without reloading it, as a link does. */
async function visit(page: Page, target: string): Promise<void> {
  await page.evaluate((next) => {
    const state: unknown = window.history.state;
    const index =
      typeof state === 'object' && state !== null && 'idx' in state && typeof state.idx === 'number'
        ? state.idx
        : 0;
    window.history.pushState({ idx: index + 1 }, '', next);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, target);
}

/** Goes to the table through the link of the menu, which is how a person gets there. */
async function openTable(page: Page): Promise<void> {
  await page
    .getByRole('navigation', { name: messages.nav.label })
    .getByRole('link', { name: text.title })
    .click();
  // A form with changes that are not saved asks first, and leaving is what this wants.
  const discard = unsavedDialog(page).getByRole('button', {
    name: text.detail.unsavedChangesDiscard,
  });
  await discard.waitFor({ state: 'visible', timeout: 1_000 }).then(
    () => discard.click(),
    () => undefined,
  );
  await expect(heading(page)).toBeVisible();
  await settled(page);
}

async function openRoles(page: Page, search = ''): Promise<void> {
  await page.goto(`/roles${search}`);
  await signIn(page, account('A1'));
  await expect(heading(page)).toBeVisible();
}

/** The table has answered: its progress bar is gone and the footer says how many roles it has. */
async function settled(page: Page): Promise<void> {
  await expect(grid(page)).toBeVisible();
  await expect(grid(page).getByRole('progressbar')).toHaveCount(0);
  await expect(rangeLabel(page)).toHaveText(/\d+\D+\d+ de \d+/);
}

interface Range {
  readonly from: number;
  readonly to: number;
  readonly total: number;
}

async function readRange(page: Page): Promise<Range> {
  const [from = 0, to = 0, total = 0] = (await rangeLabel(page).innerText())
    .match(/\d+/g)
    ?.map(Number) ?? [0, 0, 0];
  return { from, to, total };
}

/**
 * What the footer says once it stops changing: right after an action the address is already the new
 * one while the footer still shows the old page, so a single reading is not enough.
 */
async function range(page: Page): Promise<Range> {
  await settled(page);
  let last = await readRange(page);
  for (let steady = 0, reads = 0; steady < 3 && reads < 60; reads += 1) {
    await page.waitForTimeout(100);
    const next = await readRange(page);
    const same = next.from === last.from && next.to === last.to && next.total === last.total;
    steady = same ? steady + 1 : 0;
    last = next;
  }
  return last;
}

/** The rows a page must hold: the page size, or what is left of the total. */
function rowsOf(total: number, pageNumber: number, pageSize = PAGE_SIZE): number {
  return Math.max(0, Math.min(pageSize, total - (pageNumber - 1) * pageSize));
}

function lastPage(total: number, pageSize = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** The text of one column of every row that is shown. */
async function column(page: Page, field: 'status' | 'type' | 'permissions'): Promise<string[]> {
  const cells = grid(page).locator(`[role="row"][data-id] [data-field="${field}"]`);
  return (await cells.allInnerTexts()).map((value) => value.trim());
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function confirmDialog(page: Page, title: string, button: string): Promise<void> {
  const dialog = page.getByRole('dialog', { name: title });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: button, exact: true }).click();
  await expect(dialog).toBeHidden();
}

async function createRole(page: Page, name: string): Promise<void> {
  await newRoleButton(page).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(text.detail.fields.name).fill(name);
  await dialog.getByLabel(text.detail.fields.type).click();
  await page.getByRole('option', { name: text.filters.type.system }).click();
  await dialog.getByRole('button', { name: text.form.create }).click();
  await expect(page).toHaveURL(/\/roles\/\d+$/);
  await expect(nameField(page)).toHaveValue(name);
}

/** Opens a role from the table, in whatever filters the table has, and waits for its screen. */
async function openFromTable(page: Page, name: string): Promise<void> {
  await roleLink(page, name).click();
  await expect(page).toHaveURL(/\/roles\/\d+$/);
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
}

/**
 * Removes the roles of a run that a failed step left behind, wherever they are: a blocked one is
 * unblocked first, since a blocked role cannot be deleted. Best effort: it never throws.
 */
async function removeLeftovers(page: Page, prefix: string): Promise<void> {
  const mine = new RegExp(`^${escapeRegExp(prefix)}`);
  for (let round = 0; round < 6; round += 1) {
    let found = false;
    for (const status of [text.filters.status.active, text.filters.status.blocked]) {
      try {
        await openTable(page);
        await statusFilter(page, status).click();
        await pageSizeSelect(page).click();
        await page.getByRole('option', { name: '50', exact: true }).click();
        await settled(page);
        const link = grid(page).getByRole('link', { name: mine }).first();
        if ((await link.count()) === 0) {
          continue;
        }
        found = true;
        await link.click();
        await expect(page).toHaveURL(/\/roles\/\d+$/);
        const unblock = page.getByRole('button', { name: text.status.unblock });
        if (await unblock.isVisible()) {
          // The role is active afterwards, wherever this leaves the person: the next round finds it.
          await unblock.click();
          await expect(unblock).toBeHidden();
          continue;
        }
        await page.getByRole('button', { name: text.delete.action }).click();
        await page
          .getByRole('dialog')
          .getByRole('button', { name: text.delete.confirm, exact: true })
          .click();
        await expect(page).toHaveURL(/\/roles(\?.*)?$/);
      } catch {
        // Best effort: the next round looks again.
      }
    }
    if (!found) {
      return;
    }
  }
}

test.describe('the roles section, the walkthrough of feature 027 (A1)', () => {
  test.skip(!hasAccounts('A1'), 'Needs E2E_AUTH0_USER_A1 and E2E_AUTH0_PASSWORD_A1');
  // One after the other, in one worker: a role this spec creates must not move the totals of another.
  test.describe.configure({ mode: 'default' });

  const qaName = `QA role 027 ${Date.now()}`;

  test('V1, V2, V4: a table of roles, with its columns and without sorting, filters or search', async ({
    page,
  }) => {
    await openRoles(page);
    await settled(page);

    // V1: the table fills the screen, with «Nuevo role» next to the title and the filters above it.
    await expect(newRoleButton(page)).toBeVisible();
    await expect(typeFilter(page, text.filters.type.all)).toHaveAttribute('aria-pressed', 'true');
    await expect(statusFilter(page, text.filters.status.active)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // V2: the four columns, in this order, and in every row a link, a status, a type and a count.
    await expect(grid(page).getByRole('columnheader')).toHaveText([
      text.list.columns.name,
      text.list.columns.status,
      text.list.columns.type,
      text.list.columns.permissions,
    ]);
    const { total } = await range(page);
    await expect(dataRows(page)).toHaveCount(rowsOf(total, 1));
    expect(await grid(page).getByRole('link').count()).toBe(rowsOf(total, 1));
    for (const status of await column(page, 'status')) {
      expect(status).toBe(text.list.status.active);
    }
    for (const type of await column(page, 'type')) {
      expect([text.filters.type.system, text.filters.type.clinic]).toContain(type);
    }
    await expect
      .poll(async () =>
        (await column(page, 'permissions')).every((value) => /^(\d+ permisos?|—)$/.test(value)),
      )
      .toBe(true);
    // V4: nothing to sort, filter or search by in the header.
    await expect(
      grid(page).locator(
        '[aria-sort="ascending"], [aria-sort="descending"], .MuiDataGrid-sortIcon',
      ),
    ).toHaveCount(0);
    await expect(grid(page).locator('.MuiDataGrid-columnHeader button')).toHaveCount(0);
    await expect(page.getByRole('searchbox')).toHaveCount(0);
  });

  test('V28: only the permissions of the rows that are shown are asked for, and once', async ({
    page,
  }) => {
    const permissions: string[] = [];
    const lists: string[] = [];
    page.on('response', (response) => {
      const url = new URL(response.url());
      if (response.request().method() !== 'GET') {
        return;
      }
      if (PERMISSIONS_URL.test(url.pathname)) {
        permissions.push(url.pathname);
      } else if (url.pathname.endsWith(LIST_PATH)) {
        lists.push(url.pathname + url.search);
      }
    });

    await openRoles(page);
    const first = await range(page);
    const shown = rowsOf(first.total, 1);
    // One list and one request of permissions for each row that is shown, not for every role.
    await expect.poll(() => permissions.length).toBe(shown);
    expect(new Set(permissions).size).toBe(permissions.length);
    expect(lists.filter((entry) => !entry.includes('status_id'))).toHaveLength(1);

    // Opening a role of the page does not ask again for what the table already asked.
    const firstRole = permissions[0];
    await grid(page).getByRole('link').first().click();
    await expect(page).toHaveURL(/\/roles\/\d+$/);
    await expect(nameField(page)).toBeVisible();
    await page.waitForTimeout(1_000);
    expect(permissions.filter((entry) => entry === firstRole)).toHaveLength(1);
    await backToList(page).click();
    await settled(page);

    // The second page asks for its own rows, and only those.
    if (first.total > PAGE_SIZE) {
      await nextPage(page).click();
      await expect.poll(() => permissions.length).toBe(shown + rowsOf(first.total, 2));
      expect(new Set(permissions).size).toBe(permissions.length);
    }

    // V7 (Red): the blocked roles have no permissions to ask for.
    const before = permissions.length;
    await statusFilter(page, text.filters.status.blocked).click();
    await settled(page);
    await page.waitForTimeout(1_000);
    expect(permissions.length).toBe(before);
  });

  test('V5: the footer pages through the roles and changes the page size', async ({ page }) => {
    await openRoles(page);
    const first = await range(page);
    test.skip(first.total <= PAGE_SIZE, 'Needs more than 10 active roles');

    await expect(previousPage(page)).toBeDisabled();
    await nextPage(page).click();
    await expect(page).toHaveURL(/\/roles\?page=2$/);
    expect(await range(page)).toEqual({
      from: PAGE_SIZE + 1,
      to: Math.min(2 * PAGE_SIZE, first.total),
      total: first.total,
    });
    await expect(dataRows(page)).toHaveCount(rowsOf(first.total, 2));
    await expect(previousPage(page)).toBeEnabled();

    // A bigger page changes the address and takes the table back to the first page.
    await pageSizeSelect(page).click();
    await expect(page.getByRole('option')).toHaveText(['10', '25', '50']);
    await page.getByRole('option', { name: '25', exact: true }).click();
    await expect(page).toHaveURL(/\/roles\?page_size=25$/);
    expect(await range(page)).toEqual({
      from: 1,
      to: Math.min(25, first.total),
      total: first.total,
    });
    await expect(dataRows(page)).toHaveCount(rowsOf(first.total, 1, 25));

    // Back to 10, which is the default: the address does not carry it any more.
    await pageSizeSelect(page).click();
    await page.getByRole('option', { name: '10', exact: true }).click();
    await expect(page).toHaveURL(/\/roles$/);
    expect(await range(page)).toEqual({ from: 1, to: PAGE_SIZE, total: first.total });
  });

  test('V6, V7, V8: the filters show exactly their roles, from page 1, and an empty one says so', async ({
    page,
  }) => {
    await openRoles(page);
    const all = await range(page);

    // From a later page, a filter goes back to the first one with exactly its roles.
    if (all.total > PAGE_SIZE) {
      await nextPage(page).click();
      await expect(page).toHaveURL(/\/roles\?page=2$/);
    }
    await typeFilter(page, text.filters.type.system).click();
    await expect(page).toHaveURL(/\/roles\?type=sistema$/);
    const system = await range(page);
    expect(system.from).toBe(system.total === 0 ? 0 : 1);
    await expect(dataRows(page)).toHaveCount(rowsOf(system.total, 1));
    expect(new Set(await column(page, 'type'))).toEqual(
      new Set(system.total === 0 ? [] : [text.filters.type.system]),
    );

    if (system.total > PAGE_SIZE) {
      await nextPage(page).click();
    }
    await typeFilter(page, text.filters.type.clinic).click();
    await expect(page).toHaveURL(/\/roles\?type=clinica$/);
    const clinic = await range(page);
    await expect(dataRows(page)).toHaveCount(rowsOf(clinic.total, 1));
    expect(new Set(await column(page, 'type'))).toEqual(
      new Set(clinic.total === 0 ? [] : [text.filters.type.clinic]),
    );
    // The two types add up to the whole list of that status.
    expect(system.total + clinic.total).toBe(all.total);

    await typeFilter(page, text.filters.type.all).click();
    expect((await range(page)).total).toBe(all.total);

    // Blocked roles say «Bloqueado» and have no number of permissions (V7).
    if (all.total > PAGE_SIZE) {
      await nextPage(page).click();
    }
    await statusFilter(page, text.filters.status.blocked).click();
    await expect(page).toHaveURL(/\/roles\?status=bloqueados$/);
    const blocked = await range(page);
    await expect(dataRows(page)).toHaveCount(rowsOf(blocked.total, 1));
    for (const status of await column(page, 'status')) {
      expect(status).toBe(text.list.status.blocked);
    }
    for (const permissionsCell of await column(page, 'permissions')) {
      expect(permissionsCell).toBe(text.list.noValue);
    }

    // V8 (first half): a combination without roles says so, and keeps the title, the filters and
    // «Nuevo role». The message of «Todavía no hay roles…» is only offered in Activos.
    const combinations = [
      { type: text.filters.type.clinic, status: text.filters.status.blocked },
      { type: text.filters.type.system, status: text.filters.status.blocked },
      { type: text.filters.type.clinic, status: text.filters.status.active },
      { type: text.filters.type.system, status: text.filters.status.active },
    ];
    let checked = false;
    for (const combination of combinations) {
      await typeFilter(page, combination.type).click();
      await statusFilter(page, combination.status).click();
      if ((await range(page)).total > 0) {
        continue;
      }
      const message =
        combination.status === text.filters.status.blocked
          ? text.list.emptyBlocked
          : combination.type === text.filters.type.clinic
            ? text.list.emptyClinica
            : text.list.emptySistema;
      await expect(grid(page).getByText(message)).toBeVisible();
      await expect(heading(page)).toBeVisible();
      await expect(newRoleButton(page).first()).toBeVisible();
      await expect(page.getByRole('group', { name: text.filters.typeLabel })).toBeVisible();
      checked = true;
      break;
    }
    test.info().annotations.push({
      type: 'V8',
      description: checked ? 'an empty combination was found' : 'no combination is empty here',
    });
  });

  test('V11, V13: a role opens on its own screen and «Volver al listado» and Back return to the table', async ({
    page,
  }) => {
    await openRoles(page, '?type=sistema');
    const sistema = await range(page);
    if (sistema.total > PAGE_SIZE) {
      await nextPage(page).click();
      await expect(page).toHaveURL(/\/roles\?type=sistema&page=2$/);
    }
    await range(page);
    const tableAddress = address(page);
    const tableNames = await grid(page).getByRole('link').allInnerTexts();
    const [name = ''] = tableNames;

    await roleLink(page, name).click();
    await expect(page).toHaveURL(/\/roles\/\d+$/);
    await expect(page.getByRole('heading', { level: 1, name })).toBeFocused();
    await expect(nameField(page)).toHaveValue(name);
    await expect(grid(page)).toHaveCount(0);

    await backToList(page).click();
    await settled(page);
    expect(address(page)).toBe(tableAddress);
    expect(await grid(page).getByRole('link').allInnerTexts()).toEqual(tableNames);

    await roleLink(page, name).click();
    await expect(nameField(page)).toBeVisible();
    await page.goBack();
    await settled(page);
    expect(address(page)).toBe(tableAddress);
    expect(await grid(page).getByRole('link').allInnerTexts()).toEqual(tableNames);
  });

  test('V9: when the list does not load, the table says so and offers to try again', async ({
    page,
  }) => {
    await page.route(LIST_ROUTE, (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ code: 'internal_error' }),
        });
      }
      return route.continue();
    });
    await page.goto('/roles');
    await signIn(page, account('A1'));

    await expect(page.getByText(text.list.loadError.title)).toBeVisible({ timeout: 60_000 });
    await expect(heading(page)).toBeVisible();
    await expect(newRoleButton(page)).toBeVisible();
    await expect(page.getByRole('group', { name: text.filters.typeLabel })).toBeVisible();
    await expect(page.getByRole('group', { name: text.filters.statusLabel })).toBeVisible();

    await page.unroute(LIST_ROUTE);
    await page.getByRole('button', { name: messages.common.retry }).click();
    await settled(page);
    expect((await range(page)).total).toBeGreaterThanOrEqual(0);
    await expect(page.getByText(text.list.loadError.title)).toBeHidden();
  });

  test('V10: when the permissions of one role do not load, its cell says «—» and the table works', async ({
    page,
  }) => {
    let failing: string | null = null;
    await page.route(PERMISSIONS_URL, (route) => {
      const id = PERMISSIONS_URL.exec(new URL(route.request().url()).pathname)?.[1] ?? '';
      failing ??= id;
      if (id === failing) {
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ code: 'internal_error' }),
        });
      }
      return route.continue();
    });
    await openRoles(page);
    await settled(page);

    await expect.poll(() => failing).not.toBeNull();
    const failed = grid(page).locator(`[role="row"][data-id="${failing}"]`);
    await expect(failed.locator('[data-field="permissions"]')).toHaveText(text.list.noValue, {
      timeout: 60_000,
    });
    // The other rows have their number, and the page can still be paged.
    const counts = await column(page, 'permissions');
    expect(counts.filter((value) => value !== text.list.noValue).length).toBeGreaterThan(0);
    await expect(grid(page).getByRole('link').first()).toBeVisible();
  });

  test('V16, V23, V24: addresses that do not exist, are not valid or come from before', async ({
    page,
  }) => {
    await openRoles(page);
    const all = await range(page);
    const [firstId = ''] = await dataRows(page).evaluateAll((rows) =>
      rows.map((row) => row.getAttribute('data-id') ?? ''),
    );
    const [firstName = ''] = await grid(page).getByRole('link').allInnerTexts();

    // V16: a role that does not exist, and an address that is not a role at all.
    await visit(page, '/roles/999999');
    await expect(page.getByText(text.detail.notFound.title)).toBeVisible();
    await expect(backToList(page)).toBeVisible();
    await visit(page, '/roles/abc');
    await expect(page.getByText(messages.notFound.title).first()).toBeVisible();

    // V23: a value that is not valid is replaced by the default, without an error.
    await visit(page, '/roles?type=xyz&status=otro&page=0&page_size=7');
    await settled(page);
    await expect.poll(() => address(page)).toBe('/roles');
    // …and a page after the last one is taken to the last one.
    await visit(page, '/roles?page=99');
    await settled(page);
    const expected = lastPage(all.total);
    await expect
      .poll(() => address(page))
      .toBe(expected === 1 ? '/roles' : `/roles?page=${expected}`);

    // V24: the old links keep opening what they opened.
    await visit(page, '/roles?type=clinica');
    await settled(page);
    await expect(typeFilter(page, text.filters.type.clinic)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await visit(page, `/roles?roleId=${firstId}`);
    await expect(page).toHaveURL(new RegExp(`/roles/${firstId}$`));
    await expect(page.getByRole('heading', { level: 1, name: firstName })).toBeVisible();
    await visit(page, '/roles?roleId=abc');
    await settled(page);
    await expect.poll(() => address(page)).toBe('/roles');
    await visit(page, '/roles?roleId=007');
    await settled(page);
    await expect.poll(() => address(page)).toBe('/roles');
  });

  test('V17 to V22, V12, V15, V25: create, edit, duplicate, block, unblock and delete a role', async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const copyName = `${qaName} (copia)`;
    try {
      // V17: «Nuevo role» works from any filter, and the table it returns to shows the new role.
      await openRoles(page, '?status=bloqueados');
      await settled(page);
      await createRole(page, qaName);
      const roleId = new URL(page.url()).pathname.split('/').pop() ?? '';
      await page.goBack();
      await settled(page);
      await expect
        .soft(statusFilter(page, text.filters.status.active))
        .toHaveAttribute('aria-pressed', 'true');
      await expect.soft(roleLink(page, qaName)).toBeVisible();

      // V12: a permission is given and saved, and the table counts it when it is back.
      await openFromTable(page, qaName);
      const toggle = page.getByRole('button', { name: /^Ver de /, pressed: false }).first();
      await toggle.click();
      await page.getByRole('button', { name: text.detail.save }).click();
      await expect.soft(page.getByText(text.detail.saved)).toBeVisible();
      await expect.soft(page.getByText(/^1 de \d+ permisos$/)).toBeVisible();
      await backToList(page).click();
      await settled(page);
      await expect
        .soft(cell(page, qaName, 'permissions'))
        .toHaveText(text.list.permissionsCount(1));

      // V18: the copy opens with its name ready to edit, and Back returns to the original.
      await openFromTable(page, qaName);
      const originalAddress = address(page);
      await page.getByRole('button', { name: text.detail.duplicate }).click();
      await expect(nameField(page)).toHaveValue(copyName);
      await expect.soft(nameField(page)).toBeFocused();
      await page.goBack();
      await expect.soft(page).toHaveURL(new RegExp(`${escapeRegExp(originalAddress)}$`));
      await page.goForward();
      await expect(nameField(page)).toHaveValue(copyName);

      // V21 (second half): deleting a role with changes that are not saved does not ask again.
      await nameField(page).fill(`${copyName} editada`);
      await page.getByRole('button', { name: text.delete.action }).click();
      await confirmDialog(page, text.delete.confirmTitle(copyName), text.delete.confirm);
      await expect(page).toHaveURL(/\/roles(\?.*)?$/);
      await expect.soft(unsavedDialog(page)).toHaveCount(0);
      await settled(page);
      await expect.soft(roleLink(page, copyName)).toHaveCount(0);

      // V25: with changes that are not saved, every way out asks first.
      await openFromTable(page, qaName);
      await nameField(page).fill(`${qaName} editado`);
      await backToList(page).click();
      await expect.soft(unsavedDialog(page)).toBeVisible();
      await unsavedDialog(page)
        .getByRole('button', { name: text.detail.unsavedChangesStay })
        .click();
      await expect.soft(nameField(page)).toHaveValue(`${qaName} editado`);
      await page.goBack();
      await expect.soft(unsavedDialog(page)).toBeVisible();
      await unsavedDialog(page)
        .getByRole('button', { name: text.detail.unsavedChangesStay })
        .click();
      await page
        .getByRole('navigation', { name: messages.nav.label })
        .getByRole('link', { name: 'Usuarios' })
        .click();
      await expect.soft(unsavedDialog(page)).toBeVisible();
      await unsavedDialog(page)
        .getByRole('button', { name: text.detail.unsavedChangesDiscard })
        .click();
      await expect(page).toHaveURL(/\/users/);
      await openTable(page);

      // V22: when blocking fails, the person stays in the detail, with the error, and can retry.
      await openFromTable(page, qaName);
      await page.route(BLOCK_URL, (route) =>
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ code: 'internal_error' }),
        }),
      );
      await page.getByRole('button', { name: text.status.block, exact: true }).click();
      await confirmDialog(page, text.status.confirmTitle(qaName), text.status.confirm);
      await expect
        .soft(
          page.getByText(
            new RegExp(
              `${escapeRegExp(text.errors.retryable)}|${escapeRegExp(messages.errors.unexpected)}`,
            ),
          ),
        )
        .toBeVisible();
      await expect.soft(page).toHaveURL(new RegExp(`/roles/${roleId}$`));
      await page.unroute(BLOCK_URL);
      await expect
        .soft(page.getByRole('button', { name: text.status.block, exact: true }))
        .toBeEnabled();

      // …and so is deleting: the role stays, and the person can try again.
      await page.route(DELETE_URL, (route) =>
        route.request().method() === 'DELETE'
          ? route.fulfill({
              status: 500,
              contentType: 'application/json',
              body: JSON.stringify({ code: 'internal_error' }),
            })
          : route.continue(),
      );
      await page.getByRole('button', { name: text.delete.action }).click();
      await confirmDialog(page, text.delete.confirmTitle(qaName), text.delete.confirm);
      await expect
        .soft(
          page.getByText(
            new RegExp(
              `${escapeRegExp(text.errors.retryable)}|${escapeRegExp(messages.errors.unexpected)}`,
            ),
          ),
        )
        .toBeVisible();
      await expect.soft(page).toHaveURL(new RegExp(`/roles/${roleId}$`));
      await page.unroute(DELETE_URL);

      // V19: blocking goes back to the table, with the notice, the title focused and the role gone.
      await page.getByRole('button', { name: text.status.block, exact: true }).click();
      await confirmDialog(page, text.status.confirmTitle(qaName), text.status.confirm);
      await expect.soft(page.getByText(text.status.blocked(qaName))).toBeVisible();
      await expect(heading(page)).toBeVisible();
      await expect.soft(heading(page)).toBeFocused();
      await expect.soft(page).toHaveURL(/\/roles(\?.*)?$/);
      await settled(page);
      await expect.soft(roleLink(page, qaName)).toHaveCount(0);

      // V15: the detail of a blocked role has no permissions and no actions but «Desbloquear».
      await statusFilter(page, text.filters.status.blocked).click();
      await settled(page);
      await expect.soft(cell(page, qaName, 'permissions')).toHaveText(text.list.noValue);
      await openFromTable(page, qaName);
      await expect.soft(page.getByText(text.blocked.explanation)).toBeVisible();
      await expect
        .soft(page.getByText(`${text.detail.fields.type}: ${text.filters.type.system}`))
        .toBeVisible();
      await expect
        .soft(page.getByText(`${text.blocked.statusLabel}: ${text.blocked.statusValue}`))
        .toBeVisible();
      for (const hidden of [text.detail.save, text.detail.duplicate, text.delete.action]) {
        await expect.soft(page.getByRole('button', { name: hidden })).toHaveCount(0);
      }

      // V24 (a blocked role): its old link opens its detail and goes back to the filters of the link.
      await visit(page, `/roles?type=sistema&status=bloqueados&roleId=${roleId}`);
      await expect.soft(page.getByText(text.blocked.explanation)).toBeVisible();
      await expect
        .soft(backToList(page))
        .toHaveAttribute('href', '/roles?type=sistema&status=bloqueados');
      await backToList(page).click();
      await settled(page);
      const blockedTable = address(page);
      await openFromTable(page, qaName);

      // V20: unblocking goes back to the table it came from, with the notice and the title focused.
      await page.getByRole('button', { name: text.status.unblock }).click();
      await expect.soft(page.getByText(text.status.unblocked(qaName))).toBeVisible();
      await expect.soft(page).toHaveURL(new RegExp(`${escapeRegExp(blockedTable)}$`));
      await expect.soft(heading(page)).toBeFocused();
      // Wherever it left the person, the role has to be in Activos now.
      if (await backToList(page).isVisible()) {
        await backToList(page).click();
      }
      await settled(page);
      await statusFilter(page, text.filters.status.active).click();
      await settled(page);
      await expect.soft(roleLink(page, qaName)).toBeVisible();

      // V21: deleting a role goes back to the table, and the role is not in it.
      await openFromTable(page, qaName);
      await page.getByRole('button', { name: text.delete.action }).click();
      await confirmDialog(page, text.delete.confirmTitle(qaName), text.delete.confirm);
      await expect(page).toHaveURL(/\/roles(\?.*)?$/);
      await settled(page);
      await expect.soft(roleLink(page, qaName)).toHaveCount(0);
    } finally {
      await page.unrouteAll({ behavior: 'ignoreErrors' });
      await removeLeftovers(page, qaName);
    }
  });

  test('V26: the keyboard reaches every control, in order, and what changes is announced', async ({
    page,
  }) => {
    await openRoles(page);
    const all = await range(page);
    const shown = await grid(page).getByRole('link').allInnerTexts();
    expect(shown.length).toBe(rowsOf(all.total, 1));

    await page.locator('h1').focus();
    const reached: string[] = [];
    for (let step = 0; step < shown.length + 12; step += 1) {
      await page.keyboard.press('Tab');
      reached.push(
        await page.evaluate(() => {
          const element = document.activeElement;
          const label = element?.getAttribute('aria-label') ?? element?.textContent ?? '';
          return label.trim().replace(/\s+/g, ' ');
        }),
      );
    }
    for (const expected of [
      text.newRole,
      text.filters.type.all,
      text.filters.status.active,
      ...shown,
    ]) {
      expect(reached).toContain(expected);
    }
    // The names are reached in the order of the table, and the footer comes after them.
    const namesInOrder = reached.filter((entry) => shown.includes(entry));
    expect(namesInOrder).toEqual(shown);
    if (all.total > PAGE_SIZE) {
      expect(reached.indexOf('Ir a la página siguiente')).toBeGreaterThan(
        reached.lastIndexOf(shown[shown.length - 1] ?? ''),
      );
    }

    // A name with the focus of the keyboard shows it, and Enter opens the role.
    await grid(page).getByRole('link').first().focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    const outline = await page.evaluate(() => {
      const style = getComputedStyle(document.activeElement ?? document.body);
      return { style: style.outlineStyle, width: style.outlineWidth, shadow: style.boxShadow };
    });
    expect(outline.style !== 'none' || outline.shadow !== 'none').toBe(true);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/roles\/\d+$/);
    await expect(nameField(page)).toBeVisible();
    await backToList(page).click();
    await settled(page);

    // What a filter or a page changes is said in the live region, with the numbers of the footer.
    await typeFilter(page, text.filters.type.system).click();
    const system = await range(page);
    await expect(page.getByRole('status').filter({ hasText: /Mostrando/ })).toHaveText(
      text.list.pageStatus(system.from, system.to, system.total),
    );
    await expect(page.getByRole('grid', { name: text.list.gridLabel })).toBeVisible();
    await expect(page.getByRole('columnheader')).toHaveCount(4);
  });

  test.describe('at 320 px', () => {
    test.use({ viewport: { width: 320, height: 640 } });

    test('V27: the table, a role and its dialogs fit the window', async ({ page }) => {
      await openRoles(page);
      await settled(page);

      const overflowOf = (selector: string) =>
        page.evaluate((target) => {
          const element = document.querySelector(target);
          return element === null ? 0 : element.scrollWidth - element.clientWidth;
        }, selector);
      // What this feature puts on the screen does not scroll the page sideways.
      expect(await overflowOf('main')).toBeLessThanOrEqual(0);
      // The menu of the sections is shared by every screen; its overflow is reported, not blamed on Roles.
      const pageOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect
        .soft(pageOverflow, 'the page scrolls sideways: the mobile menu of all the screens')
        .toBeLessThanOrEqual(0);

      await expect(pageSizeSelect(page)).toBeVisible();
      for (const control of [
        newRoleButton(page),
        typeFilter(page, text.filters.type.all),
        statusFilter(page, text.filters.status.blocked),
      ]) {
        const box = await control.boundingBox();
        expect(box).not.toBeNull();
        expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
        expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(320);
      }

      await grid(page).getByRole('link').first().click();
      await expect(nameField(page)).toBeVisible();
      expect(await overflowOf('main')).toBeLessThanOrEqual(0);

      // The dialog of unsaved changes fits the window.
      await nameField(page).fill('QA 027 sin guardar');
      await backToList(page).click();
      const dialog = unsavedDialog(page);
      await expect(dialog).toBeVisible();
      const box = await dialog.boundingBox();
      expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(320);
      await dialog.getByRole('button', { name: text.detail.unsavedChangesDiscard }).click();
      await settled(page);

      // A combination without roles also fits.
      await statusFilter(page, text.filters.status.blocked).click();
      await typeFilter(page, text.filters.type.clinic).click();
      await settled(page);
      expect(await overflowOf('main')).toBeLessThanOrEqual(0);
    });
  });
});
