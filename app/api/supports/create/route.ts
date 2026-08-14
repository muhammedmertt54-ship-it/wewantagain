import {
  NextRequest,
  NextResponse,
} from "next/server";

import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

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

function cleanString(
  value: unknown,
  maxLength: number
) {
  if (
    typeof value !== "string"
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

  const atIndex =
    email.indexOf("@");

  if (
    atIndex <= 0 ||
    atIndex !==
      email.lastIndexOf("@")
  ) {
    return false;
  }

  const domain =
    email.slice(
      atIndex + 1
    );

  if (
    !domain ||
    !domain.includes(".")
  ) {
    return false;
  }

  if (
    email.includes(" ") ||
    email.includes("\n") ||
    email.includes("\r")
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
      .from("site_settings")
      .select("settings")
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

async function getOptionalUser(
  request: NextRequest
) {
  const authorization =
    request.headers.get(
      "authorization"
    );

  if (
    !authorization ||
    !authorization.startsWith(
      "Bearer "
    )
  ) {
    return null;
  }

  const accessToken =
    authorization
      .slice(7)
      .trim();

  if (!accessToken) {
    return null;
  }

  const {
    data: {
      user,
    },
    error,
  } =
    await supabaseAdmin.auth.getUser(
      accessToken
    );

  if (
    error ||
    !user
  ) {
    return null;
  }

  return user;
}

export async function POST(
  request: NextRequest
) {
  try {
    /*
     * 1. Site Management ayarını
     * server tarafında oku.
     */
    const {
      error:
        settingsError,
      settings,
    } =
      await getSiteSettings();

    /*
     * Ayar okunamazsa fail-closed.
     * Yani destek kabul etmiyoruz.
     */
    if (
      settingsError ||
      !settings
    ) {
      return NextResponse.json(
        {
          error:
            "Support is temporarily unavailable.",
          code:
            "SUPPORT_SETTINGS_UNAVAILABLE",
        },
        {
          status: 503,
        }
      );
    }

    /*
     * support_enabled sadece açık
     * olduğunda kayıt kabul et.
     *
     * Eski ayarlarda alan hiç yoksa
     * geriye uyumluluk için açık
     * kabul ediyoruz.
     */
    const supportEnabled =
      settings.support_enabled !==
      false;

    if (
      !supportEnabled
    ) {
      return NextResponse.json(
        {
          error:
            "Supporting campaigns is currently disabled.",
          code:
            "SUPPORT_DISABLED",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * 2. JSON body
     */
    let body: unknown;

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid request.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !body ||
      typeof body !==
        "object" ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid request.",
        },
        {
          status: 400,
        }
      );
    }

    const requestBody =
      body as Record<
        string,
        unknown
      >;

    /*
     * 3. Input temizliği
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
     * 4. Email kontrolü
     */
    if (
      !isValidEmail(
        email
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Please enter a valid email.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * 5. Country kontrolü
     */
    if (
      !ALLOWED_COUNTRIES.includes(
        country as
          (typeof ALLOWED_COUNTRIES)[number]
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid country.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * 6. Campaign slug kontrolü
     */
    if (
      !campaignSlug ||
      campaignSlug.length >
        200
    ) {
      return NextResponse.json(
        {
          error:
            "Campaign could not be found.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Basit slug format kontrolü.
     */
    if (
      !/^[a-z0-9-]+$/.test(
        campaignSlug
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid campaign.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * 7. Kampanya gerçekten
     * mevcut ve aktif mi?
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

      return NextResponse.json(
        {
          error:
            "Campaign could not be verified.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      !campaign
    ) {
      return NextResponse.json(
        {
          error:
            "Campaign could not be found or is not active.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * 8. Kullanıcı giriş yapmışsa
     * server tarafında access token
     * üzerinden user_id al.
     *
     * Guest support hala mümkün.
     */
    const user =
      await getOptionalUser(
        request
      );

    /*
     * 9. Support kaydını
     * service role üzerinden oluştur.
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
            user?.id ??
            null,
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
     * 23505:
     * unique constraint nedeniyle
     * bu email/kampanya desteği
     * zaten oluşturulmuş.
     *
     * Bunu fatal hata saymıyoruz.
     * Client yine verification mail
     * akışına devam edebilir.
     */
    if (
      insertError?.code ===
      "23505"
    ) {
      return NextResponse.json(
        {
          success: true,

          alreadyExists:
            true,

          message:
            "Support already exists. You can continue with email verification.",
        },
        {
          status: 200,
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

      return NextResponse.json(
        {
          error:
            "Support could not be created. Please try again.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,

        alreadyExists:
          false,

        support,

        message:
          "Support request created.",
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Support create API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong. Please try again.",
      },
      {
        status: 500,
      }
    );
  }
}