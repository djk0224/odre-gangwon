import type { AuthUser } from "@/types/auth";

type DemoAccount = {
  username: string;
  password: string;
  displayName: string;
};

function readEnv(key: string): string {
  return process.env[key]?.trim() ?? "";
}

function parseDemoAccounts(): DemoAccount[] {
  const accounts: DemoAccount[] = [];
  const seen = new Set<string>();

  const pushAccount = (username: string, password: string, displayName: string) => {
    const normalizedUsername = username.trim();
    if (!normalizedUsername || !password || seen.has(normalizedUsername)) return;
    seen.add(normalizedUsername);
    accounts.push({
      username: normalizedUsername,
      password,
      displayName: displayName.trim() || normalizedUsername,
    });
  };

  const accountsEnv = readEnv("DEMO_AUTH_ACCOUNTS");
  if (accountsEnv) {
    for (const entry of accountsEnv.split(";")) {
      const trimmed = entry.trim();
      if (!trimmed) continue;
      const [username, password, ...nameParts] = trimmed.split(":");
      if (!username || !password) continue;
      pushAccount(username, password, nameParts.join(":"));
    }
  }

  const legacyUser = readEnv("DEMO_AUTH_USERNAME");
  const legacyPass = readEnv("DEMO_AUTH_PASSWORD");
  if (legacyUser && legacyPass) {
    pushAccount(legacyUser, legacyPass, readEnv("DEMO_AUTH_DISPLAY_NAME") || "ODRÉ 시연");
  }

  return accounts;
}

export function isDemoAuthEnabled(): boolean {
  return parseDemoAccounts().length > 0;
}

export function verifyDemoCredentials(username: string, password: string): boolean {
  const normalizedUsername = username.trim();
  const account = parseDemoAccounts().find((entry) =>
    timingSafeEqualString(normalizedUsername, entry.username),
  );
  if (!account) return false;
  return timingSafeEqualString(password, account.password);
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
  const normalizedUsername = username.trim();
  const account =
    parseDemoAccounts().find((entry) => entry.username === normalizedUsername) ??
    ({
      username: normalizedUsername,
      displayName: readEnv("DEMO_AUTH_DISPLAY_NAME") || "ODRÉ 시연",
    } as Pick<DemoAccount, "username" | "displayName">);

  return {
    id: `demo-${account.username}`,
    name: account.displayName,
    email: `${account.username}@demo.odre`,
    provider: "demo",
  };
}
