import * as Location from "expo-location";

import { getCurrentLocale, translate } from "@/i18n";
import { env } from "@/lib/env";

export type AddressSuggestion = {
  id: string;
  title: string;
  subtitle: string;
  fullLabel: string;
  latitude: number;
  longitude: number;
};

type AddressSearchOptions = {
  near?: {
    latitude: number;
    longitude: number;
  } | null;
};

type AddressSearchRow = {
  place_id: string | number;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  address?: {
    road?: string;
    house_number?: string;
    suburb?: string;
    city?: string;
    town?: string;
    state?: string;
  };
  provider?: "legacy" | "native" | "mapbox";
  relevance?: number;
  accuracy?: string | null;
  matchCodeConfidence?: string | null;
};

type ScoredAddressSuggestion = AddressSuggestion & {
  _score: number;
  _distance: number;
};

type MapboxGeocodingResponse = {
  features?: MapboxFeature[];
};

type MapboxFeature = {
  id?: string;
  text?: string;
  place_name?: string;
  relevance?: number;
  center?: [number, number];
  geometry?: {
    coordinates?: [number, number];
  };
  properties?: {
    mapbox_id?: string;
    name?: string;
    name_preferred?: string;
    full_address?: string;
    place_formatted?: string;
    coordinates?: {
      longitude?: number;
      latitude?: number;
      accuracy?: string;
    };
    context?: {
      address?: {
        name?: string;
        address_number?: string;
        street_name?: string;
      };
      street?: {
        name?: string;
      };
      neighborhood?: {
        name?: string;
      };
      locality?: {
        name?: string;
      };
      place?: {
        name?: string;
      };
      district?: {
        name?: string;
      };
      region?: {
        name?: string;
        region_code?: string;
      };
      postcode?: {
        name?: string;
      };
      country?: {
        name?: string;
        country_code?: string;
      };
    };
    match_code?: {
      confidence?: string;
    };
  };
};

type ParsedAddressQuery = {
  normalized: string;
  road: string;
  houseNumber: string | null;
  variants: string[];
  localityHint: string | null;
  placeHint: string | null;
  regionHint: string | null;
  postcodeHint: string | null;
};

const BRAZIL_STATE_PATTERN =
  /^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/i;
const POSTCODE_PATTERN = /^\d{5}-?\d{3}$/;

export async function searchAddressSuggestions(
  query: string,
  options: AddressSearchOptions = {}
) {
  const normalizedQuery = query
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ");

  if (normalizedQuery.length < 3) {
    return [] as AddressSuggestion[];
  }

  const parsedQuery = parseAddressQuery(normalizedQuery);
  const rows = await fetchAddressCandidates(parsedQuery, options);
  return mapRowsToSuggestions(rows, parsedQuery, options.near ?? null)
    .slice(0, 6)
    .map(({ _score, _distance, ...item }) => item);
}

export async function resolveTypedAddress(
  query: string,
  options: AddressSearchOptions = {}
) {
  const normalizedQuery = query
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ");

  if (normalizedQuery.length < 5) {
    return null as AddressSuggestion | null;
  }

  const parsedQuery = parseAddressQuery(normalizedQuery);
  const near = options.near ?? null;

  let rows = await fetchNativeGeocodeCandidates(parsedQuery);

  if (!rows.length) {
    rows = await fetchLegacyAddressCandidates(parsedQuery, options).catch(() => []);
  }

  const [bestMatch] = mapRowsToSuggestions(rows, parsedQuery, near);

  if (!bestMatch) {
    return null as AddressSuggestion | null;
  }

  const typedTitle =
    [parsedQuery.road, parsedQuery.houseNumber].filter(Boolean).join(", ") || bestMatch.title;
  const latitudeKey = Math.round(bestMatch.latitude * 100000);
  const longitudeKey = Math.round(bestMatch.longitude * 100000);

  return {
    ...bestMatch,
    id: `typed-${normalizeSearchKey(parsedQuery.normalized)}-${latitudeKey}-${longitudeKey}`,
    title: typedTitle,
    fullLabel: parsedQuery.normalized,
  } satisfies AddressSuggestion;
}

