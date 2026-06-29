import { tagoCityDefaults } from "@/config/publicApiDefaults";
import { getTagoServiceKey } from "@/lib/serverEnv";
import {
  buildDataGoKrUrl,
  normalizeItemList,
  requestDataGoKr,
} from "@/lib/dataGoKrClient";
import type { TransitArrivalItem } from "@/types/externalData";

const TAGO_BASE = "https://apis.data.go.kr/1613000";

export interface TagoCityCode {
  citycode: number;
  cityname: string;
}

export interface TagoBusStop {
  nodeid: string;
  nodenm: string;
  nodeno: number;
  gpslati: number;
  gpslong: number;
}

export interface TagoBusRoute {
  routeid: string;
  routeno: number | string;
  routetp: string;
  startnodenm: string;
  endnodenm: string;
}

export interface TagoBusLocation {
  vehicleno: string;
  nodeid: string;
  nodenm: string;
  routeid: string;
  gpslati: number;
  gpslong: number;
}

type ItemsBody<T> = {
  items?: { item?: T | T[] } | "";
  totalCount?: number;
};

async function tagoRequest<T>(
  servicePath: string,
  operation: string,
  params: Record<string, string | number | undefined>,
): Promise<T[]> {
  const serviceKey = getTagoServiceKey();
  if (!serviceKey) {
    return [];
  }

  const url = buildDataGoKrUrl(`${TAGO_BASE}/${servicePath}`, operation, serviceKey, {
    _type: "json",
    ...params,
  });

  const body = await requestDataGoKr<ItemsBody<T>>(url, { emptyOnNoData: true });
  return normalizeItemList(
    typeof body.items === "object" && body.items && "item" in body.items
      ? body.items.item
      : undefined,
  );
}

/** 도시코드 목록 */
export function fetchTagoCityCodes() {
  return tagoRequest<TagoCityCode>(
    "BusSttnInfoInqireService",
    "getCtyCodeList",
    { numOfRows: 300, pageNo: 1 },
  );
}

/** 버스 정류소 */
export function fetchBusStops(options?: {
  cityCode?: string;
  numOfRows?: number;
  pageNo?: number;
}) {
  return tagoRequest<TagoBusStop>("BusSttnInfoInqireService", "getSttnNoList", {
    cityCode: options?.cityCode ?? tagoCityDefaults.samcheok,
    numOfRows: options?.numOfRows ?? 50,
    pageNo: options?.pageNo ?? 1,
  });
}

/** 버스 노선 */
export function fetchBusRoutes(options?: {
  cityCode?: string;
  numOfRows?: number;
  pageNo?: number;
}) {
  return tagoRequest<TagoBusRoute>("BusRouteInfoInqireService", "getRouteNoList", {
    cityCode: options?.cityCode ?? tagoCityDefaults.samcheok,
    numOfRows: options?.numOfRows ?? 30,
    pageNo: options?.pageNo ?? 1,
  });
}

/** 노선 상세 */
export async function fetchBusRouteDetail(options: {
  cityCode?: string;
  routeId: string;
}) {
  const serviceKey = getTagoServiceKey();
  if (!serviceKey) {
    return null;
  }

  const url = buildDataGoKrUrl(
    `${TAGO_BASE}/BusRouteInfoInqireService`,
    "getRouteInfoIem",
    serviceKey,
    {
      _type: "json",
      cityCode: options.cityCode ?? tagoCityDefaults.samcheok,
      routeId: options.routeId,
    },
  );

  const body = await requestDataGoKr<ItemsBody<TagoBusRoute>>(url, { emptyOnNoData: true });
  const items = normalizeItemList(
    typeof body.items === "object" && body.items && "item" in body.items
      ? body.items.item
      : undefined,
  );
  return items[0] ?? null;
}

/** 버스 도착정보 */
export async function fetchBusArrivals(options: {
  cityCode?: string;
  nodeId: string;
}): Promise<TransitArrivalItem[]> {
  const rows = await tagoRequest<{
    routeid: string;
    routenm?: string;
    routeno?: string | number;
    arrtime: number;
    arrprevstationcnt?: number;
    nodeid: string;
    nodenm: string;
  }>("ArvlInfoInqireService", "getSttnAcctoArvlPrearngeInfoList", {
    cityCode: options.cityCode ?? tagoCityDefaults.samcheok,
    nodeId: options.nodeId,
    numOfRows: 20,
  });

  return rows.map((row) => ({
    routeName: String(row.routeno ?? row.routeid),
    arrivalMinutes: Math.max(0, Math.round((row.arrtime ?? 0) / 60)),
    stationName: row.nodenm,
    source: "tago-bus-arrival" as const,
  }));
}

/** 버스 위치정보 */
export function fetchBusLocations(options: {
  cityCode?: string;
  routeId: string;
}) {
  return tagoRequest<TagoBusLocation>("BusLcInfoInqireService", "getRouteAcctoBusLcList", {
    cityCode: options.cityCode ?? tagoCityDefaults.samcheok,
    routeId: options.routeId,
    numOfRows: 30,
  });
}

export async function fetchBusRouteSummary(options: {
  cityCode?: string;
  routeId: string;
}): Promise<{ routeName: string; stations: string[] } | null> {
  const detail = await fetchBusRouteDetail(options);
  if (!detail) {
    return null;
  }

  return {
    routeName: String(detail.routeno),
    stations: [detail.startnodenm, detail.endnodenm].filter(Boolean),
  };
}
