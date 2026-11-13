import type { ReactNode } from 'react';
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import AdminDataLayout from '@/app/admin/data/layout';

const usePathnameMock = vi.fn<() => string>();

vi.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
}));

function installStorage() {
  const store = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(k) {
      return store.has(k) ? store.get(k)! : null;
    },
    key(i) {
      return [...store.keys()][i] ?? null;
    },
    removeItem(k) {
      store.delete(k);
    },
    setItem(k, v) {
      store.set(k, String(v));
    },
  };
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
  Object.defineProperty(window, 'localStorage', { value: storage, configurable: true });
}

function renderShell(pathname: string, body: ReactNode = null) {
  usePathnameMock.mockReturnValue(pathname);
  const store = createStore();
  return render(
    <Provider store={store}>
      <AdminDataLayout>{body}</AdminDataLayout>
    </Provider>,
  );
}

describe('REQ-DL-037 — admin dashboard layout shell', () => {
  beforeAll(() => {
    installStorage();
  });

  beforeEach(() => {
    localStorage.removeItem('midas-theme');
    document.documentElement.removeAttribute('data-theme');
    usePathnameMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the four primary nav links in spec order', () => {
    renderShell('/admin/data');
    const links = screen.getAllByRole('link').map((a) => a.textContent?.trim());
    expect(links).toEqual(['Datasets', 'Pipeline runs', 'Schema drift', 'Discovered files']);
  });

  it('marks Datasets active when pathname is /admin/data', () => {
    renderShell('/admin/data');
    expect(screen.getByRole('link', { name: 'Datasets' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Pipeline runs' })).not.toHaveAttribute('aria-current');
  });

  it('marks Pipeline runs active when pathname is a runs sub-route', () => {
    renderShell('/admin/data/runs/abc-123');
    const active = screen.getByRole('link', { name: 'Pipeline runs' });
    expect(active).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Datasets' })).not.toHaveAttribute('aria-current');
  });

  it('keeps Datasets active when viewing dataset detail under /admin/data/dataset/:id', () => {
    renderShell('/admin/data/dataset/placencia-coast-polygons');
    expect(screen.getByRole('link', { name: 'Datasets' })).toHaveAttribute('aria-current', 'page');
  });

  it('marks Schema drift active for both /drift and /drift/[id]', () => {
    renderShell('/admin/data/drift');
    expect(screen.getByRole('link', { name: 'Schema drift' })).toHaveAttribute('aria-current', 'page');
    cleanup();
    renderShell('/admin/data/drift/abc');
    expect(screen.getByRole('link', { name: 'Schema drift' })).toHaveAttribute('aria-current', 'page');
  });

  it('exposes [data-dashboard-root] as the layout anchor (Playwright selector)', () => {
    const { container } = renderShell('/admin/data');
    expect(container.querySelector('[data-dashboard-root]')).not.toBeNull();
  });

  it('renders a theme toggle whose label matches the current theme', async () => {
    renderShell('/admin/data');
    const button = screen.getByRole('button', { name: 'Switch to Dark' });
    expect(button).toBeInTheDocument();
    await userEvent.click(button);
    expect(screen.getByRole('button', { name: 'Switch to Light' })).toBeInTheDocument();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('renders nested page content via children slot', () => {
    renderShell('/admin/data', <span data-testid="page-body">slot</span>);
    expect(screen.getByTestId('page-body')).toHaveTextContent('slot');
  });
});