async function fetchAddressCandidates(
  parsedQuery: ParsedAddressQuery,
  options: AddressSearchOptions
) {
  const shouldUseMapbox =
    env.addressSearchProvider === "mapbox" && Boolean(env.mapboxAccessToken?.trim());

  if (!shouldUseMapbox) {
    return fetchLegacyAddressCandidates(parsedQuery, options);
  }

  const mapboxRows = await fetchMapboxAddressCandidates(parsedQuery, options).catch(() => []);

  if (!shouldAppendLegacyFallback(mapboxRows, parsedQuery)) {
    return sortRowsByDistance(mapboxRows, options.near ?? null);
  }

  const legacyRows = await fetchLegacyAddressCandidates(parsedQuery, options).catch(() => []);
  return sortRowsByDistance(mergeRows(mapboxRows, legacyRows), options.near ?? null);
}

function shouldAppendLegacyFallback(rows: AddressSearchRow[], parsedQuery: ParsedAddressQuery) {
  if (!rows.length) {
    return true;
  }

  if (parsedQuery.houseNumber && !hasExactHouseNumber(rows, parsedQuery.houseNumber)) {
    return true;
  }

  return rows.length < 4;
}

async function fetchMapboxAddressCandidates(
  parsedQuery: ParsedAddressQuery,
  options: AddressSearchOptions
) {
  const requests: Promise<AddressSearchRow[]>[] = [];

  if (parsedQuery.houseNumber && parsedQuery.road) {
    requests.push(fetchMapboxStructuredVariant(parsedQuery, options.near ?? null));
  }

  requests.push(
    fetchMapboxTextVariant(parsedQuery.normalized, options.near ?? null, {
      autocomplete: true,
    })
  );

  if (parsedQuery.houseNumber && parsedQuery.road) {
    requests.push(
      fetchMapboxTextVariant(
        buildMapboxExactTextQuery(parsedQuery),
        options.near ?? null,
        { autocomplete: false }
      )
    );
  }

  const settled = await Promise.allSettled(requests);

  return settled
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .reduce<AddressSearchRow[]>((unique, row) => {
      const duplicate = unique.some(
        (existing) =>
          normalizeSearchKey(existing.display_name) === normalizeSearchKey(row.display_name) ||
          (Math.abs(Number(existing.lat) - Number(row.lat)) < 0.00001 &&
            Math.abs(Number(existing.lon) - Number(row.lon)) < 0.00001)
      );

      if (!duplicate) {
        unique.push(row);
      }

      return unique;
    }, []);
}

function buildMapboxExactTextQuery(parsedQuery: ParsedAddressQuery) {
  return [parsedQuery.road, parsedQuery.houseNumber, parsedQuery.placeHint, parsedQuery.regionHint]
    .filter(Boolean)
    .join(", ");
}

async function fetchMapboxStructuredVariant(
  parsedQuery: ParsedAddressQuery,
  near: AddressSearchOptions["near"]
) {
  const params = buildMapboxBaseParams(near, false);
  params.set("limit", "8");
  params.set("types", "address");
  params.set("street", parsedQuery.road);
  params.set("address_number", parsedQuery.houseNumber ?? "");

  if (parsedQuery.localityHint) {
    params.set("locality", parsedQuery.localityHint);
  }

  if (parsedQuery.placeHint) {
    params.set("place", parsedQuery.placeHint);
  }

  if (parsedQuery.regionHint) {
    params.set("region", parsedQuery.regionHint);
  }

  if (parsedQuery.postcodeHint) {
    params.set("postcode", parsedQuery.postcodeHint);
  }

  const response = await fetch(
    `https://api.mapbox.com/search/geocode/v6/forward?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(translate("address.exactSearchError"));
  }

  const data = (await response.json()) as MapboxGeocodingResponse;
  return mapMapboxFeaturesToRows(data.features ?? [], parsedQuery, "structured");
}

async function fetchMapboxTextVariant(
  query: string,
  near: AddressSearchOptions["near"],
  options: {
    autocomplete: boolean;
  }
) {
  const params = buildMapboxBaseParams(near, options.autocomplete);
  params.set("limit", "8");
  params.set("types", "address,street");
  params.set("q", query);

  const response = await fetch(
    `https://api.mapbox.com/search/geocode/v6/forward?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(translate("address.searchError"));
  }

  const data = (await response.json()) as MapboxGeocodingResponse;
  return mapMapboxFeaturesToRows(data.features ?? [], parseAddressQuery(query), "text");
}

