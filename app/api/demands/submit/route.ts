import {
  NextRequest,
  NextResponse,
} from "next/server";

import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { secureApi } from "../../../../lib/security/secureApi";
import {
  secureJson,
  validateBodySize,
} from "../../../../lib/security/requestSecurity";

const MAX_FILE_SIZE =
  5 * 1024 * 1024;

const MAX_REQUEST_SIZE =
  6 * 1024 * 1024;

const SUBMIT_RATE_LIMIT =
  3;

const SUBMIT_RATE_WINDOW_MS =
  10 * 60 * 1000;

const DAILY_CAMPAIGN_LIMIT =
  10;

const ALLOWED_CATEGORIES = [
  "TV & Series",
  "Movies",
  "Games",
] as const;

type ImageExtension =
  | "jpg"
  | "png"
  | "webp";

type ImageInfo = {
  extension: ImageExtension;
  contentType:
    | "image/jpeg"
    | "image/png"
    | "image/webp";
};

function cleanText(
  value: FormDataEntryValue | null,
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

function makeSlug(
  value: string
) {
  return value
    .toLocaleLowerCase(
      "tr-TR"
    )
    .trim()
    .replace(/ÄŸ/g, "g")
    .replace(/Ã¼/g, "u")
    .replace(/ÅŸ/g, "s")
    .replace(/Ä±/g, "i")
    .replace(/Ã¶/g, "o")
    .replace(/Ã§/g, "c")
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    )
    .slice(
      0,
      150
    );
}

function detectImage(
  bytes: Uint8Array
): ImageInfo | null {
  /*
   * JPEG
   * FF D8 FF
   */
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return {
      extension: "jpg",
      contentType:
        "image/jpeg",
    };
  }

  /*
   * PNG
   * 89 50 4E 47 0D 0A 1A 0A
   */
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return {
      extension: "png",
      contentType:
        "image/png",
    };
  }

  /*
   * WebP
   *
   * RIFF....WEBP
   */
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return {
      extension: "webp",
      contentType:
        "image/webp",
    };
  }

  return null;
}

async function submissionsAreEnabled() {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from("site_settings")
    .select("settings")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "Submission settings lookup error:",
      error
    );

    /*
     * Ayarlar okunamÄ±yorsa gÃ¼venlik
     * aÃ§Ä±sÄ±ndan fail-closed davranÄ±yoruz.
     *
     * Yani hata halinde kampanya
     * gÃ¶nderimine izin vermiyoruz.
     */
    return {
      enabled: false,
      databaseError: true,
    };
  }

  const settings =
    data?.settings &&
    typeof data.settings ===
      "object"
      ? (
          data.settings as Record<
            string,
            unknown
          >
        )
      : {};

  return {
    enabled:
      settings.submissions_enabled !==
      false,

    databaseError: false,
  };
}

