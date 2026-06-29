import { useAuthStore } from "@/stores/authStore";

export const DEMO_LOGIN_REQUIRED_MESSAGE =
  "내 메뉴에서 로그인한 뒤 이용할 수 있습니다.";

export function isDemoUserLoggedIn(): boolean {
  return Boolean(useAuthStore.getState().user);
}