function buildMapboxBaseParams(
  near: AddressSearchOptions["near"],
  autocomplete: boolean
) {
  const params = new URLSearchParams({
    access_token: env.mapboxAccessToken ?? "",
    language: "pt-BR",
    country: "BR",
    autocomplete: autocomplete ? "true" : "false",
  });

  if (env.mapboxPermanentGeocoding) {
    params.set("permanent", "true");
  }

  if (near) {
    params.set("proximity", `${near.longitude},${near.latitude}`);
  }

  return params;
}

function mapMapboxFeaturesToRows(
  features: MapboxFeature[],
  parsedQuery: ParsedAddressQuery,
  variant: "structured" | "text"
) : AddressSearchRow[] {
  return features
    .map((feature, index) => mapMapboxFeatureToRow(feature, parsedQuery, index, variant))
    .flatMap((row) => (row ? [row] : []));
}

function mapMapboxFeatureToRow(
  feature: MapboxFeature,
  parsedQuery: ParsedAddressQuery,
  index: number,
  variant: "structured" | "text"
) {
  const longitude =
    feature.geometry?.coordinates?.[0] ??
    feature.properties?.coordinates?.longitude ??
    feature.center?.[0];
  const latitude =
    feature.geometry?.coordinates?.[1] ??
    feature.properties?.coordinates?.latitude ??
    feature.center?.[1];

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const context = feature.properties?.context;
  const road =
    context?.address?.street_name ??
    context?.street?.name ??
    (parsedQuery.road || undefined);
  const houseNumber =
    context?.address?.address_number ??
    extractTrailingHouseNumber(feature.properties?.full_address) ??
    parsedQuery.houseNumber ??
    undefined;
  const suburb =
    context?.neighborhood?.name ?? context?.locality?.name ?? context?.district?.name ?? undefined;
  const city = context?.place?.name ?? context?.locality?.name ?? context?.district?.name ?? undefined;
  const state = context?.region?.name ?? context?.region?.region_code ?? undefined;

  const title =
    [road, houseNumber].filter(Boolean).join(", ") ||
    feature.properties?.name_preferred ||
    feature.properties?.name ||
    feature.text ||
    feature.properties?.full_address ||
    translate("address.defaultTitle");
  const displayName =
    feature.properties?.full_address ||
    [
      [road, houseNumber].filter(Boolean).join(", "),
      suburb,
      city,
      state,
    ]
      .filter(Boolean)
      .join(", ") ||
    feature.place_name ||
    title;

  return {
    place_id:
      feature.id ??
      feature.properties?.mapbox_id ??
      `mapbox-${variant}-${index}-${normalizeSearchKey(displayName)}`,
    lat: String(latitude),
    lon: String(longitude),
    display_name: displayName,
    name: title,
    provider: "mapbox",
    relevance: feature.relevance,
    accuracy:
      feature.properties?.coordinates?.accuracy ??
      feature.properties?.match_code?.confidence ??
      null,
    matchCodeConfidence: feature.properties?.match_code?.confidence ?? null,
    address: {
      road,
      house_number: houseNumber,
      suburb,
      city,
      state,
    },
  } satisfies AddressSearchRow;
}

function extractTrailingHouseNumber(input?: string) {
  if (!input) {
    return null;
  }

  const match = input.match(/,\s*(\d{1,6}[A-Za-z]?)\b/u);
  return match?.[1] ?? null;
}

async function fetchLegacyAddressCandidates(
  parsedQuery: ParsedAddressQuery,
  options: AddressSearchOptions
) {
  const allRows = await Promise.allSettled(
    parsedQuery.variants.map((variant) => fetchNominatimVariant(variant, options.near ?? null))
  );

  const dedupedRows = allRows
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .reduce<AddressSearchRow[]>((unique, row) => {
      const duplicate = unique.some(
        (existing) =>
          existing.place_id === row.place_id ||
          normalizeSearchKey(existing.display_name) === normalizeSearchKey(row.display_name)
      );

      if (!duplicate) {
        unique.push(row);
      }

      return unique;
    }, []);

  if (
    dedupedRows.length < 3 ||
    (parsedQuery.houseNumber && !hasExactHouseNumber(dedupedRows, parsedQuery.houseNumber))
  ) {
    const nativeRows = await fetchNativeGeocodeCandidates(parsedQuery);

    nativeRows.forEach((row) => {
      const duplicate = dedupedRows.some(
        (existing) =>
          normalizeSearchKey(existing.display_name) === normalizeSearchKey(row.display_name) ||
          (Math.abs(Number(existing.lat) - Number(row.lat)) < 0.00001 &&
            Math.abs(Number(existing.lon) - Number(row.lon)) < 0.00001)
      );

      if (!duplicate) {
        dedupedRows.push(row);
      }
    });
  }

  return sortRowsByDistance(dedupedRows, options.near ?? null);
}

