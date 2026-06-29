import { stampMilestones } from "@/data/mockRegionalFraming";
import type {
  GangwonPassBenefit,
  GangwonPassPlan,
} from "@/types/gangwonPass";

// 강원도가 이미 무료 공식 패스(강원혜택이지/강원 패스)와 강원상품권 환급을 운영하므로
// ODRÉ는 자체 유료 패스를 팔지 않는다. 아래는 "혜택 연동" 무료 옵션(일정 기간 단위)이다.
export const gangwonPassPlans: GangwonPassPlan[] = [
  {
    id: "day-1",
    label: "당일 연동",
    durationDays: 1,
    price: 0,
    description: "당일치기 일정에 강원패스·강원상품권 혜택을 연동",
  },
  {
    id: "day-2",
    label: "1박 2일 연동",
    durationDays: 2,
    price: 0,
    description: "1박 2일 일정에 공식 혜택·로컬 쿠폰을 연동",
  },
];

export const gangwonPassBenefits: GangwonPassBenefit[] = [
  {
    id: "pass-benefit-gw-voucher",
    title: "강원상품권 환급 안내",
    description: "도외 거주자는 강원혜택이지에서 강원생활도민증 발급 후 숙박·소비 영수증 인증 시 환급",
    discountLabel: "숙박 ₩30,000 · 소비 ₩10,000 환급",
    category: "local",
  },
  {
    id: "pass-benefit-gw-pass",
    title: "강원패스 무료 입장 연동",
    description: "공공시설·제휴기관 입장 시 강원패스 QR로 할인·감면 (별도 비용 없음)",
    discountLabel: "공식 강원패스 연동",
    category: "attraction",
  },
  {
    id: "pass-benefit-chuam",
    title: "추암촛대바위 입장",
    description: "패스 QR로 현장·앱 입장 확인",
    discountLabel: "입장 20% 할인",
    category: "attraction",
    placeId: "chuam-candle",
  },
  {
    id: "pass-benefit-dottori",
    title: "도째비골 스카이밸리",
    description: "체험권 예약 시 패스 할인 적용",
    discountLabel: "체험 15% 할인",
    category: "attraction",
    placeId: "dottori-skyvalley",
  },
  {
    id: "pass-benefit-mukho-cafe",
    title: "묵호 로스터리",
    description: "경로 쿠폰 자동 발급",
    discountLabel: "아메리카노 1+1",
    category: "local",
    localOfferId: "local-mukho-roastery",
  },
  {
    id: "pass-benefit-jangho-cafe",
    title: "장호항 카페 거리",
    description: "이동 전 갭타임 음료 할인",
    discountLabel: "음료 ₩1,500",
    category: "local",
    localOfferId: "local-jangho-cafe",
  },
  {
    id: "pass-benefit-stay",
    title: "삼척·동해 숙소",
    description: "예약 허브 숙소 카테고리 할인 배지",
    discountLabel: "숙소 10% 할인",
    category: "hub",
    hubCategory: "stay",
  },
];

export { stampMilestones };

export function getPassPlan(planId: string): GangwonPassPlan | undefined {
  return gangwonPassPlans.find((plan) => plan.id === planId);
}

export function getPassBenefit(benefitId: string): GangwonPassBenefit | undefined {
  return gangwonPassBenefits.find((benefit) => benefit.id === benefitId);
}
