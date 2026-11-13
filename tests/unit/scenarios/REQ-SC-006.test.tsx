import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ScenarioAvailabilityBadges } from '@/features/scenarios/panel/ScenarioAvailabilityBadges';
import type { ScenarioAvailabilityData } from '@/features/scenarios/panel/ScenariosPanel';

describe('REQ-SC-006: ScenarioAvailabilityBadges', () => {
  it('renders 3 dots in M / W / C order', () => {
    const availability: ScenarioAvailabilityData = {
      marine: { status: 'published', publishedDatasets: ['test-marine'], partialDatasets: [], missingVariables: [] },
      watershed: { status: 'partial', publishedDatasets: [], partialDatasets: ['test-watershed'], missingVariables: [] },
      coastal: { status: 'missing', publishedDatasets: [], partialDatasets: [], missingVariables: ['wave'] },
    };

    const { container } = render(<ScenarioAvailabilityBadges scenarioId="A" availability={availability} />);
    const dots = container.querySelectorAll('[data-domain]');

    expect(dots).toHaveLength(3);
    expect(dots[0]).toHaveAttribute('data-domain', 'marine');
    expect(dots[1]).toHaveAttribute('data-domain', 'watershed');
    expect(dots[2]).toHaveAttribute('data-domain', 'coastal');
  });

  it('dot colors driven by status via data-status attribute', () => {
    const availability: ScenarioAvailabilityData = {
      marine: { status: 'published', publishedDatasets: ['test-marine'], partialDatasets: [], missingVariables: [] },
      watershed: { status: 'partial', publishedDatasets: [], partialDatasets: ['test-watershed'], missingVariables: [] },
      coastal: { status: 'missing', publishedDatasets: [], partialDatasets: [], missingVariables: ['wave'] },
    };

    const { container } = render(<ScenarioAvailabilityBadges scenarioId="A" availability={availability} />);
    const dots = container.querySelectorAll('[data-domain]');

    expect(dots[0]).toHaveAttribute('data-status', 'published');
    expect(dots[1]).toHaveAttribute('data-status', 'partial');
    expect(dots[2]).toHaveAttribute('data-status', 'missing');
  });

  it('title attribute lists scenario id + domain status summary', () => {
    const availability: ScenarioAvailabilityData = {
      marine: { status: 'published', publishedDatasets: ['test-marine-1', 'test-marine-2'], partialDatasets: [], missingVariables: [] },
      watershed: { status: 'partial', publishedDatasets: ['test-watershed'], partialDatasets: ['test-watershed-partial'], missingVariables: [] },
      coastal: { status: 'missing', publishedDatasets: [], partialDatasets: [], missingVariables: ['wave', 'erosion'] },
    };

    const { container } = render(<ScenarioAvailabilityBadges scenarioId="B" availability={availability} />);
    const dots = container.querySelectorAll('[data-domain]');

    // Marine: published (2 datasets)
    expect(dots[0]).toHaveAttribute('title', expect.stringContaining('Marine'));
    expect(dots[0]).toHaveAttribute('title', expect.stringContaining('published'));

    // Watershed: partial
    expect(dots[1]).toHaveAttribute('title', expect.stringContaining('Watershed'));
    expect(dots[1]).toHaveAttribute('title', expect.stringContaining('partial'));

    // Coastal: missing
    expect(dots[2]).toHaveAttribute('title', expect.stringContaining('Coastal'));
    expect(dots[2]).toHaveAttribute('title', expect.stringContaining('missing'));
  });

  it('aria-label describes status per domain for screen readers', () => {
    const availability: ScenarioAvailabilityData = {
      marine: { status: 'published', publishedDatasets: ['test-marine'], partialDatasets: [], missingVariables: [] },
      watershed: { status: 'partial', publishedDatasets: [], partialDatasets: ['test-partial'], missingVariables: [] },
      coastal: { status: 'missing', publishedDatasets: [], partialDatasets: [], missingVariables: ['wave'] },
    };

    const { container } = render(<ScenarioAvailabilityBadges scenarioId="C" availability={availability} />);
    
    // The container should have an aria-label describing all three domains
    const wrapper = container.querySelector('[aria-label]');
    expect(wrapper).toHaveAttribute('aria-label', expect.stringContaining('Scenario C availability'));
    expect(wrapper).toHaveAttribute('aria-label', expect.stringContaining('Marine'));
    expect(wrapper).toHaveAttribute('aria-label', expect.stringContaining('Watershed'));
    expect(wrapper).toHaveAttribute('aria-label', expect.stringContaining('Coastal'));
  });
});