function mergeRows(primary: AddressSearchRow[], fallback: AddressSearchRow[]) {
  return [...primary, ...fallback].reduce<AddressSearchRow[]>((unique, row) => {
    const duplicate = unique.some(
      (existing) =>
        normalizeSearchKey(existing.display_name) === normalizeSearchKey(row.display_name) ||
        (Math.abs(Number(existing.lat) - Number(row.lat)) < 0.00001 &&
          Math.abs(Number(existing.lon) - Number(row.lon)) < 0.00001)
    );

    if (!duplicate) {
      unique.push(row);
    }

    return unique;
  }, []);
}

function sortRowsByDistance(
  rows: AddressSearchRow[],
  near: AddressSearchOptions["near"]
) {
  if (!near) {
    return rows;
  }

  return [...rows].sort((left, right) => {
    const leftDistance = estimateDistance(near, Number(left.lat), Number(left.lon));
    const rightDistance = estimateDistance(near, Number(right.lat), Number(right.lon));
    return leftDistance - rightDistance;
  });
}

async function fetchNominatimVariant(
  query: string,
  near: AddressSearchOptions["near"]
) {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    addressdetails: "1",
    limit: "16",
    countrycodes: "br",
    dedupe: "1",
  });

  if (near) {
    const longitudeDelta = 0.18;
    const latitudeDelta = 0.12;
    params.set(
      "viewbox",
      [
        near.longitude - longitudeDelta,
        near.latitude + latitudeDelta,
        near.longitude + longitudeDelta,
        near.latitude - latitudeDelta,
      ].join(",")
    );
  }

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      "Accept-Language": getCurrentLocale() === "pt-BR" ? "pt-BR,pt;q=0.9,en;q=0.7" : "en-US,en;q=0.9,pt;q=0.7",
      "User-Agent": "GoodGameMobile/0.1",
    },
  });

  if (!response.ok) {
    throw new Error(translate("address.searchError"));
  }

  const rows = (await response.json()) as AddressSearchRow[];
  return rows.map((row) => ({
    ...row,
    provider: "legacy" as const,
  }));
}

function mapRowsToSuggestions(
  rows: AddressSearchRow[],
  parsedQuery: ParsedAddressQuery,
  near: AddressSearchOptions["near"]
) {
  return rows
    .map((row) => {
      const latitude = Number(row.lat);
      const longitude = Number(row.lon);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
      }

      const title =
        row.name?.trim() ||
        [row.address?.road, row.address?.house_number].filter(Boolean).join(", ") ||
        row.display_name.split(",")[0]?.trim() ||
        translate("address.defaultTitle");
      const subtitle = [
        row.address?.suburb,
        row.address?.city ?? row.address?.town,
        row.address?.state,
      ]
        .filter(Boolean)
        .join(" · ");

      return {
        id: String(row.place_id),
        title,
        subtitle,
        fullLabel: row.display_name,
        latitude,
        longitude,
        _distance: near ? estimateDistance(near, latitude, longitude) : Number.POSITIVE_INFINITY,
        _score: scoreAddressResult({
          queryKey: normalizeSearchKey(parsedQuery.normalized),
          roadQueryKey: normalizeSearchKey(parsedQuery.road),
          houseNumberQuery: parsedQuery.houseNumber,
          title,
          subtitle,
          fullLabel: row.display_name,
          houseNumber: row.address?.house_number,
          road: row.address?.road,
          provider: row.provider,
          relevance: row.relevance,
          accuracy: row.accuracy,
          matchCodeConfidence: row.matchCodeConfidence,
        }),
      } satisfies ScoredAddressSuggestion;
    })
    .filter((row): row is ScoredAddressSuggestion => row !== null)
    .sort((left, right) => {
      if (right._score !== left._score) {
        return right._score - left._score;
      }

      return left._distance - right._distance;
    })
    .reduce<ScoredAddressSuggestion[]>((unique, item) => {
      const duplicate = unique.some(
        (existing) =>
          normalizeSearchKey(existing.fullLabel) === normalizeSearchKey(item.fullLabel) ||
          (Math.abs(existing.latitude - item.latitude) < 0.00001 &&
            Math.abs(existing.longitude - item.longitude) < 0.00001)
      );

      if (!duplicate) {
        unique.push(item);
      }

      return unique;
    }, []);
}

