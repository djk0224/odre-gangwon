# Vercel 배포 가이드

## 1. GitHub push 전 확인

```bash
npm run build
npm run verify:vercel-env
```

커밋에 포함되어야 하는 데이터 번들:

- `src/data/imported/tour-gw-samcheok-donghae.json` (클라이언트 MVP)
- `src/data/imported/tour-gw-gangwon.json` (서버 전체 카탈로그, ~1.7MB)
- `src/data/imported/gangwon-restaurants-samcheok-donghae.json`
- `src/data/imported/sbiz-commerce-samcheok-donghae.json`
- `src/data/imported/datalab-gangwon.json`

대용량 전체 강원 JSON(`gangwon-restaurants-gangwon.json` 등)은 `.gitignore` 처리되어 있어도 됩니다.

## 2. Vercel 프로젝트 연결

### A. 네이티브 Git 연동 (권장 — PR Preview·자동 배포)

Vercel 계정에 **GitHub Login Connection**이 없으면 CLI 연동이 실패합니다.

1. [Vercel → Account → Authentication](https://vercel.com/account/settings/authentication) → **GitHub Connect**
2. [Vercel GitHub App](https://github.com/apps/vercel) → `djk0224/odre-gangwon` 저장소 접근 허용
3. 로컬에서 연결:

```bash
npm run connect:vercel-git
# 또는
npx vercel git connect --yes
```

4. [프로젝트 Git 설정](https://vercel.com/djk0224s-projects/odre-gangwon/settings/git)에서 `main` 프로덕션 브랜치 확인

`main` push 시 Vercel이 자동으로 Production 배포합니다.

### B. GitHub Actions (Login Connection 전·백업용)

`.github/workflows/vercel-deploy.yml` — `main` push 시 Vercel CLI로 배포합니다.

필수 GitHub Secrets (`djk0224/odre-gangwon`):

| Secret | 값 |
|--------|-----|
| `VERCEL_TOKEN` | [vercel.com/account/tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | `team_RWntUxecFQOCJ604zdfQtgEW` |
| `VERCEL_PROJECT_ID` | `prj_RdDOjcNli3cmhr0ssYHvZWlzZDqv` |

네이티브 Git 연동 완료 후 Actions와 중복 배포가 되면 workflow를 비활성화하거나 삭제해도 됩니다.

### C. 수동 import (최초)

1. [vercel.com](https://vercel.com) → **Add New Project** → GitHub 저장소 import
2. Framework: **Next.js** (자동 감지)
3. Root Directory: `/` (기본값)
4. `vercel.json`에 `regions: ["icn1"]` (서울) 설정됨

## 3. Environment Variables (Production + Preview)

Vercel Dashboard → Project → **Settings → Environment Variables**

| 변수 | 필수 | 비고 |
|------|------|------|
| `DEMO_AUTH_ACCOUNTS` | ✓ | `user:pass:이름;user2:pass2:이름` |
| `DEMO_AUTH_USERNAME` | | 레거시 단일 계정 (ACCOUNTS와 병합) |
| `DEMO_AUTH_PASSWORD` | | 레거시 단일 계정 |
| `DEMO_AUTH_DISPLAY_NAME` | | 프로필 이름 |
| `NEXT_PUBLIC_KAKAO_MAP_APP_KEY` | ✓ | **빌드 시 주입** → 설정 후 Redeploy |
| `KAKAO_REST_API_KEY` | ✓ | 서버 REST (경로·이동시간) |
| `PUBLIC_DATA_PORTAL_SERVICE_KEY` | ✓ | 관광·기상·TAGO 통합 키 |
| `GEMINI_API_KEY` | | AI 일정·채팅 (선택) |
| `GEMINI_MODEL` | | 예: `gemini-3.1-flash-lite-preview` |
| `NAVER_NEWS_CLIENT_ID` | | 오드레 노트 (선택) |
| `NAVER_NEWS_CLIENT_SECRET` | | 오드레 노트 (선택) |

로컬 `.env.local`을 Vercel에 옮기려면:

```bash
npx vercel env pull .env.vercel.local
# 또는 Dashboard에서 수동 입력
```

**주의:** `.env.local`은 git에 올리지 마세요.

## 4. Kakao Developers 설정

[Kakao Developers](https://developers.kakao.com/) → 내 앱 → **플랫폼 → Web**

사이트 도메인에 배포 URL 등록:

- `https://<project-name>.vercel.app`
- Preview URL도 시연에 쓰면 `https://<branch>-<team>.vercel.app` 형태 추가

JavaScript 키 → `NEXT_PUBLIC_KAKAO_MAP_APP_KEY`  
REST API 키 → `KAKAO_REST_API_KEY` (서버 전용, `NEXT_PUBLIC_` 금지)

## 5. 공공데이터포털 키

- **디코딩 키**(일반 문자열)를 Vercel에 넣는 것을 권장합니다.
- 이미 `%2F` 등으로 인코딩된 키도 앱에서 자동 처리합니다.
- 한국관광공사 GW, 기상청, TAGO API가 활성화되어 있어야 합니다.

## 6. 배포 후 검증

```bash
# 배포 URL 기준
curl -s https://<your-app>.vercel.app/api/external/status | jq '.deploy'
```

기대값 예시:

```json
{
  "kakaoMapClient": true,
  "kakaoRest": true,
  "publicDataPortal": true,
  "demoAuth": true,
  "llm": true,
  "vercel": true,
  "region": "icn1"
}
```

앱에서:

1. **내 메뉴** → `odre` / 비밀번호 로그인
2. 일정 생성 → 지도에 경로 표시 (Kakao REST + SDK)
3. 예약·케어 탭 동작 확인

## 7. 트러블슈팅

| 증상 | 원인 | 조치 |
|------|------|------|
| 지도 안 뜸 | `NEXT_PUBLIC_KAKAO_MAP_APP_KEY` 미설정 또는 빌드 이전 값 | Vercel env 설정 후 **Redeploy** |
| 직선 경로만 표시 | `KAKAO_REST_API_KEY` 없음 | 서버 키 추가 |
| 관광 API 401/403 | 공공데이터 키 오류·미활성 API | 키 재발급, API 신청 상태 확인 |
| 로그인 503 | `DEMO_AUTH_*` 미설정 | Username/Password 둘 다 설정 |
| 7권역 일부만 | `tour-gw-gangwon.json` 미커밋 | git에 파일 포함 후 push |

## 8. 로컬에서 Production 모드 테스트

```bash
npm run build
npm run start
# http://localhost:3000/api/external/status
```
