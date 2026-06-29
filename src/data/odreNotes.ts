import odreNotesImported from "@/data/imported/odre-notes.json";
import { travelZoneShortLabels } from "@/config/tourZoneSigungu";
import {
  eventStatusLabel,
  formatOdreNoteEventPeriod as formatEventPeriod,
  getOdreNoteEventStatus,
  type OdreNoteEventPeriod,
} from "@/lib/odreNoteEventPeriod";
import type { SeasonId, TravelZoneId } from "@/types/travel";
import type { OdreNoteFilter, OdreNoteLayout, OdreNoteTone } from "@/lib/odreNoteTemplates";

export type { OdreNoteFilter, OdreNoteLayout, OdreNoteTone } from "@/lib/odreNoteTemplates";
export { ODRE_NOTE_TEMPLATES, getOdreNoteTemplateForTone } from "@/lib/odreNoteTemplates";

/**
 * 오드레 노트 손글 시드 — 작성 계약
 * - 리드·본문 모두 해라체(-다/-한다). 합니다체 금지
 * - 한자(上 등)·알 수 없는 지명·B2G 홍보 톤 금지
 * - 유형 A/B/C: src/lib/odreNoteTemplates.ts
 * - 사용자용 실행 힌트(B안): src/data/odreNotePlanHints.ts (travelMemo와 분리)
 * - 시드 수정 후: npm run verify:notes · npm run audit:notes
 */

/** 일정 생성용 실행 힌트 — UI에 노출하지 않음 (`odreNotePlanBridge`) */
export interface OdreNoteTravelMemo {
  relatedNews?: string;
  bestTiming?: string;
  pairWith?: string;
  travelStyle?: string;
}

export type { OdreNoteEventPeriod } from "@/lib/odreNoteEventPeriod";

export interface OdreNoteSource {
  kind: "naver-news" | "tour-festival" | "manual";
  url?: string;
  pubDate?: string;
}

export interface OdreNote {
  id: string;
  tone: OdreNoteTone;
  layout: OdreNoteLayout;
  title: string;
  lead: string;
  sourceLine: string;
  zones: TravelZoneId[];
  filters: OdreNoteFilter[];
  season?: SeasonId;
  imageUrl?: string;
  body: string[];
  travelMemo: OdreNoteTravelMemo;
  benefitNote?: string;
  placeKeywords?: string[];
  featured?: boolean;
  source?: OdreNoteSource;
  /** 축제·행사 — 카드·상세에 「행사 기간」 표기 */
  eventPeriod?: OdreNoteEventPeriod;
}

export interface OdreNoteFilterChip {
  id: OdreNoteFilter | "all";
  label: string;
}

/** UI 필터 칩 — 확정 순서 */
export const ODRE_NOTE_FILTER_CHIPS: OdreNoteFilterChip[] = [
  { id: "all", label: "모아보기" },
  { id: "quiet-zone", label: "비켜선 동네" },
  { id: "festival", label: "지금 열리는" },
  { id: "sea", label: "해안선 따라" },
  { id: "mountain", label: "산으로 드는 길" },
  { id: "light-route", label: "느린 걸음으로" },
  { id: "next-season", label: "계절을 앞서" },
];

interface OdreNotesFile {
  notes?: OdreNote[];
  overlays?: Array<Partial<OdreNote> & { id: string }>;
  refreshedAt?: string | null;
}

function mergeNoteOverlay(seed: OdreNote, overlay: Partial<OdreNote>): OdreNote {
  return {
    ...seed,
    ...overlay,
    id: seed.id,
    travelMemo: { ...seed.travelMemo, ...overlay.travelMemo },
    source: overlay.source ?? seed.source,
    eventPeriod: overlay.eventPeriod ?? seed.eventPeriod,
  };
}

function applyOdreNoteOverlays(seeds: OdreNote[], file: OdreNotesFile): OdreNote[] {
  if (file.notes && file.notes.length > 0) {
    return file.notes;
  }

  const overlays = file.overlays ?? [];
  if (overlays.length === 0) {
    return seeds;
  }

  return seeds.map((seed) => {
    const overlay = overlays.find((item) => item.id === seed.id);
    return overlay ? mergeNoteOverlay(seed, overlay) : seed;
  });
}

import { ODRE_NOTE_SEEDS_EXTENDED } from "./odreNoteSeedsExtended";

