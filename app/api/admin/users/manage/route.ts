import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

type ManageAction = "ban" | "unban" | "delete";

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

  const { data: adminRow, error: adminError } =
    await supabaseAdmin
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

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);

    if ("error" in auth) {
      return auth.error;
    }

    const body = await request.json();

    const userId =
      typeof body?.userId === "string"
        ? body.userId.trim()
        : "";

    const action =
      typeof body?.action === "string"
        ? (body.action as ManageAction)
        : null;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required." },
        { status: 400 }
      );
    }

    if (!action || !["ban", "unban", "delete"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action." },
        { status: 400 }
      );
    }

    if (userId === auth.user.id) {
      return NextResponse.json(
        {
          error:
            "You cannot ban or delete your own admin account.",
        },
        { status: 400 }
      );
    }

    const { data: targetAdmin } = await supabaseAdmin
      .from("admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (targetAdmin) {
      return NextResponse.json(
        {
          error:
            "Admin accounts cannot be managed from this screen.",
        },
        { status: 403 }
      );
    }

    if (action === "ban") {
      const {
        data,
        error,
      } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        {
          ban_duration: "876000h",
        }
      );

      if (error) {
        console.error("Ban user error:", error);

        return NextResponse.json(
          { error: "User could not be banned." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        action: "ban",
        userId: data.user.id,
      });
    }

    if (action === "unban") {
      const {
        data,
        error,
      } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        {
          ban_duration: "none",
        }
      );

      if (error) {
        console.error("Unban user error:", error);

        return NextResponse.json(
          { error: "User ban could not be removed." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        action: "unban",
        userId: data.user.id,
      });
    }

    if (action === "delete") {
      const { error } =
        await supabaseAdmin.auth.admin.deleteUser(
          userId
        );

      if (error) {
        console.error("Delete user error:", error);

        return NextResponse.json(
          { error: "User could not be deleted." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        action: "delete",
        userId,
      });
    }

    return NextResponse.json(
      { error: "Unknown action." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Manage user API error:", error);

    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}