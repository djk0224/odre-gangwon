"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  Heart,
  LogOut,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import type { AuthUser } from "@/types/auth";
import { getPlaceById } from "@/data/placeDetailMeta";
import { PlaceThumbnail } from "@/components/travel/PlaceThumbnail";
import { getPlaceCategoryLabel } from "@/lib/placeLabels";
import { cn } from "@/lib/utils";
import { MyMenuLoginForm } from "@/components/auth/MyMenuLoginForm";
import { useAuthStore } from "@/stores/authStore";
import { ExternalDataStatusPanel } from "@/components/travel/ExternalDataStatusPanel";
import { useTripStore } from "@/stores/tripStore";
import type { TripExecutionPhase } from "@/lib/tripExecutionPhase";

type MenuSubview = "main" | "settings" | "notices";

interface MyMenuSheetProps {
  open: boolean;
  hasItinerary: boolean;
  tripExecutionPhase?: TripExecutionPhase;
  claimedLocalOfferIds: string[];
  reservationCount: number;
  pendingReservationCount: number;
  savedItinerariesCount: number;
  savedPlacesCount: number;
  careAlertCount: number;
  onClose: () => void;
  onAiPlan: () => void;
  onOpenPlaces: () => void;
  onOpenSavedPlaces: () => void;
  onOpenItinerary: () => void;
  onOpenReservation: () => void;
  onOpenCare: () => void;
  onOpenPlace: (placeId: string) => void;
}

const providerLabels = {
  demo: "데모",
  kakao: "카카오",
  naver: "네이버",
} as const;

const quickActions = [
  { id: "itinerary", label: "내 일정", icon: CalendarDays },
  { id: "saved", label: "찜한 곳", icon: Heart },
  { id: "reservation", label: "내 예약", icon: ClipboardCheck },
  { id: "care", label: "당일 케어", icon: Sparkles },
] as const;

