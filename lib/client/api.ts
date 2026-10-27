export type JsonRecord = Record<string, unknown>;

export async function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

export function isJsonRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function arrayPayload(payload: unknown, keys: string[] = []): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!isJsonRecord(payload)) return [];
  for (const key of keys) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  return [];
}

export function apiError(payload: unknown, fallback: string) {
  return isJsonRecord(payload) && typeof payload.error === "string"
    ? payload.error
    : fallback;
}