function normalizeSearchKey(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function hasExactHouseNumber(rows: AddressSearchRow[], houseNumber: string) {
  const houseNumberKey = normalizeSearchKey(houseNumber);

  return rows.some((row) => normalizeSearchKey(row.address?.house_number ?? "") === houseNumberKey);
}

function scoreAddressResult({
  queryKey,
  roadQueryKey,
  houseNumberQuery,
  title,
  subtitle,
  fullLabel,
  houseNumber,
  road,
  provider,
  relevance,
  accuracy,
  matchCodeConfidence,
}: {
  queryKey: string;
  roadQueryKey: string;
  houseNumberQuery?: string | null;
  title: string;
  subtitle: string;
  fullLabel: string;
  houseNumber?: string;
  road?: string;
  provider?: AddressSearchRow["provider"];
  relevance?: number;
  accuracy?: string | null;
  matchCodeConfidence?: string | null;
}) {
  const titleKey = normalizeSearchKey(title);
  const subtitleKey = normalizeSearchKey(subtitle);
  const fullLabelKey = normalizeSearchKey(fullLabel);
  const roadKey = normalizeSearchKey(road ?? "");
  const queryTokens = queryKey.split(/\s+/).filter(Boolean);
  const houseNumberKey = normalizeSearchKey(houseNumber ?? "");
  const houseNumberQueryKey = normalizeSearchKey(houseNumberQuery ?? "");

  let score = 0;

  if (titleKey.startsWith(queryKey)) {
    score += 40;
  } else if (titleKey.includes(queryKey)) {
    score += 28;
  }

  if (roadKey.startsWith(queryKey)) {
    score += 28;
  } else if (roadKey.includes(queryKey)) {
    score += 18;
  }

  if (roadQueryKey) {
    if (roadKey === roadQueryKey) {
      score += 56;
    } else if (roadKey.startsWith(roadQueryKey)) {
      score += 42;
    } else if (roadKey.includes(roadQueryKey)) {
      score += 26;
    }
  }

  if (houseNumberQueryKey) {
    if (houseNumberKey === houseNumberQueryKey) {
      score += 120;
    } else if (
      fullLabelKey.includes(` ${houseNumberQueryKey},`) ||
      fullLabelKey.includes(`, ${houseNumberQueryKey},`)
    ) {
      score += 72;
    } else if (
      fullLabelKey.includes(` ${houseNumberQueryKey} `) ||
      fullLabelKey.endsWith(` ${houseNumberQueryKey}`)
    ) {
      score += 48;
    } else {
      score -= 36;
    }
  }

  if (fullLabelKey.includes(queryKey)) {
    score += 12;
  }

  if (subtitleKey.includes(queryKey)) {
    score += 8;
  }

  score += queryTokens.filter((token) => fullLabelKey.includes(token)).length * 5;

  if (houseNumber) {
    score += 6;
  }

  if (road) {
    score += 4;
  }

  if (provider === "mapbox") {
    score += 18;
    score += Math.round((relevance ?? 0) * 24);

    const normalizedAccuracy = normalizeSearchKey(accuracy ?? "");
    const normalizedConfidence = normalizeSearchKey(matchCodeConfidence ?? "");

    if (normalizedAccuracy === "rooftop" || normalizedAccuracy === "parcel") {
      score += 42;
    } else if (
      normalizedAccuracy === "point" ||
      normalizedAccuracy === "interpolated" ||
      normalizedAccuracy === "entrance"
    ) {
      score += 26;
    }

    if (normalizedConfidence === "exact") {
      score += 36;
    } else if (normalizedConfidence === "high") {
      score += 18;
    }
  }

  return score;
}

function parseAddressQuery(query: string): ParsedAddressQuery {
  const normalized = query
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ");

  const segments = normalized
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);

  let road = normalized;
  let houseNumber: string | null = null;
  let contextSegments: string[] = [];

  if (segments.length >= 2 && /^\d{1,6}[A-Za-z]?$/u.test(segments[1])) {
    road = segments[0];
    houseNumber = segments[1];
    contextSegments = segments.slice(2);
  } else {
    const inlineMatch = segments[0]?.match(
      /^(.+?)(?:,\s*|\s+)(\d{1,6}[A-Za-z]?)(?:\s+(?:ap|apt|apto|casa|bloco|bl|sala|sl|cj|conj)\b.*)?$/iu
    );

    if (inlineMatch) {
      road = inlineMatch[1].trim().replace(/,\s*$/u, "");
      houseNumber = inlineMatch[2];
      contextSegments = segments.slice(1);
    } else {
      road = segments[0] ?? normalized;
      contextSegments = segments.slice(1);
    }
  }

  const postcodeHint = contextSegments.find((segment) => POSTCODE_PATTERN.test(segment)) ?? null;
  const regionHint = contextSegments.find((segment) => BRAZIL_STATE_PATTERN.test(segment)) ?? null;
  const placeCandidates = contextSegments.filter(
    (segment) => !POSTCODE_PATTERN.test(segment) && !BRAZIL_STATE_PATTERN.test(segment)
  );
  const placeHint = placeCandidates.length ? placeCandidates[placeCandidates.length - 1] : null;
  const localityHint = placeCandidates.length > 1 ? placeCandidates[0] : null;

  const variants = Array.from(
    new Set(
      [
        normalized,
        houseNumber ? `${road}, ${houseNumber}` : null,
        houseNumber ? `${road} ${houseNumber}` : null,
        placeHint && houseNumber ? `${road}, ${houseNumber}, ${placeHint}` : null,
        placeHint && houseNumber ? `${road} ${houseNumber}, ${placeHint}` : null,
        placeHint ? `${road}, ${placeHint}` : null,
        road,
      ].filter((value): value is string => Boolean(value?.trim()))
    )
  );

  return {
    normalized,
    road,
    houseNumber,
    variants,
    localityHint,
    placeHint,
    regionHint,
    postcodeHint,
  };
}

