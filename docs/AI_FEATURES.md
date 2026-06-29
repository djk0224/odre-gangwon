# ODRÉ GANGWON — AI 기능 명세

## 개요

여행자 앱의 AI는 **실행(execution)** 중심입니다. 일정 생성, 장소 검색, 혼잡·슬롯 안내, 당일 케어, 여행 Q&A를 하나의 provider 레이어로 묶고, LLM 키가 없을 때는 규칙 기반 엔진으로 자동 폴백합니다.

## Provider

| Provider | 환경 변수 | 용도 |
|----------|-----------|------|
| OpenAI | `OPENAI_API_KEY` | JSON 구조화 응답 (우선 시도) |
| Gemini | `GEMINI_API_KEY` | OpenAI 실패 시 대체 |
| rules | (없음) | 로컬 규칙·목 데이터 기반 폴백 |

기본 모델: `GEMINI_MODEL=gemini-3.1-flash-lite-preview` (`.env.local`)

상태 확인: `GET /api/ai/status`

## AI 여행 비서 — 컨시어지 (툴 콜링 + RAG)

기본 모드는 **`concierge`** (일정 없이 Q&A 우선). 「일정 추천해줘」 등 명시 요청 시 **`planning`** 으로 전환됩니다.

### 아키텍처

1. **라우터** (`concierge/router.ts`) — 메시지 → 호출할 툴 목록 (규칙 기반)
2. **툴 실행** (`concierge/tools.ts`) — 병렬 실행
3. **RAG** (`concierge/ragIndex.ts`, `ragSearch.ts`) — 카탈로그·네이처로드·맛집·FAQ 청크 검색 (벡터 DB 없이 키워드 스코어링)
4. **합성** (`concierge/synthesize.ts`) — 툴 결과 → JSON 답변 (LLM 또는 rules)
5. **오케스트레이터** (`concierge/orchestrator.ts`) — `chat.ts`에서 기본 진입

### 툴 목록

| 툴 | 데이터 |
|----|--------|
| `rag_search` | 장소·코스·맛집·FAQ 청크 |
| `search_places` | AI 장소 검색 (카탈로그 id) |
| `search_local_commerce` | 강원 음식점·상권 JSON |
| `get_weather` | 기상청 단기 |
| `get_nature_road` | 네이처로드 5·6코스 |
| `get_transit_arrivals` | TAGO 버스 도착 (데모 정류소) |
| `get_trip_context` | 세션·앱 출발일 |
| `search_stays` | 관광공사 GW 숙박 |
| `get_crowd` | 제휴 명소 슬롯·혼잡 (데모) |
| `get_datalab` | 관광빅데이터 GW · 연관 관광지 · 권역 수요 |
| `get_care` | 당일 케어 규칙 안내 |
| `open_reservation` | 예약·QR 흐름 + CTA |

**툴 플래너** (`concierge/planner.ts`): 규칙 라우터가 모호할 때 LLM이 툴 목록을 보강합니다.

**UI**: `blocks.sources` 출처 칩, `blocks.actions` CTA, `AiChatPlaceStrip`, `CONCIERGE_STARTER_REPLIES` 기본 칩.

### RAG 하이브리드 검색 (P1)

- **BM25** (`ragLexical.ts`) + **Gemini 임베딩** (`ragEmbedding.ts`) → `hybridRagSearch.ts` (55% / 45%)
- 임베딩 캐시: `src/data/generated/rag-embeddings.json`
- 생성: `npm run build:rag` (`.env.local`에 `GEMINI_API_KEY` 필요)
- 캐시 없으면 BM25만 사용 (기존과 동일하게 동작)

## AI 여행 비서 — 대화 phase (일정 planning 모드)

`POST /api/ai/chat`는 **세션(`session`)을 round-trip** 하며, phase별로 UI·일정 카드 출력을 코드에서 강제합니다.

| phase | 동작 | 일차 카드(`days`) |
|-------|------|-------------------|
| `clarify` | 필수 슬롯 부족 → 질문 1개 + **quickReplies** 칩 | 출력 안 함 |
| `confirm` | 수집된 조건 요약 → 「네, 일정 짜줘」 | 출력 안 함 |
| `propose` | LLM이 맞춤 코스 제안 | 출력 |
| `refine` | 이전 코스 수정 요청 | 출력 |
| `info` | 일반 Q&A | 출력 안 함 |

### 필수 슬롯 (채팅에서 수집)

- `duration`, `companion`, `transportation`, `themes` (관심 카테고리, 복수 선택)
- `travelDate` **또는** `season`

`tripStore.preferences`가 [`defaultPreferences`](src/data/mockTravelData.ts)와 동일하면 **미설정**으로 간주합니다. 「일정 추천해줘」만으로는 여름·당일치기 등 기본값을 쓰지 않습니다.

### 클라이언트 UI

- 헤더 **대화 초기화** (↺): 메시지·세션 리셋
- **내 여행 조건** 요약 바
- **quickReplies** 칩 → `slotPatch` 전송
- `propose` 후 **이 코스로 일정 만들기** → `mergedPreferences` + 앵커 장소로 `generating`
- **조건 자세히 설정** → PreferenceWizard (보조)

### API body 예시

```json
{
  "message": "일정 추천해줘",
  "preferences": { ... },
  "history": [{ "role": "user", "content": "..." }],
  "session": { "slots": {}, "phase": "clarify", "confirmed": false, ... },
  "slotPatch": { "duration": "one-night" },
  "action": "confirm_go",
  "stream": true
}
```

### 스트리밍·멀티턴 (P2)

