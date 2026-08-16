import {
  NextRequest,
} from "next/server";

import {
  supabaseAdmin,
} from "../../../../lib/supabaseAdmin";

import {
  getClientIp,
  parseJsonBody,
  secureJson,
} from "../../../../lib/security/requestSecurity";

import {
  secureApi,
} from "../../../../lib/security/secureApi";

import {
  requireSecureUser,
} from "../../../../lib/security/authSecurity";

const MAX_BODY_BYTES =
  10_000;

const SUPPORT_RATE_LIMIT =
  10;

const SUPPORT_RATE_WINDOW_MS =
  60_000;

const ALLOWED_COUNTRIES = [
  "Türkiye",
  "United States",
  "United Kingdom",
  "Germany",
  "France",
  "Brazil",
  "Spain",
  "Italy",
  "Canada",
  "Australia",
  "Other",
] as const;

type SiteSettings = {
  support_enabled?: boolean;
};

type SupportRequestBody = {
  email?: unknown;
  country?: unknown;
  campaignSlug?: unknown;
};

function cleanString(
  value: unknown,
  maxLength: number
) {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  return value
    .trim()
    .slice(
      0,
      maxLength
    );
}

function normalizeEmail(
  value: unknown
) {
  return cleanString(
    value,
    254
  ).toLowerCase();
}

function isValidEmail(
  email: string
) {
  if (
    email.length < 3 ||
    email.length > 254
  ) {
    return false;
  }

  if (
    email.includes(" ") ||
    email.includes("\n") ||
    email.includes("\r") ||
    email.includes("\0")
  ) {
    return false;
  }

  const atIndex =
    email.indexOf("@");

  if (
    atIndex <= 0 ||
    atIndex !==
      email.lastIndexOf("@")
  ) {
    return false;
  }

  const localPart =
    email.slice(
      0,
      atIndex
    );

  const domain =
    email.slice(
      atIndex + 1
    );

  if (
    !localPart ||
    !domain
  ) {
    return false;
  }

  if (
    localPart.length > 64
  ) {
    return false;
  }

  if (
    !domain.includes(".")
  ) {
    return false;
  }

  if (
    domain.startsWith(".") ||
    domain.endsWith(".") ||
    domain.includes("..")
  ) {
    return false;
  }

  return true;
}

async function getSiteSettings() {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "site_settings"
      )
      .select(
        "settings"
      )
      .limit(1)
      .maybeSingle();

  if (error) {
    console.error(
      "Support settings lookup error:",
      error
    );

    return {
      error: true,
      settings: null,
    };
  }

  const rawSettings =
    data?.settings;

  if (
    !rawSettings ||
    typeof rawSettings !==
      "object"
  ) {
    return {
      error: false,

      settings:
        {} as SiteSettings,
    };
  }

  return {
    error: false,

    settings:
      rawSettings as SiteSettings,
  };
}

async function isIpBanned(
  request: NextRequest
) {
  const ip =
    getClientIp(
      request
    );

  if (
    ip === "unknown"
  ) {
    return {
      banned: false,
      error: false,
      ip,
    };
  }

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "ip_bans"
      )
      .select(
        "ip_address"
      )
      .eq(
        "ip_address",
        ip
      )
      .maybeSingle();

  if (error) {
    console.error(
      "Guest support IP ban lookup error:",
      error
    );

    return {
      banned: false,
      error: true,
      ip,
    };
  }

  return {
    banned:
      !!data,

    error:
      false,

    ip,
  };
}

