import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAtom } from 'jotai';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { activeSiteAtom } from '@/atoms';
import { useSiteUrlSync } from '@/atoms/url-sync';

function Probe() {
  useSiteUrlSync();
  const [site, setSite] = useAtom(activeSiteAtom);
  return (
    <>
      <span data-testid="site">{site ?? 'none'}</span>
      <button onClick={() => setSite('placencia')}>Pick Placencia</button>
    </>
  );
}

describe('REQ-SM-009 — site URL sync', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('writes the site to ?site= when the atom changes', async () => {
    const user = userEvent.setup();
    const captured: { params: URLSearchParams | null } = { params: null };
    render(
      <NuqsTestingAdapter onUrlUpdate={(e) => { captured.params = e.searchParams; }}>
        <Probe />
      </NuqsTestingAdapter>,
    );
    await user.click(screen.getByRole('button'));
    expect(captured.params?.get('site')).toBe('placencia');
  });

  it('reads ?site= into the atom on mount', () => {
    render(
      <NuqsTestingAdapter searchParams="?site=caye-caulker">
        <Probe />
      </NuqsTestingAdapter>,
    );
    expect(screen.getByTestId('site')).toHaveTextContent('caye-caulker');
  });
});
