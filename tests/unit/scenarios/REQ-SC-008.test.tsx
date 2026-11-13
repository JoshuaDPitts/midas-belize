import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarineOutlookGroup } from '@/features/scenarios/panel/MarineOutlookGroup';
import type { ScenarioAvailabilityData } from '@/features/scenarios/panel/ScenariosPanel';

describe('REQ-SC-008: MarineOutlookGroup', () => {
  it('renders 3 pills with correct shortLabels (Restoration / Worst-case / Degradation)', () => {
    const availability: Record<string, ScenarioAvailabilityData> = {
      res: {
        marine: { status: 'published', publishedDatasets: ['test'], partialDatasets: [], missingVariables: [] },
        watershed: { status: 'missing', publishedDatasets: [], partialDatasets: [], missingVariables: [] },
        coastal: { status: 'missing', publishedDatasets: [], partialDatasets: [], missingVariables: [] },
      },
      wc: {
        marine: { status: 'partial', publishedDatasets: [], partialDatasets: ['test'], missingVariables: [] },
        watershed: { status: 'missing', publishedDatasets: [], partialDatasets: [], missingVariables: [] },
        coastal: { status: 'missing', publishedDatasets: [], partialDatasets: [], missingVariables: [] },
      },
      deg: {
        marine: { status: 'missing', publishedDatasets: [], partialDatasets: [], missingVariables: ['test'] },
        watershed: { status: 'missing', publishedDatasets: [], partialDatasets: [], missingVariables: [] },
        coastal: { status: 'missing', publishedDatasets: [], partialDatasets: [], missingVariables: [] },
      },
    };

    render(<MarineOutlookGroup availability={availability} />);

    // Check for the section title
    expect(screen.getByText(/Marine outlook/i)).toBeInTheDocument();

    // Check for 3 pills with correct labels
    expect(screen.getByText('Restoration')).toBeInTheDocument();
    expect(screen.getByText('Worst-case')).toBeInTheDocument();
    expect(screen.getByText('Degradation')).toBeInTheDocument();
  });

  it('section hidden when useScenarioAvailability returns no Marine outlook entries', () => {
    const availability: Record<string, ScenarioAvailabilityData> = {
      res: {
        marine: { status: 'missing', publishedDatasets: [], partialDatasets: [], missingVariables: [] },
        watershed: { status: 'missing', publishedDatasets: [], partialDatasets: [], missingVariables: [] },
        coastal: { status: 'missing', publishedDatasets: [], partialDatasets: [], missingVariables: [] },
      },
      wc: {
        marine: { status: 'missing', publishedDatasets: [], partialDatasets: [], missingVariables: [] },
        watershed: { status: 'missing', publishedDatasets: [], partialDatasets: [], missingVariables: [] },
        coastal: { status: 'missing', publishedDatasets: [], partialDatasets: [], missingVariables: [] },
      },
      deg: {
        marine: { status: 'missing', publishedDatasets: [], partialDatasets: [], missingVariables: [] },
        watershed: { status: 'missing', publishedDatasets: [], partialDatasets: [], missingVariables: [] },
        coastal: { status: 'missing', publishedDatasets: [], partialDatasets: [], missingVariables: [] },
      },
    };

    const { container } = render(<MarineOutlookGroup availability={availability} />);

    // Section should not render at all when all marine outlooks are missing
    expect(container.firstChild).toBeNull();
  });

  it('each pill has title attribute with description', () => {
    const availability: Record<string, ScenarioAvailabilityData> = {
      res: {
        marine: { status: 'published', publishedDatasets: ['test'], partialDatasets: [], missingVariables: [] },
        watershed: { status: 'missing', publishedDatasets: [], partialDatasets: [], missingVariables: [] },
        coastal: { status: 'missing', publishedDatasets: [], partialDatasets: [], missingVariables: [] },
      },
      wc: {
        marine: { status: 'partial', publishedDatasets: [], partialDatasets: ['test'], missingVariables: [] },
        watershed: { status: 'missing', publishedDatasets: [], partialDatasets: [], missingVariables: [] },
        coastal: { status: 'missing', publishedDatasets: [], partialDatasets: [], missingVariables: [] },
      },
      deg: {
        marine: { status: 'partial', publishedDatasets: [], partialDatasets: ['test'], missingVariables: [] },
        watershed: { status: 'missing', publishedDatasets: [], partialDatasets: [], missingVariables: [] },
        coastal: { status: 'missing', publishedDatasets: [], partialDatasets: [], missingVariables: [] },
      },
    };

    render(<MarineOutlookGroup availability={availability} />);

    const buttons = screen.getAllByRole('button');
    
    // Each button should have a title attribute with the outlook description
    expect(buttons[0]).toHaveAttribute('title', expect.stringContaining('restoration'));
    expect(buttons[1]).toHaveAttribute('title', expect.stringContaining('Worst-case'));
    expect(buttons[2]).toHaveAttribute('title', expect.stringContaining('degradation'));
  });
});
