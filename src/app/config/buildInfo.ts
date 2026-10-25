import { z } from 'zod';

import type { BackofficeBuild } from '@/features/health';

/** A semantic version, as `version` of `package.json` (research D18). */
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
/** A commit of 7 to 64 hexadecimal characters. */
const COMMIT = /^[0-9a-f]{7,64}$/i;

/** The datum when it follows its format; `null`, «No disponible», otherwise. */
const orNull =
  (schema: z.ZodType<string>) =>
  (value: string): string | null => {
    const parsed = schema.safeParse(value);
    return parsed.success ? parsed.data : null;
  };

const version = orNull(z.string().regex(SEMVER));
const commit = orNull(z.string().regex(COMMIT));
const buildDate = orNull(z.iso.datetime({ offset: true }));

/**
 * The identification of this build of the Backoffice (FR-044, FR-045, research D18): the version of
 * `package.json` and the commit and the date that the build was given. A datum that is missing or
 * does not follow its format is `null`; it never throws, so it never keeps the application from
 * starting.
 */
export function parseBuildInfo(raw: {
  readonly version: string;
  readonly commit: string;
  readonly buildDate: string;
}): BackofficeBuild {
  return {
    version: version(raw.version.trim()),
    commit: commit(raw.commit.trim()),
    buildDate: buildDate(raw.buildDate.trim()),
  };
}
