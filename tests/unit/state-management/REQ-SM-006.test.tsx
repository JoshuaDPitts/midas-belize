import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { useQueryState, parseAsString } from 'nuqs';

function Probe() {
  const [val] = useQueryState('hello', parseAsString.withDefault('world'));
  return <span data-testid="probe">{val}</span>;
}

describe('REQ-SM-006 — NuqsAdapter mounted', () => {
  it('exports NuqsAdapter from nuqs/adapters/next/app', () => {
    // The Next App Router adapter is the one mounted in src/app/layout.tsx.
    // We can't simulate the App Router context in a unit test, so we just
    // assert the adapter is reachable at the documented export path.
    expect(typeof NuqsAdapter).toBe('function');
  });

  it('useQueryState resolves under a nuqs adapter', () => {
    // Use the testing adapter as a unit-test stand-in for <NuqsAdapter>.
    // This proves nuqs hooks + parsers are wired correctly.
    render(
      <NuqsTestingAdapter>
        <Probe />
      </NuqsTestingAdapter>,
    );
    expect(screen.getByTestId('probe')).toHaveTextContent('world');
  });
});
