"use client";

import { useState } from "react";
import { Check, QrCode, Ticket } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { gangwonPassBenefits, gangwonPassPlans } from "@/data/gangwonPassCatalog";
import { isPassActive, remainingPassBenefits } from "@/services/gangwonPassService";
import type { ActiveGangwonPass } from "@/types/gangwonPass";
import type { ReservationHubCategory } from "@/types/reservationHub";
import type { TripPreferences } from "@/types/travel";
import { travelZoneShortLabels } from "@/config/tourZoneSigungu";
import { cn } from "@/lib/utils";

interface GangwonPassSheetProps {
  open: boolean;
  onClose: () => void;
  preferences: TripPreferences;
  gangwonPass?: ActiveGangwonPass;
  onPurchase: (planId: string) => boolean;
  onRedeemBenefit: (benefitId: string) => boolean;
  onOpenReservation: (options: {
    placeId?: string;
    hubCategory?: ReservationHubCategory;
  }) => void;
}

export function GangwonPassSheet({
  open,
  onClose,
  preferences,
  gangwonPass,
  onPurchase,
  onRedeemBenefit,
  onOpenReservation,
}: GangwonPassSheetProps) {
  const [selectedPlanId, setSelectedPlanId] = useState(gangwonPassPlans[0]?.id ?? "day-1");
  const [message, setMessage] = useState("");

  const passActive = isPassActive(gangwonPass, preferences.travelDate);
  const availableBenefits = remainingPassBenefits(gangwonPass);

  function handlePurchase() {
    const ok = onPurchase(selectedPlanId);
    setMessage(
      ok
        ? "혜택이 일정에 연동되었습니다. 아래 혜택을 사용해 보세요."
        : "혜택 연동에 실패했습니다. 다시 시도해 주세요.",
    );
  }

  function handleRedeem(benefitId: string) {
    const benefit = gangwonPassBenefits.find((item) => item.id === benefitId);
    if (!benefit) return;

    const ok = onRedeemBenefit(benefitId);
    if (!ok) {
      setMessage("이미 사용했거나 연동된 혜택이 없습니다.");
      return;
    }

    if (benefit.placeId) {
      onOpenReservation({ placeId: benefit.placeId });
      setMessage(`${benefit.title} 예약 화면으로 이동합니다.`);
      return;
    }
    if (benefit.hubCategory) {
      onOpenReservation({ hubCategory: benefit.hubCategory });
      setMessage(`${benefit.title} 예약 허브로 이동합니다.`);
      return;
    }
    setMessage(`${benefit.title} 혜택이 케어·쿠폰에 반영되었습니다.`);
  }

  const zoneLabel = travelZoneShortLabels[preferences.zoneId] ?? "강원";

  return (
    <BottomSheet
      eyebrow="강원 혜택 연동"
      onClose={onClose}
      open={open}
      subtitle={
        passActive
          ? `${gangwonPass?.planLabel} · ${gangwonPass?.validUntil}까지 유효`
          : `${zoneLabel} 공식 강원패스·강원상품권·로컬 혜택을 일정에 연동`
      }
      title={passActive ? "내 강원 혜택" : "강원 혜택 연동"}
      footer={
        passActive ? (
          <PremiumButton className="w-full" onClick={onClose} variant="ghost">
            닫기
          </PremiumButton>
        ) : (
          <div className="space-y-2">
            <PremiumButton className="w-full" onClick={handlePurchase}>
              {gangwonPassPlans.find((plan) => plan.id === selectedPlanId)?.label ?? "혜택"}{" "}
              연동하기
            </PremiumButton>
            <PremiumButton className="w-full" onClick={onClose} variant="ghost">
              닫기
            </PremiumButton>
          </div>
        )
      }
    >
      {message ? (
        <p className="mb-4 rounded-xl bg-pine/8 px-3 py-2.5 text-sm font-medium text-pine">
          {message}
        </p>
      ) : null}

      {passActive && gangwonPass ? (
        <div className="space-y-5">
          <div className="rounded-2xl bg-gradient-to-br from-pine-deep via-pine to-mist p-5 text-ivory">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sand">
                  GANGWON BENEFIT LINK
                </p>
                <p className="mt-2 text-xl font-semibold">강원 혜택 연동</p>
                <p className="mt-1 text-sm text-mist">{gangwonPass.planLabel}</p>
              </div>
              <QrCode aria-hidden="true" className="size-10 shrink-0 text-sand/90" />
            </div>
            <p className="mt-4 font-mono text-sm tracking-wider">{gangwonPass.passNumber}</p>
            <p className="mt-2 text-xs text-mist">
              {preferences.travelDate} 여행 · 유효 {gangwonPass.validUntil}
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-ink">연동된 혜택 사용</p>
            <ul className="mt-2 space-y-2">
              {gangwonPassBenefits.map((benefit) => {
                const redeemed = gangwonPass.redeemedBenefitIds.includes(benefit.id);
                return (
                  <li
                    className={cn(
                      "rounded-xl border px-3 py-3",
                      redeemed
                        ? "border-pine/15 bg-pine/5"
                        : "border-pine/10 bg-paper",
                    )}
                    key={benefit.id}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-ink">{benefit.title}</p>
                        <p className="mt-0.5 text-xs text-stone">{benefit.description}</p>
                        <p className="mt-1 text-xs font-medium text-pine">
                          {benefit.discountLabel}
                        </p>
                      </div>
                      {redeemed ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-pine">
                          <Check className="size-3.5" aria-hidden />
                          사용함
                        </span>
                      ) : null}
                    </div>
                    {!redeemed ? (
                      <PremiumButton
                        className="mt-3 w-full"
                        onClick={() => handleRedeem(benefit.id)}
                        variant="ghost"
                      >
                        혜택 사용하기
                      </PremiumButton>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {availableBenefits.length === 0 ? (
              <p className="mt-2 text-xs text-stone">모든 혜택을 사용했습니다.</p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm leading-6 text-stone">
            강원도가 운영하는 공식 강원패스·강원상품권 환급은 무료입니다. ODRÉ는 이 공식 혜택과
            로컬 쿠폰을 여행 날짜·일정에 맞춰 연동해 바로 사용할 수 있게 안내합니다.
          </p>
          <div className="space-y-2">
            {gangwonPassPlans.map((plan) => (
              <button
                className={cn(
                  "w-full rounded-2xl border p-4 text-left transition-colors",
                  selectedPlanId === plan.id
                    ? "border-pine bg-pine/5 shadow-[0_0_0_3px_rgba(47,74,58,0.1)]"
                    : "border-pine/10 bg-paper",
                )}
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">{plan.label}</p>
                    <p className="mt-1 text-xs text-stone">{plan.description}</p>
                  </div>
                  <p className="text-base font-semibold text-pine">
                    {plan.price > 0 ? `₩${plan.price.toLocaleString("ko-KR")}` : "무료"}
                  </p>
                </div>
              </button>
            ))}
          </div>
          <ul className="space-y-1.5 text-sm text-stone">
            {gangwonPassBenefits.slice(0, 4).map((benefit) => (
              <li className="flex gap-2" key={benefit.id}>
                <Ticket className="mt-0.5 size-4 shrink-0 text-pine" aria-hidden />
                <span>
                  {benefit.title} · {benefit.discountLabel}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </BottomSheet>
  );
}
