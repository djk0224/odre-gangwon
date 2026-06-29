export type SeasonId = "spring" | "summer" | "autumn" | "winter";

export type TravelPurposeId =
  | "drive"
  | "leisure"
  | "coast"
  | "mountain"
  | "food"
  | "workation";

/** Gangwon travel zones (7 clusters); executable when GW catalog count meets threshold. */
export type TravelZoneId =
  | "samcheok-donghae"
  | "gangneung-yangyang"
  | "sokcho-goseong"
  | "pyeongchang-jeongseon"
  | "yeongwol-jeongseon"
  | "cheorwon-dmz"
  | "wonju-chuncheon";

/** @deprecated Use TravelZoneId — kept for mvpRegion typing */
export type RegionId = TravelZoneId;

export type PlaceCategory =
  | "cave"
  | "sea"
  | "observatory"
  | "cable-car"
  | "market"
  | "trail"
  | "restaurant"
  | "cafe"
  | "experience";

export type CrowdLevel = "low" | "moderate" | "high" | "very-high";

export type CrowdConfidence = "high" | "medium" | "low";

export type TripTheme =
  | "culture"
  | "activity"
  | "history"
  | "experience"
  | "nature"
  | "rest";

export type Transportation = "car" | "public-transit";

export type CompanionType = "solo" | "couple" | "friends" | "family" | "parents";

export type TripPace = "relaxed" | "balanced" | "packed";

export type TravelDuration = "day-trip" | "one-night" | "two-nights" | "three-nights";

export type CareAlertType =
  | "departure"
  | "reservation"
  | "crowd-change"
  | "schedule-adjust"
  | "gap-recommendation"
  | "weather"
  | "transit";

export type CheckInStatus = "pending" | "ready" | "checked-in";

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
  panTo(position: KakaoLatLng): void;
  getLevel(): number;
  setLevel(level: number): void;
}

export interface KakaoLatLngBounds {
  extend(position: KakaoLatLng): void;
}

export interface KakaoCustomOverlay {
  setMap(map: KakaoMap | null): void;
  getContent(): HTMLElement | string;
}

export interface KakaoMarker {
  setMap(map: KakaoMap | null): void;
}

export interface KakaoPolyline {
  setMap(map: KakaoMap | null): void;
}

export interface KakaoMapsApi {
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  LatLngBounds: new () => KakaoLatLngBounds;
  Map: new (
    container: HTMLElement,
    options: { center: KakaoLatLng; level: number },
  ) => KakaoMap;
  Marker: new (options: { map: KakaoMap; position: KakaoLatLng; title?: string }) => KakaoMarker;
  CustomOverlay: new (options: {
    map?: KakaoMap;
    position: KakaoLatLng;
    content: HTMLElement | string;
    xAnchor?: number;
    yAnchor?: number;
  }) => KakaoCustomOverlay;
  Polyline: new (options: {
    map: KakaoMap;
    path: KakaoLatLng[];
    strokeWeight: number;
    strokeColor: string;
    strokeOpacity: number;
    strokeStyle: string;
  }) => KakaoPolyline;
  load(callback: () => void): void;
}

export interface KakaoWindow extends Window {
  kakao?: {
    maps?: KakaoMapsApi;
  };
}

export interface Region {
  id: RegionId;
  name: string;
  englishName: string;
  headline: string;
  description: string;
  mood: string;
  tags: string[];
  gradient: string;
  coordinates: Coordinates;
}

export interface ReservationSlot {
  id: string;
  placeId: string;
  time: string;
  label: string;
  capacity: number;
  reservedCount: number;
  crowdLevel: CrowdLevel;
  expectedWait: string;
}

export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  region: TravelZoneId;
  description: string;
  signature: string;
  tags: string[];
  operatingHours: string;
  estimatedDuration: string;
  distanceNote: string;
  recommendationReason: string;
  gradient: string;
  imageUrl?: string;
  /** 관광공사 GW 등 외부 소스 연락처 */
  contactPhone?: string;
  coordinates: Coordinates;
  reservationRequired: boolean;
  partner: boolean;
  qrAvailable: boolean;
  availableSlots: ReservationSlot[];
}

export type TripLodgingDepotSource =
  | "hub_booking"
  | "wizard_offer"
  | "manual_geocode";

export type LodgingDayType =
  | "day_trip"
  | "arrival_to_hotel"
  | "hotel_loop"
  | "hotel_to_hotel"
  | "departure_from_hotel";

export type SelectionState =
  | "fixed"
  | "included"
  | "suggested"
  | "deferred"
  | "conflict"
  | "weather_alternative";

export type SelectionIntent = "must_go" | "interested" | "exclude" | "ai_delegate";

export interface TripEndpoint {
  label: string;
  coordinates: Coordinates;
}

export interface TripLodgingDepot {
  id: string;
  name: string;
  coordinates: Coordinates;
  address?: string;
  source: TripLodgingDepotSource;
  offerId?: string;
  hubBookingId?: string;
}

export interface TripLodgingNight {
  nightIndex: number;
  depot: TripLodgingDepot;
  stayDate?: string;
  checkInTime?: string;
  checkOutTime?: string;
}

export type TripLodgingPlanMode = "off" | "single" | "per_night";

export interface TripLodgingPlan {
  mode: TripLodgingPlanMode;
  defaultDepot?: TripLodgingDepot;
  nights: TripLodgingNight[];
}

export interface DayLodgingLegSnapshot {
  start?: TripLodgingDepot;
  end?: TripLodgingDepot;
  dayType?: LodgingDayType;
  origin?: TripEndpoint;
  destination?: TripEndpoint;
  estimatedArrivalTime?: string;
  estimatedDepartureTime?: string;
  interHotelTransfer?: {
    from: TripLodgingDepot;
    to: TripLodgingDepot;
    minutes: number;
  };
}

