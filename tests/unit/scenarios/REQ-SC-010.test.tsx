import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { scenariosManifest } from '@/features/scenarios/manifest';

describe('REQ-SC-010: Wire ScenariosPanel into manifest', () => {
  it('manifest has correct id and label', () => {
    expect(scenariosManifest.id).toBe('scenarios');
    expect(scenariosManifest.label).toBe('Scenarios');
  });

  it('manifest has an icon', () => {
    expect(scenariosManifest.icon).toBeTruthy();
  });

  it('manifest has scenariosContent component', () => {
    expect(scenariosManifest.scenariosContent).toBeDefined();
    expect(typeof scenariosManifest.scenariosContent).toBe('function');
  });

  it('scenariosContent component renders without crashing', () => {
    const ScenariosContent = scenariosManifest.scenariosContent!;
    
    // Should render without error (even if useScenarioAvailability returns empty data)
    const { container } = render(<ScenariosContent />);
    expect(container).toBeInTheDocument();
  });
});
