import { HttpResponse } from 'msw';

/** A failure for the requests that match, injected by a test. */
export interface FailureRule {
  /** Only the requests with this method; any when it is not given. */
  readonly method?: string;
  /** Only the requests to this path (text for an exact one, or a pattern); any when not given. */
  readonly path?: string | RegExp;
  readonly status: number;
  readonly code: string;
  /** How many matching requests are let through before the failure. */
  readonly after?: number;
}

type Mode =
  | { readonly kind: 'normal' }
  | { readonly kind: 'fail'; readonly status: number; readonly code: string }
  | { readonly kind: 'hang' }
  | { readonly kind: 'defer'; readonly gate: Promise<void> };

export function errorResponse(status: number, code: string): Response {
  return HttpResponse.json({ code, message: `Error ${status}` }, { status });
}

/**
 * The failures a test can ask a simulator for: a request that fails once, every request failing,
 * answers that never come or that wait for the test. `defaultCodes` gives the code of a status
 * that `failAll` receives without one, as the simulated service would answer it.
 */
export function createFailureControls({
  defaultCodes,
}: {
  readonly defaultCodes: ReadonlyMap<number, string>;
}) {
  let mode: Mode = { kind: 'normal' };
  let rules: { readonly rule: FailureRule; skip: number }[] = [];

  function matches(rule: FailureRule, request: Request, path: string): boolean {
    if (rule.method !== undefined && rule.method.toUpperCase() !== request.method) {
      return false;
    }
    if (rule.path === undefined) {
      return true;
    }
    return typeof rule.path === 'string' ? rule.path === path : rule.path.test(path);
  }

  /**
   * What the failures injected make of this request: a response to give, `null` to go on, or no
   * answer at all while the test lets it wait.
   */
  async function intercept(request: Request, path: string): Promise<Response | null> {
    const entry = rules.find((candidate) => matches(candidate.rule, request, path));
    if (entry !== undefined) {
      if (entry.skip > 0) {
        entry.skip -= 1;
      } else {
        rules = rules.filter((candidate) => candidate !== entry);
        return errorResponse(entry.rule.status, entry.rule.code);
      }
    }
    switch (mode.kind) {
      case 'fail':
        return errorResponse(mode.status, mode.code);
      case 'hang':
        return new Promise<Response>(() => undefined);
      case 'defer':
        await mode.gate;
        return null;
      case 'normal':
        return null;
    }
  }

  return {
    intercept,

    controls: {
      /** The next request that matches fails, once; the following ones are answered normally. */
      failNext(rule: FailureRule): void {
        rules = [...rules, { rule, skip: rule.after ?? 0 }];
      },
      /** From now on every request fails, as a service that is down. */
      failAll(status: number, code = defaultCodes.get(status) ?? 'internal_error'): void {
        mode = { kind: 'fail', status, code };
      },
      /** From now on the requests are received but never answered. */
      hang(): void {
        mode = { kind: 'hang' };
      },
      /** From now on the requests wait until the returned function is called, then are answered. */
      defer(): () => void {
        let release: () => void = () => undefined;
        const gate = new Promise<void>((resolve) => {
          release = resolve;
        });
        mode = { kind: 'defer', gate };
        return release;
      },
      /** Back to answering normally: no failure rule and no waiting. */
      recover(): void {
        mode = { kind: 'normal' };
        rules = [];
      },
    },
  };
}

export type FailureControls = ReturnType<typeof createFailureControls>;
