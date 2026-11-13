import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ReactNode } from 'react';
import { cleanup, render, screen, waitFor, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SWRConfig } from 'swr';
import {
  SchemaEditor,
  validateSchemaSnippet,
} from '@/app/admin/data/components/SchemaEditor';
import { SampleRowsPreview } from '@/app/admin/data/components/SampleRowsPreview';
import { useDriftTicket } from '@/app/admin/data/hooks/useDriftTicket';

const swrWrapper = ({ children }: { children: ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
);

afterEach(() => cleanup());

describe('REQ-DL-043 — validateSchemaSnippet', () => {
  it('rejects empty / whitespace-only input', () => {
    expect(validateSchemaSnippet('')).toBe('Snippet is empty.');
    expect(validateSchemaSnippet('   \n  ')).toBe('Snippet is empty.');
  });

  it('rejects snippet without a map() function', () => {
    expect(validateSchemaSnippet('function foo() { return 1; }')).toBe(
      'Snippet must define a map() function.',
    );
  });

  it('rejects map() without a return statement', () => {
    expect(
      validateSchemaSnippet('map(row) { console.log(row); }'),
    ).toBe('map() should return something.');
  });

  it('accepts a well-formed map() snippet', () => {
    expect(
      validateSchemaSnippet('map(row) { return { polygon_id: row.Polygon_ID }; }'),
    ).toBeNull();
  });
});

describe('REQ-DL-043 — SchemaEditor', () => {
  it('seeds the textarea with the default template (which is itself a valid skeleton)', () => {
    const onChange = vi.fn();
    const { container } = render(<SchemaEditor onChange={onChange} />);
    expect(container.querySelector('[data-schema-editor]')).not.toBeNull();
    const ta = screen.getByLabelText('New schema map() snippet') as HTMLTextAreaElement;
    expect(ta.value).toContain('map(row)');
    expect(ta.value).toContain('return');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('reports an empty-snippet error and clears it once the user provides a valid map()', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SchemaEditor initial="" onChange={onChange} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Snippet is empty.');
    const ta = screen.getByLabelText('New schema map() snippet') as HTMLTextAreaElement;
    // userEvent.type interprets `{` and `}` as keyboard modifiers; doubling
    // them produces literal characters.
    await user.clear(ta);
    // userEvent interprets `{` as a keyboard-modifier opener (must double to
    // escape); `}` is treated as a literal in this position, so it must NOT
    // be doubled.
    await user.type(ta, 'map(row) {{ return row; }');
    expect(screen.queryByRole('alert')).toBeNull();
    const lastCall = onChange.mock.calls.at(-1);
    expect(lastCall?.[0]).toBe('map(row) { return row; }');
    expect(lastCall?.[1]).toBeNull();
  });

  it('marks the textarea aria-invalid when the snippet is invalid', () => {
    render(<SchemaEditor initial="not a snippet" onChange={() => undefined} />);
    expect(screen.getByLabelText('New schema map() snippet')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });
});

describe('REQ-DL-043 — SampleRowsPreview', () => {
  it('renders an empty-state when rows is empty', () => {
    const { container } = render(<SampleRowsPreview rows={[]} />);
    expect(container.querySelector('[data-empty-rows]')).not.toBeNull();
  });

  it('renders one column per unique key across rows + a header row', () => {
    const rows = [
      { Polygon_ID: 1, BIN_Label: 'BIN-A' },
      { Polygon_ID: 2, NewCol: 'extra' },
    ];
    const { container } = render(<SampleRowsPreview rows={rows} />);
    const headers = container.querySelectorAll('th');
    expect(headers.length).toBe(3);
    expect(Array.from(headers).map((h) => h.textContent)).toEqual([
      'Polygon_ID',
      'BIN_Label',
      'NewCol',
    ]);
  });

  it('shows em-dash for missing cell values', () => {
    const rows = [{ Polygon_ID: 1 }, { BIN_Label: 'BIN-X' }];
    const { container } = render(<SampleRowsPreview rows={rows} />);
    const cells = container.querySelectorAll('td');
    const texts = Array.from(cells).map((c) => c.textContent);
    expect(texts).toContain('—');
    expect(texts).toContain('BIN-X');
  });

  it('caps rendered rows at limit and shows a footnote', () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({ idx: i }));
    const { container } = render(<SampleRowsPreview rows={rows} limit={5} />);
    expect(container.querySelectorAll('tbody tr').length).toBe(5);
    expect(screen.getByText(/Showing 5 of 25/)).toBeInTheDocument();
  });
});

describe('REQ-DL-043 — useDriftTicket hook', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('returns null ticket + loading=false when driftId is null', () => {
    const { result } = renderHook(() => useDriftTicket(null), { wrapper: swrWrapper });
    expect(result.current.ticket).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fetches /api/ops/drift/{id} and returns the ticket', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          drift: { id: 'd-1', schema_id: 'mimes-polygon-detail', status: 'open' },
        }),
        { headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const { result } = renderHook(() => useDriftTicket('d-1'), { wrapper: swrWrapper });
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.ticket?.id).toBe('d-1');
    expect(global.fetch).toHaveBeenCalledWith('/api/ops/drift/d-1');
  });

  it('URL-encodes the drift id', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ drift: { id: 'a/b' } }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    renderHook(() => useDriftTicket('a/b'), { wrapper: swrWrapper });
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalledWith('/api/ops/drift/a%2Fb');
  });
});
