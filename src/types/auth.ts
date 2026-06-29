export type AuthProvider = "demo" | "kakao" | "naver";

export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  provider: AuthProvider;
}
