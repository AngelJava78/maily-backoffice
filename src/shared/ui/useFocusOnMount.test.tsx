import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useFocusOnMount } from './useFocusOnMount';

function Page() {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  return (
    <>
      <button type="button">Before</button>
      <h1 ref={headingRef} tabIndex={-1}>
        Title
      </h1>
    </>
  );
}

describe('useFocusOnMount', () => {
  it('moves the focus to the element when the component mounts', () => {
    render(<Page />);

    expect(screen.getByRole('heading', { name: 'Title' })).toHaveFocus();
  });

  it('does nothing when the ref is not attached to any element', () => {
    function Detached() {
      useFocusOnMount<HTMLHeadingElement>();
      return <p>Nothing to focus</p>;
    }

    expect(() => render(<Detached />)).not.toThrow();
    expect(document.body).toHaveFocus();
  });
});