- `stream: true` → `application/x-ndjson` 한 줄당 JSON 이벤트 (`status` | `tool` | `partial` | `done`)
- **멀티턴 슬롯**: `history`의 이전 user 발화에서 `travelDate`·인원 등을 `mergeSlotsFromHistory`로 누적
- **툴 실패 폴백**: 1차 툴이 모두 실패하면 `rag_search` → `search_places` → `get_trip_context` 순으로 재시도 (`concierge/toolRunner.ts`)
- 클라이언트: `requestAiChatStream` / `askAiTravelAssistantStream` — 답변 말풍선 점진 갱신

### 고도화 (P3)

- **Gemini 토큰 스트림**: 컨시어지 합성 시 `streamGeminiText` + `synthesizeConciergeAnswerStreaming` (가짜 청크 대신 실시간 텍스트)
- **RAG 인덱스**: 7권역 GW 카탈로그 균형 샘플 + 네이처로드 1~7코스 + 권역별 맛집·상권. `npm run build:rag` / `npm run build:rag:full` (`GEMINI_API_KEY` 필요)
- **케어 API 연동**: `tripContext` (itinerary·reservations·hubBookings) → `get_care` 툴이 `generateAiCareSuggestions` 호출
- **딥링크 CTA**: `open_care`, `open_itinerary`, `open_reservation_place` — `AiChatActionBar`에서 탭·장소로 이동

## 기타 AI 기능

### 1. AI 맞춤 일정 (`POST /api/ai/itinerary`)

- 입력: `TripPreferences`, 선택 `anchorPlaceId`, 선택 `orderedPlaceIds`
- **실행 커널** (`src/lib/executionKernel/`) — 장소 검증 → Kakao 매트릭스 일정 → DataLab 검증 → `feasibilityIssues`
- LLM은 **서술(explanation/alternatives)만** 담당; 장소 선택은 규칙 엔진 + 커널
- UI: GeneratingScreen → 일정 화면 provider 배지 + 실행 검증 패널

### 2. AI 장소 검색 (`POST /api/ai/search`)

- 자연어 → `placeIds` + `summary`

### 3. AI 혼잡·슬롯 (`POST /api/ai/crowd`)

- 예약 슬롯 AI 안내

### 4. AI 당일 케어 (`POST /api/ai/care`)

- 케어 탭 알림 보강

## P4 실행·추천 엔진 (4종)

데이터랩 없이 **관광 GW·자체 실행 데이터·Kakao Directions**를 신호원으로, 해석 가능한 가중치·규칙 합성입니다.

| 엔진 | 경로 | 역할 |
|------|------|------|
| BehaviorLog | `src/services/engines/behaviorLogEngine.ts` | `tripStore.behaviorEvents` (최대 500건) → `BehaviorProfile` |
| Crowd | `src/services/engines/crowdEngine.ts` | 슬롯 예약률·시간/계절·행사 밀도·행동 수요 → `CrowdEstimate` |
| Route | `src/services/engines/routeEngine.ts` | Kakao Directions 1차, Haversine 폴백, TSP 근사 방문 순서 |
| PersonalizationRanker | `src/services/engines/personalizationRanker.ts` | 홈·검색·일정·컨시어지 장소 rerank |

공통 입력: `src/services/engines/engineContext.ts` (`buildEngineContextFromTripStore`)

### 연결 지점

- 홈 캐러셀: `getZoneHomeBundle(zoneId, engineContext)`
- 장소 검색: `searchPlacesWithAi` 후처리 rerank
- 일정: `selectPlaces` · `optimizeVisitOrder` · `pickRecommendedSlot`
- 케어: `generateDayCareSuggestions` + `estimatePlaceCrowdQuick`
- 지도: `KakaoRouteMap` + `GET /api/external/kakao/directions`
- 행동 API (선택): `POST /api/behavior/events`

### 실행 커널 · DataLab (Phase 0–4)

| 구성 | 경로 |
|------|------|
| 커널 진입 | `src/lib/executionKernel/buildItinerary.ts` |
| DataLab·연관 관광지 | `src/services/executionStateService.ts` |
| 이동 매트릭스 | `src/services/engines/durationMatrixCache.ts`, `src/lib/itineraryLegMinutes.ts` |
| 혼잡·케어 공통 신호 | `src/services/engines/visitSignals.ts` |
| 스냅샷 | `src/data/imported/datalab-gangwon.json` |

```bash
npm run refresh:live-data    # import + tour + datalab
npm run verify:execution     # 오프라인 사전 검증
```

`GET /api/external/status` — API 키·DataLab 스냅샷 메타. 설정 시트에서 확인.

### deprecated

- `src/services/external/dataLabService.ts` — 신규 호출 금지, `tourDataLabService` 사용

## 핵심 파일

| 영역 | 경로 |
|------|------|
| 세션·슬롯 | `src/services/ai/chatSession.ts`, `src/lib/aiChatReadiness.ts` |
| phase·LLM | `src/services/ai/chat.ts`, `chatStream.ts` |
| 툴 폴백 | `src/services/ai/concierge/toolRunner.ts` |
| P4 엔진 | `src/services/engines/*`, `src/config/rankingWeights.ts` |
| 실행 커널 | `src/lib/executionKernel/*`, `src/services/executionStateService.ts` |
| UI | `src/components/travel/AiAssistantSheet.tsx`, `AiQuickReplyChips.tsx` |

## 수동 검증 시나리오

1. 「일정 추천해줘」→ clarify만 (일정 카드 없음, 기간 칩 표시)
2. 칩으로 1박2일·커플·대중교통·테마·겨울 선택 → confirm → 「네, 일정 짜줘」→ propose
3. 「둘째 날 실내로」→ refine (전체 재작성 최소화)
4. ↺ 대화 초기화 → 환영 메시지
5. propose 후 「이 코스로 일정 만들기」→ generating

## 로컬 실행

```bash
cp .env.example .env.local
# GEMINI_API_KEY=...
npm run dev
```
