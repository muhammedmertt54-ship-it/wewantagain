import { randomUUID } from "crypto";
import {
  NextRequest,
  NextResponse,
} from "next/server";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type SecureJsonOptions = {
  status?: number;
  requestId?: string;
};

const globalRateLimitStore = new Map<
  string,
  RateLimitEntry
>();

const RATE_LIMIT_CLEANUP_INTERVAL_MS =
  60_000;

let lastCleanupAt = 0;

function cleanupExpiredRateLimits() {
  const now = Date.now();

  if (
    now - lastCleanupAt <
    RATE_LIMIT_CLEANUP_INTERVAL_MS
  ) {
    return;
  }

  lastCleanupAt = now;

  for (const [
    key,
    entry,
  ] of globalRateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      globalRateLimitStore.delete(key);
    }
  }
}

export function createRequestId() {
  return randomUUID();
}

export function getClientIp(
  request: NextRequest
) {
  const forwardedFor =
    request.headers.get(
      "x-forwarded-for"
    );

  if (forwardedFor) {
    const firstIp =
      forwardedFor
        .split(",")[0]
        ?.trim();

    if (firstIp) {
      return normalizeIp(
        firstIp
      );
    }
  }

  const realIp =
    request.headers.get(
      "x-real-ip"
    );

  if (realIp) {
    return normalizeIp(
      realIp
    );
  }

  const vercelForwardedFor =
    request.headers.get(
      "x-vercel-forwarded-for"
    );

  if (vercelForwardedFor) {
    const firstIp =
      vercelForwardedFor
        .split(",")[0]
        ?.trim();

    if (firstIp) {
      return normalizeIp(
        firstIp
      );
    }
  }

  return "unknown";
}

function normalizeIp(
  value: string
) {
  const trimmed =
    value.trim();

  if (!trimmed) {
    return "unknown";
  }

  if (
    trimmed.startsWith(
      "::ffff:"
    )
  ) {
    return trimmed.slice(
      7
    );
  }

  return trimmed.slice(
    0,
    100
  );
}

export function getUserAgent(
  request: NextRequest
) {
  return (
    request.headers
      .get("user-agent")
      ?.slice(0, 500) ??
    "unknown"
  );
}

export function getOrigin(
  request: NextRequest
) {
  return (
    request.headers.get(
      "origin"
    ) ?? null
  );
}

export function getHost(
  request: NextRequest
) {
  return (
    request.headers.get(
      "host"
    ) ?? null
  );
}

export function isJsonRequest(
  request: NextRequest
) {
  const contentType =
    request.headers
      .get("content-type")
      ?.toLowerCase() ??
    "";

  return contentType.includes(
    "application/json"
  );
}

export function validateBodySize(
  request: NextRequest,
  maxBytes: number
) {
  const contentLengthHeader =
    request.headers.get(
      "content-length"
    );

  if (
    !contentLengthHeader
  ) {
    return {
      ok: true as const,
    };
  }

  const contentLength =
    Number(
      contentLengthHeader
    );

  if (
    !Number.isFinite(
      contentLength
    )
  ) {
    return {
      ok: false as const,
      status: 400,
      error:
        "Invalid Content-Length header.",
    };
  }

  if (
    contentLength < 0
  ) {
    return {
      ok: false as const,
      status: 400,
      error:
        "Invalid Content-Length header.",
    };
  }

  if (
    contentLength >
    maxBytes
  ) {
    return {
      ok: false as const,
      status: 413,
      error:
        "Request body is too large.",
    };
  }

  return {
    ok: true as const,
  };
}

export async function parseJsonBody<
  T extends Record<
    string,
    unknown
  >
>(
  request: NextRequest,
  options?: {
    maxBytes?: number;
  }
) {
  const maxBytes =
    options?.maxBytes ??
    20_000;

  const bodySize =
    validateBodySize(
      request,
      maxBytes
    );

  if (!bodySize.ok) {
    return {
      ok: false as const,
      status:
        bodySize.status,
      error:
        bodySize.error,
    };
  }

  if (
    !isJsonRequest(
      request
    )
  ) {
    return {
      ok: false as const,
      status: 415,
      error:
        "Content-Type must be application/json.",
    };
  }

  try {
    const parsed =
      await request.json();

    if (
      !parsed ||
      typeof parsed !==
        "object" ||
      Array.isArray(
        parsed
      )
    ) {
      return {
        ok: false as const,
        status: 400,
        error:
          "Invalid request body.",
      };
    }

    return {
      ok: true as const,
      body:
        parsed as T,
    };
  } catch {
    return {
      ok: false as const,
      status: 400,
      error:
        "Invalid JSON body.",
    };
  }
}

