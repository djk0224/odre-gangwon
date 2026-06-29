import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      /**
       * 데이터 fetch·마운트 초기화 패턴 — 점진적으로 이벤트 핸들러/키 리마운트로 이전 예정.
       * React 19 규칙이 데모 앱 전역 effect 초기화까지 error로 잡아 빌드 차단을 방지.
       */
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
