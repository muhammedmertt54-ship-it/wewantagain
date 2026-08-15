import {
  NextRequest,
  NextResponse,
} from "next/server";

import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { requireAdminRole } from "../../../../lib/admin/requireAdminRole";

type CopyrightStatus =
  | "reviewing"
  | "resolved"
  | "rejected";

function isCopyrightStatus(
  value: unknown
): value is CopyrightStatus {
  return (
    value === "reviewing" ||
    value === "resolved" ||
    value === "rejected"
  );
}

function parseId(
  value: unknown
) {
  const id =
    Number(value);

  if (
    !Number.isInteger(id) ||
    id < 1
  ) {
    return null;
  }

  return id;
}

async function writeAuditLog({
  adminUserId,
  action,
  details,
}: {
  adminUserId: string;
  action: string;
  details?: Record<string, unknown>;
}) {
  const {
    error,
  } =
    await supabaseAdmin
      .from("admin_audit_logs")
      .insert({
        admin_user_id:
          adminUserId,

        target_user_id:
          null,

        action,

        details:
          details ?? null,
      });

  if (error) {
    console.error(
      "Copyright audit log error:",
      error
    );
  }
}

export async function GET(
  request: NextRequest
) {
  try {
    const auth =
      await requireAdminRole(
        request,
        [
          "owner",
          "admin",
        ]
      );

    if (!auth.ok) {
      return auth.response;
    }

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from(
          "copyright_reports"
        )
        .select(
          "id, full_name, email, campaign_url, work_description, disputed_content, relationship, accuracy_confirmed, status, created_at"
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        );

    if (error) {
      console.error(
        "Copyright reports load error:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Copyright reports could not be loaded.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        reports:
          data ?? [],

        current_admin_role:
          auth.admin.role,
      }
    );
  } catch (error) {
    console.error(
      "Copyright reports GET error:",
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

export async function PATCH(
  request: NextRequest
) {
  try {
    const auth =
      await requireAdminRole(
        request,
        [
          "owner",
          "admin",
        ]
      );

    if (!auth.ok) {
      return auth.response;
    }

    const body =
      await request.json();

    const id =
      parseId(
        body?.id
      );

    const status =
      body?.status;

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Invalid report ID.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !isCopyrightStatus(
        status
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid copyright report status.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: existing,
      error:
        existingError,
    } =
      await supabaseAdmin
        .from(
          "copyright_reports"
        )
        .select(
          "id, full_name, email, campaign_url, status"
        )
        .eq(
          "id",
          id
        )
        .maybeSingle();

    if (existingError) {
      console.error(
        "Copyright report lookup error:",
        existingError
      );

      return NextResponse.json(
        {
          error:
            "Copyright report could not be checked.",
        },
        {
          status: 500,
        }
      );
    }

    if (!existing) {
      return NextResponse.json(
        {
          error:
            "Copyright report not found.",
        },
        {
          status: 404,
        }
      );
    }

    const previousStatus =
      existing.status;

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from(
          "copyright_reports"
        )
        .update({
          status,
        })
        .eq(
          "id",
          id
        )
        .select(
          "id, full_name, email, campaign_url, work_description, disputed_content, relationship, accuracy_confirmed, status, created_at"
        )
        .single();

    if (error) {
      console.error(
        "Copyright report update error:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Report status could not be updated.",
        },
        {
          status: 500,
        }
      );
    }

    await writeAuditLog({
      adminUserId:
        auth.user.id,

      action:
        "copyright-report-status-updated",

      details: {
        report_id:
          id,

        report_email:
          existing.email,

        campaign_url:
          existing.campaign_url,

        previous_status:
          previousStatus,

        new_status:
          status,

        admin_role:
          auth.admin.role,
      },
    });

    return NextResponse.json(
      {
        success: true,

        report:
          data,
      }
    );
  } catch (error) {
    console.error(
      "Copyright reports PATCH error:",
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