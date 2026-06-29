# ODRÉ GANGWON / 오드래강원

강원 특화 **여행 실행 플랫폼** 데모입니다.  
일정 설계 → 다카테고리 예약 → QR 티켓 → 당일 케어까지 한 흐름으로 이어집니다.

- **라이브 데모:** https://odre-gangwon.vercel.app  
- **저장소:** https://github.com/djk0224/odre-gangwon (public)

Phase 1 실행 검증 권역은 **삼척·동해**입니다. GW 카탈로그가 충분히 로드되면 **강원 7권역** UI·일정·스탬프가 순차적으로 열립니다.

## 무엇을 보여 주는가

| 축 | 내용 |
|----|------|
| **실행** | AI 일정(5~8초 fast path) · Kakao 경로·이동시간 · 예약 허브 · mock 결제 · QR |
| **강원 맥락** | 네이처로드 드라이브 · 권역·시즌 큐레이션 · 강원패스 혜택 연동(유료 패스 아님) |
| **데이터** | 관광공사 GW · 데이터랩 · 기상·TAGO · 로컬 상권(번들/MVP) |
| **당일** | 케어 탭 — 날씨·혼잡·이동·예약 상태 |

단일 Next.js 앱(`OdreTravelApp`)이 모바일 프레임 안에서 `step` 상태로 화면을 전환합니다. 상세 화면 맵은 [APP_FLOW_VERIFICATION.md](APP_FLOW_VERIFICATION.md)를 참고하세요.

## 주요 화면

| 영역 | 설명 |
|------|------|
| **온보딩** | 브랜드 스토리 · 5대 기둥 소개 |
| **홈** | 7권역 선택 · 네이처로드 · 강원패스 티저 · 스탬프 · 여행 조건 입력 |
| **장소** | GW 카탈로그 탐색 · 찜 · 장소 상세·지도 · 가벼운 리뷰(장소 상세 내) |
| **뉴스레터** | 오드레 노트 — 권역·시즌 큐레이션 + 뉴스 overlay |
| **예약** | 숙소 / 교통 / 렌트카 / 음식점 / 액티비티 / 관광지 허브 |
| **케어** | 당일 날씨·혼잡·이동·예약·QR 맥락 안내 |
| **내 메뉴** | 데모 로그인 · 저장 일정 · 찜 · AI 일정 · 실행·외부 데이터 상태 |

**하단 탭:** `홈 / 장소 / 뉴스레터 / 예약 / 케어`  
실행 일정은 하단 탭이 아니라 **홈 플로팅바 · 내 메뉴 · 케어**에서 진입합니다.

**제거·변경된 것 (구 문서 기준)**  
- 커뮤니티 하단 탭 · 사이트 전체 로그인 게이트 · 홈 피치 데모 배너  
- 일정 진입은 `trip-preferences` 위저드로 통일

## 시연 플로우 (추천)

1. 온보딩 → 홈에서 **삼척·동해** 권역 선택  
2. 여행 조건 입력(날짜·인원·테마·교통·페이스) → 장소 선택 · 숙소 거점  
3. AI 실행 일정 생성 → 지도·타임라인 확인  
4. **예약** 탭에서 카테고리별 예약 → mock 결제  
5. 일정 연동 **입장·QR** 또는 **케어** 탭에서 당일 안내 확인  
6. **내 메뉴** → 데모 로그인(환경 변수 계정)

## 기술 스택

- **Next.js** (App Router) · **TypeScript** · **React** · **Tailwind CSS**
- **Zustand** — trip / auth / community(장소 리뷰) 상태
- **Kakao Map SDK** (브라우저) · **Kakao REST** (서버 경로·이동시간 행렬)
- **Gemini / OpenAI** — 일정 설명·채팅(선택, 없으면 규칙 fallback)
- 한국관광공사 GW · 데이터랩 · TAGO · 기상청 · 네이버 뉴스 등 공공 API(선택)

## 빠른 시작

```bash
git clone https://github.com/djk0224/odre-gangwon.git
cd odre-gangwon
npm install
cp .env.example .env.local   # API 키·데모 로그인 (선택)
npm run dev
```

http://localhost:3000 — 모바일 프레임(최대 약 430px) 기준 UI입니다.

API 키 없이도 **번들 데이터 + 규칙 기반 일정**으로 대부분의 화면을 확인할 수 있습니다.

## 시연용 로그인 (내 메뉴)

사이트 전체 게이트가 아니라 **내 메뉴**에서만 ID/PW 로그인합니다. 자격 증명은 서버 환경 변수로만 관리됩니다.

```bash
# 복수 계정 — username:password:표시이름 을 ; 로 구분
DEMO_AUTH_ACCOUNTS=odre:your-password:ODRÉ 시연;odre2:your-password:게스트

# 레거시 단일 계정 (ACCOUNTS와 병합)
DEMO_AUTH_USERNAME=odre
DEMO_AUTH_PASSWORD=your-password
DEMO_AUTH_DISPLAY_NAME=ODRÉ 시연
```

