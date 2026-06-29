import type { CrowdLevel, Place, ReservationSlot, TravelZoneId } from "@/types/travel";

function buildSlots(
  placeId: string,
  base: Array<{
    time: string;
    capacity: number;
    reserved: number;
    crowd: CrowdLevel;
    wait: string;
  }>,
): ReservationSlot[] {
  return base.map((slot) => ({
    id: `${placeId}-${slot.time.replace(":", "")}`,
    placeId,
    time: slot.time,
    label: `${slot.time} 입장`,
    capacity: slot.capacity,
    reservedCount: slot.reserved,
    crowdLevel: slot.crowd,
    expectedWait: slot.wait,
  }));
}

export interface PartnerPlaceProfile {
  id: string;
  region: TravelZoneId;
  /** 이름 매칭 (공백 제거·소문자) */
  matchNames: string[];
  patch: Partial<Place> & {
    reservationRequired: boolean;
    partner: boolean;
    qrAvailable: boolean;
    availableSlots: ReservationSlot[];
  };
}

/** 피치·실행 데모용 제휴 명소 — GW 항목과 이름으로 병합 */
export const partnerPlaceProfiles: PartnerPlaceProfile[] = [
  {
    id: "hwanseon-cave",
    region: "samcheok-donghae",
    matchNames: ["환선굴", "삼척환선굴"],
    patch: {
      coordinates: { lat: 37.4317, lng: 129.0572 },
      imageUrl: "/images/zones/samcheok-donghae.png",
      signature: "제휴 · 예약 필수",
      tags: ["동굴", "제휴", "예약", "GW"],
      category: "cave",
      operatingHours: "09:00 - 17:00",
      estimatedDuration: "1시간 30분",
      description: "삼척을 대표하는 동굴로, 입장 시간 예약과 혼잡 안내가 필요한 제휴 명소입니다.",
      recommendationReason: "오전 첫 일정으로 동해안 여행의 핵심 장면을 열어줍니다.",
      reservationRequired: true,
      partner: true,
      qrAvailable: true,
      availableSlots: buildSlots("hwanseon-cave", [
        { time: "10:00", capacity: 80, reserved: 52, crowd: "moderate", wait: "약 15분" },
        { time: "11:30", capacity: 80, reserved: 71, crowd: "high", wait: "약 35분" },
        { time: "14:00", capacity: 80, reserved: 38, crowd: "low", wait: "약 5분" },
      ]),
    },
  },
  {
    id: "samcheok-cablecar",
    region: "samcheok-donghae",
    matchNames: ["삼척해상케이블카", "해상케이블카", "삼척케이블카"],
    patch: {
      coordinates: { lat: 37.2891, lng: 129.3085 },
      imageUrl: "/images/odre-notes/note-samcheok-coastline.jpg",
      signature: "제휴 · 시간 예약",
      tags: ["케이블카", "제휴", "전망", "GW"],
      category: "cable-car",
      operatingHours: "09:00 - 18:00",
      estimatedDuration: "1시간",
      description: "해상 전망과 시간대별 혼잡이 뚜렷한 제휴 액티비티입니다.",
      recommendationReason: "오후 전망 일정의 중심이 되는 실행형 액티비티입니다.",
      reservationRequired: true,
      partner: true,
      qrAvailable: true,
      availableSlots: buildSlots("samcheok-cablecar", [
        { time: "13:00", capacity: 60, reserved: 48, crowd: "high", wait: "약 25분" },
        { time: "14:30", capacity: 60, reserved: 55, crowd: "very-high", wait: "약 40분" },
        { time: "16:00", capacity: 60, reserved: 22, crowd: "low", wait: "약 5분" },
      ]),
    },
  },
  {
    id: "jangho-port",
    region: "samcheok-donghae",
    matchNames: ["장호어촌체험마을", "장호비치캠핑", "장호항"],
    patch: {
      coordinates: { lat: 37.2861, lng: 129.3183 },
      category: "sea",
      signature: "항구 산책",
      tags: ["항구", "해안", "GW"],
      operatingHours: "상시",
      estimatedDuration: "50분",
      description: "장호항 일대 해안 산책과 항구 풍경을 즐기는 동해안 코스입니다.",
      recommendationReason: "케이블카·남부 해안 이동 전 여유 있는 항구 산책 포인트입니다.",
      reservationRequired: false,
      partner: false,
      qrAvailable: false,
      availableSlots: [],
    },
  },
  {
    id: "chuam-candle",
    region: "samcheok-donghae",
    matchNames: ["추암 촛대바위", "추암촛대바위", "추암해변"],
    patch: {
      coordinates: { lat: 37.4795, lng: 129.1602 },
      category: "sea",
      signature: "해안 전망",
      tags: ["추암", "해안", "GW"],
      operatingHours: "상시",
      estimatedDuration: "45분",
      description: "추암 촛대바위와 해안 절경을 함께 보는 대표 산책 포인트입니다.",
      recommendationReason: "동해 북부 해안을 따라 남하하기 전 전망 일정에 맞습니다.",
      reservationRequired: false,
      partner: false,
      qrAvailable: false,
      availableSlots: [],
    },
  },
  {
    id: "nongol-alley",
    region: "samcheok-donghae",
    matchNames: ["논골담길", "삼척 논골담길", "논골"],
    patch: {
      coordinates: { lat: 37.4375, lng: 129.1682 },
      category: "trail",
      signature: "항구 골목 산책",
      tags: ["골목", "벽화", "항구", "GW"],
      operatingHours: "상시",
      estimatedDuration: "50분",
      description: "묵호 항구 언덕을 따라 이어지는 논골담길 벽화·골목 산책 코스입니다.",
      recommendationReason: "묵호등대와 망상해변 사이를 천천히 잇는 동해 북부 골목 코스입니다.",
      reservationRequired: false,
      partner: false,
      qrAvailable: false,
      availableSlots: [],
    },
  },
  {
    id: "mukho-lighthouse",
    region: "samcheok-donghae",
    matchNames: ["묵호항전망대", "묵호등대", "묵호항"],
    patch: {
      coordinates: { lat: 37.5516, lng: 129.1173 },
      category: "observatory",
      signature: "등대·항구 전망",
      tags: ["등대", "항구", "GW"],
      operatingHours: "상시",
      estimatedDuration: "40분",
      description: "묵호항과 등대 전망을 함께 보는 동해 북부 해안 거점입니다.",
      recommendationReason: "동해안 북단에서 시작해 남쪽 삼척 해안으로 이어지기 좋습니다.",
      reservationRequired: false,
      partner: false,
      qrAvailable: false,
      availableSlots: [],
    },
  },
  {
    id: "gy-yangyang-surf",
    region: "gangneung-yangyang",
    matchNames: ["양양서피비치", "서피비치", "죽도해변서핑", "낙산서핑"],
    patch: {
      signature: "제휴 · 레저",
      tags: ["서핑", "액티비티", "제휴", "GW"],
      operatingHours: "09:00 - 18:00",
      estimatedDuration: "2시간",
      description: "서핑과 해변 레저가 중심인 양양 해안 제휴 스팟입니다.",
      recommendationReason: "여름 시즌 레저 테마에 맞는 권역 대표 제휴 포인트입니다.",
      reservationRequired: true,
      partner: true,
      qrAvailable: true,
      availableSlots: buildSlots("gy-yangyang-surf", [
        { time: "10:00", capacity: 40, reserved: 18, crowd: "low", wait: "약 5분" },
        { time: "14:00", capacity: 40, reserved: 32, crowd: "moderate", wait: "약 15분" },
      ]),
    },
  },
  {
    id: "pc-alpensia",
    region: "pyeongchang-jeongseon",
    matchNames: ["알펜시아리조트", "알펜시아", "평창알펜시아"],
    patch: {
      signature: "제휴 · 산악",
      tags: ["레저", "전망", "제휴", "GW"],
      operatingHours: "09:00 - 17:00",
      estimatedDuration: "2시간",
      description: "사계절 레저와 산악 전망이 있는 평창 제휴 거점입니다.",
      recommendationReason: "평창·정선 권역 산악 테마의 중심 제휴 명소입니다.",
      reservationRequired: true,
      partner: true,
      qrAvailable: true,
      availableSlots: buildSlots("pc-alpensia", [
        { time: "11:00", capacity: 50, reserved: 30, crowd: "moderate", wait: "약 10분" },
      ]),
    },
  },
  {
    id: "sc-seorak-cable",
    region: "sokcho-goseong",
    matchNames: ["설악케이블카", "속초설악케이블카", "권금성"],
    patch: {
      signature: "제휴 · 산악",
      tags: ["케이블카", "설악", "제휴", "GW"],
      operatingHours: "09:00 - 17:00",
      estimatedDuration: "1시간 30분",
      description: "설악산 전망과 혼잡 시간대 예약이 필요한 속초·고성 제휴 명소입니다.",
      recommendationReason: "속초·고성 권역 산악·해안 일정의 중심 제휴 포인트입니다.",
      reservationRequired: true,
      partner: true,
      qrAvailable: true,
      availableSlots: buildSlots("sc-seorak-cable", [
        { time: "10:30", capacity: 70, reserved: 45, crowd: "moderate", wait: "약 15분" },
        { time: "14:00", capacity: 70, reserved: 58, crowd: "high", wait: "약 25분" },
      ]),
    },
  },
  {
    id: "yw-donggang-raft",
    region: "yeongwol-jeongseon",
    matchNames: ["동강뗏목", "동강", "영월뗏목"],
    patch: {
      signature: "제휴 · 레저",
      tags: ["뗏목", "동강", "제휴", "GW"],
      operatingHours: "09:00 - 17:00",
      estimatedDuration: "2시간",
      description: "동강 레저와 계절별 혼잡이 뚜렷한 영월·정선 제휴 체험입니다.",
      recommendationReason: "영월·정선 권역 액티비티 테마의 대표 제휴 코스입니다.",
      reservationRequired: true,
      partner: true,
      qrAvailable: true,
      availableSlots: buildSlots("yw-donggang-raft", [
        { time: "11:00", capacity: 36, reserved: 20, crowd: "low", wait: "약 5분" },
        { time: "15:00", capacity: 36, reserved: 28, crowd: "moderate", wait: "약 12분" },
      ]),
    },
  },
  {
    id: "cw-dmz-center",
    region: "cheorwon-dmz",
    matchNames: ["철원두루미생태관", "두루미생태관", "평화전망대"],
    patch: {
      signature: "제휴 · DMZ",
      tags: ["DMZ", "역사", "제휴", "GW"],
      operatingHours: "09:00 - 17:00",
      estimatedDuration: "1시간 30분",
      description: "접경·평화 테마 일정에 맞춘 철원 제휴 입장 명소입니다.",
      recommendationReason: "철원·접경 권역 역사·DMZ 동선의 핵심 제휴 포인트입니다.",
      reservationRequired: true,
      partner: true,
      qrAvailable: true,
      availableSlots: buildSlots("cw-dmz-center", [
        { time: "10:00", capacity: 40, reserved: 22, crowd: "low", wait: "약 5분" },
        { time: "13:30", capacity: 40, reserved: 31, crowd: "moderate", wait: "약 10분" },
      ]),
    },
  },
  {
    id: "wc-chuncheon-lake",
    region: "wonju-chuncheon",
    matchNames: ["춘천레GO랜드", "레고랜드", "소양강스카이워크"],
    patch: {
      signature: "제휴 · 레저",
      tags: ["레고", "호수", "제휴", "GW"],
      operatingHours: "10:00 - 18:00",
      estimatedDuration: "2시간",
      description: "춘천·원주 권역 가족·미식 일정에 맞춘 제휴 레저 명소입니다.",
      recommendationReason: "원주·춘천 권역 체류형 일정의 대표 제휴 입장 포인트입니다.",
      reservationRequired: true,
      partner: true,
      qrAvailable: true,
      availableSlots: buildSlots("wc-chuncheon-lake", [
        { time: "11:00", capacity: 80, reserved: 42, crowd: "moderate", wait: "약 10분" },
        { time: "15:00", capacity: 80, reserved: 55, crowd: "high", wait: "약 20분" },
      ]),
    },
  },
];
