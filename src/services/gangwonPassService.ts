import { gangwonPassBenefits, getPassPlan } from "@/data/gangwonPassCatalog";
import type { ActiveGangwonPass } from "@/types/gangwonPass";
import type { TripPreferences } from "@/types/travel";

export function createPassNumber(): string {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `GP-${suffix}`;
}

export function buildValidUntilDate(
  travelDate: string,
  durationDays: number,
): string {
  const start = new Date(`${travelDate}T12:00:00`);
  if (Number.isNaN(start.getTime())) {
    return travelDate;
  }
  start.setDate(start.getDate() + Math.max(0, durationDays - 1));
  return start.toISOString().slice(0, 10);
}

export function issueGangwonPass(
  planId: string,
  preferences: TripPreferences,
  paymentMethod: string,
): ActiveGangwonPass | null {
  const plan = getPassPlan(planId);
  if (!plan) return null;

  const purchasedAt = new Date().toISOString();
  return {
    planId: plan.id,
    planLabel: plan.label,
    amount: plan.price,
    purchasedAt,
    validUntil: buildValidUntilDate(preferences.travelDate, plan.durationDays),
    passNumber: createPassNumber(),
    redeemedBenefitIds: [],
  };
}

export function isPassActive(pass: ActiveGangwonPass | undefined, travelDate: string): boolean {
  if (!pass) return false;
  return pass.validUntil >= travelDate.slice(0, 10);
}

export function remainingPassBenefits(pass: ActiveGangwonPass | undefined) {
  if (!pass) return gangwonPassBenefits;
  return gangwonPassBenefits.filter(
    (benefit) => !pass.redeemedBenefitIds.includes(benefit.id),
  );
}
