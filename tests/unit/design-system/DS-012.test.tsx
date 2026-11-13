import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScenarioSelector } from '@/components/mimes/ScenarioSelector/ScenarioSelector';
import { ComparisonPanel } from '@/components/mimes/ComparisonPanel/ComparisonPanel';
import { DiffOverlayLegend } from '@/components/mimes/DiffOverlayLegend/DiffOverlayLegend';
import { ParameterCard } from '@/components/mimes/ParameterCard/ParameterCard';
import type { Scenario } from '@/types/mimes';

const scenarios: Scenario[] = [
  { id: 'baseline', name: 'Baseline', description: 'Current conditions', assumptions: { fishing: 'moderate', protection: 30 } },
  { id: 'mpa', name: 'MPA Expansion', description: 'Expand marine protected areas', assumptions: { fishing: 'low', protection: 60 } },
  { id: 'bau', name: 'Business as Usual', description: 'No policy change', assumptions: { fishing: 'high', protection: 10 } },
];

describe('DS-012: ScenarioSelector', () => {
  it('renders all scenarios', () => {
    render(<ScenarioSelector scenarios={scenarios} activeId="baseline" onChange={vi.fn()} />);
    expect(screen.getByText('Baseline')).toBeInTheDocument();
    expect(screen.getByText('MPA Expansion')).toBeInTheDocument();
    expect(screen.getByText('Business as Usual')).toBeInTheDocument();
  });

  it('highlights the active scenario', () => {
    render(<ScenarioSelector scenarios={scenarios} activeId="mpa" onChange={vi.fn()} />);
    const active = screen.getByText('MPA Expansion').closest('[data-active]');
    expect(active).toHaveAttribute('data-active', 'true');
  });

  it('fires onChange when a scenario is clicked', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<ScenarioSelector scenarios={scenarios} activeId="baseline" onChange={handler} />);
    await user.click(screen.getByText('MPA Expansion'));
    expect(handler).toHaveBeenCalledWith('mpa');
  });
});

describe('DS-012: ComparisonPanel', () => {
  it('renders both scenario names', () => {
    render(<ComparisonPanel scenarioA={scenarios[0]} scenarioB={scenarios[1]} />);
    expect(screen.getByText('Baseline')).toBeInTheDocument();
    expect(screen.getByText('MPA Expansion')).toBeInTheDocument();
  });

  it('highlights differing parameters', () => {
    const { container } = render(<ComparisonPanel scenarioA={scenarios[0]} scenarioB={scenarios[1]} />);
    const diffs = container.querySelectorAll('[data-diff="true"]');
    expect(diffs.length).toBeGreaterThan(0);
  });
});

describe('DS-012: DiffOverlayLegend', () => {
  it('renders min, max, and scenario labels', () => {
    render(<DiffOverlayLegend min={-50} max={50} unit="%" scenarioA="Baseline" scenarioB="MPA" />);
    expect(screen.getByText('-50')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText(/Baseline/)).toBeInTheDocument();
    expect(screen.getByText(/MPA/)).toBeInTheDocument();
  });

  it('renders a color bar', () => {
    const { container } = render(<DiffOverlayLegend min={-50} max={50} unit="%" scenarioA="A" scenarioB="B" />);
    expect(container.querySelector('[data-colorbar]')).not.toBeNull();
  });
});

describe('DS-012: ParameterCard', () => {
  it('renders scenario name, description, and parameters', () => {
    render(<ParameterCard scenario={scenarios[1]} />);
    expect(screen.getByText('MPA Expansion')).toBeInTheDocument();
    expect(screen.getByText('Expand marine protected areas')).toBeInTheDocument();
    expect(screen.getByText('fishing')).toBeInTheDocument();
    expect(screen.getByText('low')).toBeInTheDocument();
    expect(screen.getByText('protection')).toBeInTheDocument();
    expect(screen.getByText('60')).toBeInTheDocument();
  });
});
