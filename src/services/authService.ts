import type { AuthUser } from "@/types/auth";

export class AuthServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthServiceError";
  }
}

export async function loginWithDemoCredentials(
  username: string,
  password: string,
): Promise<AuthUser> {
  const response = await fetch("/api/auth/demo/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    user?: AuthUser;
    error?: string;
  };

  if (!response.ok || !data.user) {
    throw new AuthServiceError(data.error ?? "로그인에 실패했습니다.");
  }

  return data.user;
}
