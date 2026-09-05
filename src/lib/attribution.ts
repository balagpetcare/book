export const ATTRIBUTION_COOKIE_NAME = 'book_attribution';
export const ATTRIBUTION_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

export const attributionKeys = [
  'fbclid',
  'fbp',
  'fbc',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const;

export type AttributionKey = (typeof attributionKeys)[number];
export type AttributionSnapshot = Partial<Record<AttributionKey, string>>;

const fbpPattern = /^fb\.1\.\d+\.\d+$/;
const fbcPattern = /^fb\.1\.\d+\.[A-Za-z0-9._-]+$/;

export function isValidFbp(value: string | null | undefined): value is string {
  return Boolean(value && value.length <= 200 && fbpPattern.test(value));
}

export function isValidFbc(value: string | null | undefined): value is string {
  return Boolean(value && value.length <= 200 && fbcPattern.test(value));
}

export function isSafeAttributionValue(value: string | null | undefined): value is string {
  return Boolean(value && value.length <= 500 && !/[\u0000-\u001f\u007f]/.test(value));
}

export function buildFbcFromFbclid(fbclid: string, timestamp = Date.now()): string | null {
  if (!isSafeAttributionValue(fbclid) || !/^[A-Za-z0-9._-]+$/.test(fbclid)) return null;
  return `fb.1.${timestamp}.${fbclid}`;
}

export function parseAttributionSnapshot(value: string | null | undefined): AttributionSnapshot {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const result: AttributionSnapshot = {};
    for (const key of attributionKeys) {
      const candidate = (parsed as Record<string, unknown>)[key];
      if (typeof candidate === 'string' && isSafeAttributionValue(candidate)) {
        result[key] = candidate;
      }
    }
    if (result.fbp && !isValidFbp(result.fbp)) delete result.fbp;
    if (result.fbc && !isValidFbc(result.fbc)) delete result.fbc;
    return result;
  } catch {
    return {};
  }
}

export function mergeAttribution(
  current: AttributionSnapshot,
  incoming: AttributionSnapshot,
): AttributionSnapshot {
  const result = { ...current };
  for (const key of attributionKeys) {
    const value = incoming[key];
    if (!value || !isSafeAttributionValue(value)) continue;
    if ((key === 'fbp' && !isValidFbp(value)) || (key === 'fbc' && !isValidFbc(value))) continue;
    result[key] = value;
  }
  if (result.fbclid && !isValidFbc(result.fbc)) {
    const constructedFbc = buildFbcFromFbclid(result.fbclid);
    if (constructedFbc) result.fbc = constructedFbc;
  }
  return result;
}

export function serializeAttributionSnapshot(snapshot: AttributionSnapshot): string {
  return JSON.stringify(snapshot);
}