export function checkRateLimit(
  options: RateLimitOptions
) {
  cleanupExpiredRateLimits();

  const now =
    Date.now();

  const normalizedLimit =
    Math.max(
      1,
      Math.floor(
        options.limit
      )
    );

  const normalizedWindowMs =
    Math.max(
      1000,
      Math.floor(
        options.windowMs
      )
    );

  const existing =
    globalRateLimitStore.get(
      options.key
    );

  if (
    !existing ||
    existing.resetAt <= now
  ) {
    const resetAt =
      now +
      normalizedWindowMs;

    globalRateLimitStore.set(
      options.key,
      {
        count: 1,
        resetAt,
      }
    );

    return {
      allowed:
        true as const,
      remaining:
        normalizedLimit -
        1,
      resetAt,
      retryAfterSeconds:
        0,
    };
  }

  if (
    existing.count >=
    normalizedLimit
  ) {
    const retryAfterSeconds =
      Math.max(
        1,
        Math.ceil(
          (
            existing.resetAt -
            now
          ) / 1000
        )
      );

    return {
      allowed:
        false as const,
      remaining: 0,
      resetAt:
        existing.resetAt,
      retryAfterSeconds,
    };
  }

  existing.count += 1;

  globalRateLimitStore.set(
    options.key,
    existing
  );

  return {
    allowed:
      true as const,
    remaining:
      Math.max(
        0,
        normalizedLimit -
          existing.count
      ),
    resetAt:
      existing.resetAt,
    retryAfterSeconds:
      0,
  };
}

export function createRateLimitKey(
  request: NextRequest,
  scope: string,
  userId?: string | null
) {
  const ip =
    getClientIp(
      request
    );

  const identity =
    userId
      ? `user:${userId}`
      : `ip:${ip}`;

  return [
    "wewantagain",
    scope,
    identity,
  ].join(":");
}

export function secureJson(
  body: unknown,
  options?: SecureJsonOptions
) {
  const requestId =
    options?.requestId ??
    createRequestId();

  const response =
    NextResponse.json(
      body,
      {
        status:
          options?.status ??
          200,
      }
    );

  applySecurityHeaders(
    response,
    requestId
  );

  return response;
}

export function secureError(
  error: string,
  options?: SecureJsonOptions
) {
  return secureJson(
    {
      error,
      request_id:
        options?.requestId,
    },
    options
  );
}

export function rateLimitResponse(
  retryAfterSeconds: number,
  requestId?: string
) {
  const response =
    secureJson(
      {
        error:
          "Too many requests. Please try again later.",
        request_id:
          requestId,
      },
      {
        status: 429,
        requestId,
      }
    );

  response.headers.set(
    "Retry-After",
    String(
      Math.max(
        1,
        retryAfterSeconds
      )
    )
  );

  return response;
}

export function applySecurityHeaders(
  response: NextResponse,
  requestId?: string
) {
  response.headers.set(
    "X-Content-Type-Options",
    "nosniff"
  );

  response.headers.set(
    "X-Frame-Options",
    "DENY"
  );

  response.headers.set(
    "Referrer-Policy",
    "strict-origin-when-cross-origin"
  );

  response.headers.set(
    "Permissions-Policy",
    [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=()",
    ].join(", ")
  );

  response.headers.set(
    "Cross-Origin-Opener-Policy",
    "same-origin"
  );

  response.headers.set(
    "Cross-Origin-Resource-Policy",
    "same-origin"
  );

  response.headers.set(
    "X-Permitted-Cross-Domain-Policies",
    "none"
  );

  response.headers.set(
    "Cache-Control",
    "no-store, max-age=0"
  );

  if (requestId) {
    response.headers.set(
      "X-Request-ID",
      requestId
    );
  }

  return response;
}

export function hasSuspiciousHeaders(
  request: NextRequest
) {
  const suspiciousHeaderNames = [
    "x-http-method-override",
    "x-method-override",
    "x-original-url",
    "x-rewrite-url",
  ];

  for (
    const headerName of
    suspiciousHeaderNames
  ) {
    if (
      request.headers.has(
        headerName
      )
    ) {
      return true;
    }
  }

  return false;
}

export function validateSameOrigin(
  request: NextRequest
) {
  const origin =
    request.headers.get(
      "origin"
    );

  if (!origin) {
    return {
      ok: true as const,
    };
  }

  const host =
    request.headers.get(
      "host"
    );

  if (!host) {
    return {
      ok: false as const,
      status: 403,
      error:
        "Invalid request origin.",
    };
  }

  try {
    const originUrl =
      new URL(
        origin
      );

    if (
      originUrl.host !==
      host
    ) {
      return {
        ok: false as const,
        status: 403,
        error:
          "Cross-origin request blocked.",
      };
    }
  } catch {
    return {
      ok: false as const,
      status: 403,
      error:
        "Invalid request origin.",
    };
  }

  return {
    ok: true as const,
  };
}

export function getSafeRequestMetadata(
  request: NextRequest
) {
  return {
    ip:
      getClientIp(
        request
      ),

    method:
      request.method.slice(
        0,
        20
      ),

    pathname:
      request.nextUrl.pathname.slice(
        0,
        500
      ),

    user_agent:
      getUserAgent(
        request
      ),

    origin:
      getOrigin(
        request
      ),

    host:
      getHost(
        request
      ),
  };
}

export function logSecurityEvent(
  event: string,
  request: NextRequest,
  details?: Record<
    string,
    unknown
  >
) {
  const metadata =
    getSafeRequestMetadata(
      request
    );

  console.warn(
    "[SECURITY]",
    {
      event:
        event.slice(
          0,
          100
        ),

      ...metadata,

      details:
        details ?? {},
    }
  );
}