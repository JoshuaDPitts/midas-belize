export interface EBINEntry {
  binLabel: string;
  minDepth: number;
  maxDepth: number;
  ecosystemType: string;
  value?: number;
}

export interface FoodWebGuild {
  id: string;
  name: string;
  biomass: number;
  preyIds: string[];
}

export type FlowDirection = 'increasing' | 'decreasing' | 'stable';

export interface TimePoint {
  date: string;
  values: Record<string, number>;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  assumptions: Record<string, string | number>;
}

export interface CoBenefit {
  name: string;
  value: number;
}

export interface ServiceCell {
  ecosystemType: string;
  service: string;
  supply: number;
}

export interface NbSScore {
  locationName: string;
  restorationPotential: number;
  conservationValue: number;
  combinedScore: number;
}
