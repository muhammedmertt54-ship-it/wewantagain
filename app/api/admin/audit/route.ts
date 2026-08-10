import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

async function requireAdmin(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  const accessToken = authorization.slice(7);

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (userError || !user) {
    return {
      error: NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      ),
    };
  }

  const {
    data: adminRow,
    error: adminError,
  } = await supabaseAdmin
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError || !adminRow) {
    return {
      error: NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      ),
    };
  }

  return {
    user,
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);

    if ("error" in auth) {
      return auth.error;
    }

    const {
      data: logs,
      error,
    } = await supabaseAdmin
      .from("admin_audit_logs")
      .select(
        "id, admin_user_id, target_user_id, action, details, created_at"
      )
      .order("created_at", {
        ascending: false,
      })
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

    return NextResponse.json({
      logs: logs ?? [],
    });
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