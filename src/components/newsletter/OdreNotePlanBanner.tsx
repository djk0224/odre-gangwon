"use client";

import type { OdreNotePlanHint } from "@/data/odreNotePlanHints";
import { OdreNotePlanHintBlock } from "@/components/newsletter/OdreNotePlanHintBlock";

interface OdreNotePlanBannerProps {
  hint: OdreNotePlanHint;
  matchedPlaceCount: number;
}

export function OdreNotePlanBanner({ hint, matchedPlaceCount }: OdreNotePlanBannerProps) {
  return <OdreNotePlanHintBlock hint={hint} matchedPlaceCount={matchedPlaceCount} />;
}
