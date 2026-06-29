import { NextResponse } from "next/server";
import { getGangwonCatalogMeta } from "@/data/placeCatalogMeta";

/** Server-side catalog zone counts (full GW import) */
export async function GET() {
  return NextResponse.json(getGangwonCatalogMeta());
}
