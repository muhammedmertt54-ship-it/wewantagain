import {
  NextRequest,
  NextResponse,
} from "next/server";

import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

const MAX_FILE_SIZE =
  5 * 1024 * 1024;

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
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
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

async function getAuthenticatedUser(
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
    return {
      error:
        NextResponse.json(
          {
            error:
              "Authentication required.",
          },
          {
            status: 401,
          }
        ),
    };
  }

  const accessToken =
    authorization.slice(7);

  const {
    data: { user },
    error,
  } =
    await supabaseAdmin.auth.getUser(
      accessToken
    );

  if (
    error ||
    !user
  ) {
    return {
      error:
        NextResponse.json(
          {
            error:
              "Invalid or expired session.",
          },
          {
            status: 401,
          }
        ),
    };
  }

  return {
    user,
  };
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
     * Ayarlar okunamıyorsa güvenlik
     * açısından fail-closed davranıyoruz.
     *
     * Yani hata halinde kampanya
     * gönderimine izin vermiyoruz.
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

  try {
    /*
     * 1. Kullanıcı doğrulaması
     */
    const auth =
      await getAuthenticatedUser(
        request
      );

    if (
      "error" in auth
    ) {
      return auth.error;
    }

    /*
     * 2. Admin Site Management
     * ayarını server tarafında kontrol et.
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
     * 3. Multipart form
     */
    const formData =
      await request.formData();

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
     * 4. Metin doğrulamaları
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
     * 5. Dosya kontrolü
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
     * Tarayıcının gönderdiği
     * image.type değerine güvenmiyoruz.
     *
     * Dosyanın gerçek ilk byte'larını
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
      `${auth.user.id}/${fileId}.${imageInfo.extension}`;

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
     * 10. Kampanyayı server tarafında
     * oluştur.
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
            auth.user.id,

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
       * DB başarısız olursa
       * orphan image bırakma.
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
     * Artık cleanup yapılmamalı.
     */
    uploadedImagePath =
      "";

    return NextResponse.json(
      {
        success: true,

        message:
          "Your demand was submitted successfully. It will appear after review.",

        campaign,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Demand submit API error:",
      error
    );

    /*
     * Beklenmeyen hata halinde bile
     * yüklenmiş resmi temizlemeye çalış.
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