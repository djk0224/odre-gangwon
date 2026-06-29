# ODRÉ GANGWON / 오드래강원

강원 특화 **AI 여행 실행** 플랫폼 데모입니다.  
일정 설계 → 다카테고리 예약 → QR 티켓 → 당일 케어까지 한 흐름으로 이어집니다.

MVP 실행 권역은 **삼척·동해**이며, 강원 7권역 UI·카탈로그는 단계적으로 확장됩니다.

## 주요 기능

| 영역 | 설명 |
|------|------|
| **홈** | 권역 선택, 네이처로드·강원패스·스탬프, 여행 조건 입력 진입 |
| **장소** | GW 카탈로그 탐색, 찜, 장소 상세·지도 |
| **뉴스레터** | 오드레 노트(권역·시즌 큐레이션) |
| **예약** | 숙소 / 교통 / 렌트카 / 음식점 / 액티비티 / 관광지 허브 |
| **케어** | 당일 날씨·혼잡·이동·예약 상태 안내 |
| **내 메뉴** | 저장 일정, 찜, AI 일정, 데모 로그인 |

하단 탭: `홈 / 장소 / 뉴스레터 / 예약 / 케어`

## 기술 스택

- **Next.js** (App Router) · **TypeScript** · **React**
- **Tailwind CSS** · **Zustand** (클라이언트 상태)
- **Kakao Map SDK** (브라우저) · **Kakao REST** (서버 경로·이동시간)
- 한국관광공사 GW · 데이터랩 · TAGO · 기상청 등 공공 API (선택)

## 빠른 시작

```bash
npm install
cp .env.example .env.local   # API 키·데모 로그인 (선택)
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 을 엽니다.

API 키 없이도 **목업 + 규칙 기반 일정**으로 대부분의 화면을 확인할 수 있습니다.

## 시연용 로그인 (내 메뉴)

배포·시연 시 **내 메뉴**에서 아이디/비밀번호로 로그인합니다.  
자격 증명은 서버 환경 변수로만 관리합니다 (클라이언트에 노출되지 않음).

```bash
# .env.local 또는 Vercel Environment Variables
DEMO_AUTH_USERNAME=odre
DEMO_AUTH_PASSWORD=your-password
DEMO_AUTH_DISPLAY_NAME=ODRÉ 시연   # 선택 — 프로필 표시 이름
```

로그인 성공 시 일정·예약·찜 상태가 브라우저 `localStorage`에 유지됩니다.

## npm 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 빌드 결과 로컬 실행 |
| `npm run lint` | ESLint |
| `npm run test` | 단위 테스트 (`test:engine` 동일) |
| `npm run verify:vercel-env` | Vercel 배포용 env·데이터 번들 점검 |
| `npm run verify:execution` | 오프라인 실행 시나리오 검증 |
| `npm run import:data` | 강원 로컬 CSV/ZIP 데이터 import |
| `npm run refresh:tour-places` | GW 관광 장소 카탈로그 + 이미지 백필 |
| `npm run refresh:nature-road` | 네이처로드 데이터 갱신 |
| `npm run refresh:datalab-gangwon` | 데이터랩 스냅샷 갱신 |
| `npm run refresh:live-data` | import → tour → datalab 일괄 |
| `npm run refresh:notes` | 오드레 노트 뉴스 overlay 갱신 |
| `npm run verify:notes` | 오드레 노트 검증 |
| `npm run build:rag:full` | RAG 임베딩 전체 재빌드 |

이미지 백필만 다시 돌릴 때 (목록 재수집 없음):

```bash
node scripts/refresh-tour-places.mjs --images-only
```

## 환경 변수

전체 목록은 [.env.example](.env.example)을 참고하세요.

### 자주 쓰는 키

| 변수 | 용도 |
|------|------|
| `NEXT_PUBLIC_KAKAO_MAP_APP_KEY` | 브라우저 지도 SDK |
| `KAKAO_REST_API_KEY` | 서버 경로·지오코딩·이동시간 행렬 |
| `TOUR_API_SERVICE_KEY` / `PUBLIC_DATA_PORTAL_SERVICE_KEY` | 관광공사 GW·기상·TAGO |
| `GEMINI_API_KEY` / `OPENAI_API_KEY` | LLM 일정 설명·채팅 (없으면 규칙 fallback) |
| `NAVER_NEWS_CLIENT_ID` / `SECRET` | 오드레 노트 뉴스 스크랩 |
| `DEMO_AUTH_USERNAME` / `DEMO_AUTH_PASSWORD` | 내 메뉴 시연 로그인 |

배포 후 외부 API 준비 상태: `GET /api/external/status`  
카탈로그 메타(권역별 장소 수): `GET /api/catalog/meta`

## Vercel 배포

상세 절차: **[docs/VERCEL_DEPLOY.md](docs/VERCEL_DEPLOY.md)**

1. GitHub push
2. Vercel import → Environment Variables 설정
3. **Redeploy** (`NEXT_PUBLIC_*` 변경 시 필수)
4. Kakao Developers Web 도메인에 `*.vercel.app` 등록

### 필수 환경 변수 (Production)

| 변수 | 용도 |
|------|------|
| `DEMO_AUTH_USERNAME` / `DEMO_AUTH_PASSWORD` | 내 메뉴 시연 로그인 |
| `NEXT_PUBLIC_KAKAO_MAP_APP_KEY` | 브라우저 지도 (빌드 시 주입) |
| `KAKAO_REST_API_KEY` | 서버 경로·이동시간 |
| `PUBLIC_DATA_PORTAL_SERVICE_KEY` | 관광 GW·기상·TAGO |

배포 전 로컬 점검:

```bash
npm run verify:vercel-env
npm run build
```

배포 후: `GET /api/external/status` → `deploy` 객체 확인

### 배포 전 체크

```bash
npm run build
npm run test
npm run dev          # 별도 터미널
npm run verify:itinerary-smoke
```

## 아키텍처 요약

```
사용자 입력 → POST /api/ai/itinerary (fast: Haversine)
           → 백그라운드 enrich (Kakao leg time, LLM narrative)
           → tripStore 일정 · 예약 · 케어 UI
