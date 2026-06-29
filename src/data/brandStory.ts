export interface BrandStoryBeat {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
}

export const brandStoryHero = {
  eyebrow: "ODRÉ GANGWON",
  titleLines: ["강원의 길과 로컬을", "AI로 연결합니다"] as const,
  lead:
    "오드래강원은 강원의 도로·계절·권역·로컬 상권을 하나의 여행 실행 루프로 묶는 플랫폼입니다. 예정된 일정부터 당일 실행, 여행 후 기록까지 예약·혼잡·QR·케어를 끊김 없이 연결합니다.",
  koreanName: "오드래강원",
} as const;

export const brandStoryBeats: BrandStoryBeat[] = [
  {
    id: "origin",
    eyebrow: "브랜드 이야기",
    title: "오드래요, 강원으로",
    body:
      "ODRÉ는 강원 방언 ‘오드래요’에서 온 이름입니다. 좋은 길과 로컬을 찾아 강원으로 오라는 초대를 담았고, 여행의 시작을 지역 안에서 열어 두었습니다.",
  },
  {
    id: "problem",
    eyebrow: "왜 다른가",
    title: "일정은 있는데, 실행은 끊긴다",
    body:
      "전국 일정 앱은 장소 나열에 강합니다. 강원은 거리·계절·권역·예약이 얽혀 길 위에서 끊기기 쉽습니다. 계획과 예약·입장·당일 대응이 분리되면 하루가 흔들립니다.",
  },
  {
    id: "promise",
    eyebrow: "우리가 하는 일",
    title: "강원 실행 OS",
    body:
      "네이처로드와 권역 테마, 로컬 상권을 AI 일정과 지도에 담고, 예정·실행·종료 단계에 맞춰 예약·결제·혼잡 안내·QR 입장·당일 케어를 한 루프로 이어갑니다.",
  },
];

export const brandStoryPhase1 = {
  eyebrow: "Phase 1",
  title: "삼척·동해 실행 루프",
  flow: "예정 일정 → 예약·결제 → 당일 혼잡·QR·케어 → 여행 후 기록",
  note: "지금 이 데모는 삼척·동해에서 실행을 증명하고, 강원 전 권역은 홈·권역 탐색과 네이처로드 카드에서 확장해 보여줍니다.",
} as const;
