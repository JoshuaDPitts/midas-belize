/**
 * Support-practice (P) factor for RUSLE. There is no global gridded
 * P-factor product. Standard practice in data-sparse regions is P = 1
 * (no conservation practice modeled). For Belize, where contour cropping
 * and terracing are not mapped at scale, this default is the only
 * defensible choice; document it as a methodology assumption in the
 * domain-panel formula card.
 *
 * Returned object includes a `note` so the provenance sidecar can carry
 * the assumption forward into the published catalog.
 */

export interface PFactorResult {
  P: number;
  note: string;
}

export function computeP(): PFactorResult {
  return {
    P: 1.0,
    note:
      'No global conservation-practice raster exists; defaulting to P=1.0 ' +
      '(no support practice modeled). Override per scenario via the ' +
      'scenario engine when intervention data is available.',
  };
}
