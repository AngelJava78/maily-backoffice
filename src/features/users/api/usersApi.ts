import { z } from 'zod';

import { ApiError } from '@/shared/api/ApiError';
import type { HttpClient } from '@/shared/api/httpClient';

import { platformUserSchema, type PlatformUser } from '../schemas/user';
import type { CreateUserBody, UpdateUserBody } from '../schemas/userForm';
import { userPageSchema, type UserPage } from '../schemas/userPage';

/**
 * The operations on users of the users service (contracts/users-service.md, U1 to U9). The paths
 * of the service stay in this layer, so a change of contract does not reach the components.
 */
const USERS_PATH = '/api/v1/users';

interface Cancellable {
  readonly signal?: AbortSignal;
}

/** U1: a page of the active users, in the fixed order of the service. */
export function listUsers(
  client: HttpClient,
  { page, pageSize, signal }: Cancellable & { readonly page: number; readonly pageSize: number },
): Promise<UserPage> {
  return client.get(USERS_PATH, {
    schema: userPageSchema,
    query: { page, page_size: pageSize },
    signal,
  });
}

/**
 * U2: the user with this email, whatever its status. Nobody having it is not a failure but a
 * result, so it is `null` and does not go through the error path of the queries (FR-018).
 */
export async function getUserByEmail(
  client: HttpClient,
  email: string,
  { signal }: Cancellable = {},
): Promise<PlatformUser | null> {
  try {
    return await client.get(`${USERS_PATH}/by-email`, {
      schema: platformUserSchema,
      query: { email: email.trim() },
      signal,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404 && error.code === 'user_not_found') {
      return null;
    }
    throw error;
  }
}

/**
 * U4: creates the user, and its access account in the identity provider, in one operation of the
 * service. The body carries the password, so it is never logged. The roles are assigned afterwards.
 */
export function createUser(
  client: HttpClient,
  body: CreateUserBody,
  { signal }: Cancellable = {},
): Promise<PlatformUser> {
  return client.request({
    path: USERS_PATH,
    method: 'POST',
    body,
    schema: platformUserSchema,
    signal,
  });
}

/**
 * U5: changes the name and the last names of an active user. The email is never sent: the service
 * does not carry its change to the access account (clarification 4 of the spec).
 */
export function updateUser(
  client: HttpClient,
  userId: number,
  body: UpdateUserBody,
  { signal }: Cancellable = {},
): Promise<PlatformUser> {
  return client.request({
    path: `${USERS_PATH}/${userId}`,
    method: 'PATCH',
    body,
    schema: platformUserSchema,
    signal,
  });
}

/** U3: one user, whatever its status. It does not include its roles. */
export function getUser(
  client: HttpClient,
  userId: number,
  { signal }: Cancellable = {},
): Promise<PlatformUser> {
  return client.get(`${USERS_PATH}/${userId}`, { schema: platformUserSchema, signal });
}

/**
 * U7: blocks an active user, who can no longer sign in. The service also disables its access
 * account and, if that fails, leaves the user as it was. There is no body.
 */
export function blockUser(
  client: HttpClient,
  userId: number,
  { signal }: Cancellable = {},
): Promise<PlatformUser> {
  return client.request({
    path: `${USERS_PATH}/${userId}/block`,
    method: 'POST',
    schema: platformUserSchema,
    signal,
  });
}

/**
 * U8: unblocks a blocked user, who can sign in again. The service enables its access account first;
 * if the person has none, or the provider fails, the user stays blocked. There is no body.
 */
export function unblockUser(
  client: HttpClient,
  userId: number,
  { signal }: Cancellable = {},
): Promise<PlatformUser> {
  return client.request({
    path: `${USERS_PATH}/${userId}/unblock`,
    method: 'POST',
    schema: platformUserSchema,
    signal,
  });
}

/**
 * U6: deletes an active user. It is a logical deletion: the data and the roles stay and the email
 * stays reserved, and the user can be reactivated. The service disables its access account. The
 * answer is a 204 without a body, and a blocked user has to be unblocked first.
 */
export async function deleteUser(
  client: HttpClient,
  userId: number,
  { signal }: Cancellable = {},
): Promise<void> {
  // The client validates every answer, even an empty one: an empty body is read as `undefined`.
  await client.request({
    path: `${USERS_PATH}/${userId}`,
    method: 'DELETE',
    schema: z.undefined(),
    signal,
  });
}

/**
 * U9: reactivates a deleted user, who recovers the active roles it had. The service enables its
 * access account first; if the person has none, or the provider fails, the user stays deleted.
 */
export function reactivateUser(
  client: HttpClient,
  userId: number,
  { signal }: Cancellable = {},
): Promise<PlatformUser> {
  return client.request({
    path: `${USERS_PATH}/${userId}/reactivate`,
    method: 'POST',
    schema: platformUserSchema,
    signal,
  });
}
