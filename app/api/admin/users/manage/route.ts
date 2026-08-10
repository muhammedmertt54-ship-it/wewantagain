import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

type UserAction =
  | "ban-user"
  | "unban-user"
  | "delete-user"
  | "ban-ip"
  | "unban-ip";

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

    const action =
      typeof body?.action === "string"
        ? (body.action as UserAction)
        : null;

    const userId =
      typeof body?.userId === "string"
        ? body.userId.trim()
        : "";

    const ipAddress =
      typeof body?.ipAddress === "string"
        ? body.ipAddress.trim()
        : "";

    if (
      !action ||
      ![
        "ban-user",
        "unban-user",
        "delete-user",
        "ban-ip",
        "unban-ip",
      ].includes(action)
    ) {
      return NextResponse.json(
        { error: "Invalid action." },
        { status: 400 }
      );
    }

    // USER BAN
    if (action === "ban-user") {
      if (!userId) {
        return NextResponse.json(
          { error: "User ID is required." },
          { status: 400 }
        );
      }

      if (userId === auth.user.id) {
        return NextResponse.json(
          {
            error:
              "You cannot ban your own admin account.",
          },
          { status: 400 }
        );
      }

      const {
        data: bannedUser,
        error: banUserError,
      } =
        await supabaseAdmin.auth.admin.updateUserById(
          userId,
          {
            ban_duration: "876000h",
          }
        );

      if (banUserError) {
        console.error(
          "User ban error:",
          banUserError
        );

        return NextResponse.json(
          {
            error: "User could not be banned.",
            details: banUserError.message,
          },
          { status: 500 }
        );
      }

      console.log(
        "USER BAN SUCCESS:",
        bannedUser.user?.id
      );

      return NextResponse.json({
        success: true,
        action: "ban-user",
        userId,
      });
    }

    // USER UNBAN
    if (action === "unban-user") {
      if (!userId) {
        return NextResponse.json(
          { error: "User ID is required." },
          { status: 400 }
        );
      }

      const {
        data: unbannedUser,
        error: unbanUserError,
      } =
        await supabaseAdmin.auth.admin.updateUserById(
          userId,
          {
            ban_duration: "none",
          }
        );

      if (unbanUserError) {
        console.error(
          "User unban error:",
          unbanUserError
        );

        return NextResponse.json(
          {
            error:
              "User could not be unbanned.",
            details:
              unbanUserError.message,
          },
          { status: 500 }
        );
      }

      console.log(
        "USER UNBAN SUCCESS:",
        unbannedUser.user?.id
      );

      return NextResponse.json({
        success: true,
        action: "unban-user",
        userId,
      });
    }

    // USER DELETE
    if (action === "delete-user") {
      if (!userId) {
        return NextResponse.json(
          { error: "User ID is required." },
          { status: 400 }
        );
      }

      if (userId === auth.user.id) {
        return NextResponse.json(
          {
            error:
              "You cannot delete your own admin account.",
          },
          { status: 400 }
        );
      }

      const {
        data: deletedUser,
        error: deleteUserError,
      } =
        await supabaseAdmin.auth.admin.deleteUser(
          userId
        );

      if (deleteUserError) {
        console.error(
          "User delete error:",
          deleteUserError
        );

        return NextResponse.json(
          {
            error:
              "User could not be deleted.",
            details:
              deleteUserError.message,
          },
          { status: 500 }
        );
      }

      console.log(
        "USER DELETE SUCCESS:",
        deletedUser
      );

      return NextResponse.json({
        success: true,
        action: "delete-user",
        userId,
      });
    }

    // IP BAN
    if (action === "ban-ip") {
      if (!ipAddress) {
        return NextResponse.json(
          {
            error:
              "IP address is required.",
          },
          { status: 400 }
        );
      }

      const {
        data: bannedIp,
        error: banIpError,
      } = await supabaseAdmin
        .from("ip_bans")
        .upsert(
          {
            ip_address: ipAddress,

            reason:
              typeof body?.reason === "string"
                ? body.reason.trim() || null
                : null,

            banned_by: auth.user.id,
          },
          {
            onConflict: "ip_address",
          }
        )
        .select(
          "id, ip_address, reason, banned_by, created_at"
        )
        .single();

      if (banIpError) {
        console.error(
          "IP ban error:",
          banIpError
        );

        return NextResponse.json(
          {
            error:
              "IP address could not be banned.",

            details:
              banIpError.message,

            code:
              banIpError.code,
          },
          { status: 500 }
        );
      }

      if (!bannedIp) {
        console.error(
          "IP ban failed: no row returned.",
          { ipAddress }
        );

        return NextResponse.json(
          {
            error:
              "IP ban was not saved to the database.",
          },
          { status: 500 }
        );
      }

      console.log(
        "IP BAN SUCCESS:",
        bannedIp
      );

      return NextResponse.json({
        success: true,
        action: "ban-ip",

        ipAddress:
          bannedIp.ip_address,

        banId:
          bannedIp.id,
      });
    }

    // IP UNBAN
    if (action === "unban-ip") {
      if (!ipAddress) {
        return NextResponse.json(
          {
            error:
              "IP address is required.",
          },
          { status: 400 }
        );
      }

      const {
        data: deletedIps,
        error: unbanIpError,
      } = await supabaseAdmin
        .from("ip_bans")
        .delete()
        .eq(
          "ip_address",
          ipAddress
        )
        .select(
          "id, ip_address"
        );

      if (unbanIpError) {
        console.error(
          "IP unban error:",
          unbanIpError
        );

        return NextResponse.json(
          {
            error:
              "IP address could not be unbanned.",

            details:
              unbanIpError.message,

            code:
              unbanIpError.code,
          },
          { status: 500 }
        );
      }

      const removed =
        (deletedIps?.length ?? 0) > 0;

      console.log(
        "IP UNBAN RESULT:",
        {
          ipAddress,
          removed,
          deletedIps,
        }
      );

      return NextResponse.json({
        success: true,
        action: "unban-ip",
        ipAddress,
        removed,
      });
    }

    return NextResponse.json(
      {
        error:
          "Unknown action.",
      },
      {
        status: 400,
      }
    );
  } catch (error) {
    console.error(
      "Admin user manage API error:",
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