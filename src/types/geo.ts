export type State = 'mo' | 'ks';

export interface NeighborhoodData {
  name: string;
  slug: string;
  description: string;
  landmarks: string[];
  medianHomeValue: string;
  distressFactors: string[];
  localHook: string;
}

export interface CityData {
  name: string;
  slug: string;
  state: State;
  county: string;
  countySlug: string;
  description: string;
  population: string;
  medianHomeValue: string;
  zipCodes?: string[];
  neighborhoods: NeighborhoodData[];
  authorityBlock: string;
  distanceFromOffice: string;
  marketCondition: 'Seller\'s Market' | 'Buyer\'s Market' | 'Balanced';
  daysOnMarket: string;
  coordinates?: { lat: number; lng: number };
}

export interface CourthouseData {
  name: string;
  address: string;
  phone: string;
  website: string;
  distanceMiles: number;
  mapsCid: string;
}

export interface CountyData {
  name: string;
  slug: string;
  state: State;
  stateName: string;
  description: string;
  seatCity: string;
  population: string;
  medianHomeValue: string;
  taxLienInfo: string;
  probateInfo: string;
  courthouse: CourthouseData;
  taxDeadline: string;
  taxSaleMonth: string;
  taxSaleDates?: string;
  taxSalePattern: string;
  taxSaleDate2026: string;
  taxSaleLocation?: string;
  taxSalePreRegDeadline?: string;
  probateCourtName: string;
  reassessmentCycle: string;
  narrativeHook: string;
  courthouseLandmarks: string;
  countyFaqs: { question: string; answer: string }[];
  cities: CityData[];
}

export interface StateData {
  name: string;
  slug: State;
  fullName: string;
  counties: CountyData[];
}