export async function POST(
  request: NextRequest
) {
  let uploadedImagePath =
    "";

  const security =
    await secureApi(
      request,
      {
        scope:
          "campaign-submit",

        requireAuth:
          true,

        requireSameOrigin:
          true,

        blockSuspiciousHeaders:
          true,

        rateLimit: {
          limit:
            SUBMIT_RATE_LIMIT,

          windowMs:
            SUBMIT_RATE_WINDOW_MS,
        },
      }
    );

  if (!security.ok) {
    return security.response;
  }

  const {
    requestId,
    user,
  } = security;

  if (!user?.id) {
    return secureJson(
      {
        error:
          "Authentication required.",
        request_id:
          requestId,
      },
      {
        status: 401,
        requestId,
      }
    );
  }

  const bodySizeCheck =
    validateBodySize(
      request,
      MAX_REQUEST_SIZE
    );

  if (!bodySizeCheck.ok) {
    return secureJson(
      {
        error:
          bodySizeCheck.error,
        request_id:
          requestId,
      },
      {
        status:
          bodySizeCheck.status,
        requestId,
      }
    );
  }

  const contentType =
    request.headers
      .get("content-type")
      ?.toLowerCase() ??
    "";

  if (
    !contentType.startsWith(
      "multipart/form-data"
    )
  ) {
    return secureJson(
      {
        error:
          "Content-Type must be multipart/form-data.",
        request_id:
          requestId,
      },
      {
        status: 415,
        requestId,
      }
    );
  }

  try {
    /*
     * 1. Central authentication, ban/IP,
     * session, origin and rate-limit
     * checks already passed above.
     */

    /*
     * 2. Admin Site Management
     * ayarÄ±nÄ± server tarafÄ±nda kontrol et.
     */
    const submissionStatus =
      await submissionsAreEnabled();

    if (
      submissionStatus.databaseError
    ) {
      return NextResponse.json(
        {
          error:
            "Campaign submissions are temporarily unavailable.",
        },
        {
          status: 503,
        }
      );
    }

    if (
      !submissionStatus.enabled
    ) {
      return NextResponse.json(
        {
          error:
            "Campaign submissions are currently disabled.",
          code:
            "SUBMISSIONS_DISABLED",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * 3. Durable abuse / cooldown protection.
     *
     * In-memory rate limiting can reset between
     * serverless instances, so we also enforce
     * a database-backed daily campaign limit.
     */
    const dayAgo =
      new Date(
        Date.now() -
          24 * 60 * 60 * 1000
      ).toISOString();

    const {
      count:
        recentCampaignCount,
      error:
        recentCampaignCountError,
    } =
      await supabaseAdmin
        .from("campaigns")
        .select(
          "id",
          {
            count: "exact",
            head: true,
          }
        )
        .eq(
          "created_by",
          user.id
        )
        .gte(
          "created_at",
          dayAgo
        );

    if (
      recentCampaignCountError
    ) {
      console.error(
        "Campaign abuse check error:",
        recentCampaignCountError
      );

      return secureJson(
        {
          error:
            "Campaign submission is temporarily unavailable.",
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
      (recentCampaignCount ?? 0) >=
      DAILY_CAMPAIGN_LIMIT
    ) {
      return secureJson(
        {
          error:
            "Daily campaign submission limit reached. Please try again later.",
          code:
            "CAMPAIGN_DAILY_LIMIT",
          request_id:
            requestId,
        },
        {
          status: 429,
          requestId,
        }
      );
    }

    /*
     * 4. Multipart form
     */
    let formData:
      FormData;

    try {
      formData =
        await request.formData();
    } catch {
      return secureJson(
        {
          error:
            "Invalid multipart form data.",
          request_id:
            requestId,
        },
        {
          status: 400,
          requestId,
        }
      );
    }

    const title =
      cleanText(
        formData.get(
          "title"
        ),
        100
      );

    const subtitle =
      cleanText(
        formData.get(
          "subtitle"
        ),
        100
      );

    const category =
      cleanText(
        formData.get(
          "category"
        ),
        50
      );

    const target =
      cleanText(
        formData.get(
          "target"
        ),
        100
      );

    const description =
      cleanText(
        formData.get(
          "description"
        ),
        1000
      );

    const goalText =
      cleanText(
        formData.get(
          "goal"
        ),
        20
      );

    const copyrightConfirmed =
      formData.get(
        "copyright_confirmed"
      ) === "true";

    const image =
      formData.get(
        "image"
      );

    /*
     * 4. Metin doÄŸrulamalarÄ±
     */
    if (
      !title ||
      !subtitle ||
      !category ||
      !target ||
      !description
    ) {
      return NextResponse.json(
        {
          error:
            "Please fill in all required fields.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !ALLOWED_CATEGORIES.includes(
        category as
          (typeof ALLOWED_CATEGORIES)[number]
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid campaign category.",
        },
        {
          status: 400,
        }
      );
    }

    const numericGoal =
      Number(goalText);

    if (
      !Number.isInteger(
        numericGoal
      ) ||
      numericGoal < 1 ||
      numericGoal >
        100_000_000
    ) {
      return NextResponse.json(
        {
          error:
            "Please enter a valid supporter goal.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !copyrightConfirmed
    ) {
      return NextResponse.json(
        {
          error:
            "Image rights confirmation is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * 5. Dosya kontrolÃ¼
     */
    if (
      !(image instanceof File)
    ) {
      return NextResponse.json(
        {
          error:
            "Campaign image is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      image.size <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Campaign image is empty.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      image.size >
      MAX_FILE_SIZE
    ) {
      return NextResponse.json(
        {
          error:
            "Image must be 5 MB or smaller.",
        },
        {
          status: 413,
        }
      );
    }

    /*
     * TarayÄ±cÄ±nÄ±n gÃ¶nderdiÄŸi
     * image.type deÄŸerine gÃ¼venmiyoruz.
     *
     * DosyanÄ±n gerÃ§ek ilk byte'larÄ±nÄ±
     * kontrol ediyoruz.
     */
    const imageBuffer =
      await image.arrayBuffer();

    const imageBytes =
      new Uint8Array(
        imageBuffer
      );

    const imageInfo =
      detectImage(
        imageBytes
      );

    if (
      !imageInfo
    ) {
      return NextResponse.json(
        {
          error:
            "Only real JPG, PNG or WebP images are allowed.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * 6. Slug
     */
    const slugBase =
      makeSlug(
        `${subtitle}-${title}`
      );

    if (
      !slugBase
    ) {
      return NextResponse.json(
        {
          error:
            "Could not create a valid campaign URL.",
        },
        {
          status: 400,
        }
      );
    }

    const randomSlugPart =
      crypto
        .randomUUID()
        .replace(
          /-/g,
          ""
        )
        .slice(
          0,
          10
        );

    const slug =
      `${slugBase}-${randomSlugPart}`;

    /*
     * 7. Storage path
     */
    const fileId =
      crypto.randomUUID();

    uploadedImagePath =
      `${user.id}/${fileId}.${imageInfo.extension}`;

    /*
     * 8. Server-side upload
     */
    const {
      error: uploadError,
    } =
      await supabaseAdmin.storage
        .from(
          "campaign-images"
        )
        .upload(
          uploadedImagePath,
          imageBytes,
          {
            cacheControl:
              "3600",

            upsert: false,

            contentType:
              imageInfo.contentType,
          }
        );

    if (
      uploadError
    ) {
      console.error(
        "Campaign image upload error:",
        uploadError
      );

      uploadedImagePath =
        "";

      return NextResponse.json(
        {
          error:
            "Image could not be uploaded. Please try again.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * 9. Public URL
     */
    const {
      data:
        publicUrlData,
    } =
      supabaseAdmin.storage
        .from(
          "campaign-images"
        )
        .getPublicUrl(
          uploadedImagePath
        );

    const imageUrl =
      publicUrlData
        .publicUrl;

    if (
      !imageUrl
    ) {
      await supabaseAdmin.storage
        .from(
          "campaign-images"
        )
        .remove([
          uploadedImagePath,
        ]);

      uploadedImagePath =
        "";

      return NextResponse.json(
        {
          error:
            "Image URL could not be created.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * 10. KampanyayÄ± server tarafÄ±nda
     * oluÅŸtur.
     */
    const {
      data: campaign,
      error:
        campaignError,
    } =
      await supabaseAdmin
        .from(
          "campaigns"
        )
        .insert({
          slug,

          title,

          subtitle,

          category,

          target,

          description,

          goal:
            numericGoal,

          status:
            "pending",

          created_by:
            user.id,

          image_url:
            imageUrl,

          image_path:
            uploadedImagePath,

          copyright_confirmed:
            true,

          image_removed:
            false,
        })
        .select(
          `
          id,
          slug,
          status
          `
        )
        .single();

    if (
      campaignError
    ) {
      console.error(
        "Campaign creation error:",
        campaignError
      );

      /*
       * DB baÅŸarÄ±sÄ±z olursa
       * orphan image bÄ±rakma.
       */
      if (
        uploadedImagePath
      ) {
        await supabaseAdmin.storage
          .from(
            "campaign-images"
          )
          .remove([
            uploadedImagePath,
          ]);

        uploadedImagePath =
          "";
      }

      if (
        campaignError.code ===
        "23505"
      ) {
        return NextResponse.json(
          {
            error:
              "A similar campaign already exists.",
          },
          {
            status: 409,
          }
        );
      }

      return NextResponse.json(
        {
          error:
            "Campaign could not be created. Please try again.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * ArtÄ±k cleanup yapÄ±lmamalÄ±.
     */
    uploadedImagePath =
      "";

    return secureJson(
      {
        success: true,

        message:
          "Your demand was submitted successfully. It will appear after review.",

        campaign,

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
      "Demand submit API error:",
      error
    );

    /*
     * Beklenmeyen hata halinde bile
     * yÃ¼klenmiÅŸ resmi temizlemeye Ã§alÄ±ÅŸ.
     */
    if (
      uploadedImagePath
    ) {
      try {
        await supabaseAdmin.storage
          .from(
            "campaign-images"
          )
          .remove([
            uploadedImagePath,
          ]);
      } catch (
        cleanupError
      ) {
        console.error(
          "Campaign image cleanup error:",
          cleanupError
        );
      }
    }

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