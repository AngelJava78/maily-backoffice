import { setupServer } from 'msw/node';

/** MSW server shared by every test; each test registers its own handlers with `server.use()`. */
export const server = setupServer();
