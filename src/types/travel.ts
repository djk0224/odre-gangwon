export type RegionId =
  | "gangneung"
  | "sokcho"
  | "yangyang"
  | "chuncheon"
  | "pyeongchang"
  | "jeongseon";

export type PlaceCategory =
  | "sea"
  | "lake"
  | "forest"
  | "market"
  | "museum"
  | "cafe-street"
  | "restaurant"
  | "cafe";

export type BudgetLevel = "standard" | "comfort" | "premium";

export type MobilityPreference = "compact" | "balanced" | "spacious";

export type TravelDuration = "half-day" | "one-day" | "two-days";

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface KakaoLatLng {
  getLat(): number;
  getLng(): number;
}

export interface KakaoMap {
  setCenter(position: KakaoLatLng): void;
  setBounds(bounds: KakaoLatLngBounds): void;
}

export interface KakaoLatLngBounds {
  extend(position: KakaoLatLng): void;
}

export interface KakaoMapsApi {
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  LatLngBounds: new () => KakaoLatLngBounds;
  Map: new (
    container: HTMLElement,
    options: { center: KakaoLatLng; level: number },
  ) => KakaoMap;
  Marker: new (options: { map: KakaoMap; position: KakaoLatLng; title?: string }) => unknown;
  Polyline: new (options: {
    map: KakaoMap;
    path: KakaoLatLng[];
    strokeWeight: number;
    strokeColor: string;
    strokeOpacity: number;
    strokeStyle: string;
  }) => unknown;
  load(callback: () => void): void;
}

export interface KakaoWindow extends Window {
  kakao?: {
    maps?: KakaoMapsApi;
  };
}

export interface TravelStyle {
  id: string;
  label: string;
  description: string;
}

export interface Region {
  id: RegionId;
  name: string;
  englishName: string;
  headline: string;
  description: string;
  mood: string;
  matchScore: number;
  tags: string[];
  reasons: string[];
  gradient: string;
  coordinates: Coordinates;
}

export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  region: RegionId;
  description: string;
  signature: string;
  tags: string[];
  estimatedDuration: string;
  distanceNote: string;
  recommendationReason: string;
  gradient: string;
  imageUrl?: string;
  coordinates: Coordinates;
}

export interface TripPreferences {
  travelDate: string;
  travelers: number;
  duration: TravelDuration;
  travelStyleIds: string[];
  regionPreference?: RegionId;
  mobilityPreference: MobilityPreference;
  foodPreferenceIds: string[];
  budgetLevel: BudgetLevel;
}

export interface ItineraryStop {
  id: string;
  order: number;
  placeName: string;
  category: PlaceCategory;
  timeLabel: string;
  duration: string;
  note: string;
  coordinates: Coordinates;
}

export interface ItineraryTimelineItem {
  id: string;
  time: string;
  title: string;
  description: string;
  duration: string;
}

export interface Itinerary {
  id: string;
  region: RegionId;
  title: string;
  summary: string;
  totalDuration: string;
  movingTime: string;
  aiExplanation: string;
  stops: ItineraryStop[];
  timeline: ItineraryTimelineItem[];
  alternatives: string[];
}

export interface PlaceRecommendations {
  attractions: Place[];
  restaurants: Place[];
  cafes: Place[];
  explanation: string;
}
