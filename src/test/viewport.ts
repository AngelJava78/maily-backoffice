/**
 * A `matchMedia` that answers the width queries of MUI's breakpoints (`useMediaQuery`) as a window
 * `width` px wide would, and "no" to any other query (such as the light/dark preference, as the
 * stub of `setup.ts` does). jsdom has no layout and that stub never matches, so a test that cares
 * about a narrow window puts this one in place with
 * `vi.spyOn(window, 'matchMedia').mockImplementation(matchMediaAtWidth(320))`.
 */
export function matchMediaAtWidth(width: number): (query: string) => MediaQueryList {
  return (query) => {
    const conditions = [...query.matchAll(/\((min|max)-width:\s*([\d.]+)px\)/g)];
    const matches =
      conditions.length > 0 &&
      conditions.every(([, bound, px]) =>
        bound === 'min' ? width >= Number(px) : width <= Number(px),
      );
    return {
      matches,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => true,
      // `MediaQueryList` still declares the deprecated pair, so the stub needs it to be one. MUI
      // subscribes with `addEventListener`; nothing calls these two.
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- required by the type
      addListener: () => undefined,
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- required by the type
      removeListener: () => undefined,
    };
  };
}
