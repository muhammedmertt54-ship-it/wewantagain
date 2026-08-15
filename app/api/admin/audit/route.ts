import {
  NextRequest,
  NextResponse,
} from "next/server";

import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { requireAdminRole } from "../../../../lib/admin/requireAdminRole";

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
      data: logs,
      error,
    } =
      await supabaseAdmin
        .from(
          "admin_audit_logs"
        )
        .select(
          "id, admin_user_id, target_user_id, action, details, created_at"
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        )
        .limit(500);

    if (error) {
      console.error(
        "Audit logs error:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Audit logs could not be loaded.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        logs:
          logs ?? [],
      }
    );
  } catch (error) {
    console.error(
      "Admin audit API error:",
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