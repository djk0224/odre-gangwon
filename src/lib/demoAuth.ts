import type { AuthUser } from "@/types/auth";

function readEnv(key: string): string {
  return process.env[key]?.trim() ?? "";
}

export function isDemoAuthEnabled(): boolean {
  return Boolean(readEnv("DEMO_AUTH_USERNAME") && readEnv("DEMO_AUTH_PASSWORD"));
}

export function verifyDemoCredentials(username: string, password: string): boolean {
  const expectedUser = readEnv("DEMO_AUTH_USERNAME");
  const expectedPass = readEnv("DEMO_AUTH_PASSWORD");
  if (!expectedUser || !expectedPass) return false;

  const userOk = timingSafeEqualString(username, expectedUser);
  const passOk = timingSafeEqualString(password, expectedPass);
  return userOk && passOk;
}

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function buildDemoAuthUser(username: string): AuthUser {
  const displayName = readEnv("DEMO_AUTH_DISPLAY_NAME") || "ODRÉ 시연";
  return {
    id: `demo-${username}`,
    name: displayName,
    email: `${username}@demo.odre`,
    provider: "demo",
  };
}
