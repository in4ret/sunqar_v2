import { isIP } from "node:net";
import { env } from "@/lib/env";

type HeaderReader = {
  get(name: string): string | null;
};

export type SessionIpGeo = {
  country: string | null;
  region: string | null;
  city: string | null;
};

export type SessionClientInfo = {
  ip: string | null;
  ipGeo: SessionIpGeo | null;
};

type IpApiResponse = {
  status?: string;
  message?: string;
  countryCode?: string;
  regionName?: string;
  city?: string;
  query?: string;
};

function normalizeHeaderIp(value: string) {
  const ip = value.trim().replace(/^"|"$/g, "");

  if (!ip || ip.toLowerCase() === "unknown") {
    return null;
  }

  if (ip.startsWith("[") && ip.includes("]")) {
    return ip.slice(1, ip.indexOf("]"));
  }

  const ipv4WithPortMatch = ip.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);

  if (ipv4WithPortMatch) {
    return ipv4WithPortMatch[1];
  }

  if (ip.startsWith("::ffff:")) {
    return ip.slice("::ffff:".length);
  }

  return ip;
}

function isPrivateIpv4(ip: string) {
  const parts = ip.split(".").map((part) => Number(part));

  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return true;
  }

  const [first, second] = parts;

  return (
    first === 10 ||
    first === 127 ||
    first === 0 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function isPrivateIpv6(ip: string) {
  const normalizedIp = ip.toLowerCase();

  return (
    normalizedIp === "::1" ||
    normalizedIp === "::" ||
    normalizedIp.startsWith("fc") ||
    normalizedIp.startsWith("fd") ||
    normalizedIp.startsWith("fe80:")
  );
}

function isPublicIp(ip: string) {
  const version = isIP(ip);

  if (version === 4) {
    return !isPrivateIpv4(ip);
  }

  if (version === 6) {
    return !isPrivateIpv6(ip);
  }

  return false;
}

export function getClientIpFromHeaders(headerReader: HeaderReader) {
  const realIp = normalizeHeaderIp(headerReader.get("x-real-ip") ?? "");

  if (realIp && isPublicIp(realIp)) {
    return realIp;
  }

  const forwardedFor = headerReader.get("x-forwarded-for") ?? "";
  const forwardedIp = forwardedFor
    .split(",")
    .map((part) => normalizeHeaderIp(part))
    .find((ip) => ip && isPublicIp(ip));

  return forwardedIp ?? null;
}

function normalizeGeoValue(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue || null;
}

async function lookupIpApiInfo(ip: string | null): Promise<SessionClientInfo | null> {
  try {
    const query = ip ? `/${encodeURIComponent(ip)}` : "";
    const url = new URL(`http://ip-api.com/json${query}`);

    url.searchParams.set("fields", "status,message,countryCode,regionName,city,query");

    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as IpApiResponse;

    if (data.status !== "success") {
      return null;
    }

    return {
      ip: normalizeGeoValue(data.query) ?? ip,
      ipGeo: {
        city: normalizeGeoValue(data.city),
        country: normalizeGeoValue(data.countryCode),
        region: normalizeGeoValue(data.regionName),
      },
    };
  } catch {
    return null;
  }
}

export async function lookupIpGeo(ip: string): Promise<SessionIpGeo | null> {
  const clientInfo = await lookupIpApiInfo(ip);

  return clientInfo?.ipGeo ?? null;
}

export async function getSessionClientInfo(headerReader: HeaderReader): Promise<SessionClientInfo> {
  const ip = getClientIpFromHeaders(headerReader);

  if (!ip) {
    if (!env.isProduction) {
      return (
        (await lookupIpApiInfo(null)) ?? {
          ip: null,
          ipGeo: null,
        }
      );
    }

    return {
      ip: null,
      ipGeo: null,
    };
  }

  return {
    ip,
    ipGeo: await lookupIpGeo(ip),
  };
}