```

- **클라이언트 번들:** `src/data/imported/tour-gw-samcheok-donghae.json` (MVP 권역)
- **서버 전체 카탈로그:** `src/data/imported/tour-gw-gangwon.json`
- **실행 커널:** `src/lib/executionKernel/buildItinerary.ts`
- **일정 빠른 경로:** `src/lib/clientItinerary/buildFastItinerary.ts`

## AI 일정 플로우

1. 홈 → 여행 조건 입력 (날짜, 인원, 권역, 테마, 교통, 페이스 등)
2. 카드 선택 · 숙소 거점 · 식당 시간대 삽입
3. AI 실행 일정 생성 (5~8초 fast path)
4. 지도·타임라인 확인 → 예약 허브 → mock 결제 → QR
5. 당일 케어에서 날씨·혼잡·이동 안내

관광지 방문 순서는 **TSP 최적화**, 식당은 **점심·저녁 시간대 기준 삽입** 후 순서를 유지합니다.

## 문서

| 문서 | 내용 |
|------|------|
| [PRD.md](PRD.md) | 제품 요구사항 |
| [PLAN.md](PLAN.md) | 구현 단계 |
| [AGENTS.md](AGENTS.md) | 코딩·브랜드 규칙 |
| [APP_FLOW_VERIFICATION.md](APP_FLOW_VERIFICATION.md) | 화면·플로우 QA |
| [DEPLOY_WEEK.md](DEPLOY_WEEK.md) | 1주 배포 실행 계획 |
| [docs/ODRE_Gangwon_execution_platform_brief.md](docs/ODRE_Gangwon_execution_platform_brief.md) | 실행 플랫폼 브리프 |

## 라이선스

Private demo repository.