export const ODRE_NOTE_SEED_COUNT = 32;

export const ODRE_NOTE_SEEDS: OdreNote[] = [
  {
    id: "note-mukho-alley",
    tone: "scene",
    layout: "image-lead",
    title: "묵호에서는 바다가 한 번에 오지 않는다",
    lead: "논골담길이 다시 열리면서, 동해의 북쪽 항구가 조용히 숨을 고른다.",
    sourceLine: "동해시, 묵호·논골담길·망상 5대 권역 관광 연결",
    zones: ["samcheok-donghae"],
    filters: ["sea", "quiet-zone"],
    season: "summer",
    featured: true,
    body: [
      "묵호항의 아침은 비린내와 커피 냄새가 같이 온다. 등대로 오르는 길은 생각보다 가파르고, 색칠된 담장이 바다 쪽으로 기울어져 있다. 항구는 아직 잠에서 깨는 시간이라 소리가 크지 않다.",
      "논골담길은 이름 그대로 논 사이를 따라 이어진 길이다. 벽화가 새로 정리되면서 걷기 편해졌지만, 여전히 골목마다 물고기를 말리는 줄과 작은 창문이 먼저 눈에 들어온다. 사진보다 발밑의 돌과 물기를 먼저 보게 된다.",
      "동해시가 묵호·천곡·망상을 하나의 동선으로 묶기 시작한 것도 이런 이유다. 항구는 항구대로, 언덕은 언덕대로 시간이 다르게 흐른다. 체류형 스포츠도시 이야기가 나와도, 묵호의 매력은 '빨리 돌아보기'보다 '늦게 이해하기'에 가깝다.",
      "망상해변까지 이어지면 바다가 넓어지지만, 묵호에서 느낀 좁은 항구의 밀도는 사라지지 않는다. 점심은 시장 쪽으로 내려가면 된다. 해산물은 이름 있는 곳보다 줄이 짧은 자리가 낫다. 현지인이 앉아 있는 테이블 근처가 대개 정답에 가깝다.",
      "천곡동 골목과 묵호등대 사이를 오가며 하루를 쓰면, 바다가 한 번에 닥치지 않고 조금씩 다가온다. 저녁엔 등대 쪽 노을을 보고 천천히 내려오면 된다.",
      "묵호는 하루에 다 담기지 않는 항구다. 다음 날 다른 골목을 열어두면 된다.",
    ],
    travelMemo: {
      relatedNews: "동해시 5대 권역(무릉·추암·천곡·묵호·망상) 관광 상품화",
      bestTiming: "평일 오전, 논골담길→묵호등대→망상 순",
      pairWith: "추암 촛대바위·장호항 드라이브",
      travelStyle: "도보+짧은 드라이브, 사진보다 골목 위주",
    },
    placeKeywords: ["묵호", "논골", "망상", "동해"],
    source: {
      kind: "naver-news",
      pubDate: "2026-06-15",
    },
  },
  {
    id: "note-jeongseon-festival",
    tone: "news-hook",
    layout: "news-label",
    title: "정선의 축제는 무대보다 시장에 남는다",
    lead: "가리왕산 봄나물축제가 열리면, 아라리촌의 불빛이 늦게까지 켜진다.",
    sourceLine: "가리왕산 봄나물축제, 아라리촌 야간 개장",
    zones: ["yeongwol-jeongseon"],
    filters: ["festival", "next-season"],
    season: "spring",
    eventPeriod: { startDate: "2026-05-15", endDate: "2026-05-18" },
    body: [
      "정선에서 축제 소식이 들리면 먼저 무대를 찾게 된다. 포스터와 SNS 사진은 화려하지만, 정선의 축제는 끝나도 시장과 골목에 더 오래 남는 편이다.",
      "올해 봄 가리왕산 봄나물축제에는 아리랑 공연과 버스킹, 나물 퀴즈가 이어진다. 조양강 뗏목 체험과 아라리촌 야간 개장까지 겹치면 하루가 금세 지나간다. 그래도 정선의 중심은 무대가 아니라 시장 쪽에 있다.",
      "축제 기간에만 붐비는 곳보다, 다음 날 아침 시장을 여는 시간이 더 솔직하다. 어제 밤의 소리가 아직 골목에 남아 있고, 상인들은 평소처럼 장사를 시작한다. 나물과 곤드레, 아리랑 국수 같은 것들이 다시 일상으로 돌아온다.",
      "정선은 '보러 가는' 도시라기보다 '지나가다 멈추는' 도시에 가깝다. 축제는 그 멈춤의 계기가 될 뿐이다. 일정표에 공연만 넣지 말고, 시장 한 바퀴를 비워 두면 축제가 길어진다.",
    ],
    travelMemo: {
      relatedNews: "가리왕산 봄나물축제·아라리촌 야간 개장",
      bestTiming: "축제 첫날 오후~야간, 다음 날 오전 시장",
      pairWith: "레일바이크·하이원 인근 드라이브",
      travelStyle: "1박2일, 시장·골목 중심",
    },
    placeKeywords: ["정선", "아라리", "가리왕", "시장"],
    source: {
      kind: "naver-news",
      pubDate: "2026-06-15",
    },
  },
  {
    id: "note-goseong-north-sea",
    tone: "local-context",
    layout: "image-lead",
    title: "고성의 바다는 북쪽을 향할 때 달라진다",
    lead: "DMZ 평화의 길에서 하룻밤을 걷는다면, 고성의 북쪽 바다는 다른 속도로 다가온다.",
    sourceLine: "고성 DMZ·양양, 평화를 걷는 하룻밤",
    zones: ["sokcho-goseong"],
    filters: ["sea", "quiet-zone"],
    season: "summer",
    body: [
      "고성의 바다는 동쪽이 아니라 북쪽을 향한다. 지도에서 보면 당연한 일이지만, 해변에 서면 몸이 받아들이는 방향이 다르다. 파도가 밀어오는 쪽을 바라보면 긴장과 개방이 동시에 온다.",
      "DMZ와 가까운 이 해변들은 '아름답다'는 말만으로는 설명되지 않는다. 분단의 역사가 바로 옆에 있고, 그 긴장이 바다 바람과 섞여 있다. 표지판과 안내 문구를 읽는 시간도 여행의 일부가 된다.",
      "최근 평화를 기원하는 걷기 행사와 관광 재발굴 이야기가 겹치면서, 고성은 '속초 다음'이 아니라 '다른 시간대'로 다시 읽히고 있다. 북쪽 바다는 빠르게 훑기보다 천천히 걷는 쪽이 맞다.",
      "속초에서 북쪽으로 30분이면 풍경이 바뀐다. 사람도 줄고, 파도 소리가 길어진다. 급하게 채울 일정이 아니라, 한곳에 오래 앉아 있는 쪽이 맞다. 해변 카페보다 바닷가 조약돌 위가 더 어울리는 날도 있다.",
      "저녁노을이 길어지는 계절, 고성 북쪽 해변은 이름보다 방향을 기억하는 편이 낫다. '어디'보다 '어느 쪽 바다'인지가 먼저다.",
      "고성은 속초와 다른 리듬으로 숨 쉰다. 그 차이를 느끼려면 하루를 통째로 내어주는 것이 좋다.",
    ],
    travelMemo: {
      relatedNews: "고성 DMZ에서 양양까지 평화 트레킹·하룻밤 코스",
      bestTiming: "늦은 오후~일몰, 평일",
      pairWith: "속초 출발 당일, 또는 고성 1박",
      travelStyle: "드라이브+해변 산책, 체류 위주",
    },
    placeKeywords: ["고성", "DMZ", "해변", "속초"],
    source: {
      kind: "naver-news",
      pubDate: "2026-06-15",
    },
  },
  {
    id: "note-pyeongchang-summer",
    tone: "myth-flip",
    layout: "text-only",
    title: "평창은 눈이 온 뒤에만 생각나는 지역이 아니다",
    lead: "대관령이 여름 휴가지로 다시 불리면, 평창은 눈 대신 숲길로 기억된다.",
    sourceLine: "평창·대관령 여름 휴가지·자연명소",
    zones: ["pyeongchang-jeongseon"],
    filters: ["mountain", "next-season"],
    season: "summer",
    eventPeriod: { startDate: "2026-07-01", endDate: "2026-07-31", monthOnly: true },
    body: [
      "평창 하면 눈과 올림픽이 먼저 떠오른다. 겨울의 기억이 너무 강해서, 여름의 평창은 흐릿하게 남는 경우가 많다. 그래서 '지금 가도 되나'는 질문이 자주 나온다.",
      "하지만 6월 대관령의 낮 기온이 24도대에 머무는 날, 평창은 '시원한 산'이 아니라 '천천히 걷는 산'으로 다시 읽힌다. 바람이 세지 않고, 숲길에 그늘이 길게 드리워진다.",
      "여름 한우 행사와 산간 휴양 수요가 겹치면서, 평창·정선·영월 축산 지역은 식당과 드라이브 코스가 따로 움직인다. 눈이 녹은 뒤에야 보이는 녹색이 길게 이어지고, 테이블 예약도 겨울과 다른 리듬으로 흐른다.",
      "겨울에 못 갔다고 아쉬워할 필요는 없다. 평창은 계절마다 다른 문을 연다. 여름에는 대관령 양떼목장과 숲길, 드라이브 코스가 먼저 손을 든다.",
      "눈이 온 뒤에만 생각나는 지역이 아니라, 눈이 녹은 뒤에 더 오래 걷게 되는 지역이다.",
    ],
    travelMemo: {
      relatedNews: "평창·대관령 여름 휴가지·체험·드라이브",
      bestTiming: "6~9월 평일, 대관령 오전",
      pairWith: "정선 아라리·영월 동강",
      travelStyle: "자차 드라이브, 산책·맛집",
    },
    placeKeywords: ["평창", "대관령", "알펜시아", "오대"],
    source: {
      kind: "naver-news",
      pubDate: "2026-06-16",
    },
  },
  {
    id: "note-sokcho-goseong-comma",
    tone: "traveler",
    layout: "news-label",
    title: "속초가 빠르게 느껴질 때, 고성은 쉼표가 된다",
    lead: "설악·속초·고성을 이어 도는 동선이 길어지면, 여행은 속도보다 간격을 먼저 고른다.",
    sourceLine: "설악·속초·고성, 북부 해안 느린 동선",
    zones: ["sokcho-goseong"],
    filters: ["sea", "light-route"],
    season: "summer",
    body: [
      "속초는 하루에 많은 것을 담기 쉽다. 아침 시장, 점심 해수욕장, 저녁 야경까지 빠르게 채워진다. 일정표가 꽉 차면 만족스럽지만, 숨 고를 틈이 줄어든다.",
      "그런데 이틀째가 되면 속도가 부담스러워지는 사람도 있다. 그때 고성은 쉼표처럼 끼워 넣을 수 있다. 속초에서 멀지 않지만, 시간의 밀도가 다르다.",
      "속초에서 고성까지는 30분 남짓. 기온은 비슷하지만, 북쪽으로 갈수록 사람 밀도가 낮아진다. 같은 해안선인데 숨 쉬는 간격이 달라진다.",
      "속초에서 1박하고, 다음 날 오전만 고성으로 넘어가도 동선이 정리된다. 빠르게 보는 여행과 느리게 머무는 여행을 한 번에 담을 수 있다. 고성은 '빼는' 일정이 아니라 '늘리는' 일정이다.",
      "북쪽 해안의 여름은 더워도 바람이 길다. 속초에서 고성으로 넘어갈 때, 차창을 내리고 속도를 줄이면 여행의 결이 바뀐다.",
    ],
    travelMemo: {
      relatedNews: "설악·속초·고성 연계 드라이브·해안 동선",
      bestTiming: "속초 1박 후 고성 오전~오후",
      pairWith: "설악·아바이순대·고성 해변",
      travelStyle: "자차, 2박3일 속초+고성",
    },
    placeKeywords: ["속초", "고성", "설악", "해수욕장"],
    source: {
      kind: "naver-news",
      pubDate: "2026-06-16",
    },
  },
  {
    id: "note-benefit-light-touch",
    tone: "column",
    layout: "text-only",
    title: "혜택은 여행의 목적이 아니라 동선을 가볍게 하는 장치다",
    lead: "강원관광재단이 추천 여행지와 혜택을 묶어 내면, 혜택은 일정 뒤에 얹는 쪽이 낫다.",
    sourceLine: "5월 추천 여행지·강원 방문 혜택",
    zones: [
      "samcheok-donghae",
      "gangneung-yangyang",
      "sokcho-goseong",
      "pyeongchang-jeongseon",
      "yeongwol-jeongseon",
      "cheorwon-dmz",
      "wonju-chuncheon",
    ],
    filters: [],
    season: "summer",
    featured: true,
    body: [
      "여행 계획을 세울 때 혜택부터 찾으면 동선이 뒤집힌다. 가고 싶은 곳 대신, 할인되는 곳을 먼저 고르게 되기 때문이다. 지도가 할인 지도가 되면, 여행은 금방 지친다.",
      "강원관광재단의 월별 추천 여행지와 혜택 소식은, 이미 정한 동선 위에서 확인하는 편이 낫다. 방문객 수가 늘었다는 이야기도, '강원 전체'가 고르게 읽히는 계절이 왔다는 신호다.",
      "강원패스와 지역 상품권은 따로 앱을 뒤지기보다, 일정을 짜고 예약하는 과정에서 자연스럽게 연결되는 편이 낫다. 숙소를 고르고, 장소를 정하고, 그다음에 챙기면 된다.",
      "혜택은 목적지가 아니라, 잘 짜인 동선 위의 가벼운 보상이다. 일정이 먼저, 혜택은 따라온다.",
    ],
    travelMemo: {
      relatedNews: "5월 추천 여행지·강원 방문 혜택·숙박세일",
      bestTiming: "일정 확정 후, 예약·방문 직전 확인",
      pairWith: "어느 권역이든 — 동선 확정 후 적용",
      travelStyle: "일정 우선, 혜택은 후행",
    },
    benefitNote:
      "강원혜택이지·강원상품권은 일정과 예약 흐름 안에서 확인하면 된다. ODRÉ는 그 연결만 돕는다.",
    source: {
      kind: "naver-news",
      pubDate: "2026-06-16",
    },
  },
  {
    id: "note-samcheok-coastline",
    tone: "scene",
    layout: "image-lead",
    title: "삼척은 해안선이 길어서 자꾸 차를 세우게 된다",
    lead: "해상케이블카에서 바라본 에메랄드 바다는, 삼척의 긴 해안을 걷고 싶게 만든다.",
    sourceLine: "삼척 바다·동굴·해안 드라이브 코스",
    zones: ["samcheok-donghae"],
    filters: ["sea"],
    season: "summer",
    body: [
      "삼척에 도착하면 바다를 한곳에서 보려 하지 않는 편이 낫다. 해안선이 길어서, 차를 세우는 지점이 계속 생긴다. 지도상으로는 가까운 두 해변도, 실제로는 다른 색을 가진다.",
      "장호항에서 용화 해변을 잇는 해상케이블카는 바다 위를 가로지른다. 발아래로 에메랄드빛 수면이 펼쳐지면, 지도로 보던 '해안'이 감각으로 바뀐다. 케이블카는 빠르지만, 바다를 오래 보게 만든다.",
      "케이블카에서 내려도 끝이 아니다. 근덕·죽서리·하맹방 방향으로 이어지는 해안도로는 절벽과 포구가 번갈아 나온다. 포구마다 비린내와 그늘의 온도가 다르다.",
      "환선굴과 용화·장호를 하루에 넣으면 빠듯하다. 둘 중 하나만 고르고, 나머지 해안은 드라이브로 훑는 쪽이 여유롭다. '다 봤다'보다 '어디서 멈췄는지'가 기억에 남는다.",
      "해안선을 따라 가다 보면 작은 마을과 항구 마을, 조용한 포구가 섞여 나온다. 삼척은 한 장의 엽서가 아니라 긴 필름처럼 펼쳐진다.",
      "삼척은 '대표 명소 하나'보다 '긴 해안선'으로 기억되는 도시다. 자꾸 차를 세우게 되는 이유가 거기 있다.",
    ],
    travelMemo: {
      relatedNews: "삼척 바다·동굴·드라이브 8코스",
      bestTiming: "오전 케이블카, 오후 해안 드라이브",
      pairWith: "환선굴·죽서리 일출",
      travelStyle: "자차 필수, 해안 드라이브",
    },
    placeKeywords: ["삼척", "케이블카", "장호", "용화", "환선굴"],
    source: {
      kind: "naver-news",
      pubDate: "2026-06-15",
    },
  },
  {
    id: "note-gangneung-coffee",
    tone: "news-hook",
    layout: "news-label",
    title: "커피축제는 강릉의 바다보다 도시 안쪽을 보게 만든다",
    lead: "강릉커피축제가 개막하면, 바다보다 도시 안쪽 골목이 먼저 붐빈다.",
    sourceLine: "강릉커피축제·로스터리 순례",
    zones: ["gangneung-yangyang"],
    filters: ["festival", "quiet-zone"],
    season: "autumn",
    eventPeriod: { startDate: "2026-10-09", endDate: "2026-10-12" },
    body: [
      "강릉 하면 바다와 커피가 함께 떠오른다. 안목·주문진 해변 카페는 여전히 인기지만, 강릉의 커피 이야기는 바다만이 전부는 아니다. 도시 안쪽 골목에도 로스터리가 밀집해 있다.",
      "원두는 대부분 수입하지만, 로스팅과 추출은 이 도시 안에서 일어난다. '강릉 커피'는 산지가 아니라 도시의 취향을 뜻한다. 로스터리를 순례하고, 골목 카페에 줄을 서는 패턴이 강릉만의 리듬이다.",
      "커피축제 시즌이면 도시 안쪽으로 사람이 밀린다. 바다는 배경이 되고, 카페와 시장이 중심이 된다. 축제는 바다를 부르기보다, 강릉의 실내 문화를 앞으로 세운다.",
      "오전에 로스터리와 중앙시장을 걷고, 오후에 안목 해변을 여는 식으로 하루를 나누면 강릉의 두 얼굴을 동시에 볼 수 있다. 바다 카페만이 아니라 도시 카페로도 충분히 하루가 채워진다.",
    ],
    travelMemo: {
      relatedNews: "강릉커피축제 일정·로스터리·안목 해변",
      bestTiming: "오전 로스터리·시장, 오후 안목 해변",
      pairWith: "오죽헌·중앙시장·경포",
      travelStyle: "도보+카페, 바다는 오후",
    },
    placeKeywords: ["강릉", "커피", "안목", "로스터리"],
    source: {
      kind: "naver-news",
      pubDate: "2026-06-15",
    },
  },
  ...ODRE_NOTE_SEEDS_EXTENDED,
];

