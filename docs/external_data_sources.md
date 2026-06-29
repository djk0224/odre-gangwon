# ODRÉ GANGWON 외부 데이터 연동

## 데이터 소스 카탈로그

| ID | 활용데이터명 | 분야 | 환경 변수 |
|---|---|---|---|
| `tour-gw` | 한국관광공사 국문 관광정보 서비스_GW | 관광지·숙박·행사·이미지 | `TOUR_API_SERVICE_KEY` |
| `data-lab` | 한국관광 데이터랩 · 관광빅데이터 GW | 방문자·집중률·체류·소비·자원 수요 | `TOUR_API_SERVICE_KEY` (또는 `PUBLIC_DATA_PORTAL_SERVICE_KEY`) |
| `sbiz-stroll` | 소상공인 상가정보 API | 상권·음식점·카페 | `SBIZ_SERVICE_KEY` |
| `gangwon-restaurant` | 강원 일반음식점 현황 | 음식점 분류 | `GANGWON_OPEN_API_KEY` |
| `weather-short` | 기상청 단기예보 | 일정 조정 | `WEATHER_API_SERVICE_KEY` |
| `tago-bus-arrival` | TAGO 버스도착 | 대중교통 | `TAGO_SERVICE_KEY` |
| `tago-bus-route` | TAGO 버스노선 | 노선·정류소 | `TAGO_SERVICE_KEY` |
| `gangwon-lodging` | 강원 숙박업소 | 숙박 | `GANGWON_OPEN_API_KEY` |
| `kakao-map` | 카카오맵 | 지도·좌표·경로 | `NEXT_PUBLIC_KAKAO_MAP_APP_KEY`, `KAKAO_REST_API_KEY` |
| `odre-*` | 자체 데이터 | 선호·행동·제휴 | (앱 내부) |

코드 정의: `src/config/dataSources.ts`

## 로컬 설정

1. `.env.example`을 참고해 `.env.local` 작성
2. `npm run dev` 재시작
3. 연결 상태 확인: `GET http://localhost:3000/api/external/status`

## 카카오 (연동 완료)

| 용도 | 키 | 호출 |
|---|---|---|
| 지도 표시 | JavaScript 키 (`NEXT_PUBLIC_*`) | 브라우저 SDK |
| 좌표 검색 | REST 키 (`KAKAO_REST_API_KEY`) | 서버 Route Handler |

- 키워드 검색: `GET /api/external/kakao/keyword?query=삼척+환선굴`
- MVP 장소 좌표 동기화: `POST /api/external/places/geocode`
- 앱 시작 시 자동으로 `placeGeocodeQueries` 대상 장소 좌표를 Kakao에서 갱신

REST 키는 **서버 전용**입니다. `NEXT_PUBLIC_` 접두사를 붙이지 마세요.

## 공공 API (연동 완료)

`.env.local`에 `PUBLIC_DATA_PORTAL_SERVICE_KEY` 또는 개별 키 설정.

| API | 서비스 | Route / Probe |
|-----|--------|----------------|
| 관광공사 GW 숙박 | `searchStay2` | `GET /api/external/tour/stays` |
| 관광공사 GW 지역 | `areaBasedList2` · `detailImage2` | `GET /api/external/tour/areas` · 강원 전체 카탈로그 `npm run refresh:tour-places` → `src/data/imported/tour-gw-gangwon.json` |
| 관광공사 GW 키워드 | `searchKeyword2` | `GET /api/external/tour/keyword?keyword=삼척` |
| DataLab 강원 스냅샷 | DataLabService 등 4종 | `GET /api/external/datalab/gangwon` · `npm run refresh:datalab-gangwon` → `src/data/imported/datalab-gangwon.json` |
| TAGO 정류소 | `getSttnNoList` | `GET /api/external/tago/stops` |
| TAGO 노선 | `getRouteNoList` | `GET /api/external/tago/routes` |
| TAGO 도착 | `getSttnAcctoArvlPrearngeInfoList` | `GET /api/external/tago/arrivals?nodeId=...` |
| TAGO 위치 | `getRouteAcctoBusLcList` | `GET /api/external/tago/locations?routeId=...` |
| 기상청 단기예보 | `getVilageFcst` | `GET /api/external/weather/forecast` |
| 기상청 중기예보 | `getMidLandFcst` | `GET /api/external/weather/mid` |
| 강원 일반음식점 (CSV) | 로컬 JSON | `GET /api/external/gangwon/restaurants` |
| 소상공인 상권 (ZIP) | 로컬 JSON | `GET /api/external/sbiz/commerce` |
| 일괄 점검 | — | `GET /api/external/probe` |

로컬 데이터 갱신: `npm run import:data` (Downloads CSV/ZIP 경로 사용)

코드: `src/services/external/tourGwService.ts`, `tourDataLabService.ts`, `tagoTransitService.ts`, `weatherService.ts`

추가 GW 엔드포인트(`detailCommon2`, `detailPetTour2`, `searchFestival2` 등)는 서비스 함수로 확장 가능.

### DataLab (연동 완료)

동일 공공데이터포털 인증키(`TOUR_API_SERVICE_KEY` / `PUBLIC_DATA_PORTAL_SERVICE_KEY`)로 아래 5 API를 **각각** 활성화해야 합니다.

| API | 서비스 경로 | 용도 |
|-----|------------|------|
| 관광빅데이터 GW | `DataLabService/locgoRegnVisitrDDList` | 지자체 일별 방문자 |
| 관광지 집중률 예측 | `TatsCnctrRateService/tatsCnctrRatedList` | 집중률·방문 추이 |
| 관광지별 연관 관광지 | `TarRlteTarService1/areaBasedList1`, `searchKeyword1` | 티맵 연계 동선·연관 POI |
| 지역별 수요 강도 | `AreaTarDemDsService` | 체류·소비 지수 |
| 지역별 자원 수요 | `AreaTarResDemService` | 관광·문화 자원 수요 |

- 강원 18시·군 일괄 갱신: `npm run refresh:datalab-gangwon`
- 캐시 조회: `GET /api/external/datalab/gangwon`
- 시·군 단위: `GET /api/external/datalab/gangwon?sigunguCode=4`
- 실시간(키 필요): `GET /api/external/datalab/gangwon?sigunguCode=4&live=true`
- 연관 관광지: `GET /api/external/datalab/related?placeName=환선굴&sigunguCode=4`
- 연관 관광지 실시간: `...&live=true`
- 혼잡 추정(`crowdEngine`)에 DataLab 스냅샷 블렌딩

아직 스텁: 상가정보, 강원 음식점·숙박 오픈API.

## 아키텍처

```txt
Browser → /api/external/* (Next.js Route Handler)
        → services/external/* (서버)
        → 공공/민간 API

장소 카탈로그 → placeGeocodeService (runtime 좌표 override)
             → itinerary / map / reservation
```
