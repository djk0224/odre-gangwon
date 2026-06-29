import { NextResponse } from "next/server";
import { getConfiguredAiProviders } from "@/services/ai/provider";
import { isLlmConfigured } from "@/lib/serverEnv";

export async function GET() {
  const providers = getConfiguredAiProviders();
  return NextResponse.json({
    llmConfigured: isLlmConfigured(),
    providers,
    primary: providers.find((p) => p !== "rules") ?? "rules",
    checkedAt: new Date().toISOString(),
  });
}
