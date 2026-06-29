"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { PreferenceChip } from "@/components/ui/PreferenceChip";
import { TravelCardShell, travelCardClass } from "@/components/ui/TravelCard";
import {
  formatKrw,
  getPaymentMethodLabel,
  paymentMethods,
  type PaymentMethodId,
} from "@/lib/paymentQuote";

interface ReservationPaymentPanelProps {
  title: string;
  summary: string;
  amount: number;
  discountLabel?: string;
  discountAmount?: number;
  onBack: () => void;
  onPaid: (method: PaymentMethodId) => void;
}

export function ReservationPaymentPanel({
  title,
  summary,
  amount,
  discountLabel,
  discountAmount = 0,
  onBack,
  onPaid,
}: ReservationPaymentPanelProps) {
  const [method, setMethod] = useState<PaymentMethodId>("kakao");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const subtotal = amount;
  const discount = Math.min(discountAmount, subtotal);
  const total = Math.max(0, subtotal - discount);

  function handlePay() {
    setError("");
    setProcessing(true);
    window.setTimeout(() => {
      setProcessing(false);
      onPaid(method);
    }, 900);
  }

  return (
    <section className="space-y-4">
      <TravelCardShell>
        <div className={travelCardClass.bodyLg}>
          <p className={travelCardClass.eyebrow}>Payment</p>
          <h3 className="mt-1 text-lg font-semibold text-ink">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-stone">{summary}</p>
        </div>
      </TravelCardShell>

      <TravelCardShell>
        <div className={travelCardClass.body}>
          <div className="flex justify-between text-sm text-stone">
            <span>상품 금액</span>
            <span className="font-medium text-ink">{formatKrw(subtotal)}</span>
          </div>
          {discount > 0 ? (
            <div className="mt-2 flex justify-between text-sm text-pine">
              <span>{discountLabel ?? "할인"}</span>
              <span className="font-medium">-{formatKrw(discount)}</span>
            </div>
          ) : null}
          <div className="mt-4 flex justify-between border-t border-pine/10 pt-4">
            <span className="text-sm font-semibold text-ink">결제 금액</span>
            <span className="text-lg font-bold text-pine">{formatKrw(total)}</span>
          </div>
        </div>
      </TravelCardShell>

      <div>
        <p className="text-sm font-semibold text-ink">결제 수단</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {paymentMethods.map((item) => (
            <PreferenceChip
              key={item.id}
              onClick={() => setMethod(item.id)}
              selected={method === item.id}
            >
              {item.label}
            </PreferenceChip>
          ))}
        </div>
        {method === "card" ? (
          <p className="mt-3 rounded-xl border border-pine/10 bg-paper px-4 py-3 text-sm text-stone">
            등록 카드 · <span className="font-semibold text-ink">신한카드 •••• 4829</span>
          </p>
        ) : null}
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-pine/10 bg-paper px-4 py-3 text-xs leading-5 text-stone">
        <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-pine" />
        <p>
          데모 결제입니다. {getPaymentMethodLabel(method)}로 {formatKrw(total)}이 결제된 뒤 예약이
          확정됩니다.
        </p>
      </div>

      {error ? <p className="text-sm font-medium text-pine">{error}</p> : null}

      <div className="flex gap-2">
        <PremiumButton className="flex-1" onClick={onBack} variant="ghost">
          이전
        </PremiumButton>
        <PremiumButton className="flex-[1.4]" disabled={processing} onClick={handlePay}>
          {processing ? "결제 처리 중..." : `${formatKrw(total)} 결제하기`}
        </PremiumButton>
      </div>
    </section>
  );
}