export interface TripPreferences {
  travelDate: string;
  travelers: number;
  duration: TravelDuration;
  /** 여행 관심 카테고리 (다중 선택) */
  themes: TripTheme[];
  transportation: Transportation;
  companion: CompanionType;
  pace: TripPace;
  season: SeasonId;
  travelPurpose: TravelPurposeId;
  zoneId: TravelZoneId;
  origin?: TripEndpoint;
  destination?: TripEndpoint;
}

export type ItineraryDay = 1 | 2 | 3 | 4;

export interface ItineraryStop {
  id: string;
  order: number;
  day: ItineraryDay;
  placeId: string;
  placeName: string;
  category: PlaceCategory;
  /** 내부 혼잡 추정용(표시하지 않음). 사용자별 출발 시각은 일정에 포함하지 않음 */
  timeLabel?: string;
  duration: string;
  note: string;
  movementNote?: string;
  /** 다음 장소까지 예상 이동 시간(분) — preferences.transportation 기준 */
  travelMinutesToNext?: number;
  /** 당일 마지막 관광지 → 숙소 복귀(또는 숙소 이동) 분 */
  returnToLodgingMinutes?: number;
  returnToLodgingLabel?: string;
  coordinates: Coordinates;
  reservationRequired: boolean;
  partner: boolean;
  crowdLevel?: CrowdLevel;
  expectedWait?: string;
  crowdConfidence?: CrowdConfidence;
  selectionState?: SelectionState;
  lockedDay?: ItineraryDay;
  lockedOrder?: number;
  lockedTime?: string;
}

export type TimelineItemKind = "place" | "local" | "lodging";

export interface LocalCommerceOffer {
  id: string;
  name: string;
  category: "market" | "cafe" | "restaurant";
  couponLabel: string;
  discount: string;
  routeNote: string;
  coordinates: Coordinates;
  zoneId?: TravelZoneId;
}

export type FeasibilitySeverity = "warning" | "error";

export interface FeasibilityIssue {
  id: string;
  code: string;
  message: string;
  severity: FeasibilitySeverity;
}

export type ItineraryRoutingSource = "kakao" | "haversine";

export type ExecutionDataMode = "live" | "demo";

export interface ItineraryTimelineItem {
  id: string;
  day: ItineraryDay;
  /** Day 내 방문 순서 */
  order?: number;
  /** @deprecated UI에 표시하지 않음 — order 기준 정렬 */
  time?: string;
  title: string;
  description: string;
  duration: string;
  kind?: TimelineItemKind;
  localOffer?: LocalCommerceOffer;
  reservationRequired?: boolean;
  partner?: boolean;
  crowdLevel?: CrowdLevel;
  expectedWait?: string;
  crowdConfidence?: CrowdConfidence;
  /** 다음 장소까지 이동 안내 (차량/대중교통 · 분) */
  travelLegToNext?: string;
  lodgingDepot?: TripLodgingDepot;
  selectionState?: SelectionState;
}

export interface Itinerary {
  id: string;
  region: TravelZoneId;
  title: string;
  summary: string;
  totalDuration: string;
  movingTime: string;
  aiExplanation: string;
  stops: ItineraryStop[];
  timeline: ItineraryTimelineItem[];
  alternatives: string[];
  reservationPlaceIds: string[];
  /** Gangwon Nature Road segment polyline for map overlay (demo). */
  natureRoadLabel?: string;
  natureRoadPath?: Coordinates[];
  /** 실행 커널 검증 결과 (경고·오류) */
  feasibilityIssues?: FeasibilityIssue[];
  routingSource?: ItineraryRoutingSource;
  executionDataMode?: ExecutionDataMode;
  lodgingPlan?: TripLodgingPlan;
  dayLodgingLegs?: Partial<Record<ItineraryDay, DayLodgingLegSnapshot>>;
}

export interface ReservationPayment {
  amount: number;
  method: string;
  paidAt: string;
}

export type ReservationExecutionStatus =
  | "slot_selected"
  | "payment_pending"
  | "confirmed"
  | "qr_issued"
  | "checked_in"
  | "cancelled";

export interface ReservationRecord {
  id: string;
  placeId: string;
  placeName: string;
  slotId: string;
  slotLabel: string;
  travelers: number;
  confirmedAt: string;
  crowdLevel: CrowdLevel;
  expectedWait: string;
  payment: ReservationPayment;
  executionStatus?: ReservationExecutionStatus;
}

export interface QRTicket {
  id: string;
  reservationId: string;
  placeId: string;
  placeName: string;
  slotLabel: string;
  reservationNumber: string;
  checkInStatus: CheckInStatus;
  issuedAt: string;
}

export type CareAlertAction =
  | { type: "qr-ticket"; placeId?: string }
  | { type: "itinerary-reservation" }
  | { type: "itinerary-edit" }
  | { type: "local-coupons" }
  | { type: "hub-reservations" }
  | { type: "transport-hub" }
  | { type: "place"; placeId: string };

export interface CareAlert {
  id: string;
  type: CareAlertType;
  title: string;
  message: string;
  actionLabel?: string;
  action?: CareAlertAction;
  priority: "low" | "medium" | "high";
  relatedPlaceId?: string;
}

export interface TodayCareStatus {
  headline: string;
  nextAction: string;
  completedReservations: number;
  hubBookings: number;
  pendingCheckIns: number;
  pendingItineraryReservations: number;
}