export function MyMenuSheet({
  open,
  hasItinerary,
  tripExecutionPhase,
  claimedLocalOfferIds,
  reservationCount,
  pendingReservationCount,
  savedItinerariesCount,
  savedPlacesCount,
  careAlertCount,
  onClose,
  onAiPlan,
  onOpenPlaces,
  onOpenSavedPlaces,
  onOpenItinerary,
  onOpenReservation,
  onOpenCare,
  onOpenPlace,
}: MyMenuSheetProps) {
  const [subView, setSubView] = useState<MenuSubview>("main");

  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const recentPlaceIds = useTripStore((state) => state.recentPlaceIds);

  const recentPlaces = useMemo(
    () =>
      recentPlaceIds
        .map((id) => getPlaceById(id))
        .filter((place): place is NonNullable<ReturnType<typeof getPlaceById>> => Boolean(place)),
    [recentPlaceIds],
  );

  useEffect(() => {
    if (open) setSubView("main");
  }, [open]);

  if (!open) return null;

  function handleSelect(action: () => void) {
    onClose();
    action();
  }

  function handleOpenPlace(placeId: string) {
    onClose();
    onOpenPlace(placeId);
  }

  const quickHandlers: Record<(typeof quickActions)[number]["id"], () => void> = {
    itinerary: onOpenItinerary,
    saved: onOpenSavedPlaces,
    reservation: onOpenReservation,
    care: onOpenCare,
  };

  if (subView === "settings") {
    return (
      <MenuOverlay onClose={onClose}>
        <SettingsPanel onBack={() => setSubView("main")} onLogout={logout} user={user} />
      </MenuOverlay>
    );
  }

  if (subView === "notices") {
    return (
      <MenuOverlay onClose={onClose}>
        <NoticesPanel onBack={() => setSubView("main")} />
      </MenuOverlay>
    );
  }

  return (
    <MenuOverlay onClose={onClose}>
      <header className="flex shrink-0 items-center justify-between px-4 py-3">
        <button
          aria-label="닫기"
          className="flex size-10 items-center justify-center text-ink"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" className="size-6" />
        </button>
        <div className="flex items-center gap-1">
          <button
            aria-label="알림"
            className="relative flex size-10 items-center justify-center text-ink"
            onClick={() => handleSelect(onOpenCare)}
            type="button"
          >
            <Bell aria-hidden="true" className="size-5" />
            {careAlertCount > 0 ? (
              <span className="absolute right-2 top-2 size-2 rounded-full bg-[#E85D4C]" />
            ) : null}
          </button>
          <button
            aria-label="설정"
            className="flex size-10 items-center justify-center text-ink"
            onClick={() => setSubView("settings")}
            type="button"
          >
            <Settings aria-hidden="true" className="size-5" />
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto pb-8">
        <section className="px-5 pb-5">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-pine text-lg font-semibold text-ivory">
                {user.name.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold text-ink">{user.name}</p>
                <p className="text-xs text-stone">
                  {providerLabels[user.provider] ?? "데모"} 계정 · {user.email ?? user.name}
                </p>
                <button
                  className="mt-0.5 text-sm text-stone underline-offset-2 hover:underline"
                  onClick={() => setSubView("settings")}
                  type="button"
                >
                  프로필 · 계정
                </button>
              </div>
            </div>
          ) : (
            <MyMenuLoginForm />
          )}
        </section>

        <section className="grid grid-cols-4 gap-2 border-y border-pine/10 px-3 py-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            const badge =
              action.id === "saved"
                ? savedPlacesCount
                : action.id === "reservation"
                  ? reservationCount || pendingReservationCount
                  : 0;
            return (
              <button
                className="flex flex-col items-center gap-2 px-1 py-1"
                key={action.id}
                onClick={() => handleSelect(quickHandlers[action.id])}
                type="button"
              >
                <span className="relative flex size-11 items-center justify-center rounded-full border border-pine/12 text-pine">
                  <Icon aria-hidden="true" className="size-5" strokeWidth={1.5} />
                  {badge > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 min-w-[16px] rounded-full bg-pine px-1 text-center text-[9px] font-bold text-ivory">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  ) : null}
                </span>
                <span className="text-center text-[11px] font-medium text-ink">{action.label}</span>
              </button>
            );
          })}
        </section>

        <ul className="divide-y divide-pine/8">
          <MenuRow label="AI 실행 일정 만들기" onClick={() => handleSelect(onAiPlan)} />
          <MenuRow label="장소 탐색" onClick={() => handleSelect(onOpenPlaces)} />
          <MenuRow
            badge={savedItinerariesCount > 0 ? String(savedItinerariesCount) : undefined}
            label="저장된 일정"
            onClick={() => handleSelect(onOpenItinerary)}
          />
          <MenuRow
            badge={
              pendingReservationCount > 0
                ? String(pendingReservationCount)
                : reservationCount > 0
                  ? String(reservationCount)
                  : undefined
            }
            badgeTone={pendingReservationCount > 0 ? "alert" : "default"}
            label="내 예약"
            onClick={() => handleSelect(onOpenReservation)}
          />
          {claimedLocalOfferIds.length > 0 ? (
            <MenuRow
              badge={String(claimedLocalOfferIds.length)}
              label="경로 쿠폰 보관함"
              onClick={() => handleSelect(onOpenCare)}
            />
          ) : null}
        </ul>

        {recentPlaces.length > 0 ? (
          <section className="mt-6 px-5">
            <h2 className="text-sm font-semibold text-ink">최근 본 장소</h2>
            <div className="mt-3 flex gap-3 overflow-x-auto pb-1 scrollbar-none">
              {recentPlaces.map((place) => (
                <button
                  className="w-28 shrink-0 text-left"
                  key={place.id}
                  onClick={() => handleOpenPlace(place.id)}
                  type="button"
                >
                  <PlaceThumbnail
                    className="w-full rounded-xl"
                    heightClassName="aspect-square w-full"
                    place={place}
                  />
                  <p className="mt-2 line-clamp-1 text-xs font-semibold text-ink">{place.name}</p>
                  <p className="text-[10px] text-stone">
                    {getPlaceCategoryLabel(place.category)}
                  </p>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <footer className="mt-8 flex items-center justify-center gap-4 px-5 text-sm text-stone">
          <button
            className="relative font-medium hover:text-ink"
            onClick={() => setSubView("notices")}
            type="button"
          >
            공지사항
            <span className="absolute -right-2 top-0 size-1.5 rounded-full bg-[#E85D4C]" />
          </button>
          <span aria-hidden="true" className="text-pine/20">
            |
          </span>
          <button
            className="font-medium hover:text-ink"
            onClick={() => {
              window.alert("ODRÉ GANGWON 고객센터\nhelp@odre.demo · 033-000-0000");
            }}
            type="button"
          >
            고객센터
          </button>
        </footer>

        {hasItinerary ? (
          <p className="mt-4 text-center text-xs text-stone">
            {tripExecutionPhase === "trip-day"
              ? "실행 일정이 진행 중입니다."
              : tripExecutionPhase === "after-trip"
                ? "지난 여행 일정이 저장되어 있습니다."
                : "다가오는 여행 일정이 준비되었습니다."}
          </p>
        ) : null}
      </div>
    </MenuOverlay>
  );
}

function MenuOverlay({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 z-40 flex justify-end">
      <button
        aria-label="메뉴 닫기"
        className="absolute inset-0 bg-ink/35 animate-[drawer-backdrop-in_0.2s_ease-out]"
        onClick={onClose}
        type="button"
      />
      <aside
        aria-modal="true"
        className="relative flex h-full w-[min(82%,19.5rem)] max-w-[320px] flex-col border-l border-pine/10 bg-ivory shadow-[var(--shadow-soft)] animate-[drawer-slide-in_0.28s_cubic-bezier(0.22,1,0.36,1)]"
        role="dialog"
      >
        {children}
      </aside>
    </div>
  );
}

function MenuRow({
  label,
  onClick,
  badge,
  badgeTone = "default",
}: {
  label: string;
  onClick: () => void;
  badge?: string;
  badgeTone?: "default" | "alert";
}) {
  return (
    <li>
      <button
        className="flex w-full items-center px-5 py-4 text-left"
        onClick={onClick}
        type="button"
      >
        <span className="flex-1 text-[15px] text-ink">{label}</span>
        {badge ? (
          <span
            className={cn(
              "mr-2 text-sm font-semibold",
              badgeTone === "alert" ? "text-[#E85D4C]" : "text-pine",
            )}
          >
            {badge}
          </span>
        ) : null}
        <ChevronRight aria-hidden="true" className="size-4 text-stone/60" />
      </button>
    </li>
  );
}

function SettingsPanel({
  user,
  onBack,
  onLogout,
}: {
  user: AuthUser | null;
  onBack: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center gap-2 border-b border-pine/10 px-4 py-3">
        <button
          className="text-sm font-medium text-pine"
          onClick={onBack}
          type="button"
        >
          ← 뒤로
        </button>
        <h2 className="text-base font-semibold text-ink">설정</h2>
      </header>
      <div className="flex-1 overflow-y-auto space-y-4 px-5 py-6">
        {user ? (
          <>
            <p className="text-sm text-stone">
              {providerLabels[user.provider]} · {user.email ?? user.name}
            </p>
            <button
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-pine/15 py-3 text-sm font-semibold text-pine"
              onClick={onLogout}
              type="button"
            >
              <LogOut aria-hidden="true" className="size-4" />
              로그아웃
            </button>
          </>
        ) : (
          <p className="text-sm text-stone">로그인 후 계정 설정을 이용할 수 있습니다.</p>
        )}
        <section className="rounded-xl border border-pine/10 bg-paper p-4">
          <p className="text-sm font-semibold text-ink">실행·외부 데이터</p>
          <div className="mt-2">
            <ExternalDataStatusPanel />
          </div>
        </section>
        <p className="text-xs text-stone">알림·프로필 편집은 다음 단계에서 연결됩니다.</p>
      </div>
    </div>
  );
}

function NoticesPanel({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center gap-2 border-b border-pine/10 px-4 py-3">
        <button className="text-sm font-medium text-pine" onClick={onBack} type="button">
          ← 뒤로
        </button>
        <h2 className="text-base font-semibold text-ink">공지사항</h2>
      </header>
      <ul className="flex-1 overflow-y-auto divide-y divide-pine/8 px-5">
        <li className="py-4">
          <p className="text-sm font-semibold text-ink">강원 7권역 실행</p>
          <p className="mt-1 text-xs text-stone">실행 일정·제휴 예약·QR 데모를 이용해 보세요.</p>
        </li>
        <li className="py-4">
          <p className="text-sm font-semibold text-ink">카카오맵 연동 안내</p>
          <p className="mt-1 text-xs text-stone">
            API 키 설정 시 장소 상세·경로 지도가 활성화됩니다.
          </p>
        </li>
      </ul>
    </div>
  );
}
