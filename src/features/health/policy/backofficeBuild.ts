/**
 * The identification of this build of the Backoffice (FR-044, research D18): `null` is a datum the
 * build was not given, or did not follow its format, and is shown as «No disponible».
 */
export interface BackofficeBuild {
  readonly version: string | null;
  readonly commit: string | null;
  readonly buildDate: string | null;
}
