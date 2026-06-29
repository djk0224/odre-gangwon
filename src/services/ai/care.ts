import { buildPreferencesPrompt, buildWeatherSummaryForAi } from "@/services/ai/context";
import { completeJsonWithLlm } from "@/services/ai/provider";
import { generateDayCareSuggestions } from "@/services/careService";
import type { AiCareSuggestion, AiProvider } from "@/services/ai/types";
import type { HubReservationBooking } from "@/types/reservationHub";
import type { CareAlert, Itinerary, ReservationRecord, TripPreferences } from "@/types/travel";

const CARE_SYSTEM = `You are ODRÉ GANGWON day-of travel care assistant.
Return ONLY JSON: { "alerts": [{ "id", "type", "title", "message", "priority", "actionLabel" }] }.
type: departure|reservation|crowd-change|schedule-adjust|gap-recommendation|weather|transit.
priority: low|medium|high. Korean text. Max 4 alerts. Be actionable for the user's selected Gangwon zone trip.`;

export async function generateAiCareSuggestions(options: {
  itinerary?: Itinerary;
  preferences: TripPreferences;
  reservations: ReservationRecord[];
  hubBookings: HubReservationBooking[];
  claimedLocalOfferIds: string[];
  ruleAlerts: CareAlert[];
}): Promise<{ alerts: CareAlert[]; provider: AiProvider; aiExtras: AiCareSuggestion[] }> {
  const weatherSummary = await buildWeatherSummaryForAi();
  const base = options.ruleAlerts.length
    ? options.ruleAlerts
    : await generateDayCareSuggestions(
        options.itinerary,
        options.reservations,
        options.hubBookings,
        options.claimedLocalOfferIds,
        { preferences: options.preferences, weatherShort: null, weatherMid: null },
      );

  if (!options.itinerary) {
    return { alerts: base, provider: "rules", aiExtras: [] };
  }

  try {
    const llm = await completeJsonWithLlm<{ alerts: AiCareSuggestion[] }>({
      system: CARE_SYSTEM,
      user: JSON.stringify({
        itinerary: {
          title: options.itinerary.title,
          stops: options.itinerary.stops.map((s) => ({
            order: s.order,
            day: s.day,
            place: s.placeName,
          })),
          alternatives: options.itinerary.alternatives,
        },
        ...buildPreferencesPrompt({
          preferences: options.preferences,
          weatherSummary,
        }),
        reservations: options.reservations.map((r) => ({
          place: r.placeName,
          slot: r.slotLabel,
        })),
      }),
    });

    if (llm?.data.alerts?.length) {
      const mapped: CareAlert[] = llm.data.alerts.slice(0, 4).map((alert, index) => ({
        id: alert.id || `ai-care-${index}`,
        type: (alert.type as CareAlert["type"]) || "schedule-adjust",
        title: alert.title,
        message: alert.message,
        priority: alert.priority,
        actionLabel: alert.actionLabel,
      }));

      const merged = [...mapped, ...base.filter((b) => !mapped.some((m) => m.type === b.type))];
      return { alerts: merged.slice(0, 8), provider: llm.provider, aiExtras: llm.data.alerts };
    }
  } catch {
    /* rules only */
  }

  return { alerts: base, provider: "rules", aiExtras: [] };
}