async function fetchNativeGeocodeCandidates(parsedQuery: ParsedAddressQuery) {
  try {
    const geocodedResults = (
      await Promise.all(parsedQuery.variants.map((variant) => Location.geocodeAsync(variant)))
    )
      .flat()
      .filter((result) => Number.isFinite(result.latitude) && Number.isFinite(result.longitude))
      .slice(0, 4);

    const reverseResults = await Promise.all(
      geocodedResults.map((result) =>
        Location.reverseGeocodeAsync({
          latitude: result.latitude,
          longitude: result.longitude,
        }).catch(() => [])
      )
    );

    return geocodedResults.map((result, index) => {
      const address = reverseResults[index]?.[0];
      const road = address?.street ?? address?.name ?? parsedQuery.road;
      const houseNumber = address?.streetNumber ?? parsedQuery.houseNumber ?? undefined;
      const suburb = address?.district ?? address?.subregion ?? undefined;
      const city = address?.city ?? undefined;
      const state = address?.region ?? undefined;
      const displayName = [road, houseNumber, suburb, city, state].filter(Boolean).join(", ");

      return {
        place_id: -1 * (index + 1),
        lat: String(result.latitude),
        lon: String(result.longitude),
        display_name: displayName || parsedQuery.normalized,
        name: [road, houseNumber].filter(Boolean).join(", ") || parsedQuery.normalized,
        provider: "native",
        address: {
          road,
          house_number: houseNumber,
          suburb,
          city,
          state,
        },
      } satisfies AddressSearchRow;
    });
  } catch {
    return [] as AddressSearchRow[];
  }
}

function estimateDistance(
  origin: { latitude: number; longitude: number },
  latitude: number,
  longitude: number
) {
  const latDistance = origin.latitude - latitude;
  const lngDistance = origin.longitude - longitude;
  return latDistance * latDistance + lngDistance * lngDistance;
}
