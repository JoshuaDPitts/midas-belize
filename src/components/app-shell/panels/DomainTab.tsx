'use client';
import { useAtom } from 'jotai';
import { activeFeatureAtom } from '@/atoms';
import { useFeatures } from '../hooks/useFeatures';

export function DomainTab() {
  const features = useFeatures();
  const [atomValue, setActiveFeature] = useAtom(activeFeatureAtom);
  const contribs = features.filter((f) => f.domainContent);

  // The atom is the source of truth for the active vertical so external
  // setters (e.g. WS-037 MarineDownstreamHint → 'marine', a future Coastal
  // hint → 'coastal') can switch the domain tab from outside the panel.
  // Local fallback when atom is null: first contributing manifest wins,
  // matching the prior behaviour.
  const activeId =
    atomValue && contribs.some((f) => f.id === atomValue)
      ? atomValue
      : contribs[0]?.id;
  const setActiveId = (id: string) => setActiveFeature(id);

  if (contribs.length === 0) return null;

  if (contribs.length === 1) {
    const C = contribs[0]!.domainContent!.component;
    return <div data-testid="panel-domain"><C /></div>;
  }

  const active = contribs.find((f) => f.id === activeId) ?? contribs[0]!;
  const C = active.domainContent!.component;
  return (
    <div data-testid="panel-domain">
      <div role="tablist" style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {contribs.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={f.id === active.id}
            onClick={() => setActiveId(f.id)}
            style={{
              padding: '4px 10px',
              border: '1px solid var(--glass-border-subtle)',
              borderRadius: 'var(--radius-sm)',
              background: f.id === active.id
                ? 'color-mix(in oklch, var(--color-accent) 14%, transparent)'
                : 'transparent',
              color: f.id === active.id ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: 'var(--font-sans)',
            }}
          >
            {f.domainContent!.sublabel}
          </button>
        ))}
      </div>
      <C />
    </div>
  );
}
