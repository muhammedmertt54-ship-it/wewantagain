import { NextRequest } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import {
  secureAdminApi,
} from "../../../../lib/security/secureAdminApi";
import {
  parseJsonBody,
  secureJson,
} from "../../../../lib/security/requestSecurity";

const MAX_BODY_BYTES =
  24_000;

const SITE_SETTINGS_READ_RATE_LIMIT =
  60;

const SITE_SETTINGS_WRITE_RATE_LIMIT =
  20;

const SITE_SETTINGS_RATE_WINDOW_MS =
  60_000;

type SiteSettingsBody = {
  settings?: unknown;
};

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
  const security =
    await secureAdminApi(
      request,
      {
        scope:
          "admin-site-settings-read",

        allowedRoles: [
          "owner",
          "admin",
        ],

        blockSuspiciousHeaders:
          true,

        rateLimit: {
          limit:
            SITE_SETTINGS_READ_RATE_LIMIT,

          windowMs:
            SITE_SETTINGS_RATE_WINDOW_MS,
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

      return secureJson(
        {
          error:
            "Site settings could not be loaded.",
        },
        { status: 500, requestId }
      );
    }

    return secureJson(
      {
        settings:
          data?.settings ?? {},

        updated_at:
          data?.updated_at ?? null,

        updated_by:
          data?.updated_by ?? null,

        request_id:
          requestId,
      },
      {
        requestId,
      }
    );
  } catch (error) {
    console.error(
      "Site settings GET error:",
      error
    );

    return secureJson(
      {
        error:
          "Unexpected server error.",
      },
      { status: 500, requestId }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  const security =
    await secureAdminApi(
      request,
      {
        scope:
          "admin-site-settings-write",

        allowedRoles: [
          "owner",
          "admin",
        ],

        requireSameOrigin:
          true,

        blockSuspiciousHeaders:
          true,

        rateLimit: {
          limit:
            SITE_SETTINGS_WRITE_RATE_LIMIT,

          windowMs:
            SITE_SETTINGS_RATE_WINDOW_MS,
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

  try {
    const parsed =
      await parseJsonBody<SiteSettingsBody>(
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

    const body =
      parsed.body;

    const settings =
      body?.settings;

    if (
      !settings ||
      typeof settings !== "object" ||
      Array.isArray(settings)
    ) {
      return secureJson(
        {
          error:
            "Invalid site settings.",
          request_id:
            requestId,
        },
        {
          status: 400,
          requestId,
        }
      );
    }

    const settingsRecord =
      settings as Record<
        string,
        unknown
      >;

    const cleanedSettings = {
      hero_badge:
        typeof settingsRecord.hero_badge ===
        "string"
          ? settingsRecord.hero_badge
              .trim()
              .slice(0, 200)
          : "",

      hero_title:
        typeof settingsRecord.hero_title ===
        "string"
          ? settingsRecord.hero_title
              .trim()
              .slice(0, 180)
          : "",

      hero_description:
        typeof settingsRecord.hero_description ===
        "string"
          ? settingsRecord.hero_description
              .trim()
              .slice(0, 500)
          : "",

      hero_primary_button:
        typeof settingsRecord.hero_primary_button ===
        "string"
          ? settingsRecord.hero_primary_button
              .trim()
              .slice(0, 100)
          : "",

      hero_secondary_button:
        typeof settingsRecord.hero_secondary_button ===
        "string"
          ? settingsRecord.hero_secondary_button
              .trim()
              .slice(0, 100)
          : "",

      trending_title:
        typeof settingsRecord.trending_title ===
        "string"
          ? settingsRecord.trending_title
              .trim()
              .slice(0, 150)
          : "",

      most_wanted_title:
        typeof settingsRecord.most_wanted_title ===
        "string"
          ? settingsRecord.most_wanted_title
              .trim()
              .slice(0, 150)
          : "",

      categories_title:
        typeof settingsRecord.categories_title ===
        "string"
          ? settingsRecord.categories_title
              .trim()
              .slice(0, 150)
          : "",

      footer_text:
        typeof settingsRecord.footer_text ===
        "string"
          ? settingsRecord.footer_text
              .trim()
              .slice(0, 250)
          : "",

      submissions_enabled:
        settingsRecord.submissions_enabled !==
        false,

      support_enabled:
        settingsRecord.support_enabled !==
        false,

      maintenance_mode:
        settingsRecord.maintenance_mode ===
        true,

      maintenance_schedule_enabled:
        settingsRecord.maintenance_schedule_enabled ===
        true,

      maintenance_reason:
        typeof settingsRecord.maintenance_reason ===
        "string"
          ? settingsRecord.maintenance_reason
              .trim()
              .slice(0, 200)
          : "",

      maintenance_message:
        typeof settingsRecord.maintenance_message ===
        "string"
          ? settingsRecord.maintenance_message
              .trim()
              .slice(0, 600)
          : "",

      maintenance_starts_at:
        cleanDateTime(
          settingsRecord.maintenance_starts_at
        ),

      maintenance_ends_at:
        cleanDateTime(
          settingsRecord.maintenance_ends_at
        ),
    };

    if (
      cleanedSettings.maintenance_mode &&
      !cleanedSettings.maintenance_reason
    ) {
      return secureJson(
        {
          error:
            "Maintenance reason is required while manual maintenance is enabled.",
        },
        { status: 400, requestId }
      );
    }

    if (
      cleanedSettings.maintenance_schedule_enabled &&
      !cleanedSettings.maintenance_starts_at
    ) {
      return secureJson(
        {
          error:
            "Scheduled maintenance requires a start time.",
        },
        { status: 400, requestId }
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
        return secureJson(
          {
            error:
              "Maintenance end time must be after the start time.",
          },
          { status: 400, requestId }
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

      return secureJson(
        {
          error:
            "Site settings could not be checked.",
        },
        { status: 500, requestId }
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
              user.id,

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
              user.id,

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

      return secureJson(
        {
          error:
            "Site settings could not be saved.",
        },
        { status: 500, requestId }
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
        user.id,

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

    return secureJson(
      {
        success: true,

        settings:
          cleanedSettings,

        request_id:
          requestId,
      },
      {
        requestId,
      }
    );
  } catch (error) {
    console.error(
      "Site settings POST error:",
      error
    );

    return secureJson(
      {
        error:
          "Unexpected server error.",
      },
      { status: 500, requestId }
    );
  }
}