export function getOdreNotes(): OdreNote[] {
  const file = odreNotesImported as OdreNotesFile;
  return applyOdreNoteOverlays(ODRE_NOTE_SEEDS, file);
}

export function getOdreNoteById(noteId: string): OdreNote | undefined {
  return getOdreNotes().find((note) => note.id === noteId);
}

export function getFeaturedOdreNote(notes: OdreNote[] = getOdreNotes()): OdreNote | undefined {
  return notes.find((note) => note.featured) ?? notes[0];
}

export function filterOdreNotes(
  notes: OdreNote[],
  filterId: OdreNoteFilterChip["id"],
): OdreNote[] {
  if (filterId === "all") return notes;
  return notes.filter((note) => note.filters.includes(filterId));
}

export function getOdreNoteZoneLabel(zones: TravelZoneId[]): string {
  if (zones.length === 0) return "강원";
  if (zones.length >= 3) return "강원 전역";
  return zones.map((zone) => travelZoneShortLabels[zone]).join(" · ");
}

/** 네이버 refresh overlays 또는 시드 source.url */
export function getOdreNoteHeroImage(note: OdreNote): string | undefined {
  return note.imageUrl?.trim() || undefined;
}

export function getOdreNoteSourceUrl(note: OdreNote): string | undefined {
  const url = note.source?.url?.trim();
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}

/** ISO(2026-06-15) 또는 네이버 pubDate → 「2026년 6월 15일」 */
export function formatOdreNotePubDate(pubDate?: string): string | undefined {
  if (!pubDate?.trim()) return undefined;

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(pubDate.trim());
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    return `${year}년 ${month}월 ${day}일`;
  }

  const parsed = new Date(pubDate);
  if (Number.isNaN(parsed.getTime())) return pubDate.trim();
  return `${parsed.getFullYear()}년 ${parsed.getMonth() + 1}월 ${parsed.getDate()}일`;
}

export function formatOdreNoteEventPeriodLabel(period?: OdreNoteEventPeriod): string | undefined {
  if (!period) return undefined;
  return formatEventPeriod(period);
}

export function getOdreNoteEventPeriodBadge(period?: OdreNoteEventPeriod): string | undefined {
  if (!period) return undefined;
  return eventStatusLabel(getOdreNoteEventStatus(period));
}
