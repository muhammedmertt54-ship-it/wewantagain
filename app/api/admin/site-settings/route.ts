import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { requireAdminRole } from "../../../../lib/admin/requireAdminRole";

async function writeAuditLog({
  adminUserId,
  action,
  details,
}: {
  adminUserId: string;
  action: string;
  details?: Record<string, unknown>;
}) {
  const { error } = await supabaseAdmin
    .from("admin_audit_logs")
    .insert({
      admin_user_id: adminUserId,
      target_user_id: null,
      action,
      details: details ?? null,
    });

  if (error) {
    console.error(
      "Site settings audit log error:",
      error
    );
  }
}

function cleanDateTime(
  value: unknown
) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return "";
  }

  const trimmed =
    value.trim();

  const parsed =
    new Date(trimmed);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return "";
  }

  return trimmed;
}

export async function GET(
  request: NextRequest
) {
  try {
    const auth =
      await requireAdminRole(request, [
        "owner",
        "admin",
      ]);

    if (!auth.ok) {
      return auth.response;
    }

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("site_settings")
      .select(
        "id, settings, updated_by, updated_at"
      )
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(
        "Site settings load error:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Site settings could not be loaded.",
          details:
            error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      settings:
        data?.settings ?? {},

      updated_at:
        data?.updated_at ?? null,

      updated_by:
        data?.updated_by ?? null,
    });
  } catch (error) {
    console.error(
      "Site settings GET error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unexpected server error.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const auth =
      await requireAdminRole(request, [
        "owner",
        "admin",
      ]);

    if (!auth.ok) {
      return auth.response;
    }

    const body =
      await request.json();

    const settings =
      body?.settings;

    if (
      !settings ||
      typeof settings !== "object" ||
      Array.isArray(settings)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid site settings.",
        },
        {
          status: 400,
        }
      );
    }

    const cleanedSettings = {
      hero_badge:
        typeof settings.hero_badge ===
        "string"
          ? settings.hero_badge
              .trim()
              .slice(0, 200)
          : "",

      hero_title:
        typeof settings.hero_title ===
        "string"
          ? settings.hero_title
              .trim()
              .slice(0, 180)
          : "",

      hero_description:
        typeof settings.hero_description ===
        "string"
          ? settings.hero_description
              .trim()
              .slice(0, 500)
          : "",

      hero_primary_button:
        typeof settings.hero_primary_button ===
        "string"
          ? settings.hero_primary_button
              .trim()
              .slice(0, 100)
          : "",

      hero_secondary_button:
        typeof settings.hero_secondary_button ===
        "string"
          ? settings.hero_secondary_button
              .trim()
              .slice(0, 100)
          : "",

      trending_title:
        typeof settings.trending_title ===
        "string"
          ? settings.trending_title
              .trim()
              .slice(0, 150)
          : "",

      most_wanted_title:
        typeof settings.most_wanted_title ===
        "string"
          ? settings.most_wanted_title
              .trim()
              .slice(0, 150)
          : "",

      categories_title:
        typeof settings.categories_title ===
        "string"
          ? settings.categories_title
              .trim()
              .slice(0, 150)
          : "",

      footer_text:
        typeof settings.footer_text ===
        "string"
          ? settings.footer_text
              .trim()
              .slice(0, 250)
          : "",

      submissions_enabled:
        settings.submissions_enabled !==
        false,

      support_enabled:
        settings.support_enabled !==
        false,

      maintenance_mode:
        settings.maintenance_mode ===
        true,

      maintenance_schedule_enabled:
        settings.maintenance_schedule_enabled ===
        true,

      maintenance_reason:
        typeof settings.maintenance_reason ===
        "string"
          ? settings.maintenance_reason
              .trim()
              .slice(0, 200)
          : "",

      maintenance_message:
        typeof settings.maintenance_message ===
        "string"
          ? settings.maintenance_message
              .trim()
              .slice(0, 600)
          : "",

      maintenance_starts_at:
        cleanDateTime(
          settings.maintenance_starts_at
        ),

      maintenance_ends_at:
        cleanDateTime(
          settings.maintenance_ends_at
        ),
    };

    if (
      cleanedSettings.maintenance_mode &&
      !cleanedSettings.maintenance_reason
    ) {
      return NextResponse.json(
        {
          error:
            "Maintenance reason is required while manual maintenance is enabled.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      cleanedSettings.maintenance_schedule_enabled &&
      !cleanedSettings.maintenance_starts_at
    ) {
      return NextResponse.json(
        {
          error:
            "Scheduled maintenance requires a start time.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      cleanedSettings.maintenance_schedule_enabled &&
      cleanedSettings.maintenance_starts_at &&
      cleanedSettings.maintenance_ends_at
    ) {
      const startTime =
        new Date(
          cleanedSettings.maintenance_starts_at
        ).getTime();

      const endTime =
        new Date(
          cleanedSettings.maintenance_ends_at
        ).getTime();

      if (
        Number.isFinite(startTime) &&
        Number.isFinite(endTime) &&
        endTime <= startTime
      ) {
        return NextResponse.json(
          {
            error:
              "Maintenance end time must be after the start time.",
          },
          {
            status: 400,
          }
        );
      }
    }

    const now =
      new Date().toISOString();

    const {
      data: existing,
      error: existingError,
    } = await supabaseAdmin
      .from("site_settings")
      .select(
        "id, settings"
      )
      .limit(1)
      .maybeSingle();

    if (existingError) {
      console.error(
        "Site settings lookup error:",
        existingError
      );

      return NextResponse.json(
        {
          error:
            "Site settings could not be checked.",
          details:
            existingError.message,
        },
        {
          status: 500,
        }
      );
    }

    let saveError = null;

    if (existing?.id) {
      const { error } =
        await supabaseAdmin
          .from("site_settings")
          .update({
            settings:
              cleanedSettings,

            updated_by:
              auth.user.id,

            updated_at:
              now,
          })
          .eq(
            "id",
            existing.id
          );

      saveError = error;
    } else {
      const { error } =
        await supabaseAdmin
          .from("site_settings")
          .insert({
            settings:
              cleanedSettings,

            updated_by:
              auth.user.id,

            updated_at:
              now,
          });

      saveError = error;
    }

    if (saveError) {
      console.error(
        "Site settings save error:",
        saveError
      );

      return NextResponse.json(
        {
          error:
            "Site settings could not be saved.",
          details:
            saveError.message,
        },
        {
          status: 500,
        }
      );
    }

    const previousSettings =
      existing?.settings &&
      typeof existing.settings ===
        "object"
        ? existing.settings as Record<
            string,
            unknown
          >
        : {};

    const previousManual =
      previousSettings.maintenance_mode ===
      true;

    const previousSchedule =
      previousSettings.maintenance_schedule_enabled ===
      true;

    let auditAction =
      "update-site-settings";

    if (
      !previousManual &&
      cleanedSettings.maintenance_mode
    ) {
      auditAction =
        "maintenance-enabled";
    } else if (
      previousManual &&
      !cleanedSettings.maintenance_mode
    ) {
      auditAction =
        "maintenance-disabled";
    } else if (
      !previousSchedule &&
      cleanedSettings.maintenance_schedule_enabled
    ) {
      auditAction =
        "maintenance-scheduled";
    } else if (
      previousSchedule &&
      !cleanedSettings.maintenance_schedule_enabled
    ) {
      auditAction =
        "maintenance-schedule-cancelled";
    }

    await writeAuditLog({
      adminUserId:
        auth.user.id,

      action:
        auditAction,

      details: {
        maintenance_mode:
          cleanedSettings.maintenance_mode,

        maintenance_schedule_enabled:
          cleanedSettings.maintenance_schedule_enabled,

        maintenance_reason:
          cleanedSettings.maintenance_reason ||
          null,

        maintenance_message:
          cleanedSettings.maintenance_message ||
          null,

        maintenance_starts_at:
          cleanedSettings.maintenance_starts_at ||
          null,

        maintenance_ends_at:
          cleanedSettings.maintenance_ends_at ||
          null,

        submissions_enabled:
          cleanedSettings.submissions_enabled,

        support_enabled:
          cleanedSettings.support_enabled,
      },
    });

    return NextResponse.json({
      success: true,

      settings:
        cleanedSettings,
    });
  } catch (error) {
    console.error(
      "Site settings POST error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unexpected server error.",
      },
      {
        status: 500,
      }
    );
  }
}