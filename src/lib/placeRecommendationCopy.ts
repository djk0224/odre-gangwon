export function inferEmotionLineFromName(name: string): string {
  if (/해변|비치|영금정|전망/.test(name)) return "바람과 풍경을 천천히 즐기기 좋은 장소";
  if (/시장|식당|카페/.test(name)) return "강원 로컬 무드를 가볍게 채우기 좋은 코스";
  if (/관|전시|박물/.test(name)) return "날씨 영향이 적어 일정 안정성이 높은 선택지";
  return "선택한 여행 분위기와 자연스럽게 어울리는 장소";
}
