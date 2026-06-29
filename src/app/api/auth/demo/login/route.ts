import { NextResponse } from "next/server";
import { buildDemoAuthUser, isDemoAuthEnabled, verifyDemoCredentials } from "@/lib/demoAuth";

export async function POST(request: Request) {
  if (!isDemoAuthEnabled()) {
    return NextResponse.json(
      { error: "데모 로그인이 설정되지 않았습니다. DEMO_AUTH_USERNAME/PASSWORD를 확인해 주세요." },
      { status: 503 },
    );
  }

  let body: { username?: string; password?: string };
  try {
    body = (await request.json()) as { username?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const username = body.username?.trim() ?? "";
  const password = body.password ?? "";

  if (!username || !password) {
    return NextResponse.json({ error: "아이디와 비밀번호를 입력해 주세요." }, { status: 400 });
  }

  if (!verifyDemoCredentials(username, password)) {
    return NextResponse.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  return NextResponse.json({ user: buildDemoAuthUser(username) });
}
