import { NextResponse } from "next/server";
import type { BehaviorEvent } from "@/types/behavior";

const MAX_BATCH = 50;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sessionId?: string;
      events?: BehaviorEvent[];
    };

    const events = body.events ?? [];
    if (events.length === 0) {
      return NextResponse.json({ ok: true, accepted: 0 });
    }

    if (events.length > MAX_BATCH) {
      return NextResponse.json({ error: `max ${MAX_BATCH} events per batch` }, { status: 400 });
    }

    // Demo: acknowledge batch; production would persist to analytics store.
    return NextResponse.json({
      ok: true,
      accepted: events.length,
      sessionId: body.sessionId ?? null,
    });
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
}
