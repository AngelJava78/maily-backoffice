// CORS of the health routes for the origin of the Backoffice (feature 016, research D19, SC-024).
// The direct check and the public status are asked from the browser, so a service that does not
// allow the origin of the Backoffice looks down («No responde») although it works. Run it in each
// environment before giving it as ready, and every time a domain or the configuration changes:
//
//   npm run check:health-cors -- --origin https://backoffice.maily.example \
//     --status https://system-api.maily.example \
//     https://system-api.maily.example https://usuarios.maily.example https://pacientes.maily.example
//
// It asks `/health/live` and `/health/ready` of every base, and `/health/status` of the base given
// with `--status`, with the header `Origin`, as the browser does. It fails when an answer is neither
// a 2xx nor the 503 of the contract, or when it does not allow that origin. One line per route.
// No dependencies: `node:http` and `node:https`, because `fetch` may not let a script set `Origin`.
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';

const TIMEOUT_MS = 10_000;

/** `--origin <origin>`, `--status <base>` and the bases, in any order. */
function parseArguments(argv) {
  const bases = [];
  let origin;
  let status;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--origin') {
      origin = argv[(index += 1)];
    } else if (argument === '--status') {
      status = argv[(index += 1)];
    } else {
      bases.push(argument);
    }
  }
  return { origin, status, bases };
}

/** A GET with `Origin`: its status and the origin it allows, or the error of the network. */
function get(url, origin) {
  return new Promise((resolve) => {
    const target = new URL(url);
    const send = target.protocol === 'https:' ? httpsRequest : httpRequest;
    const request = send(
      target,
      { method: 'GET', headers: { Accept: 'application/json', Origin: origin } },
      (response) => {
        response.resume();
        response.on('end', () => {
          resolve({
            status: response.statusCode ?? 0,
            allowOrigin: response.headers['access-control-allow-origin'],
          });
        });
      },
    );
    request.setTimeout(TIMEOUT_MS, () => {
      request.destroy(new Error(`no answer in ${TIMEOUT_MS / 1000} s`));
    });
    request.on('error', (error) => {
      resolve({ error: error.message });
    });
    request.end();
  });
}

const { origin, status, bases } = parseArguments(process.argv.slice(2));
if (origin === undefined || (bases.length === 0 && status === undefined)) {
  console.error(
    'Usage: node scripts/check-health-cors.mjs --origin <origin> [--status <base>] <base>...',
  );
  process.exit(2);
}

const routes = [
  ...bases.flatMap((base) => [`${base}/health/live`, `${base}/health/ready`]),
  ...(status === undefined ? [] : [`${status}/health/status`]),
];

let failures = 0;
for (const url of routes) {
  const answer = await get(url, origin);
  const allowed = answer.allowOrigin === origin || answer.allowOrigin === '*';
  const answered =
    answer.error === undefined &&
    ((answer.status >= 200 && answer.status < 300) ||
      (answer.status === 503 && url.endsWith('/health/ready')));
  const ok = answered && allowed;
  if (!ok) {
    failures += 1;
  }
  const detail =
    answer.error === undefined
      ? `${answer.status}, Access-Control-Allow-Origin: ${answer.allowOrigin ?? '(none)'}`
      : answer.error;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${url} (${detail})`);
}

if (failures > 0) {
  console.error(
    `${failures} route(s) do not allow ${origin}: the direct check would see them down.`,
  );
  process.exit(1);
}
