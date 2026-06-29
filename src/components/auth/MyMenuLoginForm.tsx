"use client";

import { useState, type FormEvent } from "react";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { useAuthStore } from "@/stores/authStore";

export function MyMenuLoginForm() {
  const loginWithCredentials = useAuthStore((state) => state.loginWithCredentials);
  const isLoggingIn = useAuthStore((state) => state.isLoggingIn);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const message = await loginWithCredentials(username.trim(), password);
    if (message) setError(message);
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div>
        <p className="text-lg font-semibold text-ink">로그인하고 시작하기</p>
        <p className="mt-1 text-sm text-stone">
          시연용 아이디와 비밀번호로 로그인하면 일정·예약·찜이 이 기기에 저장됩니다.
        </p>
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs font-semibold text-stone">아이디</span>
        <input
          autoComplete="username"
          className="w-full rounded-xl border border-pine/15 bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-pine/35 focus:ring-2 focus:ring-pine/15"
          onChange={(event) => setUsername(event.target.value)}
          placeholder="demo"
          required
          value={username}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-semibold text-stone">비밀번호</span>
        <input
          autoComplete="current-password"
          className="w-full rounded-xl border border-pine/15 bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-pine/35 focus:ring-2 focus:ring-pine/15"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          required
          type="password"
          value={password}
        />
      </label>

      {error ? (
        <p className="rounded-xl border border-[#E85D4C]/20 bg-[#E85D4C]/8 px-3 py-2 text-sm text-[#B42318]">
          {error}
        </p>
      ) : null}

      <PremiumButton className="w-full" disabled={isLoggingIn} type="submit">
        {isLoggingIn ? "확인 중…" : "로그인"}
      </PremiumButton>
    </form>
  );
}
