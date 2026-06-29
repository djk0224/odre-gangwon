import { Bell, Bus, Clock3, CloudRain, MapPin, Ticket, TrendingUp } from "lucide-react";
import {
  TravelCardList,
  TravelCardRow,
  TravelCardShell,
  travelCardClass,
} from "@/components/ui/TravelCard";
import type { CareAlert } from "@/types/travel";

const iconByType = {
  departure: Clock3,
  reservation: Ticket,
  "crowd-change": TrendingUp,
  "schedule-adjust": Bell,
  "gap-recommendation": MapPin,
  weather: CloudRain,
  transit: Bus,
} as const;

const labelByType = {
  departure: "출발 안내",
  reservation: "예약 알림",
  "crowd-change": "혼잡 변화",
  "schedule-adjust": "일정 조정",
  "gap-recommendation": "갭타임 추천",
  weather: "날씨",
  transit: "대중교통",
} as const;

interface CareAlertListProps {
  alerts: CareAlert[];
  onAction?: (alert: CareAlert) => void;
}

export function CareAlertList({ alerts, onAction }: CareAlertListProps) {
  if (alerts.length === 0) return null;

  return (
    <TravelCardShell>
      <div className={travelCardClass.bodyLg}>
        <p className={travelCardClass.eyebrow}>Day-of Care</p>
        <h3 className="mt-1 text-xl font-semibold text-ink">오늘의 케어 알림</h3>
      </div>
      <TravelCardList>
        {alerts.map((alert) => {
          const Icon = iconByType[alert.type];
          const actionable = Boolean(alert.action && alert.actionLabel && onAction);

          return (
            <TravelCardRow
              description={alert.message}
              eyebrow={labelByType[alert.type]}
              footer={
                alert.actionLabel ? (
                  actionable ? (
                    <button
                      className="text-sm font-semibold text-pine underline-offset-2 hover:underline"
                      onClick={() => onAction?.(alert)}
                      type="button"
                    >
                      {alert.actionLabel}
                    </button>
                  ) : (
                    <p className="text-sm font-semibold text-pine">{alert.actionLabel}</p>
                  )
                ) : undefined
              }
              key={alert.id}
              title={alert.title}
              trailing={
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-pine/8 text-pine">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
              }
            />
          );
        })}
      </TravelCardList>
    </TravelCardShell>
  );
}
