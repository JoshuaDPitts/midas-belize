import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { ScenarioMatrix } from '@/features/scenarios/panel/ScenarioMatrix';
import { activeScenarioAtom } from '@/atoms';
import type { ScenarioAvailabilityData } from '@/features/scenarios/panel/ScenariosPanel';

// Mock availability data for all scenarios
const mockAvailability: Record<string, ScenarioAvailabilityData> = {
  basecase: {
    marine: { status: 'published', publishedDatasets: ['test'], partialDatasets: [], missingVariables: [] },
    watershed: { status: 'published', publishedDatasets: ['test'], partialDatasets: [], missingVariables: [] },
    coastal: { status: 'published', publishedDatasets: ['test'], partialDatasets: [], missingVariables: [] },
  },
  A: {
    marine: { status: 'partial', publishedDatasets: [], partialDatasets: ['test'], missingVariables: [] },
    watershed: { status: 'partial', publishedDatasets: [], partialDatasets: ['test'], missingVariables: [] },
    coastal: { status: 'partial', publishedDatasets: [], partialDatasets: ['test'], missingVariables: [] },
  },
  B: {
    marine: { status: 'missing', publishedDatasets: [], partialDatasets: [], missingVariables: ['test'] },
    watershed: { status: 'missing', publishedDatasets: [], partialDatasets: [], missingVariables: ['test'] },
    coastal: { status: 'missing', publishedDatasets: [], partialDatasets: [], missingVariables: ['test'] },
  },
  C: {
    marine: { status: 'published', publishedDatasets: ['test'], partialDatasets: [], missingVariables: [] },
    watershed: { status: 'published', publishedDatasets: ['test'], partialDatasets: [], missingVariables: [] },
    coastal: { status: 'published', publishedDatasets: ['test'], partialDatasets: [], missingVariables: [] },
  },
  D: {
    marine: { status: 'partial', publishedDatasets: [], partialDatasets: ['test'], missingVariables: [] },
    watershed: { status: 'partial', publishedDatasets: [], partialDatasets: ['test'], missingVariables: [] },
    coastal: { status: 'partial', publishedDatasets: [], partialDatasets: ['test'], missingVariables: [] },
  },
  E: {
    marine: { status: 'missing', publishedDatasets: [], partialDatasets: [], missingVariables: ['test'] },
    watershed: { status: 'missing', publishedDatasets: [], partialDatasets: [], missingVariables: ['test'] },
    coastal: { status: 'missing', publishedDatasets: [], partialDatasets: [], missingVariables: ['test'] },
  },
  F: {
    marine: { status: 'published', publishedDatasets: ['test'], partialDatasets: [], missingVariables: [] },
    watershed: { status: 'published', publishedDatasets: ['test'], partialDatasets: [], missingVariables: [] },
    coastal: { status: 'published', publishedDatasets: ['test'], partialDatasets: [], missingVariables: [] },
  },
  G: {
    marine: { status: 'partial', publishedDatasets: [], partialDatasets: ['test'], missingVariables: [] },
    watershed: { status: 'partial', publishedDatasets: [], partialDatasets: ['test'], missingVariables: [] },
    coastal: { status: 'partial', publishedDatasets: [], partialDatasets: ['test'], missingVariables: [] },
  },
};

describe('REQ-SC-007: ScenarioMatrix', () => {
  it('renders 8 cards across 3 groups with correct group labels', () => {
    const store = createStore();
    render(
      <Provider store={store}>
        <ScenarioMatrix availability={mockAvailability} />
      </Provider>
    );

    // Check for 3 group labels (using heading role to distinguish from card names)
    expect(screen.getByRole('heading', { name: /Base Case/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Urban-driven/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /SLR-driven/i })).toBeInTheDocument();

    // Check that all 8 scenarios are present (by their data-scenario-id attribute)
    const cards = screen.getAllByRole('radio');
    expect(cards).toHaveLength(8);
    
    const scenarioIds = cards.map(card => card.getAttribute('data-scenario-id'));
    expect(scenarioIds).toContain('basecase');
    expect(scenarioIds).toContain('A');
    expect(scenarioIds).toContain('B');
    expect(scenarioIds).toContain('C');
    expect(scenarioIds).toContain('D');
    expect(scenarioIds).toContain('E');
    expect(scenarioIds).toContain('F');
    expect(scenarioIds).toContain('G');
  });

  it('active scenario card has aria-checked="true"', () => {
    const store = createStore();
    store.set(activeScenarioAtom, 'basecase');

    render(
      <Provider store={store}>
        <ScenarioMatrix availability={mockAvailability} />
      </Provider>
    );
    
    const cards = screen.getAllByRole('radio');
    const activeCard = cards.find(card => card.getAttribute('data-scenario-id') === 'basecase');
    expect(activeCard).toHaveAttribute('aria-checked', 'true');

    // Other cards should have aria-checked="false"
    const otherCards = cards.filter(card => card.getAttribute('data-scenario-id') !== 'basecase');
    otherCards.forEach(card => {
      expect(card).toHaveAttribute('aria-checked', 'false');
    });
  });

  it('click dispatches activeScenarioAtom setter', () => {
    const store = createStore();
    render(
      <Provider store={store}>
        <ScenarioMatrix availability={mockAvailability} />
      </Provider>
    );

    const cards = screen.getAllByRole('radio');
    const cardB = cards.find(card => card.getAttribute('data-scenario-id') === 'B')!;
    
    expect(store.get(activeScenarioAtom)).toBeNull();
    fireEvent.click(cardB);
    expect(store.get(activeScenarioAtom)).toBe('B');
  });

  it('each card has title showing axes (Erosion / SLR / Urban)', () => {
    const store = createStore();
    render(
      <Provider store={store}>
        <ScenarioMatrix availability={mockAvailability} />
      </Provider>
    );

    const cards = screen.getAllByRole('radio');
    
    // Base case should mention the axes
    const basecaseCard = cards.find(card => card.getAttribute('data-scenario-id') === 'basecase')!;
    expect(basecaseCard).toHaveAttribute('title', expect.stringMatching(/Erosion|SLR|Urban/i));
    
    // Urban scenarios should mention Urban axis
    const cardA = cards.find(card => card.getAttribute('data-scenario-id') === 'A')!;
    expect(cardA).toHaveAttribute('title', expect.stringContaining('Urban'));
    
    // SLR scenarios should mention SLR axis
    const cardD = cards.find(card => card.getAttribute('data-scenario-id') === 'D')!;
    expect(cardD).toHaveAttribute('title', expect.stringContaining('SLR'));
  });

  it('keyboard ArrowLeft/ArrowRight navigates between cards within a group; Enter selects', () => {
    const store = createStore();
    render(
      <Provider store={store}>
        <ScenarioMatrix availability={mockAvailability} />
      </Provider>
    );

    const cards = screen.getAllByRole('radio');
    const urbanCards = cards.filter(card => 
      ['G', 'B'].includes(card.getAttribute('data-scenario-id') || '')
    );
    
    // Focus first urban card (G)
    urbanCards[0].focus();
    expect(document.activeElement).toBe(urbanCards[0]);
    
    // Press ArrowRight to move to card B
    fireEvent.keyDown(urbanCards[0], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(urbanCards[1]);
    
    // Press ArrowLeft to move back to card G
    fireEvent.keyDown(urbanCards[1], { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(urbanCards[0]);
    
    // Press Enter to select card G
    expect(store.get(activeScenarioAtom)).toBeNull();
    fireEvent.keyDown(urbanCards[0], { key: 'Enter' });
    expect(store.get(activeScenarioAtom)).toBe('G');
  });
});
