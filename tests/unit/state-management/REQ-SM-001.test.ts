import { describe, it, expect } from 'vitest';
import * as atoms from '@/atoms';

describe('REQ-SM-001 — consolidated atom barrel', () => {
  it('re-exports every atom from the prior 4 files', () => {
    // theme
    expect(atoms.themeAtom).toBeDefined();
    // map
    expect(atoms.mapViewportAtom).toBeDefined();
    expect(atoms.inspectedFeatureAtom).toBeDefined();
    expect(atoms.selectionAtom).toBeDefined();
    expect(atoms.basemapAtom).toBeDefined();
    expect(atoms.activeSiteAtom).toBeDefined();
    // draw
    expect(atoms.drawModeAtom).toBeDefined();
    expect(atoms.drawInFlightAtom).toBeDefined();
    expect(atoms.drawCommittedAtom).toBeDefined();
    expect(atoms.queryResultAtom).toBeDefined();
    // time
    expect(atoms.timeRangeAtom).toBeDefined();
    expect(atoms.timeStepAtom).toBeDefined();
    expect(atoms.playingAtom).toBeDefined();
    expect(atoms.playbackSpeedAtom).toBeDefined();
  });
});