export async function POST(
  request: NextRequest
) {
  /*
   * BASE SECURITY
   *
   * Campaign support remains available
   * to guest users, therefore auth is
   * not required here.
   *
   * Rate limiting falls back to IP.
   */
  const security =
    await secureApi(
      request,
      {
        scope:
          "campaign-support-create",

        requireAuth:
          false,

        requireSameOrigin:
          true,

        blockSuspiciousHeaders:
          true,

        rateLimit: {
          limit:
            SUPPORT_RATE_LIMIT,

          windowMs:
            SUPPORT_RATE_WINDOW_MS,
        },
      }
    );

  if (!security.ok) {
    return security.response;
  }

  const {
    requestId,
  } = security;

  try {
    /*
     * IP BAN CHECK
     *
     * This also protects guest users,
     * which requireSecureUser alone
     * cannot do.
     */
    const ipCheck =
      await isIpBanned(
        request
      );

    if (
      ipCheck.error
    ) {
      return secureJson(
        {
          error:
            "Security validation is temporarily unavailable.",

          request_id:
            requestId,
        },
        {
          status: 503,
          requestId,
        }
      );
    }

    if (
      ipCheck.banned
    ) {
      return secureJson(
        {
          error:
            "Access from this network is restricted.",

          request_id:
            requestId,
        },
        {
          status: 403,
          requestId,
        }
      );
    }

    /*
     * OPTIONAL AUTH
     *
     * Guest users are allowed.
     *
     * However, if somebody sends an
     * Authorization header, it must be
     * a real valid session. Invalid or
     * banned sessions are not silently
     * downgraded to guest access.
     */
    const authorization =
      request.headers.get(
        "authorization"
      );

    let userId:
      | string
      | null =
      null;

    if (authorization) {
      if (
        !authorization.startsWith(
          "Bearer "
        )
      ) {
        return secureJson(
          {
            error:
              "Invalid authentication header.",

            request_id:
              requestId,
          },
          {
            status: 401,
            requestId,
          }
        );
      }

      const auth =
        await requireSecureUser(
          request
        );

      if (!auth.ok) {
        return auth.response;
      }

      userId =
        auth.user.id;
    }

    /*
     * SITE SETTING
     */
    const {
      error:
        settingsError,

      settings,
    } =
      await getSiteSettings();

    if (
      settingsError ||
      !settings
    ) {
      return secureJson(
        {
          error:
            "Support is temporarily unavailable.",

          code:
            "SUPPORT_SETTINGS_UNAVAILABLE",

          request_id:
            requestId,
        },
        {
          status: 503,
          requestId,
        }
      );
    }

    const supportEnabled =
      settings
        .support_enabled !==
      false;

    if (
      !supportEnabled
    ) {
      return secureJson(
        {
          error:
            "Supporting campaigns is currently disabled.",

          code:
            "SUPPORT_DISABLED",

          request_id:
            requestId,
        },
        {
          status: 403,
          requestId,
        }
      );
    }

    /*
     * SAFE JSON BODY
     */
    const parsed =
      await parseJsonBody<SupportRequestBody>(
        request,
        {
          maxBytes:
            MAX_BODY_BYTES,
        }
      );

    if (!parsed.ok) {
      return secureJson(
        {
          error:
            parsed.error,

          request_id:
            requestId,
        },
        {
          status:
            parsed.status,

          requestId,
        }
      );
    }

    const requestBody =
      parsed.body;

    /*
     * NORMALIZE INPUT
     */
    const email =
      normalizeEmail(
        requestBody.email
      );

    const country =
      cleanString(
        requestBody.country,
        100
      );

    const campaignSlug =
      cleanString(
        requestBody.campaignSlug,
        200
      );

    /*
     * EMAIL
     */
    if (
      !isValidEmail(
        email
      )
    ) {
      return secureJson(
        {
          error:
            "Please enter a valid email.",

          request_id:
            requestId,
        },
        {
          status: 400,
          requestId,
        }
      );
    }

    /*
     * COUNTRY
     */
    if (
      !ALLOWED_COUNTRIES.includes(
        country as
          (typeof ALLOWED_COUNTRIES)[number]
      )
    ) {
      return secureJson(
        {
          error:
            "Invalid country.",

          request_id:
            requestId,
        },
        {
          status: 400,
          requestId,
        }
      );
    }

    /*
     * CAMPAIGN SLUG
     */
    if (
      !campaignSlug ||
      campaignSlug.length >
        200
    ) {
      return secureJson(
        {
          error:
            "Campaign could not be found.",

          request_id:
            requestId,
        },
        {
          status: 400,
          requestId,
        }
      );
    }

    if (
      !/^[a-z0-9-]+$/.test(
        campaignSlug
      )
    ) {
      return secureJson(
        {
          error:
            "Invalid campaign.",

          request_id:
            requestId,
        },
        {
          status: 400,
          requestId,
        }
      );
    }

    /*
     * CAMPAIGN MUST EXIST
     * AND BE ACTIVE
     */
    const {
      data:
        campaign,

      error:
        campaignError,
    } =
      await supabaseAdmin
        .from(
          "campaigns"
        )
        .select(
          `
            id,
            slug,
            status
          `
        )
        .eq(
          "slug",
          campaignSlug
        )
        .eq(
          "status",
          "active"
        )
        .maybeSingle();

    if (
      campaignError
    ) {
      console.error(
        "Campaign lookup error:",
        campaignError
      );

      return secureJson(
        {
          error:
            "Campaign could not be verified.",

          request_id:
            requestId,
        },
        {
          status: 500,
          requestId,
        }
      );
    }

    if (!campaign) {
      return secureJson(
        {
          error:
            "Campaign could not be found or is not active.",

          request_id:
            requestId,
        },
        {
          status: 404,
          requestId,
        }
      );
    }

    /*
     * CREATE SUPPORT
     *
     * Service-role write remains
     * server-side only.
     */
    const {
      data:
        support,

      error:
        insertError,
    } =
      await supabaseAdmin
        .from(
          "supports"
        )
        .insert({
          email,

          country,

          campaign_slug:
            campaignSlug,

          verified:
            false,

          user_id:
            userId,
        })
        .select(
          `
            id,
            campaign_slug,
            verified
          `
        )
        .single();

    /*
     * UNIQUE DUPLICATE
     */
    if (
      insertError?.code ===
      "23505"
    ) {
      return secureJson(
        {
          success: true,

          alreadyExists:
            true,

          message:
            "Support already exists. You can continue with email verification.",

          request_id:
            requestId,
        },
        {
          status: 200,
          requestId,
        }
      );
    }

    if (
      insertError
    ) {
      console.error(
        "Support insert error:",
        insertError
      );

      return secureJson(
        {
          error:
            "Support could not be created. Please try again.",

          request_id:
            requestId,
        },
        {
          status: 500,
          requestId,
        }
      );
    }

    return secureJson(
      {
        success:
          true,

        alreadyExists:
          false,

        support,

        message:
          "Support request created.",

        request_id:
          requestId,
      },
      {
        status: 201,
        requestId,
      }
    );
  } catch (error) {
    console.error(
      "Support create API error:",
      error
    );

    return secureJson(
      {
        error:
          "Something went wrong. Please try again.",

        request_id:
          requestId,
      },
      {
        status: 500,
        requestId,
      }
    );
  }
}