로그인 성공 시 일정·예약·찜이 브라우저 `localStorage`에 유지됩니다.  
실제 비밀번호는 저장소에 커밋하지 마세요.

## 환경 변수

전체 목록: [.env.example](.env.example)

| 변수 | 용도 |
|------|------|
| `NEXT_PUBLIC_KAKAO_MAP_APP_KEY` | 브라우저 지도 SDK (**빌드 시 주입** → Vercel 변경 후 Redeploy) |
| `KAKAO_REST_API_KEY` | 서버 경로·지오코딩·이동시간 |
| `PUBLIC_DATA_PORTAL_SERVICE_KEY` / `TOUR_API_SERVICE_KEY` | 관광 GW · 기상 · TAGO |
| `GEMINI_API_KEY` / `OPENAI_API_KEY` | LLM 일정·채팅 (선택) |
| `NAVER_NEWS_CLIENT_ID` / `SECRET` | 오드레 노트 뉴스 (선택) |
| `DEMO_AUTH_ACCOUNTS` | 내 메뉴 시연 로그인 (권장) |

**상태 API**

- `GET /api/external/status` — 외부 데이터·`deploy` 준비 상태  
- `GET /api/catalog/meta` — 권역별 카탈로그 장소 수

## npm 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` / `start` | 프로덕션 빌드·실행 |
| `npm run lint` | ESLint |
| `npm run test` | 실행 커널·일정·예약 단위 테스트 |
| `npm run verify:vercel-env` | Vercel 배포용 env·데이터 번들 점검 |
| `npm run verify:execution` | 오프라인 실행 시나리오 검증 |
| `npm run verify:itinerary-smoke` | 일정 API 스모크 (dev 서버 필요) |
| `npm run connect:vercel-git` | Vercel ↔ GitHub 네이티브 연동 |
| `npm run import:data` | 강원 로컬 CSV/ZIP → JSON |
| `npm run refresh:tour-places` | GW 관광 장소 + 이미지 백필 |
| `npm run refresh:live-data` | import → tour → datalab 일괄 |
| `npm run refresh:notes` | 오드레 노트 뉴스 overlay |
| `npm run verify:notes` / `audit:notes` | 오드레 노트 검증·정합 감사 |
| `npm run build:rag:full` | RAG 임베딩 전체 재빌드 |

이미지 백필만:

```bash
node scripts/refresh-tour-places.mjs --images-only
```

## 아키텍처 요약

```
여행 조건 입력
  → POST /api/ai/itinerary (routeProfile: fast, Haversine)
  → UI 즉시 표시 (5~8초 목표)
  → 백그라운드: POST /api/ai/itinerary/enrich (LLM)
              + POST /api/execution/itinerary/enrich-routes (Kakao leg time)
  → tripStore · 예약 · 케어 UI
```

| 경로 | 역할 |
|------|------|
| `src/lib/executionKernel/buildItinerary.ts` | Tour GW + DataLab + 이동시간·실행 가능성 |
| `src/lib/clientItinerary/buildFastItinerary.ts` | 클라이언트 fast fallback |
| `src/data/imported/tour-gw-samcheok-donghae.json` | 클라이언트 MVP 번들 |
| `src/data/imported/tour-gw-gangwon.json` | 서버 전체 GW 카탈로그 (~1.7MB) |

일정 로직: 관광지 **TSP 방문 순서 최적화**, 식당은 **점심·저녁 시간대 삽입** 후 순서 유지.

## Vercel 배포

상세: **[docs/VERCEL_DEPLOY.md](docs/VERCEL_DEPLOY.md)**

- **프로덕션:** `main` push → Vercel 네이티브 자동 배포 (`regions: icn1`)
- 배포 전: `npm run verify:vercel-env` · `npm run build`
- Kakao Developers Web 도메인에 `https://odre-gangwon.vercel.app` 등록
- `NEXT_PUBLIC_*` 변경 시 **Redeploy** 필수

Git 연동이 안 될 때: `npm run connect:vercel-git`

## 배포 전 체크

```bash
npm run build
npm run test
npm run verify:vercel-env
# 선택: dev 서버 켠 뒤
npm run verify:itinerary-smoke
```

## 문서

| 문서 | 내용 |
|------|------|
| [APP_FLOW_VERIFICATION.md](APP_FLOW_VERIFICATION.md) | 화면·플로우·QA 체크리스트 |
| [docs/VERCEL_DEPLOY.md](docs/VERCEL_DEPLOY.md) | Vercel·env·Kakao 설정 |

내부 전략 문서(PRD·PLAN 등)는 public 저장소에 포함하지 않습니다.

## 라이선스

Public demo repository — ODRÉ GANGWON. 데모·피치·포트폴리오 용도입니다.
