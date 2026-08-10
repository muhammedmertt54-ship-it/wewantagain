import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

type UserAction =
  | "ban-user"
  | "unban-user"
  | "delete-user"
  | "ban-ip"
  | "unban-ip"
  | "force-logout"
  | "make-admin"
  | "remove-admin";

async function requireAdmin(request: NextRequest) {
  const authorization =
    request.headers.get("authorization");

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

async function writeAuditLog({
  adminUserId,
  targetUserId,
  action,
  details,
}: {
  adminUserId: string;
  targetUserId?: string | null;
  action: string;
  details?: Record<string, unknown>;
}) {
  const { error } = await supabaseAdmin
    .from("admin_audit_logs")
    .insert({
      admin_user_id: adminUserId,
      target_user_id: targetUserId ?? null,
      action,
      details: details ?? null,
    });

  if (error) {
    console.error(
      "Audit log error:",
      error
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth =
      await requireAdmin(request);

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

    const reason =
      typeof body?.reason === "string"
        ? body.reason.trim()
        : "";

    if (
      !action ||
      ![
        "ban-user",
        "unban-user",
        "delete-user",
        "ban-ip",
        "unban-ip",
        "force-logout",
        "make-admin",
        "remove-admin",
      ].includes(action)
    ) {
      return NextResponse.json(
        { error: "Invalid action." },
        { status: 400 }
      );
    }

    // BAN USER
    if (action === "ban-user") {
      if (!userId) {
        return NextResponse.json(
          {
            error:
              "User ID is required.",
          },
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
        error: banError,
      } =
        await supabaseAdmin.auth.admin.updateUserById(
          userId,
          {
            ban_duration: "876000h",
          }
        );

      if (banError) {
        console.error(
          "User ban error:",
          banError
        );

        return NextResponse.json(
          {
            error:
              "User could not be banned.",
            details:
              banError.message,
          },
          { status: 500 }
        );
      }

      await writeAuditLog({
        adminUserId: auth.user.id,
        targetUserId: userId,
        action: "ban-user",
        details: {
          reason:
            reason || null,
          banned_until:
            bannedUser.user
              ?.banned_until ??
            null,
        },
      });

      return NextResponse.json({
        success: true,
        action: "ban-user",
      });
    }

    // UNBAN USER
    if (action === "unban-user") {
      if (!userId) {
        return NextResponse.json(
          {
            error:
              "User ID is required.",
          },
          { status: 400 }
        );
      }

      const {
        error: unbanError,
      } =
        await supabaseAdmin.auth.admin.updateUserById(
          userId,
          {
            ban_duration: "none",
          }
        );

      if (unbanError) {
        console.error(
          "User unban error:",
          unbanError
        );

        return NextResponse.json(
          {
            error:
              "User could not be unbanned.",
            details:
              unbanError.message,
          },
          { status: 500 }
        );
      }

      await writeAuditLog({
        adminUserId: auth.user.id,
        targetUserId: userId,
        action: "unban-user",
      });

      return NextResponse.json({
        success: true,
        action: "unban-user",
      });
    }

    // DELETE USER
    if (action === "delete-user") {
      if (!userId) {
        return NextResponse.json(
          {
            error:
              "User ID is required.",
          },
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

      await writeAuditLog({
        adminUserId: auth.user.id,
        targetUserId: userId,
        action: "delete-user",
      });

      const {
        error: deleteError,
      } =
        await supabaseAdmin.auth.admin.deleteUser(
          userId
        );

      if (deleteError) {
        console.error(
          "User delete error:",
          deleteError
        );

        return NextResponse.json(
          {
            error:
              "User could not be deleted.",
            details:
              deleteError.message,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        action: "delete-user",
      });
    }

    // FORCE LOGOUT
    if (action === "force-logout") {
      if (!userId) {
        return NextResponse.json(
          {
            error:
              "User ID is required.",
          },
          { status: 400 }
        );
      }

      if (userId === auth.user.id) {
        return NextResponse.json(
          {
            error:
              "You cannot force logout your own admin account.",
          },
          { status: 400 }
        );
      }

      const {
        error: sessionDeleteError,
      } = await supabaseAdmin
        .schema("auth")
        .from("sessions")
        .delete()
        .eq("user_id", userId);

      if (sessionDeleteError) {
        console.error(
          "Force logout error:",
          sessionDeleteError
        );

        return NextResponse.json(
          {
            error:
              "User sessions could not be ended.",
            details:
              sessionDeleteError.message,
          },
          { status: 500 }
        );
      }

      await writeAuditLog({
        adminUserId: auth.user.id,
        targetUserId: userId,
        action: "force-logout",
      });

      return NextResponse.json({
        success: true,
        action: "force-logout",
      });
    }

    // MAKE ADMIN
    if (action === "make-admin") {
      if (!userId) {
        return NextResponse.json(
          {
            error:
              "User ID is required.",
          },
          { status: 400 }
        );
      }

      const {
        error: makeAdminError,
      } = await supabaseAdmin
        .from("admins")
        .upsert(
          {
            user_id: userId,
          },
          {
            onConflict: "user_id",
          }
        );

      if (makeAdminError) {
        console.error(
          "Make admin error:",
          makeAdminError
        );

        return NextResponse.json(
          {
            error:
              "Admin permission could not be granted.",
            details:
              makeAdminError.message,
          },
          { status: 500 }
        );
      }

      await writeAuditLog({
        adminUserId: auth.user.id,
        targetUserId: userId,
        action: "make-admin",
      });

      return NextResponse.json({
        success: true,
        action: "make-admin",
      });
    }

    // REMOVE ADMIN
    if (action === "remove-admin") {
      if (!userId) {
        return NextResponse.json(
          {
            error:
              "User ID is required.",
          },
          { status: 400 }
        );
      }

      if (userId === auth.user.id) {
        return NextResponse.json(
          {
            error:
              "You cannot remove your own admin permission.",
          },
          { status: 400 }
        );
      }

      const {
        error: removeAdminError,
      } = await supabaseAdmin
        .from("admins")
        .delete()
        .eq("user_id", userId);

      if (removeAdminError) {
        console.error(
          "Remove admin error:",
          removeAdminError
        );

        return NextResponse.json(
          {
            error:
              "Admin permission could not be removed.",
            details:
              removeAdminError.message,
          },
          { status: 500 }
        );
      }

      await writeAuditLog({
        adminUserId: auth.user.id,
        targetUserId: userId,
        action: "remove-admin",
      });

      return NextResponse.json({
        success: true,
        action: "remove-admin",
      });
    }

    // BAN IP
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
              reason || null,
            banned_by:
              auth.user.id,
          },
          {
            onConflict:
              "ip_address",
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
        return NextResponse.json(
          {
            error:
              "IP ban was not saved.",
          },
          { status: 500 }
        );
      }

      await writeAuditLog({
        adminUserId: auth.user.id,
        targetUserId:
          userId || null,
        action: "ban-ip",
        details: {
          ip_address:
            bannedIp.ip_address,
          reason:
            reason || null,
        },
      });

      return NextResponse.json({
        success: true,
        action: "ban-ip",
        ipAddress:
          bannedIp.ip_address,
      });
    }

    // UNBAN IP
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

      await writeAuditLog({
        adminUserId: auth.user.id,
        targetUserId:
          userId || null,
        action: "unban-ip",
        details: {
          ip_address:
            ipAddress,
          removed:
            (deletedIps?.length ??
              0) > 0,
        },
      });

      return NextResponse.json({
        success: true,
        action: "unban-ip",
        ipAddress,
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