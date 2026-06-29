import { fetchJson } from "@/services/external/fetchJson";

interface DataGoKrHeader {
  resultCode?: string;
  resultMsg?: string;
}

interface DataGoKrResponse<T> {
  response?: {
    header?: DataGoKrHeader;
    body?: T;
  };
}

export class PublicApiError extends Error {
  constructor(
    message: string,
    readonly resultCode?: string,
  ) {
    super(message);
    this.name = "PublicApiError";
  }
}

function encodeServiceKey(rawKey: string): string {
  if (rawKey.includes("%")) {
    return rawKey;
  }
  return encodeURIComponent(rawKey);
}

export function buildDataGoKrUrl(
  baseUrl: string,
  operation: string,
  serviceKey: string,
  params: Record<string, string | number | undefined>,
): string {
  const url = new URL(`${baseUrl.replace(/\/$/, "")}/${operation}`);
  url.searchParams.set("serviceKey", encodeServiceKey(serviceKey));

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      return;
    }
    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

export async function requestDataGoKr<TBody>(
  url: string,
  options?: {
    okCodes?: string[];
    emptyOnNoData?: boolean;
  },
): Promise<TBody> {
  const data = await fetchJson<DataGoKrResponse<TBody>>(url);
  const header = data.response?.header;
  const code = header?.resultCode ?? "";
  const msg = header?.resultMsg ?? "Unknown API error";
  const okCodes = options?.okCodes ?? ["00", "0000", "03"];

  if (!okCodes.includes(code)) {
    throw new PublicApiError(msg, code);
  }

  if (code === "03" && options?.emptyOnNoData) {
    return {} as TBody;
  }

  const body = data.response?.body;
  if (!body && code !== "03") {
    throw new PublicApiError(msg, code);
  }

  return (body ?? {}) as TBody;
}

export function normalizeItemList<T>(item: T | T[] | undefined | ""): T[] {
  if (!item || item === "") {
    return [];
  }
  return Array.isArray(item) ? item : [item];
}
